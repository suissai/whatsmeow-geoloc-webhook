# WhatsMeow Geolocation Webhook

TypeScript HTTP webhook + WebSocket bridge for geolocation events produced by [WhatsMeow](https://github.com/tulir/whatsmeow).

## Endpoints

- `GET /healthz` — health check.
- `POST /webhooks/whatsmeow/geolocation` — validates and accepts normalized WhatsMeow geolocation events.
- `GET /ws` — WebSocket endpoint. Connected clients receive every accepted event as `{ type: "geolocation", data }`.

The webhook returns **202 Accepted** only after validation and broadcast.

## Payload

```json
{
  "event": "message.location",
  "messageId": "wamid-123",
  "chatJid": "5511999999999@s.whatsapp.net",
  "senderJid": "5511888888888@s.whatsapp.net",
  "timestamp": "2026-10-04T20:00:00.000Z",
  "location": {
    "latitude": -23.55052,
    "longitude": -46.633308,
    "accuracy": 8.5,
    "name": "São Paulo",
    "address": "São Paulo, SP"
  },
  "liveLocation": {
    "accuracyInMeters": 8.5,
    "speedInMps": 1.2,
    "degreesClockwiseFromMagneticNorth": 90,
    "sequenceNumber": 1
  }
}
```

Required fields are `messageId`, `chatJid`, `senderJid`, `timestamp`, and `location.latitude/longitude`.

## Authentication

Set `WEBHOOK_SECRET` and send it as `X-Webhook-Secret`. The secret is optional.

## Run locally

```bash
npm install
npm run dev
```

Environment variables: `PORT` (default `8080`), `HOST` (default `0.0.0.0`), and optional `WEBHOOK_SECRET`.

## WhatsMeow integration

WhatsMeow is a Go library, so this service exposes a JSON boundary. A WhatsMeow event handler should extract the location message and POST the normalized payload to `/webhooks/whatsmeow/geolocation`.

The contract preserves message identity, chat/sender JIDs, timestamp, coordinates, optional accuracy/altitude/metadata, and live-location movement metadata.

## CI

GitHub Actions runs typecheck, tests, and the production build on pushes to `main` and pull requests targeting `main`.
