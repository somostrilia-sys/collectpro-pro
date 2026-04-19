-- ═══════════════════════════════════════════════════════════════════════════
-- Sprint 1 — Infraestrutura base UAZAPI completa
-- Data: 2026-04-19
-- Aditiva: nunca remove/renomeia. Idempotente (IF NOT EXISTS).
-- Não toca em nada de Meta.
-- ═══════════════════════════════════════════════════════════════════════════

-- ═════════ 1. AJUSTES em whatsapp_messages ═════════

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS provider_tipo text DEFAULT 'uazapi',
  ADD COLUMN IF NOT EXISTS colaborador_nome_snap text,
  ADD COLUMN IF NOT EXISTS message_external_id text,
  ADD COLUMN IF NOT EXISTS message_timestamp_ms bigint;

-- Migrar dados existentes: copiar external_id pra message_external_id
UPDATE public.whatsapp_messages
SET message_external_id = external_id
WHERE message_external_id IS NULL AND external_id IS NOT NULL;

-- Constraint de idempotência (parcial: só registra quando external_id existe)
CREATE UNIQUE INDEX IF NOT EXISTS uq_wa_messages_instance_external
  ON public.whatsapp_messages (instance_id, message_external_id)
  WHERE message_external_id IS NOT NULL;

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_wa_messages_instance_telefone_criado
  ON public.whatsapp_messages (instance_id, telefone, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_wa_messages_instance_criado
  ON public.whatsapp_messages (instance_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_wa_messages_associado_criado
  ON public.whatsapp_messages (associado_id, criado_em DESC)
  WHERE associado_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wa_messages_colaborador_criado
  ON public.whatsapp_messages (colaborador_id, criado_em DESC)
  WHERE colaborador_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wa_messages_provider
  ON public.whatsapp_messages (provider_tipo);

-- ═════════ 2. whatsapp_uazapi_details (extensão 1:1) ═════════

CREATE TABLE IF NOT EXISTS public.whatsapp_uazapi_details (
  message_id uuid PRIMARY KEY REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE,
  is_group boolean NOT NULL DEFAULT false,
  chat_jid text NOT NULL,
  chat_lid text,
  sender_jid text,
  sender_lid text,
  sender_name text,
  sender_avatar_url text,
  quoted_external_id text,
  quoted_body text,
  quoted_sender_jid text,
  file_url text,
  file_mime text,
  file_size bigint,
  message_type text,
  reactions jsonb DEFAULT '[]'::jsonb,
  edited_at timestamptz,
  deleted_at timestamptz,
  forwarded boolean DEFAULT false,
  from_me boolean DEFAULT false,
  was_sent_by_api boolean DEFAULT false,
  raw jsonb
);

CREATE INDEX IF NOT EXISTS idx_wa_uazapi_chat_jid
  ON public.whatsapp_uazapi_details (chat_jid);
CREATE INDEX IF NOT EXISTS idx_wa_uazapi_sender_jid
  ON public.whatsapp_uazapi_details (sender_jid) WHERE sender_jid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wa_uazapi_is_group
  ON public.whatsapp_uazapi_details (is_group);

-- ═════════ 3. whatsapp_contacts (cache) ═════════

CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  telefone text NOT NULL,
  jid text NOT NULL,
  push_name text,
  contact_name text,
  business_name text,
  avatar_url text,
  avatar_preview_url text,
  is_business boolean DEFAULT false,
  is_blocked boolean DEFAULT false,
  last_seen_at timestamptz,
  last_refresh timestamptz DEFAULT now(),
  raw jsonb,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now(),
  UNIQUE (instance_id, jid)
);

CREATE INDEX IF NOT EXISTS idx_wa_contacts_telefone
  ON public.whatsapp_contacts (telefone);
CREATE INDEX IF NOT EXISTS idx_wa_contacts_instance_telefone
  ON public.whatsapp_contacts (instance_id, telefone);

-- ═════════ 4. whatsapp_groups (cache de grupos) ═════════

CREATE TABLE IF NOT EXISTS public.whatsapp_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  group_jid text NOT NULL,
  nome text,
  descricao text,
  avatar_url text,
  owner_jid text,
  is_community boolean DEFAULT false,
  is_parent boolean DEFAULT false,
  linked_parent_jid text,
  is_announce boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  is_ephemeral boolean DEFAULT false,
  disappearing_timer integer,
  participants jsonb DEFAULT '[]'::jsonb,
  participants_count integer DEFAULT 0,
  invite_link text,
  created_at_wa timestamptz,
  last_refresh timestamptz DEFAULT now(),
  raw jsonb,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now(),
  UNIQUE (instance_id, group_jid)
);

CREATE INDEX IF NOT EXISTS idx_wa_groups_instance
  ON public.whatsapp_groups (instance_id);

-- ═════════ 5. whatsapp_media (catálogo de arquivos) ═════════

CREATE TABLE IF NOT EXISTS public.whatsapp_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE,
  instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  storage_path text,
  public_url text,
  mime_type text,
  file_name text,
  size_bytes bigint,
  sha256 text,
  duration_seconds integer,
  width integer,
  height integer,
  thumbnail_path text,
  thumbnail_url text,
  origem_url text,
  status text NOT NULL DEFAULT 'pending',
  erro text,
  tentativas integer DEFAULT 0,
  baixado_em timestamptz,
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_media_message
  ON public.whatsapp_media (message_id);
CREATE INDEX IF NOT EXISTS idx_wa_media_status
  ON public.whatsapp_media (status);
CREATE INDEX IF NOT EXISTS idx_wa_media_sha256
  ON public.whatsapp_media (sha256) WHERE sha256 IS NOT NULL;

-- ═════════ 6. whatsapp_labels (etiquetas) ═════════

CREATE TABLE IF NOT EXISTS public.whatsapp_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  external_id text,
  nome text NOT NULL,
  cor text,
  ativo boolean DEFAULT true,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now(),
  UNIQUE (instance_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_wa_labels_instance
  ON public.whatsapp_labels (instance_id);

-- ═════════ 7. whatsapp_chat_labels (N:N chat <-> label) ═════════

CREATE TABLE IF NOT EXISTS public.whatsapp_chat_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  chat_jid text NOT NULL,
  label_id uuid NOT NULL REFERENCES public.whatsapp_labels(id) ON DELETE CASCADE,
  aplicado_em timestamptz DEFAULT now(),
  aplicado_por uuid,
  UNIQUE (instance_id, chat_jid, label_id)
);

CREATE INDEX IF NOT EXISTS idx_wa_chat_labels_chat
  ON public.whatsapp_chat_labels (instance_id, chat_jid);

-- ═════════ 8. whatsapp_quick_replies (respostas rápidas) ═════════

CREATE TABLE IF NOT EXISTS public.whatsapp_quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  colaborador_id uuid,
  external_id text,
  atalho text NOT NULL,
  conteudo text NOT NULL,
  categoria text,
  variaveis jsonb DEFAULT '[]'::jsonb,
  ativo boolean DEFAULT true,
  global boolean DEFAULT false,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_qr_instance
  ON public.whatsapp_quick_replies (instance_id);
CREATE INDEX IF NOT EXISTS idx_wa_qr_colaborador
  ON public.whatsapp_quick_replies (colaborador_id);

-- ═════════ 9. whatsapp_newsletters (canais) ═════════

CREATE TABLE IF NOT EXISTS public.whatsapp_newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  newsletter_jid text NOT NULL,
  invite_link text,
  nome text,
  descricao text,
  avatar_url text,
  role text,
  subscribers_count integer,
  is_muted boolean DEFAULT false,
  is_following boolean DEFAULT true,
  created_at_wa timestamptz,
  last_refresh timestamptz DEFAULT now(),
  raw jsonb,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now(),
  UNIQUE (instance_id, newsletter_jid)
);

-- ═════════ 10. whatsapp_blocks (bloqueios) ═════════

CREATE TABLE IF NOT EXISTS public.whatsapp_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  jid text NOT NULL,
  telefone text,
  bloqueado_em timestamptz DEFAULT now(),
  bloqueado_por uuid,
  UNIQUE (instance_id, jid)
);

-- ═════════ 11. whatsapp_chat_notes (notas internas) ═════════

CREATE TABLE IF NOT EXISTS public.whatsapp_chat_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  chat_jid text NOT NULL,
  conteudo text NOT NULL,
  criado_por uuid,
  criado_por_nome text,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_notes_chat
  ON public.whatsapp_chat_notes (instance_id, chat_jid);

-- ═════════ 12. whatsapp_chat_leads (CRM) ═════════

CREATE TABLE IF NOT EXISTS public.whatsapp_chat_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  chat_jid text NOT NULL,
  lead_name text,
  lead_full_name text,
  lead_email text,
  lead_personalid text,
  lead_status text,
  lead_tags jsonb DEFAULT '[]'::jsonb,
  lead_notes text,
  lead_kanban_order integer,
  lead_assigned_attendant_id uuid,
  custom_fields jsonb DEFAULT '{}'::jsonb,
  sync_from_uazapi boolean DEFAULT false,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now(),
  UNIQUE (instance_id, chat_jid)
);

CREATE INDEX IF NOT EXISTS idx_wa_leads_assigned
  ON public.whatsapp_chat_leads (lead_assigned_attendant_id);
CREATE INDEX IF NOT EXISTS idx_wa_leads_status
  ON public.whatsapp_chat_leads (lead_status);

-- ═════════ 13. whatsapp_call_log (chamadas) ═════════

CREATE TABLE IF NOT EXISTS public.whatsapp_call_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  external_id text,
  chat_jid text,
  telefone text,
  direction text,
  status text,
  duration_seconds integer,
  is_video boolean DEFAULT false,
  colaborador_id uuid,
  iniciada_em timestamptz,
  encerrada_em timestamptz,
  raw jsonb,
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_calls_chat
  ON public.whatsapp_call_log (instance_id, chat_jid);

-- ═════════ 14. whatsapp_automations (configurações de automação) ═════════

CREATE TABLE IF NOT EXISTS public.whatsapp_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  nome text NOT NULL,
  ativo boolean DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  prioridade integer DEFAULT 0,
  criado_por uuid,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_automations_instance
  ON public.whatsapp_automations (instance_id, ativo);

-- ═════════ 15. whatsapp_automation_runs (execuções) ═════════

CREATE TABLE IF NOT EXISTS public.whatsapp_automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES public.whatsapp_automations(id) ON DELETE CASCADE,
  chat_jid text,
  telefone text,
  message_id uuid,
  executado_em timestamptz DEFAULT now(),
  resultado text,
  erro text,
  duration_ms integer
);

CREATE INDEX IF NOT EXISTS idx_wa_auto_runs_automation
  ON public.whatsapp_automation_runs (automation_id, executado_em DESC);

-- ═════════ 16. whatsapp_send_attempts (observabilidade) ═════════

CREATE TABLE IF NOT EXISTS public.whatsapp_send_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE,
  colaborador_id uuid,
  endpoint text,
  request_payload jsonb,
  response_payload jsonb,
  status_code integer,
  sucesso boolean,
  erro text,
  duration_ms integer,
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_attempts_message
  ON public.whatsapp_send_attempts (message_id);
CREATE INDEX IF NOT EXISTS idx_wa_attempts_instance_criado
  ON public.whatsapp_send_attempts (instance_id, criado_em DESC);

-- ═════════ 17. whatsapp_chat_assignments (atribuição) ═════════

CREATE TABLE IF NOT EXISTS public.whatsapp_chat_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  chat_jid text NOT NULL,
  colaborador_id uuid NOT NULL,
  status text DEFAULT 'active',
  atribuido_por uuid,
  atribuido_em timestamptz DEFAULT now(),
  liberado_em timestamptz
);

CREATE INDEX IF NOT EXISTS idx_wa_assignments_chat
  ON public.whatsapp_chat_assignments (instance_id, chat_jid)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_wa_assignments_colaborador
  ON public.whatsapp_chat_assignments (colaborador_id)
  WHERE status = 'active';

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Função auxiliar: verifica se usuário logado é admin/gestora
CREATE OR REPLACE FUNCTION public.is_admin_or_gestora()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'gestora', 'diretor')
  );
$$;

-- Função auxiliar: retorna instâncias visíveis pro usuário logado
CREATE OR REPLACE FUNCTION public.user_visible_instances()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM public.whatsapp_instances
  WHERE public.is_admin_or_gestora() = true
     OR colaborador_id = auth.uid();
$$;

-- whatsapp_uazapi_details
ALTER TABLE public.whatsapp_uazapi_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wa_uazapi_details_select ON public.whatsapp_uazapi_details;
CREATE POLICY wa_uazapi_details_select ON public.whatsapp_uazapi_details
  FOR SELECT USING (
    public.is_admin_or_gestora()
    OR EXISTS (
      SELECT 1 FROM public.whatsapp_messages m
      WHERE m.id = whatsapp_uazapi_details.message_id
        AND m.instance_id IN (SELECT public.user_visible_instances())
    )
  );

-- whatsapp_contacts
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wa_contacts_select ON public.whatsapp_contacts;
CREATE POLICY wa_contacts_select ON public.whatsapp_contacts
  FOR SELECT USING (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  );

-- whatsapp_groups
ALTER TABLE public.whatsapp_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wa_groups_select ON public.whatsapp_groups;
CREATE POLICY wa_groups_select ON public.whatsapp_groups
  FOR SELECT USING (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  );

-- whatsapp_media
ALTER TABLE public.whatsapp_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wa_media_select ON public.whatsapp_media;
CREATE POLICY wa_media_select ON public.whatsapp_media
  FOR SELECT USING (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  );

-- whatsapp_labels
ALTER TABLE public.whatsapp_labels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wa_labels_select ON public.whatsapp_labels;
CREATE POLICY wa_labels_select ON public.whatsapp_labels
  FOR SELECT USING (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  );
DROP POLICY IF EXISTS wa_labels_write ON public.whatsapp_labels;
CREATE POLICY wa_labels_write ON public.whatsapp_labels
  FOR ALL USING (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  )
  WITH CHECK (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  );

-- whatsapp_chat_labels
ALTER TABLE public.whatsapp_chat_labels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wa_chat_labels_select ON public.whatsapp_chat_labels;
CREATE POLICY wa_chat_labels_select ON public.whatsapp_chat_labels
  FOR SELECT USING (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  );
DROP POLICY IF EXISTS wa_chat_labels_write ON public.whatsapp_chat_labels;
CREATE POLICY wa_chat_labels_write ON public.whatsapp_chat_labels
  FOR ALL USING (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  )
  WITH CHECK (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  );

-- whatsapp_quick_replies
ALTER TABLE public.whatsapp_quick_replies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wa_qr_select ON public.whatsapp_quick_replies;
CREATE POLICY wa_qr_select ON public.whatsapp_quick_replies
  FOR SELECT USING (
    public.is_admin_or_gestora()
    OR global = true
    OR colaborador_id = auth.uid()
    OR instance_id IN (SELECT public.user_visible_instances())
  );
DROP POLICY IF EXISTS wa_qr_write ON public.whatsapp_quick_replies;
CREATE POLICY wa_qr_write ON public.whatsapp_quick_replies
  FOR ALL USING (
    public.is_admin_or_gestora()
    OR colaborador_id = auth.uid()
  )
  WITH CHECK (
    public.is_admin_or_gestora()
    OR colaborador_id = auth.uid()
  );

-- whatsapp_newsletters
ALTER TABLE public.whatsapp_newsletters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wa_newsletters_select ON public.whatsapp_newsletters;
CREATE POLICY wa_newsletters_select ON public.whatsapp_newsletters
  FOR SELECT USING (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  );

-- whatsapp_blocks
ALTER TABLE public.whatsapp_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wa_blocks_select ON public.whatsapp_blocks;
CREATE POLICY wa_blocks_select ON public.whatsapp_blocks
  FOR SELECT USING (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  );

-- whatsapp_chat_notes
ALTER TABLE public.whatsapp_chat_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wa_notes_select ON public.whatsapp_chat_notes;
CREATE POLICY wa_notes_select ON public.whatsapp_chat_notes
  FOR SELECT USING (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  );
DROP POLICY IF EXISTS wa_notes_write ON public.whatsapp_chat_notes;
CREATE POLICY wa_notes_write ON public.whatsapp_chat_notes
  FOR ALL USING (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  )
  WITH CHECK (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  );

-- whatsapp_chat_leads
ALTER TABLE public.whatsapp_chat_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wa_leads_select ON public.whatsapp_chat_leads;
CREATE POLICY wa_leads_select ON public.whatsapp_chat_leads
  FOR SELECT USING (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  );
DROP POLICY IF EXISTS wa_leads_write ON public.whatsapp_chat_leads;
CREATE POLICY wa_leads_write ON public.whatsapp_chat_leads
  FOR ALL USING (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  )
  WITH CHECK (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  );

-- whatsapp_call_log
ALTER TABLE public.whatsapp_call_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wa_calls_select ON public.whatsapp_call_log;
CREATE POLICY wa_calls_select ON public.whatsapp_call_log
  FOR SELECT USING (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  );

-- whatsapp_automations
ALTER TABLE public.whatsapp_automations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wa_automations_select ON public.whatsapp_automations;
CREATE POLICY wa_automations_select ON public.whatsapp_automations
  FOR SELECT USING (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  );
DROP POLICY IF EXISTS wa_automations_write ON public.whatsapp_automations;
CREATE POLICY wa_automations_write ON public.whatsapp_automations
  FOR ALL USING (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  )
  WITH CHECK (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  );

-- whatsapp_automation_runs
ALTER TABLE public.whatsapp_automation_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wa_auto_runs_select ON public.whatsapp_automation_runs;
CREATE POLICY wa_auto_runs_select ON public.whatsapp_automation_runs
  FOR SELECT USING (
    public.is_admin_or_gestora()
    OR EXISTS (
      SELECT 1 FROM public.whatsapp_automations a
      WHERE a.id = whatsapp_automation_runs.automation_id
        AND a.instance_id IN (SELECT public.user_visible_instances())
    )
  );

-- whatsapp_send_attempts (só admin/gestora vê)
ALTER TABLE public.whatsapp_send_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wa_attempts_select ON public.whatsapp_send_attempts;
CREATE POLICY wa_attempts_select ON public.whatsapp_send_attempts
  FOR SELECT USING (public.is_admin_or_gestora());

-- whatsapp_chat_assignments
ALTER TABLE public.whatsapp_chat_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wa_assignments_select ON public.whatsapp_chat_assignments;
CREATE POLICY wa_assignments_select ON public.whatsapp_chat_assignments
  FOR SELECT USING (
    public.is_admin_or_gestora()
    OR colaborador_id = auth.uid()
    OR instance_id IN (SELECT public.user_visible_instances())
  );
DROP POLICY IF EXISTS wa_assignments_write ON public.whatsapp_chat_assignments;
CREATE POLICY wa_assignments_write ON public.whatsapp_chat_assignments
  FOR ALL USING (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  )
  WITH CHECK (
    public.is_admin_or_gestora()
    OR instance_id IN (SELECT public.user_visible_instances())
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER: atualizar atualizado_em automaticamente
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.set_atualizado_em()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'whatsapp_contacts', 'whatsapp_groups', 'whatsapp_labels',
      'whatsapp_quick_replies', 'whatsapp_newsletters', 'whatsapp_chat_notes',
      'whatsapp_chat_leads', 'whatsapp_automations'
    ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_atualizado_em ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_set_atualizado_em BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em()',
      t
    );
  END LOOP;
END $$;
