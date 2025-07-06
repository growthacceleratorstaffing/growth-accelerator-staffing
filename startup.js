// Azure startup script for PM2 deployment
const { spawn } = require('child_process');

// Start PM2 with the specified configuration
const pm2Process = spawn('pm2', ['serve', '/home/site/wwwroot/dist', '--no-daemon'], {
  stdio: 'inherit',
  cwd: '/home/site/wwwroot'
});

pm2Process.on('close', (code) => {
  console.log(`PM2 process exited with code ${code}`);
  process.exit(code);
});

pm2Process.on('error', (err) => {
  console.error('Failed to start PM2:', err);
  process.exit(1);
});