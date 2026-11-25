export interface GameItem {
  id: string;
  title: string;
  description: string;
  platform: string;
  priceCents: number;
  inStock: boolean;
  codePrefix: string;
  featured?: boolean;
}

export type OrderType = "purchase" | "redeem";

export interface GameOrder {
  id: string;
  gameId: string;
  gameTitle: string;
  platform: string;
  priceCents: number;
  activationCode: string;
  type: OrderType;
  createdAt: string;
}

export const GAMES: GameItem[] = [
  {
    id: "gta-6",
    title: "GTA 6",
    description: "Retorno a Vice City em mundo aberto. Chave Rockstar.",
    platform: "Rockstar",
    priceCents: 34990,
    inStock: true,
    codePrefix: "GTA6",
    featured: true,
  },
  {
    id: "elden-ring",
    title: "Elden Ring",
    description: "RPG de ação em mundo aberto. Chave Steam.",
    platform: "Steam",
    priceCents: 19990,
    inStock: false,
    codePrefix: "ELDN",
  },
  {
    id: "cyberpunk-2077",
    title: "Cyberpunk 2077",
    description: "Aventura em Night City. Chave GOG.",
    platform: "GOG",
    priceCents: 12990,
    inStock: false,
    codePrefix: "CYBR",
  },
  {
    id: "hollow-knight",
    title: "Hollow Knight",
    description: "Metroidvania artesanal. Chave Steam.",
    platform: "Steam",
    priceCents: 4690,
    inStock: false,
    codePrefix: "HLLW",
  },
  {
    id: "red-dead-redemption-2",
    title: "Red Dead Redemption 2",
    description: "Faroeste épico. Chave Rockstar.",
    platform: "Rockstar",
    priceCents: 14990,
    inStock: false,
    codePrefix: "RDR2",
  },
];

const STORAGE_KEY = "keyvault_orders_v1";
const KEY_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function formatBRL(priceCents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(priceCents / 100);
}

export function generateActivationKey(prefix: string): string {
  const segment = () => {
    let out = "";
    for (let i = 0; i < 4; i++) {
      const idx = Math.floor(Math.random() * KEY_CHARS.length);
      out += KEY_CHARS[idx] ?? "A";
    }
    return out;
  };
  return `${prefix.toUpperCase()}-${segment()}-${segment()}-${segment()}`;
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function validateActivationCode(
  raw: string,
  prefix: string,
  existingOrders: GameOrder[]
): { ok: true; code: string } | { ok: false; error: string } {
  const normalized = normalizeCode(raw);
  if (!normalized) {
    return { ok: false, error: "Informe um código de ativação." };
  }
  const pattern = new RegExp(`^${prefix.toUpperCase()}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$`);
  if (!pattern.test(normalized)) {
    return {
      ok: false,
      error: `Use o formato ${prefix.toUpperCase()}-XXXX-XXXX-XXXX.`,
    };
  }
  if (existingOrders.some((o) => o.activationCode === normalized)) {
    return { ok: false, error: "Este código já foi resgatado." };
  }
  return { ok: true, code: normalized };
}

export function loadOrders(): GameOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GameOrder[]) : [];
  } catch {
    return [];
  }
}

export function saveOrder(order: GameOrder): GameOrder[] {
  const current = loadOrders();
  const next = [order, ...current];
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}