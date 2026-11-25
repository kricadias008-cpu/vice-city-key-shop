export interface CatalogGame {
  id: string;
  title: string;
  description: string;
  platform: string;
  priceCents: number;
  codePrefix: string;
  featured?: boolean;
  availableCount: number;
}

export type KeyStatus = "available" | "sold" | "activated";

export interface GameOrder {
  keyId: string;
  gameId: string;
  gameTitle: string;
  platform: string;
  priceCents: number;
  activationCode: string;
  status: "sold" | "activated";
  purchasedAt: string | null;
  activatedAt: string | null;
}

const SAVED_CODES_KEY = "keyvault_saved_codes_v2";

export function formatBRL(priceCents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(priceCents / 100);
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidKeyFormat(raw: string, prefix?: string): boolean {
  const normalized = normalizeCode(raw);
  const head = prefix ? prefix.toUpperCase() : "[A-Z0-9]{4}";
  return new RegExp(`^${head}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$`).test(normalized);
}

export function loadSavedCodes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_CODES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
  } catch {
    return [];
  }
}

export function rememberCode(code: string): string[] {
  const normalized = normalizeCode(code);
  const current = loadSavedCodes().filter((c) => c !== normalized);
  const next = [normalized, ...current].slice(0, 50);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SAVED_CODES_KEY, JSON.stringify(next));
  }
  return next;
}