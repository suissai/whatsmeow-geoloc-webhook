import { createGeolocationServer } from "./server.js";

const service = createGeolocationServer({
  webhookSecret: process.env.WEBHOOK_SECRET
});

console.log(`WhatsMeow geolocation webhook listening on :${service.port}`);

const shutdown = async () => {
  await service.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
