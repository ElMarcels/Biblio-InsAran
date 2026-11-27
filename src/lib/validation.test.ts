import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { changelogSchema } from "./validation";

const changelog = { title: "Novedad", body: "Cambios de la plataforma." };

describe("changelogSchema tour steps", () => {
  it("normalizes whitespace and ignores empty lines", () => {
    const result = changelogSchema.safeParse({
      ...changelog,
      tourSteps: "  Abre el panel  \n\n  Selecciona la función  ",
    });

    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.tourSteps, "Abre el panel\nSelecciona la función");
    }
  });

  it("allows an empty tour and accepts the five-step, 220-character limits", () => {
    const empty = changelogSchema.safeParse({ ...changelog, tourSteps: "  \n  " });
    const maximum = changelogSchema.safeParse({
      ...changelog,
      tourSteps: Array.from({ length: 5 }, () => "a".repeat(220)).join("\n"),
    });

    assert.equal(empty.success, true);
    if (empty.success) assert.equal(empty.data.tourSteps, undefined);
    assert.equal(maximum.success, true);
  });

  it("rejects more than five steps", () => {
    const result = changelogSchema.safeParse({
      ...changelog,
      tourSteps: Array.from({ length: 6 }, (_, index) => `Paso ${index + 1}`).join("\n"),
    });

    assert.equal(result.success, false);
  });

  it("rejects a step longer than 220 characters", () => {
    const result = changelogSchema.safeParse({
      ...changelog,
      tourSteps: "a".repeat(221),
    });

    assert.equal(result.success, false);
  });
});