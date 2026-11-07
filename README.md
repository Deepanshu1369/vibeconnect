# VibeConnect – Random Chat Website

Modern, smooth, addictive random text + video chat platform.  
Built to feel premium and keep users coming back every day.

## Features
- Beautiful dark modern UI
- Interest-based matching
- Text chat + Video chat (WebRTC)
- Smooth animations
- Online counter
- Ice-breaker suggestions
- Report / Next / Stop
- Low-to-moderate ad spaces (already prepared)
- Mobile responsive

## Project Structure
```
vibechat/
├── backend/
│   ├── package.json
│   └── server.js          ← Matching + Socket.io + WebRTC signaling
├── frontend/
│   └── index.html         ← Complete beautiful UI
└── README.md
```

## How to Run Locally (for testing)

### 1. Backend
```bash
cd backend
npm install
node server.js
```
Server will start on http://localhost:3001

### 2. Frontend
Just open `frontend/index.html` in browser  
OR use a simple server:
```bash
cd frontend
npx serve .
```

**Important:** In `index.html` change this line if needed:
```js
const BACKEND_URL = "http://localhost:3001";
```

## Free Deployment (Recommended for ₹2000 budget)

### Step 1: Backend (Free)
1. Go to https://railway.app or https://render.com
2. Create new project → Deploy from GitHub (or upload)
3. Set start command: `node server.js`
4. Copy the public URL (example: https://vibeconnect-backend.up.railway.app)

### Step 2: Frontend (Free)
1. Go to https://vercel.com or https://netlify.com or https://pages.cloudflare.com
2. Upload the `frontend` folder
3. In `index.html` change:
   ```js
   const BACKEND_URL = "https://your-backend-url.railway.app";
   ```
4. Deploy

### Step 3: Domain (only cost)
Buy a cheap domain (.in / .xyz / .site) for ₹150–500  
Point it to your frontend.

## Ad Spaces (already in the code)
- Landing top banner
- Landing bottom
- Matching screen (while users wait)
- Chat bottom sticky (small)

Just replace the placeholder text with your real ad code (PropellerAds / Monetag / Adsterra / AdSense).

## Making it Addictive (already included)
- Fast matching
- Interest tags
- Beautiful UI + smooth animations
- Ice-breaker buttons
- Online people counter
- Clean “Next” experience

## Later (when you have users)
- Add MongoDB for reports & stats
- Add “Remove Ads” premium
- Convert to Android/iOS app using Capacitor

## Support
This is a complete working foundation.  
Deploy it, get first users, then we can improve further.

