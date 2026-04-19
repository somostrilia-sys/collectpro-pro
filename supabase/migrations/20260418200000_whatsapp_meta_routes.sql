-- ============================================
-- whatsapp_meta_routes — Rotas de proxy pra webhook Meta multi-sistema
--
-- Contexto: 1 App Meta (Trilia.1) tem N números (LuxSales, Objetivo, etc).
-- Webhook do App é único, aponta pro Hub. Hub precisa distinguir por
-- phone_number_id e reencaminhar eventos de números externos pros seus
-- webhooks originais (ex: LuxSales) enquanto processa os próprios.
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_meta_routes (
  phone_number_id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  system_tag TEXT NOT NULL,               -- 'luxsales', 'objetivo_externo', etc.
  forward_url TEXT NOT NULL,              -- URL pra onde reencaminhar o payload
  forward_headers JSONB DEFAULT '{}'::jsonb,
  verify_token TEXT,                      -- token pra validar GET Meta
  app_secret TEXT,                        -- opcional — valida HMAC antes do proxy
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_meta_routes_ativo ON whatsapp_meta_routes(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_wa_meta_routes_tag ON whatsapp_meta_routes(system_tag);

ALTER TABLE whatsapp_meta_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_routes_select_auth" ON whatsapp_meta_routes;
CREATE POLICY "wa_routes_select_auth" ON whatsapp_meta_routes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "wa_routes_all_admin" ON whatsapp_meta_routes;
CREATE POLICY "wa_routes_all_admin" ON whatsapp_meta_routes
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','gestora'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','gestora'))
  );

DROP TRIGGER IF EXISTS tg_wa_routes_atualizado ON whatsapp_meta_routes;
CREATE TRIGGER tg_wa_routes_atualizado BEFORE UPDATE ON whatsapp_meta_routes
  FOR EACH ROW EXECUTE FUNCTION tg_whatsapp_atualizado_em();

-- ─── Seed: rota pra LuxSales (restaurar webhook quebrado) ────────────
INSERT INTO whatsapp_meta_routes (phone_number_id, nome, system_tag, forward_url, verify_token)
VALUES (
  '1033452629855082',
  'LuxSales (+5511980999151)',
  'luxsales',
  'https://ecaduzwautlpzpvjognr.supabase.co/functions/v1/whatsapp-meta-webhook',
  NULL  -- preencher se LuxSales exigir verify token específico
)
ON CONFLICT (phone_number_id) DO UPDATE SET
  forward_url = EXCLUDED.forward_url,
  nome = EXCLUDED.nome,
  ativo = true,
  atualizado_em = now();
