import { describe, expect, it } from "vitest";
import { formatBRL, isValidKeyFormat, normalizeCode } from "../lib/catalog";

describe("KeyVault catalog and GTA 6 activation codes", () => {
  it("formats GTA 6 price in BRL", () => {
    expect(formatBRL(34990)).toContain("349,90");
  });

  it("normalizes whitespace and casing on activation codes", () => {
    expect(normalizeCode("  gta6-vice-2026-k9m4 ")).toBe("GTA6-VICE-2026-K9M4");
  });

  it("checks expected key format with or without game prefix", () => {
    expect(isValidKeyFormat("GTA6-VICE-2026-K9M4", "GTA6")).toBe(true);
    expect(isValidKeyFormat("ELDN-RING-4K8P-M2X7", "GTA6")).toBe(false);
    expect(isValidKeyFormat("ELDN-RING-4K8P-M2X7")).toBe(true);
    expect(isValidKeyFormat("INVALID")).toBe(false);
  });
});