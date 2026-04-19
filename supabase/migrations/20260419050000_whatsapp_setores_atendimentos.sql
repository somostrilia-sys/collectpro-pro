-- ============================================
-- WhatsApp Setores + Atendimentos + Handoffs
-- Camada de roteamento/fila/handoff pro Hub Central
-- ============================================

-- ─── whatsapp_setores ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_setores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,                      -- 'cobranca','evento','track','gestao','geral'
  nome TEXT NOT NULL,
  sistema_tag TEXT,                                -- 'collectpro','crmeventos','trackit','gia'
  cor TEXT DEFAULT '#6366f1',
  icone TEXT,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO whatsapp_setores (slug, nome, sistema_tag, cor, ordem) VALUES
  ('cobranca', 'Cobrança',            'collectpro', '#dc2626', 1),
  ('evento',   'Eventos/Sinistros',   'crmeventos', '#f59e0b', 2),
  ('track',    'Rastreamento',        'trackit',    '#10b981', 3),
  ('gestao',   'Gestão/Atendimento',  'gia',        '#3b82f6', 4),
  ('geral',    'Caixa Geral',         null,         '#6b7280', 9)
ON CONFLICT (slug) DO NOTHING;

-- ─── whatsapp_messages: adicionar coluna setor ────────────────────────
ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS setor TEXT REFERENCES whatsapp_setores(slug) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_setor
  ON whatsapp_messages(setor, criado_em DESC);

-- ─── whatsapp_atendimentos (sessão de atendimento por conversa) ─────
CREATE TABLE IF NOT EXISTS whatsapp_atendimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  telefone TEXT NOT NULL,
  setor TEXT REFERENCES whatsapp_setores(slug) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto','em_ia','em_humano','aguardando_cliente','resolvido','transferido','arquivado')),
  atendente_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  atendente_nome TEXT,
  sistema_origem TEXT,                   -- qual sistema assumiu ('crmeventos' etc)
  associado_id UUID,
  associado_nome TEXT,
  protocolo TEXT UNIQUE,                 -- gerado automático pra rastreio
  primeira_msg_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultima_msg_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  assumido_em TIMESTAMPTZ,
  resolvido_em TIMESTAMPTZ,
  sla_primeiro_resp_seg INTEGER,
  sla_resolucao_seg INTEGER,
  sentimento TEXT,                       -- 'positivo','neutro','irritado'
  tags TEXT[] DEFAULT '{}',
  notas TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atendimentos_status ON whatsapp_atendimentos(status, ultima_msg_em DESC);
CREATE INDEX IF NOT EXISTS idx_atendimentos_setor ON whatsapp_atendimentos(setor, status, ultima_msg_em DESC);
CREATE INDEX IF NOT EXISTS idx_atendimentos_atendente ON whatsapp_atendimentos(atendente_id, status);
CREATE INDEX IF NOT EXISTS idx_atendimentos_telefone ON whatsapp_atendimentos(telefone, ultima_msg_em DESC);

-- Um atendimento ativo por (instance, telefone) simultâneo
CREATE UNIQUE INDEX IF NOT EXISTS uq_atendimento_ativo
  ON whatsapp_atendimentos(instance_id, telefone)
  WHERE status IN ('aberto','em_ia','em_humano','aguardando_cliente');

-- ─── whatsapp_handoffs (log de transferências) ──────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atendimento_id UUID REFERENCES whatsapp_atendimentos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('auto_to_ia','ia_to_humano','humano_to_humano','setor_to_setor','ia_to_ia')),
  de_atendente UUID REFERENCES profiles(id) ON DELETE SET NULL,
  para_atendente UUID REFERENCES profiles(id) ON DELETE SET NULL,
  de_setor TEXT,
  para_setor TEXT,
  motivo TEXT,
  contexto JSONB,                        -- snapshot de sentimento, intenção, etc
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_handoffs_atendimento ON whatsapp_handoffs(atendimento_id, criado_em DESC);

-- ─── whatsapp_system_keys (API keys por sistema cliente) ─────────────
CREATE TABLE IF NOT EXISTS whatsapp_system_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema TEXT NOT NULL,                 -- 'crmeventos','trackit','gia','collectpro'
  descricao TEXT,
  key_value TEXT UNIQUE NOT NULL DEFAULT 'wahub_' || encode(gen_random_bytes(24), 'hex'),
  setores_permitidos TEXT[] DEFAULT '{}',-- quais setores essa key pode ler
  pode_enviar BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  ultimo_uso TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO whatsapp_system_keys (sistema, descricao, setores_permitidos, pode_enviar) VALUES
  ('collectpro', 'CollectPro consumindo Hub (mesma db)', ARRAY['cobranca','geral'], true),
  ('gia',        'GIA Gestão consumindo Hub',            ARRAY['gestao','geral'],    true),
  ('trackit',    'Trackit consumindo Hub',               ARRAY['track','geral'],     true),
  ('crmeventos', 'CRM Eventos consumindo Hub',           ARRAY['evento','geral'],    true)
ON CONFLICT DO NOTHING;

-- ─── whatsapp_automacoes (regras Camada 1 Auto) ─────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_automacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  setor TEXT REFERENCES whatsapp_setores(slug),
  keywords TEXT[] NOT NULL,              -- palavras-chave que disparam
  tipo TEXT NOT NULL CHECK (tipo IN ('resposta_texto','template','transferir_setor','acionar_ia','encerrar')),
  resposta_texto TEXT,
  template_id UUID REFERENCES whatsapp_templates(id),
  setor_destino TEXT,
  prioridade INTEGER DEFAULT 10,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed automações iniciais (Suzana-like)
INSERT INTO whatsapp_automacoes (nome, setor, keywords, tipo, resposta_texto, prioridade) VALUES
  ('Cumprimento inicial', 'geral', ARRAY['oi','olá','ola','bom dia','boa tarde','boa noite'],
   'resposta_texto', 'Olá! Somos da Objetivo. Em que posso ajudar? Você pode dizer: *boleto*, *app*, *rastreador*, *sinistro* ou *falar com atendente*.', 100),
  ('Boleto/pagamento', 'cobranca', ARRAY['boleto','2ª via','pagamento','pix','vencimento','cobrança'],
   'transferir_setor', null, 50),
  ('App do associado', 'geral', ARRAY['app','aplicativo','android','iphone','ios'],
   'resposta_texto', 'Baixe o app do associado: https://apps.apple.com/ (iOS) ou https://play.google.com/ (Android).', 50),
  ('Rastreador', 'track', ARRAY['rastreador','gps','chip','localizar','localização'],
   'transferir_setor', null, 50),
  ('Sinistro', 'evento', ARRAY['bati','acidente','sinistro','colisão','bateu','roubaram','furto'],
   'transferir_setor', null, 50),
  ('Falar com humano', 'geral', ARRAY['atendente','humano','pessoa','falar com alguém'],
   'acionar_ia', null, 30)
ON CONFLICT DO NOTHING;

-- ─── RLS ─────────────────────────────────────────────────────────────
ALTER TABLE whatsapp_setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_system_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_automacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_setores_read" ON whatsapp_setores;
CREATE POLICY "wa_setores_read" ON whatsapp_setores FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "wa_atend_read" ON whatsapp_atendimentos;
CREATE POLICY "wa_atend_read" ON whatsapp_atendimentos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "wa_atend_write" ON whatsapp_atendimentos;
CREATE POLICY "wa_atend_write" ON whatsapp_atendimentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "wa_handoff_read" ON whatsapp_handoffs;
CREATE POLICY "wa_handoff_read" ON whatsapp_handoffs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "wa_handoff_write" ON whatsapp_handoffs;
CREATE POLICY "wa_handoff_write" ON whatsapp_handoffs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "wa_auto_read" ON whatsapp_automacoes;
CREATE POLICY "wa_auto_read" ON whatsapp_automacoes FOR SELECT TO authenticated USING (true);

-- system_keys: só admin
DROP POLICY IF EXISTS "wa_keys_admin" ON whatsapp_system_keys;
CREATE POLICY "wa_keys_admin" ON whatsapp_system_keys FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','gestora')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','gestora')));

-- ─── Triggers ────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS tg_atendimentos_updated ON whatsapp_atendimentos;
CREATE TRIGGER tg_atendimentos_updated BEFORE UPDATE ON whatsapp_atendimentos
  FOR EACH ROW EXECUTE FUNCTION tg_whatsapp_atualizado_em();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_atendimentos;
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_handoffs;

-- ─── View: fila por setor com dados agregados ───────────────────────
CREATE OR REPLACE VIEW whatsapp_filas_setor AS
SELECT
  s.slug AS setor,
  s.nome AS setor_nome,
  s.cor,
  COUNT(*) FILTER (WHERE a.status = 'aberto') AS fila_nova,
  COUNT(*) FILTER (WHERE a.status = 'em_ia') AS em_ia,
  COUNT(*) FILTER (WHERE a.status = 'em_humano') AS em_humano,
  COUNT(*) FILTER (WHERE a.status = 'aguardando_cliente') AS aguardando_cliente,
  COUNT(*) FILTER (WHERE a.status = 'resolvido' AND a.resolvido_em > now() - interval '24 hours') AS resolvidas_24h
FROM whatsapp_setores s
LEFT JOIN whatsapp_atendimentos a ON a.setor = s.slug
WHERE s.ativo = true
GROUP BY s.slug, s.nome, s.cor, s.ordem
ORDER BY s.ordem;
