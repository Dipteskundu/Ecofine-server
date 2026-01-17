# Render Deployment Guide

The error `Error: Cannot find module '/opt/render/project/src/index.js'` occurs because Render is trying to find `index.js` in the root of your repository, but your server code is located in the `server` folder.

## 1. Fix Root Directory Setting

Go to your Render Dashboard, select your service, and update the **Settings**:

*   **Root Directory**: `server`
    *   *This tells Render to run commands inside the `server` folder.*
*   **Build Command**: `npm install`
*   **Start Command**: `node index.js` (or `npm start`)

## 2. Code Update (Applied Automatically)

I have already updated your `index.js` file to ensure the server starts correctly in production. Previously, it was configured to only listen on a port in development mode.

## 3. Environment Variables

Ensure you have added the following Environment Variables in the Render Dashboard:

*   `DB_USER`
*   `DB_PASS`
*   `DB_NAME`
*   `DB_CLUSTER` (e.g., `cluster0`)
*   `FIREBASE_SERVICE_ACCOUNT` (The entire JSON string from your service account file)
*   `NODE_ENV` (Set to `production`)

## 4. Verify

After saving the "Root Directory" setting, trigger a manual deploy (or push a commit) to restart the build process. It should now correctly install dependencies in the `server` folder and start `index.js`.
