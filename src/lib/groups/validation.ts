import { z } from "zod";

export const MAX_GROUPS_PER_OWNER = 20;
export const MAX_GROUP_MEMBERS = 30;
export const MAX_VOICE_PARTICIPANTS = 6;
export const CALL_PARTICIPANT_TTL_MS = 30_000;
export const MAX_GROUP_CALL_BOARD_EVENTS = 500;

export const groupCreateSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).default(""),
});

export const groupMessageSchema = z.object({
  content: z.string().trim().min(1).max(1500),
});

export const groupInviteSchema = z.object({
  targetType: z.enum(["STAFF", "READER"]),
  targetId: z.string().trim().min(1).max(64),
});

export const groupInvitationResponseSchema = z.object({
  decision: z.enum(["ACCEPTED", "DECLINED"]),
});

export const groupCallActionSchema = z.object({
  action: z.enum(["start", "join", "heartbeat", "raiseHand", "lowerHand", "leave", "end"]),
  callId: z.string().trim().min(1).max(64).optional(),
  connectionId: z.string().uuid(),
  videoEnabled: z.boolean().default(false),
});

export const groupCallSignalSchema = z.object({
  connectionId: z.string().uuid(),
  toConnectionId: z.string().uuid(),
  type: z.enum(["offer", "answer", "candidate"]),
  payload: z.unknown().refine(
    (value) => typeof value === "object" && value !== null && !Array.isArray(value),
  ),
});

const groupCallBoardPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const groupCallBoardActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("stroke"),
    connectionId: z.string().uuid(),
    color: z.enum(["#111827", "#dc2626", "#2563eb", "#16a34a", "#ca8a04"]),
    width: z.number().min(2).max(16),
    erase: z.boolean(),
    points: z.array(groupCallBoardPointSchema).min(1).max(80),
  }),
  z.object({
    action: z.literal("clear"),
    connectionId: z.string().uuid(),
  }),
]);

export const iceServersSchema = z.array(
  z.object({
    urls: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
    username: z.string().optional(),
    credential: z.string().optional(),
  }),
).max(8);