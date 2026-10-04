import { z } from "zod";

export const geolocationSchema = z.object({
  event: z.string().min(1).default("message.location"),
  messageId: z.string().min(1),
  chatJid: z.string().min(1),
  senderJid: z.string().min(1),
  timestamp: z.string().datetime({ offset: true }),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().nonnegative().optional(),
    altitude: z.number().optional(),
    name: z.string().optional(),
    address: z.string().optional(),
    url: z.string().url().optional()
  }),
  liveLocation: z.object({
    accuracyInMeters: z.number().nonnegative().optional(),
    speedInMps: z.number().nonnegative().optional(),
    degreesClockwiseFromMagneticNorth: z.number().min(0).max(360).optional(),
    sequenceNumber: z.number().int().nonnegative().optional()
  }).optional()
});

export type GeolocationEvent = z.infer<typeof geolocationSchema>;

export const websocketEnvelopeSchema = z.object({
  type: z.literal("geolocation"),
  data: geolocationSchema
});
