-- UAZAPI Audit Fixes — corrige gaps de schema identificados na auditoria
-- Idempotente: usa IF NOT EXISTS e ON CONFLICT. Seguro pra Meta (nada Meta-específico muda).

-- ═════════ 1. atualizado_em faltantes ═════════

ALTER TABLE public.whatsapp_media
  ADD COLUMN IF NOT EXISTS atualizado_em timestamptz DEFAULT now();

ALTER TABLE public.whatsapp_call_log
  ADD COLUMN IF NOT EXISTS atualizado_em timestamptz DEFAULT now();

ALTER TABLE public.whatsapp_chat_labels
  ADD COLUMN IF NOT EXISTS atualizado_em timestamptz DEFAULT now();

ALTER TABLE public.whatsapp_blocks
  ADD COLUMN IF NOT EXISTS criado_em timestamptz DEFAULT now();
ALTER TABLE public.whatsapp_blocks
  ADD COLUMN IF NOT EXISTS atualizado_em timestamptz DEFAULT now();

-- Triggers set_atualizado_em (assume que a função já existe em sprint1)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_atualizado_em') THEN
    DROP TRIGGER IF EXISTS trg_wa_media_atualizado ON public.whatsapp_media;
    CREATE TRIGGER trg_wa_media_atualizado
      BEFORE UPDATE ON public.whatsapp_media
      FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

    DROP TRIGGER IF EXISTS trg_wa_call_log_atualizado ON public.whatsapp_call_log;
    CREATE TRIGGER trg_wa_call_log_atualizado
      BEFORE UPDATE ON public.whatsapp_call_log
      FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

    DROP TRIGGER IF EXISTS trg_wa_chat_labels_atualizado ON public.whatsapp_chat_labels;
    CREATE TRIGGER trg_wa_chat_labels_atualizado
      BEFORE UPDATE ON public.whatsapp_chat_labels
      FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

    DROP TRIGGER IF EXISTS trg_wa_blocks_atualizado ON public.whatsapp_blocks;
    CREATE TRIGGER trg_wa_blocks_atualizado
      BEFORE UPDATE ON public.whatsapp_blocks
      FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
  END IF;
END $$;

-- ═════════ 2. RLS em whatsapp_blocks ═════════

ALTER TABLE public.whatsapp_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wa_blocks_select ON public.whatsapp_blocks;
CREATE POLICY wa_blocks_select ON public.whatsapp_blocks
  FOR SELECT USING (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  );

DROP POLICY IF EXISTS wa_blocks_mutate ON public.whatsapp_blocks;
CREATE POLICY wa_blocks_mutate ON public.whatsapp_blocks
  FOR ALL USING (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  ) WITH CHECK (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  );

-- ═════════ 3. FK em whatsapp_chat_leads.lead_assigned_attendant_id ═════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_chat_leads'
      AND constraint_name = 'whatsapp_chat_leads_lead_assigned_attendant_fkey'
  ) THEN
    ALTER TABLE public.whatsapp_chat_leads
      ADD CONSTRAINT whatsapp_chat_leads_lead_assigned_attendant_fkey
      FOREIGN KEY (lead_assigned_attendant_id)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ═════════ 4. CHECK constraint em whatsapp_messages.provider_tipo ═════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'whatsapp_messages_provider_tipo_check'
  ) THEN
    ALTER TABLE public.whatsapp_messages
      ADD CONSTRAINT whatsapp_messages_provider_tipo_check
      CHECK (provider_tipo IN ('uazapi', 'meta'));
  END IF;
END $$;

-- ═════════ 5. Unique composto em whatsapp_call_log ═════════
-- Antes: external_id UNIQUE global → risco de colisão entre instâncias.
-- Substitui por (instance_id, external_id).

DO $$
DECLARE
  uq_name text;
BEGIN
  SELECT conname INTO uq_name
  FROM pg_constraint
  WHERE conrelid = 'public.whatsapp_call_log'::regclass
    AND contype = 'u'
    AND array_length(conkey, 1) = 1
    AND conkey[1] = (
      SELECT attnum FROM pg_attribute
      WHERE attrelid = 'public.whatsapp_call_log'::regclass AND attname = 'external_id'
    );
  IF uq_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.whatsapp_call_log DROP CONSTRAINT ' || quote_ident(uq_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.whatsapp_call_log'::regclass
      AND conname = 'whatsapp_call_log_instance_external_uq'
  ) THEN
    ALTER TABLE public.whatsapp_call_log
      ADD CONSTRAINT whatsapp_call_log_instance_external_uq
      UNIQUE (instance_id, external_id);
  END IF;
END $$;

-- ═════════ 6. Colunas last_presence em whatsapp_contacts ═════════
-- Usadas pelo webhook handlePresence (implementado nesta mesma auditoria).

ALTER TABLE public.whatsapp_contacts
  ADD COLUMN IF NOT EXISTS last_presence text;
ALTER TABLE public.whatsapp_contacts
  ADD COLUMN IF NOT EXISTS last_presence_at timestamptz;

-- ═════════ 7. INSERT policy explícita em whatsapp_webhooks_raw ═════════
-- Service role bypassa RLS, mas documentar explicitamente evita confusão
-- e permite eventuais inserts via edge function com JWT do usuário.

DROP POLICY IF EXISTS wa_webhooks_raw_insert ON public.whatsapp_webhooks_raw;
CREATE POLICY wa_webhooks_raw_insert ON public.whatsapp_webhooks_raw
  FOR INSERT WITH CHECK (true);
