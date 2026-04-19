-- ============================================
-- Trigger: inbound message → cria/reativa atendimento automaticamente
-- + fallback de setor baseado em whatsapp_automacoes (keywords)
-- + coluna fallback_ai + ai_context em whatsapp_atendimentos
-- ============================================

-- Extensões opcionais de contexto IA
ALTER TABLE whatsapp_atendimentos
  ADD COLUMN IF NOT EXISTS ai_context JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_last_run TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_runs_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fallback_motivo TEXT,
  ADD COLUMN IF NOT EXISTS intencao TEXT,
  ADD COLUMN IF NOT EXISTS urgencia TEXT CHECK (urgencia IN ('baixa','media','alta','critica'));

-- Helper: gerar protocolo único (timestamp YYMMDDHHMMSS + 3 chars rand)
CREATE OR REPLACE FUNCTION gen_whatsapp_protocolo() RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE p TEXT;
BEGIN
  p := to_char(now(), 'YYMMDDHH24MISS') || upper(substr(md5(random()::text), 1, 3));
  RETURN p;
END; $$;

-- Função do trigger
CREATE OR REPLACE FUNCTION tg_whatsapp_auto_atendimento() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_atend_id UUID;
  v_existing UUID;
  v_setor_default TEXT := 'geral';
  v_setor_match TEXT;
  v_instance_setor TEXT;
BEGIN
  -- Só processa inbound (cliente → nós)
  IF NEW.direction <> 'in' THEN
    RETURN NEW;
  END IF;

  -- Instance tipo (meta_oficial usa setor, uazapi centraliza)
  IF NEW.instance_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Verifica se já tem atendimento ativo pra (instance, telefone)
  SELECT id INTO v_existing
  FROM whatsapp_atendimentos
  WHERE instance_id = NEW.instance_id
    AND telefone = NEW.telefone
    AND status IN ('aberto','em_ia','em_humano','aguardando_cliente')
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    -- Atualiza última msg + status aguardando_cliente → aberto
    UPDATE whatsapp_atendimentos
    SET ultima_msg_em = now(),
        status = CASE WHEN status = 'aguardando_cliente' THEN 'aberto' ELSE status END
    WHERE id = v_existing;

    -- Sync setor na mensagem
    UPDATE whatsapp_messages SET setor = (
      SELECT setor FROM whatsapp_atendimentos WHERE id = v_existing
    ) WHERE id = NEW.id;

    RETURN NEW;
  END IF;

  -- NOVO atendimento. Determina setor:
  -- 1) Matcha keywords de whatsapp_automacoes (mais específico)
  IF NEW.body IS NOT NULL THEN
    SELECT setor INTO v_setor_match
    FROM whatsapp_automacoes
    WHERE ativo = true
      AND setor IS NOT NULL
      AND setor <> 'geral'
      AND EXISTS (
        SELECT 1 FROM unnest(keywords) kw
        WHERE lower(NEW.body) LIKE '%' || lower(kw) || '%'
      )
    ORDER BY prioridade DESC
    LIMIT 1;
  END IF;

  -- 2) Fallback: geral
  v_setor_default := COALESCE(v_setor_match, 'geral');

  -- Cria atendimento
  INSERT INTO whatsapp_atendimentos (
    instance_id, telefone, setor, status,
    associado_id, protocolo, primeira_msg_em, ultima_msg_em,
    intencao
  ) VALUES (
    NEW.instance_id, NEW.telefone, v_setor_default, 'aberto',
    NEW.associado_id, gen_whatsapp_protocolo(), now(), now(),
    v_setor_match
  ) RETURNING id INTO v_atend_id;

  -- Marca setor na mensagem original
  UPDATE whatsapp_messages SET setor = v_setor_default WHERE id = NEW.id;

  -- Notifica Camada 1 (Auto) via pg_notify pra edge processar async
  PERFORM pg_notify('whatsapp_new_atendimento', json_build_object(
    'atendimento_id', v_atend_id,
    'instance_id', NEW.instance_id,
    'telefone', NEW.telefone,
    'body', NEW.body,
    'setor', v_setor_default,
    'message_id', NEW.id
  )::text);

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS tg_wa_auto_atendimento ON whatsapp_messages;
CREATE TRIGGER tg_wa_auto_atendimento
  AFTER INSERT ON whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION tg_whatsapp_auto_atendimento();

-- Config de IA por setor (feature-flag + prompt sistema)
CREATE TABLE IF NOT EXISTS whatsapp_ia_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setor TEXT UNIQUE REFERENCES whatsapp_setores(slug) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT false,
  modelo TEXT DEFAULT 'claude-haiku-4-5-20251001',
  system_prompt TEXT NOT NULL,
  max_tokens INTEGER DEFAULT 600,
  temperature NUMERIC DEFAULT 0.4,
  fallback_humano_threshold NUMERIC DEFAULT 0.6,  -- confiança <X → humano
  auto_responder BOOLEAN DEFAULT true,             -- responder direto?
  contexto_msgs INTEGER DEFAULT 6,                 -- qtas mensagens pra contexto
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

INSERT INTO whatsapp_ia_config (setor, ativo, system_prompt) VALUES
  ('cobranca', false, 'Você é atendente da Objetivo Auto Benefícios no setor de cobrança. Ajude com boletos, segundas vias, negociações de acordos. Seja cordial e direto. Se não conseguir resolver em 2 mensagens, escale pra humano. Nunca admita ser IA — diga que é atendente da Objetivo.'),
  ('evento',   false, 'Você é atendente da Objetivo Auto no setor de eventos/sinistros. Colete dados do sinistro (quando, onde, como, veículo envolvido). Seja empático com clientes estressados. Escale pra regulador humano em 2 mensagens. Nunca admita ser IA.'),
  ('track',    false, 'Você é atendente da Objetivo Auto no setor de rastreamento. Ajude com questões de GPS, chip, sinal do rastreador, instalação. Se for urgência de roubo, escale imediatamente. Nunca admita ser IA.'),
  ('gestao',   false, 'Você é atendente da Objetivo Auto no setor de atendimento geral. Ajude com cadastro, documentação, aplicativo, canais de atendimento. Nunca admita ser IA.'),
  ('geral',    false, 'Você é atendente da Objetivo Auto. Classifique a intenção do cliente e se não for claro, pergunte. Nunca admita ser IA.')
ON CONFLICT (setor) DO NOTHING;

ALTER TABLE whatsapp_ia_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ia_config_read" ON whatsapp_ia_config;
CREATE POLICY "ia_config_read" ON whatsapp_ia_config FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ia_config_admin" ON whatsapp_ia_config;
CREATE POLICY "ia_config_admin" ON whatsapp_ia_config FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','gestora')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','gestora')));
