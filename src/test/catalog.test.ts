import { describe, expect, it } from "vitest";
import {
  formatBRL,
  GAMES,
  generateActivationKey,
  validateActivationCode,
  type GameOrder,
} from "../lib/catalog";

describe("KeyVault catalog and GTA 6 activation codes", () => {
  it("includes GTA 6 in stock at R$ 349,90", () => {
    const gta6 = GAMES.find((g) => g.id === "gta-6");
    expect(gta6).toBeDefined();
    expect(gta6?.inStock).toBe(true);
    expect(gta6?.priceCents).toBe(34990);
    expect(formatBRL(gta6?.priceCents ?? 0)).toContain("349,90");
  });

  it("generates GTA 6 activation keys in GTA6-XXXX-XXXX-XXXX format", () => {
    const key = generateActivationKey("GTA6");
    expect(key).toMatch(/^GTA6-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it("validates, normalizes, and rejects duplicate GTA 6 codes", () => {
    const valid = validateActivationCode("  gta6-ab12-cd34-ef56 ", "GTA6", []);
    expect(valid).toEqual({ ok: true, code: "GTA6-AB12-CD34-EF56" });

    const empty = validateActivationCode("   ", "GTA6", []);
    expect(empty.ok).toBe(false);

    const wrongFormat = validateActivationCode("INVALID-123", "GTA6", []);
    expect(wrongFormat.ok).toBe(false);

    const existing: GameOrder[] = [
      {
        id: "ord_1",
        gameId: "gta-6",
        gameTitle: "GTA 6",
        platform: "Rockstar",
        priceCents: 34990,
        activationCode: "GTA6-AB12-CD34-EF56",
        type: "purchase",
        createdAt: "2026-11-25T15:00:00.000Z",
      },
    ];
    const duplicate = validateActivationCode("GTA6-AB12-CD34-EF56", "GTA6", existing);
    expect(duplicate.ok).toBe(false);
  });
});