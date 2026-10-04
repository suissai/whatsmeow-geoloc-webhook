import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { geolocationSchema, type GeolocationEvent } from "./types.js";

const MAX_BODY_BYTES = 1024 * 1024;

export interface ServerOptions {
  host?: string;
  port?: number;
  webhookSecret?: string;
}

export interface GeolocationServer {
  server: Server;
  wss: WebSocketServer;
  port: number;
  close: () => Promise<void>;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload)
  });
  res.end(payload);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
    chunks.push(buffer);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function createGeolocationServer(options: ServerOptions = {}): GeolocationServer {
  let broadcast: (event: GeolocationEvent) => void = () => {};

  const server = createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/healthz") {
      sendJson(res, 200, { status: "ok" });
      return;
    }

    if (req.method === "POST" && req.url === "/webhooks/whatsmeow/geolocation") {
      if (options.webhookSecret && req.headers["x-webhook-secret"] !== options.webhookSecret) {
        sendJson(res, 401, { error: "unauthorized" });
        return;
      }

      try {
        const raw = await readJson(req);
        const parsed = geolocationSchema.safeParse(raw);

        if (!parsed.success) {
          sendJson(res, 400, { error: "invalid_geolocation", issues: parsed.error.issues });
          return;
        }

        broadcast(parsed.data);
        sendJson(res, 202, { accepted: true, messageId: parsed.data.messageId });
      } catch (error) {
        if (error instanceof Error && error.message === "PAYLOAD_TOO_LARGE") {
          sendJson(res, 413, { error: "payload_too_large" });
        } else {
          sendJson(res, 400, { error: "invalid_json" });
        }
      }
      return;
    }

    sendJson(res, 404, { error: "not_found" });
  });

  const wss = new WebSocketServer({ server, path: "/ws" });

  broadcast = (event) => {
    const message = JSON.stringify({ type: "geolocation", data: event });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(message);
    }
  };

  const host = options.host ?? process.env.HOST ?? "0.0.0.0";
  const port = options.port ?? Number(process.env.PORT ?? 8080);
  server.listen(port, host);

  return {
    server,
    wss,
    port,
    close: async () => {
      for (const client of wss.clients) client.close();
      await new Promise<void>((resolve, reject) => wss.close((error) => error ? reject(error) : resolve()));
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  };
}
