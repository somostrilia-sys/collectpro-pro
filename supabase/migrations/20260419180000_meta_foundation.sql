-- Fundação Meta — fase 1 da implementação paralela Meta + UAZAPI.
-- ADD-ONLY: nada UAZAPI é alterado.

-- ═════════ 1. whatsapp_meta_details (1:1 com whatsapp_messages) ═════════

CREATE TABLE IF NOT EXISTS public.whatsapp_meta_details (
  message_id uuid PRIMARY KEY REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE,
  wamid text,
  conversation_id text,
  pricing_category text,          -- MARKETING / UTILITY / AUTHENTICATION
  pricing_model text DEFAULT 'PMP',
  pricing_type text,              -- regular / free_customer_service / free_entry_point
  pricing_billable boolean,
  conversation_origin_type text,
  context_wamid text,
  interactive_payload jsonb,
  button_payload jsonb,
  referral jsonb,
  errors jsonb,
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_meta_details_wamid ON public.whatsapp_meta_details (wamid);
CREATE INDEX IF NOT EXISTS idx_wa_meta_details_conversation ON public.whatsapp_meta_details (conversation_id);

ALTER TABLE public.whatsapp_meta_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wa_meta_details_select ON public.whatsapp_meta_details;
CREATE POLICY wa_meta_details_select ON public.whatsapp_meta_details
  FOR SELECT USING (
    public.is_admin_or_gestora()
    OR EXISTS (
      SELECT 1 FROM public.whatsapp_messages m
      WHERE m.id = whatsapp_meta_details.message_id
        AND m.instance_id IN (SELECT public.user_visible_instances())
    )
  );

DROP POLICY IF EXISTS wa_meta_details_mutate ON public.whatsapp_meta_details;
CREATE POLICY wa_meta_details_mutate ON public.whatsapp_meta_details
  FOR ALL USING (public.is_admin_or_gestora()) WITH CHECK (public.is_admin_or_gestora());

-- ═════════ 2. whatsapp_meta_conversations (CSW 24h) ═════════

CREATE TABLE IF NOT EXISTS public.whatsapp_meta_conversations (
  instance_id uuid NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  telefone text NOT NULL,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  csw_expires_at timestamptz,            -- last_inbound_at + 24h (atualizado por trigger)
  origin_type text,
  is_free_entry boolean DEFAULT false,
  free_entry_expires_at timestamptz,     -- 72h quando FEP
  atualizado_em timestamptz DEFAULT now(),
  PRIMARY KEY (instance_id, telefone)
);

CREATE INDEX IF NOT EXISTS idx_wa_meta_conv_csw ON public.whatsapp_meta_conversations (csw_expires_at);

ALTER TABLE public.whatsapp_meta_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wa_meta_conv_select ON public.whatsapp_meta_conversations;
CREATE POLICY wa_meta_conv_select ON public.whatsapp_meta_conversations
  FOR SELECT USING (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  );

DROP POLICY IF EXISTS wa_meta_conv_mutate ON public.whatsapp_meta_conversations;
CREATE POLICY wa_meta_conv_mutate ON public.whatsapp_meta_conversations
  FOR ALL USING (public.is_admin_or_gestora()) WITH CHECK (public.is_admin_or_gestora());

-- ═════════ 3. whatsapp_meta_media_cache (URL Meta expira 5min) ═════════

CREATE TABLE IF NOT EXISTS public.whatsapp_meta_media_cache (
  media_id text PRIMARY KEY,
  storage_path text,
  mime_type text,
  file_size bigint,
  sha256 text,
  source_wamid text,
  downloaded_at timestamptz DEFAULT now(),
  ttl_expires_at timestamptz     -- media_id API: 30d, webhook: 7d
);

CREATE INDEX IF NOT EXISTS idx_wa_meta_media_sha ON public.whatsapp_meta_media_cache (sha256);

ALTER TABLE public.whatsapp_meta_media_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wa_meta_media_select ON public.whatsapp_meta_media_cache;
CREATE POLICY wa_meta_media_select ON public.whatsapp_meta_media_cache
  FOR SELECT USING (public.is_admin_or_gestora() OR auth.uid() IS NOT NULL);

-- ═════════ 4. whatsapp_meta_templates (cache local) ═════════

CREATE TABLE IF NOT EXISTS public.whatsapp_meta_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  waba_id text NOT NULL,
  external_id text,
  name text NOT NULL,
  language text NOT NULL,
  category text NOT NULL,          -- MARKETING / UTILITY / AUTHENTICATION
  status text NOT NULL,            -- PENDING / APPROVED / REJECTED / PAUSED / DISABLED
  components jsonb NOT NULL,
  variables jsonb,
  quality_score text,              -- GREEN / YELLOW / RED
  rejection_reason text,
  last_synced_at timestamptz DEFAULT now(),
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now(),
  UNIQUE (waba_id, name, language)
);

CREATE INDEX IF NOT EXISTS idx_wa_meta_templates_waba ON public.whatsapp_meta_templates (waba_id);
CREATE INDEX IF NOT EXISTS idx_wa_meta_templates_status ON public.whatsapp_meta_templates (status);

ALTER TABLE public.whatsapp_meta_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wa_meta_templates_select ON public.whatsapp_meta_templates;
CREATE POLICY wa_meta_templates_select ON public.whatsapp_meta_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS wa_meta_templates_mutate ON public.whatsapp_meta_templates;
CREATE POLICY wa_meta_templates_mutate ON public.whatsapp_meta_templates
  FOR ALL USING (public.is_admin_or_gestora()) WITH CHECK (public.is_admin_or_gestora());

-- ═════════ 5. whatsapp_meta_phone_quality_log ═════════

CREATE TABLE IF NOT EXISTS public.whatsapp_meta_phone_quality_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  phone_number_id text,
  quality_rating text,             -- GREEN / YELLOW / RED
  messaging_limit text,            -- TIER_250 / 1K / 10K / 100K / UNLIMITED
  registered_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_meta_quality_instance ON public.whatsapp_meta_phone_quality_log (instance_id, registered_at DESC);

ALTER TABLE public.whatsapp_meta_phone_quality_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wa_meta_quality_select ON public.whatsapp_meta_phone_quality_log;
CREATE POLICY wa_meta_quality_select ON public.whatsapp_meta_phone_quality_log
  FOR SELECT USING (public.is_admin_or_gestora());

-- ═════════ 6. Estender whatsapp_chat_assignments pra Meta ═════════
-- NOTA: a tabela existente usa nomes em pt-BR (liberado_em, atribuido_em).
-- Mantemos a convenção ao estender.

ALTER TABLE public.whatsapp_chat_assignments
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS provider_tipo text DEFAULT 'uazapi',
  ADD COLUMN IF NOT EXISTS auto_release_minutes int DEFAULT 30,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS transfer_from uuid,
  ADD COLUMN IF NOT EXISTS transfer_reason text;

-- chat_jid atualmente é NOT NULL; pra Meta usaremos telefone.
-- Afrouxar NOT NULL (se ainda for) pra suportar Meta.
ALTER TABLE public.whatsapp_chat_assignments
  ALTER COLUMN chat_jid DROP NOT NULL;

-- Checks leves (sem quebrar dados existentes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'whatsapp_chat_assignments_provider_check'
  ) THEN
    ALTER TABLE public.whatsapp_chat_assignments
      ADD CONSTRAINT whatsapp_chat_assignments_provider_check
      CHECK (provider_tipo IN ('uazapi', 'meta'));
  END IF;

  -- Meta precisa de telefone; UAZAPI precisa de chat_jid
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'whatsapp_chat_assignments_target_check'
  ) THEN
    ALTER TABLE public.whatsapp_chat_assignments
      ADD CONSTRAINT whatsapp_chat_assignments_target_check
      CHECK (
        (provider_tipo = 'meta'   AND telefone IS NOT NULL)
        OR (provider_tipo = 'uazapi' AND chat_jid IS NOT NULL)
      );
  END IF;
END $$;

-- Backfill: assignments existentes são UAZAPI
UPDATE public.whatsapp_chat_assignments
  SET provider_tipo = 'uazapi'
  WHERE provider_tipo IS NULL;

-- Índice composto pra lookup rápido de assignments Meta por telefone
CREATE INDEX IF NOT EXISTS idx_wa_assignments_meta_lookup
  ON public.whatsapp_chat_assignments (instance_id, telefone, liberado_em)
  WHERE provider_tipo = 'meta';

-- ═════════ 7. Função de auto-release de assignments ociosos ═════════

CREATE OR REPLACE FUNCTION public.release_idle_meta_assignments()
RETURNS int AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.whatsapp_chat_assignments
    SET liberado_em = now(),
        status = 'released',
        transfer_reason = 'auto_release_idle'
    WHERE provider_tipo = 'meta'
      AND liberado_em IS NULL
      AND expires_at IS NOT NULL
      AND expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═════════ 8. Trigger: atualizar whatsapp_meta_conversations on msg insert ═════════

CREATE OR REPLACE FUNCTION public.update_meta_conversation_on_message()
RETURNS trigger AS $$
DECLARE
  v_csw_expires timestamptz;
BEGIN
  IF NEW.provider_tipo = 'meta' AND NEW.telefone IS NOT NULL AND NEW.telefone <> '' THEN
    v_csw_expires := CASE
      WHEN NEW.direction = 'in' THEN NEW.criado_em + INTERVAL '24 hours'
      ELSE NULL
    END;
    INSERT INTO public.whatsapp_meta_conversations (
      instance_id, telefone, last_inbound_at, last_outbound_at, csw_expires_at, atualizado_em
    )
    VALUES (
      NEW.instance_id,
      NEW.telefone,
      CASE WHEN NEW.direction = 'in'  THEN NEW.criado_em ELSE NULL END,
      CASE WHEN NEW.direction = 'out' THEN NEW.criado_em ELSE NULL END,
      v_csw_expires,
      now()
    )
    ON CONFLICT (instance_id, telefone) DO UPDATE
      SET last_inbound_at  = CASE WHEN NEW.direction = 'in'  THEN NEW.criado_em
                                  ELSE whatsapp_meta_conversations.last_inbound_at END,
          last_outbound_at = CASE WHEN NEW.direction = 'out' THEN NEW.criado_em
                                  ELSE whatsapp_meta_conversations.last_outbound_at END,
          csw_expires_at   = CASE WHEN NEW.direction = 'in'  THEN v_csw_expires
                                  ELSE whatsapp_meta_conversations.csw_expires_at END,
          atualizado_em = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_meta_conversation ON public.whatsapp_messages;
CREATE TRIGGER trg_update_meta_conversation
  AFTER INSERT ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_meta_conversation_on_message();
