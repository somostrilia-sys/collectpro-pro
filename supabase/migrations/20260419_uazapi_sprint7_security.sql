-- Sprint 7 — Segurança, compliance e observabilidade
-- Aditiva. Idempotente (IF NOT EXISTS).

-- ═════════ 1. AUDITORIA APPEND-ONLY ═════════

CREATE TABLE IF NOT EXISTS public.whatsapp_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
  colaborador_id uuid,
  colaborador_nome text,
  action_type text NOT NULL, -- send, edit, delete, react, group_add, group_remove, label_apply, etc
  entity_type text, -- message, chat, group, label, contact, instance
  entity_id text,
  chat_jid text,
  telefone text,
  associado_id uuid,
  message_external_id text,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_audit_instance ON public.whatsapp_audit_log (instance_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_wa_audit_colaborador ON public.whatsapp_audit_log (colaborador_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_wa_audit_action ON public.whatsapp_audit_log (action_type, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_wa_audit_associado ON public.whatsapp_audit_log (associado_id, criado_em DESC) WHERE associado_id IS NOT NULL;

-- RLS: só admin/gestora veem; ninguém edita/deleta (append-only)
ALTER TABLE public.whatsapp_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wa_audit_select ON public.whatsapp_audit_log;
CREATE POLICY wa_audit_select ON public.whatsapp_audit_log
  FOR SELECT USING (public.is_admin_or_gestora());

DROP POLICY IF EXISTS wa_audit_insert ON public.whatsapp_audit_log;
CREATE POLICY wa_audit_insert ON public.whatsapp_audit_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ═════════ 2. OPT-OUTS LGPD ═════════

CREATE TABLE IF NOT EXISTS public.whatsapp_optouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone text NOT NULL,
  instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  associado_id uuid,
  motivo text,
  palavra_detectada text, -- PARE, DESCADASTRAR, SAIR, etc
  optado_em timestamptz DEFAULT now(),
  revogado_em timestamptz,
  raw_message text,
  UNIQUE (instance_id, telefone)
);

CREATE INDEX IF NOT EXISTS idx_wa_optouts_telefone ON public.whatsapp_optouts (telefone);
CREATE INDEX IF NOT EXISTS idx_wa_optouts_instance ON public.whatsapp_optouts (instance_id);

ALTER TABLE public.whatsapp_optouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wa_optouts_select ON public.whatsapp_optouts;
CREATE POLICY wa_optouts_select ON public.whatsapp_optouts
  FOR SELECT USING (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  );

-- ═════════ 3. HORÁRIO PERMITIDO ═════════

CREATE TABLE IF NOT EXISTS public.whatsapp_opening_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  dia_semana integer NOT NULL, -- 0=domingo, 6=sábado
  hora_inicio time NOT NULL DEFAULT '08:00',
  hora_fim time NOT NULL DEFAULT '20:00',
  ativo boolean DEFAULT true,
  UNIQUE (instance_id, dia_semana)
);

ALTER TABLE public.whatsapp_opening_hours ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wa_hours_all ON public.whatsapp_opening_hours;
CREATE POLICY wa_hours_all ON public.whatsapp_opening_hours
  FOR ALL USING (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  )
  WITH CHECK (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  );

-- ═════════ 4. Função de OPT-OUT detectar em mensagem recebida ═════════

CREATE OR REPLACE FUNCTION public.detect_optout(
  p_instance_id uuid,
  p_telefone text,
  p_body text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  normalized text;
  keyword text;
BEGIN
  IF p_body IS NULL THEN RETURN false; END IF;
  normalized := upper(trim(p_body));

  -- Palavras-chave padrão (case-insensitive)
  FOR keyword IN SELECT unnest(ARRAY['PARE', 'PARAR', 'DESCADASTRAR', 'SAIR', 'CANCELAR', 'REMOVER', 'STOP', 'UNSUBSCRIBE'])
  LOOP
    IF normalized = keyword OR normalized LIKE keyword || ' %' OR normalized LIKE '% ' || keyword THEN
      INSERT INTO public.whatsapp_optouts (instance_id, telefone, palavra_detectada, raw_message)
      VALUES (p_instance_id, p_telefone, keyword, p_body)
      ON CONFLICT (instance_id, telefone) DO UPDATE
        SET revogado_em = NULL,
            optado_em = now(),
            palavra_detectada = EXCLUDED.palavra_detectada,
            raw_message = EXCLUDED.raw_message;
      RETURN true;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

-- ═════════ 5. Função LGPD: deletar dados de um associado ═════════

CREATE OR REPLACE FUNCTION public.delete_whatsapp_data_lgpd(
  p_associado_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_msgs_count integer;
  v_media_count integer;
  v_phones text[];
  v_telefone text;
BEGIN
  -- Auditar a operação ANTES de deletar
  INSERT INTO public.whatsapp_audit_log (
    action_type, entity_type, entity_id, associado_id, metadata
  ) VALUES (
    'lgpd_delete', 'associado', p_associado_id::text, p_associado_id,
    jsonb_build_object('triggered_by', auth.uid(), 'at', now())
  );

  -- Buscar telefones do associado (podem ter múltiplos)
  SELECT array_agg(DISTINCT telefone) INTO v_phones
  FROM public.whatsapp_messages
  WHERE associado_id = p_associado_id;

  -- Contar antes
  SELECT count(*) INTO v_msgs_count
  FROM public.whatsapp_messages WHERE associado_id = p_associado_id;

  SELECT count(*) INTO v_media_count
  FROM public.whatsapp_media m
  JOIN public.whatsapp_messages msg ON msg.id = m.message_id
  WHERE msg.associado_id = p_associado_id;

  -- Deletar cascata (FK cuida de uazapi_details, media, etc)
  DELETE FROM public.whatsapp_messages WHERE associado_id = p_associado_id;

  -- Limpar contatos/leads vinculados aos telefones
  IF v_phones IS NOT NULL THEN
    FOREACH v_telefone IN ARRAY v_phones LOOP
      DELETE FROM public.whatsapp_contacts WHERE telefone = v_telefone;
      DELETE FROM public.whatsapp_chat_leads
      WHERE chat_jid LIKE v_telefone || '@%';
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'messages_deleted', v_msgs_count,
    'media_deleted', v_media_count,
    'phones_cleaned', coalesce(array_length(v_phones, 1), 0)
  );
END;
$$;

-- ═════════ 6. VIEWS DE MÉTRICAS ═════════

-- View: KPIs por instância (últimos 30 dias)
CREATE OR REPLACE VIEW public.v_whatsapp_instance_metrics AS
SELECT
  i.id as instance_id,
  i.nome as instance_nome,
  i.tipo as instance_tipo,
  i.colaborador_id,
  i.telefone,
  i.status,
  -- Envios
  (SELECT count(*) FROM public.whatsapp_messages m
   WHERE m.instance_id = i.id AND m.direction = 'out'
     AND m.criado_em > now() - interval '30 days') as msgs_enviadas_30d,
  (SELECT count(*) FROM public.whatsapp_messages m
   WHERE m.instance_id = i.id AND m.direction = 'out'
     AND m.criado_em > now() - interval '1 day') as msgs_enviadas_24h,
  -- Recebidos
  (SELECT count(*) FROM public.whatsapp_messages m
   WHERE m.instance_id = i.id AND m.direction = 'in'
     AND m.criado_em > now() - interval '30 days') as msgs_recebidas_30d,
  (SELECT count(*) FROM public.whatsapp_messages m
   WHERE m.instance_id = i.id AND m.direction = 'in'
     AND m.criado_em > now() - interval '1 day') as msgs_recebidas_24h,
  -- Taxa de entrega
  (SELECT count(*)::float / NULLIF(count(*) FILTER (WHERE m.direction = 'out'), 0) * 100
   FROM public.whatsapp_messages m
   WHERE m.instance_id = i.id AND m.direction = 'out'
     AND m.status IN ('delivered', 'read')
     AND m.criado_em > now() - interval '7 days') as taxa_entrega_7d,
  -- Taxa de leitura
  (SELECT count(*)::float / NULLIF(count(*) FILTER (WHERE m.direction = 'out'), 0) * 100
   FROM public.whatsapp_messages m
   WHERE m.instance_id = i.id AND m.direction = 'out'
     AND m.status = 'read'
     AND m.criado_em > now() - interval '7 days') as taxa_leitura_7d,
  -- Erros
  (SELECT count(*) FROM public.whatsapp_messages m
   WHERE m.instance_id = i.id AND m.status = 'failed'
     AND m.criado_em > now() - interval '7 days') as erros_7d,
  -- Conversas ativas (últimos 7 dias)
  (SELECT count(DISTINCT telefone) FROM public.whatsapp_messages m
   WHERE m.instance_id = i.id
     AND m.criado_em > now() - interval '7 days') as conversas_ativas_7d
FROM public.whatsapp_instances i;

-- View: KPIs por atendente
CREATE OR REPLACE VIEW public.v_whatsapp_attendant_metrics AS
SELECT
  p.id as colaborador_id,
  p.full_name as colaborador_nome,
  p.role,
  count(DISTINCT m.id) FILTER (WHERE m.direction = 'out'
    AND m.criado_em > now() - interval '30 days') as msgs_enviadas_30d,
  count(DISTINCT m.id) FILTER (WHERE m.direction = 'out'
    AND m.criado_em > now() - interval '1 day') as msgs_enviadas_24h,
  count(DISTINCT m.telefone) FILTER (WHERE m.direction = 'out'
    AND m.criado_em > now() - interval '7 days') as conversas_7d,
  count(*) FILTER (WHERE m.direction = 'out'
    AND m.status = 'failed'
    AND m.criado_em > now() - interval '7 days') as falhas_7d,
  avg(extract(epoch from m.entregue_em - m.enviado_em)) FILTER (
    WHERE m.direction = 'out'
    AND m.enviado_em IS NOT NULL
    AND m.entregue_em IS NOT NULL
    AND m.criado_em > now() - interval '7 days'
  ) as tempo_medio_entrega_segundos
FROM public.profiles p
LEFT JOIN public.whatsapp_messages m ON m.colaborador_id = p.id
WHERE p.role != 'bloqueado'
GROUP BY p.id, p.full_name, p.role;

-- ═════════ 7. Trigger: detectar opt-out em mensagens recebidas ═════════

CREATE OR REPLACE FUNCTION public.whatsapp_messages_detect_optout()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.direction = 'in' AND NEW.body IS NOT NULL AND NEW.body != '' THEN
    PERFORM public.detect_optout(NEW.instance_id, NEW.telefone, NEW.body);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wa_msgs_optout ON public.whatsapp_messages;
CREATE TRIGGER trg_wa_msgs_optout
  AFTER INSERT ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.whatsapp_messages_detect_optout();
