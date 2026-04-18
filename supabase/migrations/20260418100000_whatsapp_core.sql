-- ============================================
-- WhatsApp Core — Instâncias, Templates, Mensagens, Webhooks
-- Servidor único uazapi (trilhoassist) com múltiplas instâncias
-- (central, colaboradores) + estrutura pronta para Meta Cloud API
-- ============================================

-- ─── whatsapp_instances ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('central', 'colaborador', 'meta_oficial')),
  servidor_url TEXT,              -- uazapi: 'https://trilhoassist.uazapi.com'
  instance_name TEXT,             -- identificador na uazapi (ex: 'collectpro-central')
  token TEXT,                     -- uazapi instance token OU meta access_token
  telefone TEXT,
  colaborador_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  meta_config JSONB,              -- {waba_id, phone_number_id, app_secret, verify_token}
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('connected','disconnected','qr_pending','banned','error')),
  qr_code TEXT,
  qr_expires_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  is_default_central BOOLEAN DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_tipo ON whatsapp_instances(tipo);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_colaborador ON whatsapp_instances(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_status ON whatsapp_instances(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_instances_default_central
  ON whatsapp_instances(is_default_central)
  WHERE is_default_central = true;

-- ─── whatsapp_templates ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  categoria TEXT NOT NULL DEFAULT 'cobranca'
    CHECK (categoria IN ('cobranca','lembrete','acordo','negativacao','boas_vindas','manual','outro')),
  provider_tipo TEXT NOT NULL DEFAULT 'uazapi'
    CHECK (provider_tipo IN ('uazapi','meta','both')),
  conteudo_texto TEXT,            -- uazapi: texto livre com {{vars}}
  meta_template_name TEXT,        -- meta: nome do template aprovado
  meta_language TEXT DEFAULT 'pt_BR',
  componentes JSONB,              -- meta: estrutura de components
  variaveis TEXT[] DEFAULT '{}',  -- ['nome','valor','vencimento']
  aprovado_meta BOOLEAN DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_categoria ON whatsapp_templates(categoria);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_ativo ON whatsapp_templates(ativo);

-- ─── whatsapp_messages ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','sent','delivered','read','failed','received')),
  telefone TEXT NOT NULL,
  associado_id UUID,
  boleto_id UUID,
  template_id UUID REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
  colaborador_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL DEFAULT 'text'
    CHECK (tipo IN ('text','template','image','audio','video','document','location','sticker','reaction')),
  body TEXT,
  media_url TEXT,
  media_mime TEXT,
  external_id TEXT,               -- wamid (meta) ou id uazapi
  reply_to_external_id TEXT,
  error TEXT,
  raw JSONB,
  enviado_em TIMESTAMPTZ,
  entregue_em TIMESTAMPTZ,
  lido_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_instance ON whatsapp_messages(instance_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_telefone ON whatsapp_messages(telefone, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_associado ON whatsapp_messages(associado_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_external ON whatsapp_messages(external_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);

-- ─── whatsapp_webhooks_raw (log bruto) ───────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_webhooks_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_tipo TEXT NOT NULL CHECK (provider_tipo IN ('uazapi','meta')),
  event_type TEXT,
  payload JSONB NOT NULL,
  processado BOOLEAN DEFAULT false,
  erro TEXT,
  recebido_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhooks_pending
  ON whatsapp_webhooks_raw(processado, recebido_em) WHERE processado = false;

-- ─── View: conversas agregadas ───────────────────────────────────────
CREATE OR REPLACE VIEW whatsapp_conversations AS
SELECT
  m.instance_id,
  m.telefone,
  (array_agg(m.associado_id ORDER BY m.criado_em DESC) FILTER (WHERE m.associado_id IS NOT NULL))[1] AS associado_id,
  COUNT(*) AS total_mensagens,
  COUNT(*) FILTER (WHERE m.direction = 'in' AND m.status != 'read') AS nao_lidas,
  MAX(m.criado_em) AS ultima_mensagem_em,
  (array_agg(m.body ORDER BY m.criado_em DESC))[1] AS ultima_mensagem,
  (array_agg(m.direction ORDER BY m.criado_em DESC))[1] AS ultima_direction
FROM whatsapp_messages m
GROUP BY m.instance_id, m.telefone;

-- ─── RLS ─────────────────────────────────────────────────────────────
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_webhooks_raw ENABLE ROW LEVEL SECURITY;

-- instâncias: authenticated pode ver; só admin/gestora altera
DROP POLICY IF EXISTS "wa_inst_select" ON whatsapp_instances;
CREATE POLICY "wa_inst_select" ON whatsapp_instances
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "wa_inst_all_admin" ON whatsapp_instances;
CREATE POLICY "wa_inst_all_admin" ON whatsapp_instances
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','gestora'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','gestora'))
  );

-- templates: authenticated vê; admin/gestora altera
DROP POLICY IF EXISTS "wa_tpl_select" ON whatsapp_templates;
CREATE POLICY "wa_tpl_select" ON whatsapp_templates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "wa_tpl_all_admin" ON whatsapp_templates;
CREATE POLICY "wa_tpl_all_admin" ON whatsapp_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','gestora'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','gestora'))
  );

-- mensagens: authenticated vê (service role usa p/ escrever via edge)
DROP POLICY IF EXISTS "wa_msg_select" ON whatsapp_messages;
CREATE POLICY "wa_msg_select" ON whatsapp_messages
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "wa_msg_insert_auth" ON whatsapp_messages;
CREATE POLICY "wa_msg_insert_auth" ON whatsapp_messages
  FOR INSERT TO authenticated WITH CHECK (true);

-- webhooks raw: só service role (sem policy, RLS bloqueia tudo)

-- ─── Trigger atualizado_em ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION tg_whatsapp_atualizado_em()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS tg_wa_inst_atualizado ON whatsapp_instances;
CREATE TRIGGER tg_wa_inst_atualizado BEFORE UPDATE ON whatsapp_instances
  FOR EACH ROW EXECUTE FUNCTION tg_whatsapp_atualizado_em();

DROP TRIGGER IF EXISTS tg_wa_tpl_atualizado ON whatsapp_templates;
CREATE TRIGGER tg_wa_tpl_atualizado BEFORE UPDATE ON whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION tg_whatsapp_atualizado_em();

-- ─── Realtime ────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_instances;

-- ─── Seeds ───────────────────────────────────────────────────────────
-- Instância central placeholder (usuário conecta via UI)
INSERT INTO whatsapp_instances (nome, tipo, servidor_url, instance_name, is_default_central, status)
VALUES ('CollectPro Central', 'central', 'https://trilhoassist.uazapi.com', 'collectpro-central', true, 'disconnected')
ON CONFLICT DO NOTHING;

-- Instância Meta Oficial placeholder (estrutura pronta, não ativa)
INSERT INTO whatsapp_instances (nome, tipo, status, meta_config)
VALUES (
  'Meta Oficial (Walk Holding)',
  'meta_oficial',
  'disconnected',
  jsonb_build_object(
    'waba_id', '',
    'phone_number_id', '',
    'app_secret', '',
    'verify_token', ''
  )
)
ON CONFLICT DO NOTHING;

-- Templates padrão de cobrança
INSERT INTO whatsapp_templates (nome, categoria, provider_tipo, conteudo_texto, variaveis) VALUES
  ('cobranca_lembrete',  'lembrete',   'both',   'Olá {{nome}}! Lembramos que seu boleto de R$ {{valor}} vence em {{vencimento}}. Pague pelo app ou responda aqui que te ajudamos.', ARRAY['nome','valor','vencimento']),
  ('cobranca_atraso',    'cobranca',   'uazapi', 'Oi {{nome}}, identificamos pendência no seu plano (R$ {{valor}} venceu em {{vencimento}}). Podemos negociar? Responde aqui.', ARRAY['nome','valor','vencimento']),
  ('acordo_proposta',    'acordo',     'uazapi', '{{nome}}, montamos uma condição especial: {{parcelas}}x de R$ {{valor_parcela}}. Topa fechar? Responde SIM que mando o primeiro boleto.', ARRAY['nome','parcelas','valor_parcela']),
  ('pre_negativacao',    'negativacao','uazapi', '{{nome}}, seu nome está prestes a ser incluído em SPC/Serasa por R$ {{valor}} em aberto. Ainda dá pra resolver — responde aqui urgente.', ARRAY['nome','valor'])
ON CONFLICT (nome) DO NOTHING;
