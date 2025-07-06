module.exports = {
  apps: [{
    name: 'growth-accelerator-platform',
    script: 'serve',
    env: {
      PM2_SERVE_PATH: '/home/site/wwwroot/dist',
      PM2_SERVE_PORT: process.env.PORT || 8080,
      PM2_SERVE_SPA: 'true',
      PM2_SERVE_HOMEPAGE: '/index.html'
    }
  }]
};