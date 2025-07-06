# Azure Deployment Guide

## Setup Instructions

1. **Configure Azure Web App Settings:**
   - Set the startup command in Azure Portal: `pm2 serve /home/site/wwwroot/dist --no-daemon`
   - Alternatively, you can use: `node startup.js`

2. **Environment Variables:**
   - Set `NODE_ENV=production`
   - Set `PORT=8080` (or let Azure handle this automatically)

3. **Build Process:**
   - The GitHub Action will automatically build the app with `npm run build`
   - The `dist` folder will be deployed to `/home/site/wwwroot/dist`

4. **PM2 Configuration:**
   - PM2 will serve the static files from the `dist` directory
   - SPA routing is handled by the `web.config` file
   - The `--no-daemon` flag ensures PM2 runs in the foreground for Azure

## Files Added:
- `ecosystem.config.js` - PM2 configuration
- `startup.js` - Alternative startup script
- `web.config` - Already configured for SPA routing

## Deployment Command Options:
1. **Direct PM2 command:** `pm2 serve /home/site/wwwroot/dist --no-daemon`
2. **Using startup script:** `node startup.js`
3. **Using ecosystem config:** `pm2 start ecosystem.config.js --no-daemon`