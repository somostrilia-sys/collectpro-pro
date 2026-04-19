-- Sprint 10 — Automações UAZAPI (tabelas)
-- Aditiva.

-- ═════════ whatsapp_scheduled_messages ═════════
CREATE TABLE IF NOT EXISTS public.whatsapp_scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  chat_jid text,
  telefone text,
  associado_id uuid,
  colaborador_id uuid,
  tipo text NOT NULL DEFAULT 'text', -- text, media, template, etc
  payload jsonb NOT NULL, -- conteúdo completo (inclusive texto/mídia/etc)
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, processing, sent, failed, cancelled
  tentativas integer DEFAULT 0,
  automation_id uuid REFERENCES public.whatsapp_automations(id) ON DELETE SET NULL,
  message_id uuid REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL,
  erro text,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_scheduled_pending
  ON public.whatsapp_scheduled_messages (scheduled_for)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_wa_scheduled_instance
  ON public.whatsapp_scheduled_messages (instance_id, scheduled_for DESC);

ALTER TABLE public.whatsapp_scheduled_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wa_scheduled_select ON public.whatsapp_scheduled_messages;
CREATE POLICY wa_scheduled_select ON public.whatsapp_scheduled_messages
  FOR SELECT USING (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  );

DROP POLICY IF EXISTS wa_scheduled_write ON public.whatsapp_scheduled_messages;
CREATE POLICY wa_scheduled_write ON public.whatsapp_scheduled_messages
  FOR ALL USING (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  )
  WITH CHECK (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  );

-- Trigger pra atualizar atualizado_em
DROP TRIGGER IF EXISTS trg_set_atualizado_em ON public.whatsapp_scheduled_messages;
CREATE TRIGGER trg_set_atualizado_em
  BEFORE UPDATE ON public.whatsapp_scheduled_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
