CREATE TABLE public.games (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  platform text NOT NULL,
  price_cents integer NOT NULL,
  code_prefix text NOT NULL,
  featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.games TO anon, authenticated;
GRANT ALL ON public.games TO service_role;

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Games are publicly readable"
ON public.games
FOR SELECT
TO anon, authenticated
USING (true);

CREATE TABLE public.game_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id text NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  activation_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'available',
  buyer_email text,
  purchased_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_game_keys_game_status ON public.game_keys (game_id, status);

GRANT ALL ON public.game_keys TO service_role;

ALTER TABLE public.game_keys ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.purchase_game_key(
  p_game_id text,
  p_buyer_email text DEFAULT NULL
)
RETURNS TABLE (
  key_id uuid,
  game_id text,
  activation_code text,
  status text,
  purchased_at timestamptz,
  activated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key_id uuid;
BEGIN
  SELECT gk.id
  INTO v_key_id
  FROM public.game_keys gk
  WHERE gk.game_id = p_game_id
    AND gk.status = 'available'
  ORDER BY gk.created_at ASC, gk.id ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_key_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  UPDATE public.game_keys gk
  SET status = 'sold',
      buyer_email = NULLIF(trim(p_buyer_email), ''),
      purchased_at = now()
  WHERE gk.id = v_key_id
  RETURNING gk.id, gk.game_id, gk.activation_code, gk.status, gk.purchased_at, gk.activated_at;
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_game_key(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_game_key(text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.activate_game_key(
  p_code text,
  p_expected_game_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized text;
  v_row public.game_keys%ROWTYPE;
  v_game public.games%ROWTYPE;
BEGIN
  v_normalized := upper(regexp_replace(coalesce(trim(p_code), ''), '\s+', '', 'g'));

  IF v_normalized = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Informe uma chave de ativação.');
  END IF;

  SELECT *
  INTO v_row
  FROM public.game_keys
  WHERE activation_code = v_normalized
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Chave inválida ou não encontrada no estoque.');
  END IF;

  IF p_expected_game_id IS NOT NULL AND v_row.game_id <> p_expected_game_id THEN
    SELECT * INTO v_game FROM public.games WHERE id = v_row.game_id;
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Esta chave pertence ao jogo ' || coalesce(v_game.title, v_row.game_id) || '.'
    );
  END IF;

  IF v_row.status = 'activated' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Esta chave já foi ativada anteriormente.');
  END IF;

  UPDATE public.game_keys
  SET status = 'activated',
      activated_at = now()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  SELECT * INTO v_game FROM public.games WHERE id = v_row.game_id;

  RETURN jsonb_build_object(
    'ok', true,
    'keyId', v_row.id,
    'gameId', v_row.game_id,
    'gameTitle', v_game.title,
    'platform', v_game.platform,
    'priceCents', v_game.price_cents,
    'activationCode', v_row.activation_code,
    'status', v_row.status,
    'purchasedAt', v_row.purchased_at,
    'activatedAt', v_row.activated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_game_key(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_game_key(text, text) TO service_role;

INSERT INTO public.games (id, title, description, platform, price_cents, code_prefix, featured, sort_order) VALUES
  ('gta-6', 'GTA 6', 'Retorno a Vice City em mundo aberto. Chave Rockstar.', 'Rockstar', 34990, 'GTA6', true, 1),
  ('elden-ring', 'Elden Ring', 'RPG de ação em mundo aberto. Chave Steam.', 'Steam', 19990, 'ELDN', false, 2),
  ('cyberpunk-2077', 'Cyberpunk 2077', 'Aventura em Night City. Chave GOG.', 'GOG', 12990, 'CYBR', false, 3),
  ('hollow-knight', 'Hollow Knight', 'Metroidvania artesanal. Chave Steam.', 'Steam', 4690, 'HLLW', false, 4),
  ('red-dead-redemption-2', 'Red Dead Redemption 2', 'Faroeste épico. Chave Rockstar.', 'Rockstar', 14990, 'RDR2', false, 5);

INSERT INTO public.game_keys (game_id, activation_code, status) VALUES
  ('gta-6', 'GTA6-VICE-2026-K9M4', 'available'),
  ('gta-6', 'GTA6-LEON-7X3P-Q8R2', 'available'),
  ('gta-6', 'GTA6-STAR-4N9W-H2V6', 'available'),
  ('gta-6', 'GTA6-CITY-8B5T-M3J7', 'available'),
  ('gta-6', 'GTA6-GOLD-6F2Y-P9C4', 'available'),
  ('gta-6', 'GTA6-MIAM-3D8K-W5L9', 'available'),
  ('gta-6', 'GTA6-APEX-9R4X-T7N2', 'available'),
  ('gta-6', 'GTA6-NEXT-5H6M-Z8Q3', 'available'),
  ('elden-ring', 'ELDN-RING-4K8P-M2X7', 'available'),
  ('elden-ring', 'ELDN-ERDT-9W3N-V6Q2', 'available'),
  ('elden-ring', 'ELDN-LORD-5B7T-H4C9', 'available'),
  ('cyberpunk-2077', 'CYBR-2077-8P4M-N3K6', 'available'),
  ('cyberpunk-2077', 'CYBR-CITY-2X9V-R7W4', 'available'),
  ('cyberpunk-2077', 'CYBR-NETR-6Q5L-T8J2', 'available'),
  ('hollow-knight', 'HLLW-KNHT-3M8R-P5V2', 'available'),
  ('hollow-knight', 'HLLW-SILK-7C4X-N9W6', 'available'),
  ('hollow-knight', 'HLLW-HALL-9T2K-B6Q8', 'available'),
  ('red-dead-redemption-2', 'RDR2-WEST-5R9K-M4P7', 'available'),
  ('red-dead-redemption-2', 'RDR2-GANG-8V2N-X6T3', 'available'),
  ('red-dead-redemption-2', 'RDR2-OUTL-4H7W-C9Q5', 'available');