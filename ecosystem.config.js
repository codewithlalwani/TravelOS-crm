module.exports = {
  apps: [
    {
      name: 'travel-crm',
      script: 'npm',
      args: 'start',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      autorestart: true,
    },
  ],
};
