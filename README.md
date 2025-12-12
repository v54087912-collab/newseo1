# Music Web App

A single-page, mobile-first music player application built with vanilla HTML, CSS, and JavaScript. It features real-time search, a built-in player, and MP3 download capabilities.

## Features

*   **Real-time Search:** Search for songs and artists with live results.
*   **Music Player:** Full-featured player with play/pause, seek, volume, and next/previous controls.
*   **Mobile-First Design:** Responsive layout with a sticky mini-player for mobile devices.
*   **Download:** Download tracks as MP3s.
*   **Persistent State:** Remembers your playlist and last played track.

## Project Structure

*   `index.html`: The main application structure.
*   `styles.css`: Mobile-first styling with a dark theme.
*   `script.js`: Application logic (search, player, state management).
*   `api/proxy.js`: Serverless proxy to handle API requests and CORS.
*   `vercel.json`: Vercel configuration file.

## Deployment

This project is designed to be deployed on [Vercel](https://vercel.com).

1.  **Install Vercel CLI (optional):** `npm i -g vercel`
2.  **Deploy:** Run `vercel` in the project root.
    *   Or, connect your GitHub repository to Vercel and it will auto-deploy.

### Vercel Configuration

The project uses `vercel.json` to configure routes and serverless functions.
*   The `api/proxy.js` function handles requests to external APIs to avoid CORS issues.
*   The frontend is served as a static site.

## APIs Used

*   **Search:** `https://ashlynn-repo.vercel.app/search`
*   **Download:** `https://socialdown.itz-ashlynn.workers.dev/yt`

## Development

To run locally, you can use a simple static file server, but the API proxy requires a Node.js environment or Vercel Dev.

Using Vercel CLI:
```bash
vercel dev
```

This will start a local development server that mimics the Vercel production environment, including the serverless functions.
