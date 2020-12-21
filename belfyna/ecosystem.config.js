module.exports = {
  apps: [
    {
      name: "belfyna",
      script: "src/service.js",
      instances: 1,
      autorestart: true,
      max_memory_restart: "1000M",
      watch: false,
      time: true
    }
  ]
};
