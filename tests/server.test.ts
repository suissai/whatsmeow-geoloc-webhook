import { afterEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { createGeolocationServer, type GeolocationServer } from "../src/server.js";

const payload = {
  event: "message.location",
  messageId: "wamid-test-001",
  chatJid: "5511999999999@s.whatsapp.net",
  senderJid: "5511888888888@s.whatsapp.net",
  timestamp: "2026-10-04T20:00:00.000Z",
  location: {
    latitude: -23.55052,
    longitude: -46.633308,
    accuracy: 8.5
  }
};

let service: GeolocationServer | undefined;

afterEach(async () => {
  if (service) await service.close();
  service = undefined;
});

function start(options = {}): Promise<{ base: string; port: number }> {
  return new Promise((resolve) => {
    service = createGeolocationServer({ host: "127.0.0.1", port: 0, ...options });
    service.server.once("listening", () => {
      const address = service!.server.address() as { port: number };
      resolve({ base: `http://127.0.0.1:${address.port}`, port: address.port });
    });
  });
}

describe("WhatsMeow geolocation webhook", () => {
  it("returns health status", async () => {
    const { base } = await start();
    const response = await fetch(`${base}/healthz`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("rejects invalid geolocation", async () => {
    const { base } = await start();
    const response = await fetch(`${base}/webhooks/whatsmeow/geolocation`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messageId: "missing-fields" })
    });
    expect(response.status).toBe(400);
  });

  it("accepts geolocation and broadcasts it to WebSocket clients", async () => {
    const { base, port } = await start();
    const received = new Promise<unknown>((resolve) => {
      const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      socket.once("message", (message) => {
        resolve(JSON.parse(message.toString()));
        socket.close();
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 25));

    const response = await fetch(`${base}/webhooks/whatsmeow/geolocation`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    expect(response.status).toBe(202);
    await expect(received).resolves.toMatchObject({ type: "geolocation", data: payload });
  });

  it("protects the webhook with the optional secret", async () => {
    const { base } = await start({ webhookSecret: "secret" });
    const response = await fetch(`${base}/webhooks/whatsmeow/geolocation`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    expect(response.status).toBe(401);
  });
});
