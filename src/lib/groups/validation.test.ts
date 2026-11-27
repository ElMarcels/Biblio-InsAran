import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  groupCallActionSchema,
  groupCallBoardActionSchema,
  groupCallSignalSchema,
  groupCreateSchema,
  groupInviteSchema,
  groupMessageSchema,
  iceServersSchema,
} from "./validation";

describe("validación de grupos privados", () => {
  it("normaliza el nombre y la descripción del grupo", () => {
    const result = groupCreateSchema.safeParse({
      name: "  Club lector  ",
      description: "  Lecturas del curso  ",
    });

    assert.equal(result.success, true);
    if (result.success) {
      assert.deepEqual(result.data, {
        name: "Club lector",
        description: "Lecturas del curso",
      });
    }
  });

  it("rechaza mensajes vacíos y demasiado largos", () => {
    assert.equal(groupMessageSchema.safeParse({ content: "   " }).success, false);
    assert.equal(groupMessageSchema.safeParse({ content: "a".repeat(1501) }).success, false);
    assert.equal(groupMessageSchema.safeParse({ content: "Mensaje breve" }).success, true);
  });

  it("solo acepta invitaciones a una identidad conocida", () => {
    assert.equal(
      groupInviteSchema.safeParse({ targetType: "READER", targetId: "reader-id" }).success,
      true,
    );
    assert.equal(
      groupInviteSchema.safeParse({ targetType: "ADMIN", targetId: "user-id" }).success,
      false,
    );
  });

  it("solo acepta mensajes de señalización con un payload objeto", () => {
    const base = {
      connectionId: "9fef3fb7-7ad1-4673-b2a8-ec6fb97dfcb0",
      toConnectionId: "e58a21a7-1873-4ad0-969e-ae84e9d68219",
      type: "offer",
    };

    assert.equal(groupCallSignalSchema.safeParse({ ...base, payload: { sdp: "offer" } }).success, true);
    assert.equal(groupCallSignalSchema.safeParse({ ...base, payload: "not-an-object" }).success, false);
    assert.equal(groupCallSignalSchema.safeParse({ ...base, type: "hangup", payload: {} }).success, false);
  });

  it("valida el modo de vídeo de las llamadas y mantiene voz como opción predeterminada", () => {
    const base = {
      action: "start",
      connectionId: "9fef3fb7-7ad1-4673-b2a8-ec6fb97dfcb0",
    };

    assert.deepEqual(groupCallActionSchema.parse(base), { ...base, videoEnabled: false });
    assert.equal(groupCallActionSchema.safeParse({ ...base, videoEnabled: true }).success, true);
    assert.equal(groupCallActionSchema.safeParse({ ...base, videoEnabled: "yes" }).success, false);
    assert.equal(groupCallActionSchema.safeParse({ ...base, action: "raiseHand" }).success, true);
    assert.equal(groupCallActionSchema.safeParse({ ...base, action: "lowerHand" }).success, true);
  });

  it("limita los trazos de la pizarra a colores y coordenadas permitidos", () => {
    const base = {
      action: "stroke",
      connectionId: "9fef3fb7-7ad1-4673-b2a8-ec6fb97dfcb0",
      color: "#2563eb",
      width: 4,
      erase: false,
      points: [{ x: 0.1, y: 0.9 }, { x: 0.8, y: 0.2 }],
    };

    assert.equal(groupCallBoardActionSchema.safeParse(base).success, true);
    assert.equal(groupCallBoardActionSchema.safeParse({ ...base, color: "url(https://example.com)" }).success, false);
    assert.equal(groupCallBoardActionSchema.safeParse({ ...base, points: [{ x: 1.1, y: 0.5 }] }).success, false);
    assert.equal(
      groupCallBoardActionSchema.safeParse({ ...base, points: Array.from({ length: 81 }, () => ({ x: 0.5, y: 0.5 })) }).success,
      false,
    );
    assert.equal(
      groupCallBoardActionSchema.safeParse({ action: "clear", connectionId: base.connectionId }).success,
      true,
    );
  });

  it("valida la configuración opcional de servidores ICE", () => {
    assert.equal(
      iceServersSchema.safeParse([
        { urls: ["turn:turn.example.org:3478"], username: "temporary", credential: "secret" },
      ]).success,
      true,
    );
    assert.equal(iceServersSchema.safeParse([{ urls: [] }]).success, false);
    assert.equal(iceServersSchema.safeParse(Array.from({ length: 9 }, () => ({ urls: "stun:host" }))).success, false);
  });
});