import { createServerFn } from "@tanstack/react-start";
import { normalizeCode, type CatalogGame, type GameOrder } from "./catalog";

export type PurchaseResult =
  | { ok: true; order: GameOrder }
  | { ok: false; error: string };

export type ActivateResult =
  | { ok: true; order: GameOrder }
  | { ok: false; error: string };

export const getCatalog = createServerFn({ method: "GET" }).handler(async (): Promise<CatalogGame[]> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: games, error: gamesError }, { data: keys, error: keysError }] = await Promise.all([
    supabaseAdmin
      .from("games")
      .select("id, title, description, platform, price_cents, code_prefix, featured, sort_order")
      .order("sort_order", { ascending: true }),
    supabaseAdmin.from("game_keys").select("game_id").eq("status", "available"),
  ]);

  if (gamesError) throw new Error(gamesError.message);
  if (keysError) throw new Error(keysError.message);

  const counts = new Map<string, number>();
  for (const row of keys ?? []) {
    counts.set(row.game_id, (counts.get(row.game_id) ?? 0) + 1);
  }

  return (games ?? []).map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    platform: g.platform,
    priceCents: g.price_cents,
    codePrefix: g.code_prefix,
    featured: g.featured,
    availableCount: counts.get(g.id) ?? 0,
  }));
});

export const purchaseGame = createServerFn({ method: "POST" })
  .inputValidator((input: { gameId: string; buyerEmail?: string }) => input)
  .handler(async ({ data }): Promise<PurchaseResult> => {
    const email = data.buyerEmail?.trim() ?? "";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: "Informe um e-mail válido ou deixe o campo em branco." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: game, error: gameError } = await supabaseAdmin
      .from("games")
      .select("id, title, platform, price_cents")
      .eq("id", data.gameId)
      .maybeSingle();

    if (gameError || !game) {
      return { ok: false, error: "Jogo não encontrado." };
    }

    const { data: claimed, error: claimError } = await supabaseAdmin.rpc("purchase_game_key", {
      p_game_id: data.gameId,
      ...(email ? { p_buyer_email: email } : {}),
    });

    if (claimError) {
      return { ok: false, error: "Não foi possível reservar uma chave agora." };
    }

    const row = Array.isArray(claimed) ? claimed[0] : undefined;
    if (!row) {
      return { ok: false, error: "Estoque esgotado para este jogo." };
    }

    return {
      ok: true,
      order: {
        keyId: row.key_id,
        gameId: game.id,
        gameTitle: game.title,
        platform: game.platform,
        priceCents: game.price_cents,
        activationCode: row.activation_code,
        status: row.status === "activated" ? "activated" : "sold",
        purchasedAt: row.purchased_at,
        activatedAt: row.activated_at,
      },
    };
  });

export const activateKey = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string; expectedGameId?: string }) => input)
  .handler(async ({ data }): Promise<ActivateResult> => {
    const normalized = normalizeCode(data.code);
    if (!normalized) {
      return { ok: false, error: "Informe uma chave de ativação." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: raw, error } = await supabaseAdmin.rpc("activate_game_key", {
      p_code: normalized,
      ...(data.expectedGameId ? { p_expected_game_id: data.expectedGameId } : {}),
    });

    if (error || !raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, error: "Não foi possível validar a chave agora." };
    }

    const res = raw as Record<string, unknown>;
    if (res["ok"] !== true) {
      const msg = typeof res["error"] === "string" ? res["error"] : "Chave inválida.";
      return { ok: false, error: msg };
    }

    return {
      ok: true,
      order: {
        keyId: String(res["keyId"] ?? ""),
        gameId: String(res["gameId"] ?? ""),
        gameTitle: String(res["gameTitle"] ?? ""),
        platform: String(res["platform"] ?? ""),
        priceCents: Number(res["priceCents"] ?? 0),
        activationCode: String(res["activationCode"] ?? normalized),
        status: "activated",
        purchasedAt: typeof res["purchasedAt"] === "string" ? res["purchasedAt"] : null,
        activatedAt: typeof res["activatedAt"] === "string" ? res["activatedAt"] : new Date().toISOString(),
      },
    };
  });

export const lookupMyKeys = createServerFn({ method: "POST" })
  .inputValidator((input: { codes: string[] }) => input)
  .handler(async ({ data }): Promise<GameOrder[]> => {
    const cleaned = Array.from(new Set(data.codes.map(normalizeCode).filter(Boolean))).slice(0, 50);
    if (cleaned.length === 0) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("game_keys")
      .select("id, game_id, activation_code, status, purchased_at, activated_at, games(title, platform, price_cents)")
      .in("activation_code", cleaned)
      .neq("status", "available");

    if (error || !rows) return [];

    const byCode = new Map<string, GameOrder>();
    for (const row of rows) {
      const gameRel = Array.isArray(row.games) ? row.games[0] : row.games;
      byCode.set(row.activation_code, {
        keyId: row.id,
        gameId: row.game_id,
        gameTitle: gameRel?.title ?? row.game_id,
        platform: gameRel?.platform ?? "",
        priceCents: gameRel?.price_cents ?? 0,
        activationCode: row.activation_code,
        status: row.status === "activated" ? "activated" : "sold",
        purchasedAt: row.purchased_at,
        activatedAt: row.activated_at,
      });
    }

    return cleaned
      .map((code) => byCode.get(code))
      .filter((item): item is GameOrder => Boolean(item));
  });