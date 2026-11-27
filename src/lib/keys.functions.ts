import { normalizeCode, type CatalogGame, type GameOrder } from "./catalog";

type LocalKey = {
  id: string;
  gameId: string;
  code: string;
  status: "available" | "sold" | "activated";
  buyerEmail?: string;
  purchasedAt: string | null;
  activatedAt: string | null;
};

type LocalDatabase = { games: CatalogGame[]; keys: LocalKey[] };
const STORAGE_KEY = "vice_city_key_shop_local_v1";

const seedGames: CatalogGame[] = [
  { id: "gta-6", title: "GTA 6", description: "Retorno a Vice City em mundo aberto. Código interno da loja.", platform: "Loja", priceCents: 34990, codePrefix: "GTA6", featured: true, availableCount: 0 },
  { id: "elden-ring", title: "Elden Ring", description: "RPG de ação em mundo aberto. Código interno da loja.", platform: "Loja", priceCents: 19990, codePrefix: "ELDN", availableCount: 0 },
  { id: "cyberpunk-2077", title: "Cyberpunk 2077", description: "Aventura em Night City. Código interno da loja.", platform: "Loja", priceCents: 12990, codePrefix: "CYBR", availableCount: 0 },
  { id: "hollow-knight", title: "Hollow Knight", description: "Metroidvania artesanal. Código interno da loja.", platform: "Loja", priceCents: 4690, codePrefix: "HLLW", availableCount: 0 },
  { id: "red-dead-redemption-2", title: "Red Dead Redemption 2", description: "Faroeste épico. Código interno da loja.", platform: "Loja", priceCents: 14990, codePrefix: "RDR2", availableCount: 0 },
];

const seedKeys: LocalKey[] = [
  ["gta-6","GTA6-VICE-2026-K9M4"],["gta-6","GTA6-LEON-7X3P-Q8R2"],["gta-6","GTA6-STAR-4N9W-H2V6"],["gta-6","GTA6-CITY-8B5T-M3J7"],
  ["gta-6","GTA6-GOLD-6F2Y-P9C4"],["gta-6","GTA6-MIAM-3D8K-W5L9"],["gta-6","GTA6-APEX-9R4X-T7N2"],["gta-6","GTA6-NEXT-5H6M-Z8Q3"],
  ["elden-ring","ELDN-RING-4K8P-M2X7"],["elden-ring","ELDN-ERDT-9W3N-V6Q2"],["elden-ring","ELDN-LORD-5B7T-H4C9"],
  ["cyberpunk-2077","CYBR-2077-8P4M-N3K6"],["cyberpunk-2077","CYBR-CITY-2X9V-R7W4"],["cyberpunk-2077","CYBR-NETR-6Q5L-T8J2"],
  ["hollow-knight","HLLW-KNHT-3M8R-P5V2"],["hollow-knight","HLLW-SILK-7C4X-N9W6"],["hollow-knight","HLLW-HALL-9T2K-B6Q8"],
  ["red-dead-redemption-2","RDR2-WEST-5R9K-M4P7"],["red-dead-redemption-2","RDR2-GANG-8V2N-X6T3"],["red-dead-redemption-2","RDR2-OUTL-4H7W-C9Q5"],
].map(([gameId, code], index) => ({ id: `local-key-${index + 1}`, gameId, code, status: "available" as const, purchasedAt: null, activatedAt: null }));

function readDatabase(): LocalDatabase {
  if (typeof window === "undefined") return { games: seedGames, keys: seedKeys };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LocalDatabase;
      if (Array.isArray(parsed.games) && Array.isArray(parsed.keys)) return parsed;
    }
  } catch { /* Recreate local data if storage is damaged. */ }
  const initial = { games: seedGames, keys: seedKeys };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function writeDatabase(db: LocalDatabase): void {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function toOrder(key: LocalKey, game: CatalogGame): GameOrder {
  return {
    keyId: key.id, gameId: game.id, gameTitle: game.title, platform: game.platform,
    priceCents: game.priceCents, activationCode: key.code,
    status: key.status === "activated" ? "activated" : "sold",
    purchasedAt: key.purchasedAt, activatedAt: key.activatedAt,
  };
}

export async function getCatalog(): Promise<CatalogGame[]> {
  const db = readDatabase();
  return db.games.map((game) => ({
    ...game,
    availableCount: db.keys.filter((key) => key.gameId === game.id && key.status === "available").length,
  }));
}

export type PurchaseResult = { ok: true; order: GameOrder } | { ok: false; error: string };
export type ActivateResult = { ok: true; order: GameOrder } | { ok: false; error: string };

export async function purchaseGame(input: { gameId: string; buyerEmail?: string }): Promise<PurchaseResult> {
  const email = input.buyerEmail?.trim() ?? "";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Informe um e-mail válido ou deixe o campo em branco." };
  const db = readDatabase();
  const game = db.games.find((item) => item.id === input.gameId);
  if (!game) return { ok: false, error: "Jogo não encontrado." };
  const key = db.keys.find((item) => item.gameId === game.id && item.status === "available");
  if (!key) return { ok: false, error: "Estoque esgotado para este jogo." };
  key.status = "sold";
  key.buyerEmail = email || undefined;
  key.purchasedAt = new Date().toISOString();
  writeDatabase(db);
  return { ok: true, order: toOrder(key, game) };
}

export async function activateKey(input: { code: string; expectedGameId?: string }): Promise<ActivateResult> {
  const normalized = normalizeCode(input.code);
  if (!normalized) return { ok: false, error: "Informe um código." };
  const db = readDatabase();
  const key = db.keys.find((item) => normalizeCode(item.code) === normalized);
  if (!key) return { ok: false, error: "Código inválido ou não encontrado no estoque local." };
  const game = db.games.find((item) => item.id === key.gameId);
  if (!game) return { ok: false, error: "Jogo vinculado ao código não encontrado." };
  if (input.expectedGameId && key.gameId !== input.expectedGameId) return { ok: false, error: `Este código pertence ao jogo ${game.title}.` };
  if (key.status === "activated") return { ok: false, error: "Este código já foi utilizado." };
  key.status = "activated";
  key.purchasedAt ??= new Date().toISOString();
  key.activatedAt = new Date().toISOString();
  writeDatabase(db);
  return { ok: true, order: toOrder(key, game) };
}

export async function lookupMyKeys(input: { codes: string[] }): Promise<GameOrder[]> {
  const db = readDatabase();
  const wanted = new Set(input.codes.map(normalizeCode));
  return db.keys.filter((key) => wanted.has(normalizeCode(key.code)) && key.status !== "available")
    .flatMap((key) => {
      const game = db.games.find((item) => item.id === key.gameId);
      return game ? [toOrder(key, game)] : [];
    });
}
