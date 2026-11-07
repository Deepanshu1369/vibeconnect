/**
 * VibeConnect Backend
 * Random stranger matching + text chat + WebRTC signaling
 * Optimized for free hosting (Railway / Render / Fly.io)
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

app.use(cors());
app.use(express.json());

// ====================== IN-MEMORY DATA ======================
const waitingQueue = [];          // people waiting for match
const activePairs = new Map();    // socketId -> partnerSocketId
const userData = new Map();       // socketId -> { interests, mode, joinedAt }

// Simple stats
let totalConnections = 0;
let totalMatches = 0;

// ====================== HELPER FUNCTIONS ======================
function findMatch(socketId, interests = [], mode = 'text') {
  // Remove self if somehow in queue
  const idx = waitingQueue.findIndex(u => u.socketId === socketId);
  if (idx !== -1) waitingQueue.splice(idx, 1);

  // Try interest match first
  let matchIndex = -1;
  if (interests.length > 0) {
    matchIndex = waitingQueue.findIndex(u => {
      if (u.mode !== mode) return false;
      return u.interests.some(i => interests.includes(i));
    });
  }

  // Fallback to any same mode
  if (matchIndex === -1) {
    matchIndex = waitingQueue.findIndex(u => u.mode === mode);
  }

  if (matchIndex !== -1) {
    const partner = waitingQueue.splice(matchIndex, 1)[0];
    return partner;
  }
  return null;
}

function cleanUser(socketId) {
  // Remove from queue
  const qIdx = waitingQueue.findIndex(u => u.socketId === socketId);
  if (qIdx !== -1) waitingQueue.splice(qIdx, 1);

  // Break pair
  const partnerId = activePairs.get(socketId);
  if (partnerId) {
    activePairs.delete(socketId);
    activePairs.delete(partnerId);
    const partnerSocket = io.sockets.sockets.get(partnerId);
    if (partnerSocket) {
      partnerSocket.emit('partner-left');
    }
  }

  userData.delete(socketId);
}

// ====================== SOCKET.IO ======================
io.on('connection', (socket) => {
  totalConnections++;
  console.log(`[+] Connected: ${socket.id} | Online: ${io.engine.clientsCount}`);

  // Send current online count
  socket.emit('online-count', io.engine.clientsCount);
  io.emit('online-count', io.engine.clientsCount);

  // ---------- FIND PARTNER ----------
  socket.on('find-partner', (data = {}) => {
    const { interests = [], mode = 'text' } = data;

    // Clean previous state
    cleanUser(socket.id);

    userData.set(socket.id, {
      interests: Array.isArray(interests) ? interests.slice(0, 5) : [],
      mode,
      joinedAt: Date.now()
    });

    const partner = findMatch(socket.id, interests, mode);

    if (partner) {
      // Match found!
      activePairs.set(socket.id, partner.socketId);
      activePairs.set(partner.socketId, socket.id);
      totalMatches++;

      const roomId = uuidv4();

      // Notify both
      socket.emit('matched', {
        partnerId: partner.socketId,
        roomId,
        isInitiator: true
      });

      const partnerSocket = io.sockets.sockets.get(partner.socketId);
      if (partnerSocket) {
        partnerSocket.emit('matched', {
          partnerId: socket.id,
          roomId,
          isInitiator: false
        });
      }

      console.log(`[MATCH] ${socket.id} <-> ${partner.socketId} | Total matches: ${totalMatches}`);
    } else {
      // Add to waiting queue
      waitingQueue.push({
        socketId: socket.id,
        interests: userData.get(socket.id).interests,
        mode
      });
      socket.emit('searching');
      console.log(`[QUEUE] ${socket.id} waiting | Queue size: ${waitingQueue.length}`);
    }
  });

  // ---------- TEXT MESSAGE ----------
  socket.on('send-message', (msg) => {
    const partnerId = activePairs.get(socket.id);
    if (partnerId) {
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket) {
        partnerSocket.emit('receive-message', {
          text: String(msg).slice(0, 1000),
          timestamp: Date.now()
        });
      }
    }
  });

  // ---------- WEBRTC SIGNALING ----------
  socket.on('webrtc-offer', (data) => {
    const partnerId = activePairs.get(socket.id);
    if (partnerId) {
      io.to(partnerId).emit('webrtc-offer', data);
    }
  });

  socket.on('webrtc-answer', (data) => {
    const partnerId = activePairs.get(socket.id);
    if (partnerId) {
      io.to(partnerId).emit('webrtc-answer', data);
    }
  });

  socket.on('webrtc-ice', (data) => {
    const partnerId = activePairs.get(socket.id);
    if (partnerId) {
      io.to(partnerId).emit('webrtc-ice', data);
    }
  });

  // ---------- NEXT / SKIP ----------
  socket.on('next', () => {
    const oldPartner = activePairs.get(socket.id);
    cleanUser(socket.id);

    if (oldPartner) {
      const oldPartnerSocket = io.sockets.sockets.get(oldPartner);
      if (oldPartnerSocket) {
        oldPartnerSocket.emit('partner-left');
      }
    }

    // Automatically search again with same preferences
    const prev = userData.get(socket.id) || { interests: [], mode: 'text' };
    socket.emit('searching');
    // Re-trigger find after short delay so frontend can show animation
    setTimeout(() => {
      socket.emit('auto-research');
    }, 400);
  });

  // ---------- STOP / LEAVE ----------
  socket.on('stop', () => {
    cleanUser(socket.id);
    socket.emit('stopped');
  });

  // ---------- REPORT ----------
  socket.on('report', (reason) => {
    const partnerId = activePairs.get(socket.id);
    console.log(`[REPORT] ${socket.id} reported ${partnerId} | Reason: ${reason}`);
    // In production you would save this to database
    cleanUser(socket.id);
    socket.emit('reported');
  });

  // ---------- DISCONNECT ----------
  socket.on('disconnect', () => {
    console.log(`[-] Disconnected: ${socket.id}`);
    cleanUser(socket.id);
    io.emit('online-count', io.engine.clientsCount);
  });
});

// ====================== BASIC API ======================
app.get('/', (req, res) => {
  res.json({
    status: 'VibeConnect server running',
    online: io.engine.clientsCount,
    queue: waitingQueue.length,
    totalMatches
  });
});

app.get('/stats', (req, res) => {
  res.json({
    online: io.engine.clientsCount,
    queue: waitingQueue.length,
    totalMatches,
    totalConnections
  });
});

// ====================== START ======================
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`VibeConnect backend running on port ${PORT}`);
});
