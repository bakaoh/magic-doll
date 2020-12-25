module.exports = {
  apps: [
    {
      name: "sumer",
      script: "src/index.js",
      instances: 1,
      autorestart: true,
      max_memory_restart: "1000M",
      watch: false,
      time: true
    }
  ]
};
