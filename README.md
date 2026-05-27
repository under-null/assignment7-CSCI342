## Live URLs

- **Client:** https://assignment7-csci-342-5fm2oz3mu-logan-s-projects14.vercel.app/
- **Server:** https://platescout-loganheeringa.onrender.com
- **Server health check:** https://platescout-loganheeringa.onrender.com/api/health

## Local setup

1. Clone the repo
2. Copy `server/.env.example` to `server/.env` and fill in `MONGO_URI` + `JWT_SECRET`
3. From the root: `npm install` (client) and `cd server && npm install` (server)
4. Two terminals: `npm run dev` (root, client) + `npm run dev` (server)
5. Open http://localhost:5173

## What I learned during deployment

I had no prior experience with React, MongoDB, Render, nor Vercel. I learned how they all work and how to use them in combination with one another to create a full stack web app, hosted publicly. I found it a bit trickier to debug the site once hosted on Vercel and Render, versus my local machine. I don't think I would do anything differently as it works quite well in its current state and I do not see any obvious issues or inefficiencies.