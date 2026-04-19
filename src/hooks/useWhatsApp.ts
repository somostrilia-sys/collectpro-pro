import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type {
  WhatsAppInstance,
  WhatsAppTemplate,
  WhatsAppMessage,
  WhatsAppConversation,
  WhatsAppContact,
  WhatsAppGroup,
  WhatsAppLabel,
  WhatsAppQuickReply,
  WhatsAppLead,
  WhatsAppChatNote,
  WhatsAppAutomation,
  WhatsAppMedia,
  WhatsAppUazapiDetails,
} from "@/types/whatsapp";

// ═══════════════════════════════════════════════════════════════════════
// INSTÂNCIAS
// ═══════════════════════════════════════════════════════════════════════

export function useWhatsAppInstances() {
  return useQuery<WhatsAppInstance[]>({
    queryKey: ["whatsapp-instances"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("whatsapp_instances")
        .select("*")
        .order("is_default_central", { ascending: false })
        .order("criado_em", { ascending: true });
      if (error) throw error;
      return (data || []) as WhatsAppInstance[];
    },
    staleTime: 30_000,
  });
}

export function useWhatsAppInstance(id: string | null) {
  return useQuery<WhatsAppInstance | null>({
    queryKey: ["whatsapp-instance", id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await (supabase as any)
        .from("whatsapp_instances")
        .select("*").eq("id", id).maybeSingle();
      return data;
    },
    enabled: !!id,
    staleTime: 10_000,
  });
}

export function useSaveInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<WhatsAppInstance> & { id?: string }) => {
      const { id, ...rest } = payload;
      if (id) {
        const { error } = await (supabase as any).from("whatsapp_instances")
          .update(rest).eq("id", id);
        if (error) throw error;
        return id;
      } else {
        const { data, error } = await (supabase as any).from("whatsapp_instances")
          .insert(rest).select().single();
        if (error) throw error;
        return data.id;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-instances"] }),
  });
}

export function useDeleteInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("whatsapp_instances")
        .delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-instances"] }),
  });
}

// ─── Conexão ───────────────────────────────────────────────────────────
export function useConnectInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (instance_id: string) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-instance-connect", {
        body: { instance_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-instances"] }),
  });
}

export function useRefreshStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (instance_id: string) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-instance-status", {
        body: { instance_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-instances"] }),
  });
}

// ═══════════════════════════════════════════════════════════════════════
// TEMPLATES (compartilhado Meta/UAZAPI)
// ═══════════════════════════════════════════════════════════════════════

export function useWhatsAppTemplates(categoria?: string) {
  return useQuery<WhatsAppTemplate[]>({
    queryKey: ["whatsapp-templates", categoria],
    queryFn: async () => {
      let q = (supabase as any).from("whatsapp_templates").select("*").eq("ativo", true);
      if (categoria) q = q.eq("categoria", categoria);
      const { data, error } = await q.order("nome");
      if (error) throw error;
      return (data || []) as WhatsAppTemplate[];
    },
  });
}

export function useSaveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<WhatsAppTemplate> & { id?: string }) => {
      const { id, ...rest } = payload;
      if (id) {
        const { error } = await (supabase as any).from("whatsapp_templates").update(rest).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await (supabase as any).from("whatsapp_templates").insert(rest).select().single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-templates"] }),
  });
}

// ═══════════════════════════════════════════════════════════════════════
// CONVERSATIONS
// ═══════════════════════════════════════════════════════════════════════

export function useConversations(instanceId: string | null) {
  return useQuery<WhatsAppConversation[]>({
    queryKey: ["whatsapp-conversations", instanceId],
    queryFn: async () => {
      if (!instanceId) return [];
      const { data, error } = await (supabase as any)
        .from("whatsapp_conversations")
        .select("*")
        .eq("instance_id", instanceId)
        .order("ultima_mensagem_em", { ascending: false })
        .limit(200);
      if (error) throw error;
      const convs = (data || []) as WhatsAppConversation[];

      // Enriquecer com associado, contato e grupo
      const ids = Array.from(new Set(convs.map((c) => c.associado_id).filter(Boolean))) as string[];
      const phones = convs.map((c) => c.telefone);

      const [{ data: ass }, { data: contacts }, { data: groups }] = await Promise.all([
        ids.length > 0
          ? (supabase as any).from("associados").select("id, nome").in("id", ids)
          : Promise.resolve({ data: [] }),
        (supabase as any).from("whatsapp_contacts")
          .select("telefone, push_name, contact_name, avatar_url")
          .eq("instance_id", instanceId)
          .in("telefone", phones),
        (supabase as any).from("whatsapp_groups")
          .select("group_jid, nome, avatar_url, participants_count")
          .eq("instance_id", instanceId),
      ]);

      const assocMap = new Map<string, string>((ass || []).map((a: any) => [a.id, a.nome]));
      const contactMap = new Map<string, any>((contacts || []).map((c: any) => [c.telefone, c]));
      const groupMap = new Map<string, any>((groups || []).map((g: any) => [g.group_jid, g]));

      for (const c of convs) {
        if (c.associado_id) c.associado_nome = assocMap.get(c.associado_id) || null;
        // Detect group by phone (when phone is a group jid number)
        const groupCandidate = (groups || []).find((g: any) =>
          g.group_jid.replace(/\D/g, "") === c.telefone
        );
        if (groupCandidate) {
          c.is_group = true;
          c.chat_jid = groupCandidate.group_jid;
          c.chat_nome = groupCandidate.nome;
          c.chat_avatar_url = groupCandidate.avatar_url;
        } else {
          c.is_group = false;
          c.chat_jid = `${c.telefone}@s.whatsapp.net`;
          const contact = contactMap.get(c.telefone);
          if (contact) {
            c.chat_nome = c.associado_nome || contact.contact_name || contact.push_name;
            c.chat_avatar_url = contact.avatar_url;
          } else {
            c.chat_nome = c.associado_nome;
          }
        }
      }
      return convs;
    },
    enabled: !!instanceId,
    staleTime: 5_000,
  });
}

// Realtime de conversations
export function useConversationsRealtime(instanceId: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!instanceId) return;
    const channel = supabase
      .channel(`wa-convs-${instanceId}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "whatsapp_messages", filter: `instance_id=eq.${instanceId}` },
        () => qc.invalidateQueries({ queryKey: ["whatsapp-conversations", instanceId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [instanceId, qc]);
}

// ═══════════════════════════════════════════════════════════════════════
// MENSAGENS
// ═══════════════════════════════════════════════════════════════════════

export function useMessages(instanceId: string | null, telefone: string | null) {
  const qc = useQueryClient();
  const query = useQuery<WhatsAppMessage[]>({
    queryKey: ["whatsapp-messages", instanceId, telefone],
    queryFn: async () => {
      if (!instanceId || !telefone) return [];
      const { data, error } = await (supabase as any)
        .from("whatsapp_messages")
        .select(`
          *,
          uazapi_details:whatsapp_uazapi_details(*),
          media:whatsapp_media(*)
        `)
        .eq("instance_id", instanceId)
        .eq("telefone", telefone)
        .order("criado_em", { ascending: true })
        .limit(500);
      if (error) throw error;
      // Normalizar: uazapi_details/media vêm como array (1-element) do Supabase
      return (data || []).map((m: any) => ({
        ...m,
        uazapi_details: Array.isArray(m.uazapi_details)
          ? (m.uazapi_details[0] ?? null)
          : (m.uazapi_details ?? null),
        media: Array.isArray(m.media) ? (m.media[0] ?? null) : (m.media ?? null),
      })) as WhatsAppMessage[];
    },
    enabled: !!instanceId && !!telefone,
  });

  useEffect(() => {
    if (!instanceId || !telefone) return;
    const channel = supabase
      .channel(`wa-msgs-${instanceId}-${telefone}`)
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "whatsapp_messages",
          filter: `instance_id=eq.${instanceId}`,
        },
        (payload: any) => {
          const row = payload.new || payload.old;
          if (row?.telefone === telefone) {
            qc.invalidateQueries({ queryKey: ["whatsapp-messages", instanceId, telefone] });
            qc.invalidateQueries({ queryKey: ["whatsapp-conversations", instanceId] });
          }
        },
      )
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "whatsapp_uazapi_details" },
        () => qc.invalidateQueries({ queryKey: ["whatsapp-messages", instanceId, telefone] }),
      )
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "whatsapp_media" },
        () => qc.invalidateQueries({ queryKey: ["whatsapp-messages", instanceId, telefone] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [instanceId, telefone, qc]);

  return query;
}

// Realtime global de instâncias
export function useInstancesRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("wa-instances")
      .on("postgres_changes" as any,
        { event: "*", schema: "public", table: "whatsapp_instances" },
        () => qc.invalidateQueries({ queryKey: ["whatsapp-instances"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);
}

// ═══════════════════════════════════════════════════════════════════════
// ENVIO
// ═══════════════════════════════════════════════════════════════════════

export interface SendPayload {
  telefone?: string;
  chat_jid?: string;
  associado_id?: string;
  boleto_id?: string;
  instance_id?: string;
  colaborador_id?: string;
  template_id?: string;
  texto?: string;
  variaveis?: Record<string, any>;
  media?: { type: "image" | "audio" | "video" | "document" | "sticker"; url: string; caption?: string };
  contact?: { name: string; phone: string; vcard?: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  menu?: Record<string, any>;
  carousel?: Record<string, any>;
  pix?: { chave: string; valor: number; nome: string; descricao?: string };
  payment?: { valor: number; descricao: string; referencia?: string };
  quoted?: { external_id: string };
  reply_to_external_id?: string;
}

export function useSendMessage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: SendPayload) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: { colaborador_id: user?.id, ...payload },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      if (vars.instance_id && vars.telefone) {
        qc.invalidateQueries({ queryKey: ["whatsapp-messages", vars.instance_id, vars.telefone] });
      }
      qc.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════
// AÇÕES DE MENSAGEM
// ═══════════════════════════════════════════════════════════════════════

export function useMessageAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { instance_id: string; action: string } & Record<string, any>) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-message-action", {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["whatsapp-messages"] });
      qc.invalidateQueries({ queryKey: ["whatsapp-conversations", vars.instance_id] });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════
// AÇÕES DE CHAT
// ═══════════════════════════════════════════════════════════════════════

export function useChatAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { instance_id: string; action: string } & Record<string, any>) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-chat-action", {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["whatsapp-conversations", vars.instance_id] });
      qc.invalidateQueries({ queryKey: ["whatsapp-chat-notes"] });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════
// PRESENÇA
// ═══════════════════════════════════════════════════════════════════════

export function useSendPresence() {
  return useMutation({
    mutationFn: async (payload: {
      instance_id: string;
      chat_jid?: string;
      telefone?: string;
      presence: "composing" | "recording" | "paused" | "available" | "unavailable";
    }) => {
      const { data } = await supabase.functions.invoke("whatsapp-presence", { body: payload });
      return data;
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════
// CONTATOS
// ═══════════════════════════════════════════════════════════════════════

export function useContacts(instanceId: string | null, search?: string) {
  return useQuery<WhatsAppContact[]>({
    queryKey: ["whatsapp-contacts", instanceId, search],
    queryFn: async () => {
      if (!instanceId) return [];
      let q = (supabase as any).from("whatsapp_contacts")
        .select("*")
        .eq("instance_id", instanceId);
      if (search) {
        q = q.or(`push_name.ilike.%${search}%,contact_name.ilike.%${search}%,telefone.ilike.%${search}%`);
      }
      const { data } = await q.order("push_name", { ascending: true }).limit(500);
      return (data || []) as WhatsAppContact[];
    },
    enabled: !!instanceId,
    staleTime: 30_000,
  });
}

export function useContactAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { instance_id: string; action: string } & Record<string, any>) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-contact-action", {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["whatsapp-contacts", vars.instance_id] });
      qc.invalidateQueries({ queryKey: ["whatsapp-blocks", vars.instance_id] });
    },
  });
}

export function useBlocks(instanceId: string | null) {
  return useQuery({
    queryKey: ["whatsapp-blocks", instanceId],
    queryFn: async () => {
      if (!instanceId) return [];
      const { data } = await (supabase as any).from("whatsapp_blocks")
        .select("*").eq("instance_id", instanceId);
      return data || [];
    },
    enabled: !!instanceId,
  });
}

// ═══════════════════════════════════════════════════════════════════════
// GRUPOS
// ═══════════════════════════════════════════════════════════════════════

export function useGroups(instanceId: string | null, search?: string) {
  return useQuery<WhatsAppGroup[]>({
    queryKey: ["whatsapp-groups", instanceId, search],
    queryFn: async () => {
      if (!instanceId) return [];
      let q = (supabase as any).from("whatsapp_groups")
        .select("*")
        .eq("instance_id", instanceId);
      if (search) q = q.ilike("nome", `%${search}%`);
      const { data } = await q.order("nome", { ascending: true });
      return (data || []) as WhatsAppGroup[];
    },
    enabled: !!instanceId,
    staleTime: 30_000,
  });
}

export function useGroup(instanceId: string | null, groupJid: string | null) {
  return useQuery<WhatsAppGroup | null>({
    queryKey: ["whatsapp-group", instanceId, groupJid],
    queryFn: async () => {
      if (!instanceId || !groupJid) return null;
      const { data } = await (supabase as any).from("whatsapp_groups")
        .select("*")
        .eq("instance_id", instanceId)
        .eq("group_jid", groupJid)
        .maybeSingle();
      return data;
    },
    enabled: !!instanceId && !!groupJid,
  });
}

export function useGroupAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { instance_id: string; action: string } & Record<string, any>) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-group-action", {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["whatsapp-groups", vars.instance_id] });
      qc.invalidateQueries({ queryKey: ["whatsapp-group"] });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════
// ETIQUETAS
// ═══════════════════════════════════════════════════════════════════════

export function useLabels(instanceId: string | null) {
  return useQuery<WhatsAppLabel[]>({
    queryKey: ["whatsapp-labels", instanceId],
    queryFn: async () => {
      if (!instanceId) return [];
      const { data } = await (supabase as any).from("whatsapp_labels")
        .select("*")
        .eq("instance_id", instanceId)
        .eq("ativo", true)
        .order("nome", { ascending: true });
      return (data || []) as WhatsAppLabel[];
    },
    enabled: !!instanceId,
  });
}

export function useLabelAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { instance_id: string; action: string } & Record<string, any>) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-label-action", {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["whatsapp-labels", vars.instance_id] });
    },
  });
}

export function useChatLabels(instanceId: string | null, chatJid: string | null) {
  return useQuery({
    queryKey: ["whatsapp-chat-labels", instanceId, chatJid],
    queryFn: async () => {
      if (!instanceId || !chatJid) return [];
      const { data } = await (supabase as any)
        .from("whatsapp_chat_labels")
        .select("*, label:whatsapp_labels(*)")
        .eq("instance_id", instanceId)
        .eq("chat_jid", chatJid);
      return data || [];
    },
    enabled: !!instanceId && !!chatJid,
  });
}

// ═══════════════════════════════════════════════════════════════════════
// RESPOSTAS RÁPIDAS
// ═══════════════════════════════════════════════════════════════════════

export function useQuickReplies(instanceId: string | null, colaboradorId?: string | null) {
  return useQuery<WhatsAppQuickReply[]>({
    queryKey: ["whatsapp-quickreplies", instanceId, colaboradorId],
    queryFn: async () => {
      if (!instanceId) return [];
      let q = (supabase as any).from("whatsapp_quick_replies")
        .select("*")
        .eq("instance_id", instanceId)
        .eq("ativo", true);
      if (colaboradorId) {
        q = q.or(`colaborador_id.eq.${colaboradorId},global.eq.true`);
      } else {
        q = q.eq("global", true);
      }
      const { data } = await q.order("atalho", { ascending: true });
      return (data || []) as WhatsAppQuickReply[];
    },
    enabled: !!instanceId,
  });
}

export function useQuickReplyAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { instance_id: string; action: string } & Record<string, any>) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-quickreply-action", {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["whatsapp-quickreplies", vars.instance_id] });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════
// LEADS (CRM)
// ═══════════════════════════════════════════════════════════════════════

export function useLead(instanceId: string | null, chatJid: string | null) {
  return useQuery<WhatsAppLead | null>({
    queryKey: ["whatsapp-lead", instanceId, chatJid],
    queryFn: async () => {
      if (!instanceId || !chatJid) return null;
      const { data } = await (supabase as any).from("whatsapp_chat_leads")
        .select("*")
        .eq("instance_id", instanceId)
        .eq("chat_jid", chatJid)
        .maybeSingle();
      return data;
    },
    enabled: !!instanceId && !!chatJid,
  });
}

export function useLeads(instanceId: string | null, filter?: { status?: string; attendant_id?: string }) {
  return useQuery<WhatsAppLead[]>({
    queryKey: ["whatsapp-leads", instanceId, filter],
    queryFn: async () => {
      if (!instanceId) return [];
      let q = (supabase as any).from("whatsapp_chat_leads")
        .select("*")
        .eq("instance_id", instanceId);
      if (filter?.status) q = q.eq("lead_status", filter.status);
      if (filter?.attendant_id) q = q.eq("lead_assigned_attendant_id", filter.attendant_id);
      const { data } = await q.order("lead_kanban_order", { ascending: true, nullsFirst: false });
      return (data || []) as WhatsAppLead[];
    },
    enabled: !!instanceId,
  });
}

// ═══════════════════════════════════════════════════════════════════════
// NOTAS INTERNAS DO CHAT
// ═══════════════════════════════════════════════════════════════════════

export function useChatNotes(instanceId: string | null, chatJid: string | null) {
  return useQuery<WhatsAppChatNote[]>({
    queryKey: ["whatsapp-chat-notes", instanceId, chatJid],
    queryFn: async () => {
      if (!instanceId || !chatJid) return [];
      const { data } = await (supabase as any).from("whatsapp_chat_notes")
        .select("*")
        .eq("instance_id", instanceId)
        .eq("chat_jid", chatJid)
        .order("criado_em", { ascending: false });
      return (data || []) as WhatsAppChatNote[];
    },
    enabled: !!instanceId && !!chatJid,
  });
}

// ═══════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DE INSTÂNCIA
// ═══════════════════════════════════════════════════════════════════════

export function useInstanceConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { instance_id: string; action: string } & Record<string, any>) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-instance-config", {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-instances"] });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════
// ATRIBUIÇÃO DE CHATS
// ═══════════════════════════════════════════════════════════════════════

export function useChatAssignment(instanceId: string | null, chatJid: string | null) {
  return useQuery({
    queryKey: ["whatsapp-assignment", instanceId, chatJid],
    queryFn: async () => {
      if (!instanceId || !chatJid) return null;
      const { data } = await supabase.functions.invoke("whatsapp-assignment", {
        body: { instance_id: instanceId, action: "get_current", chat_jid: chatJid },
      });
      return data?.assignment ?? null;
    },
    enabled: !!instanceId && !!chatJid,
    staleTime: 30_000,
  });
}

export function useAssignmentAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { instance_id: string; action: string } & Record<string, any>) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-assignment", {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["whatsapp-assignment"] });
      if (vars.chat_jid) {
        qc.invalidateQueries({ queryKey: ["whatsapp-assignment", vars.instance_id, vars.chat_jid] });
      }
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════
// NOTAS INTERNAS
// ═══════════════════════════════════════════════════════════════════════

export function useChatNoteActions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { instance_id: string; action: string } & Record<string, any>) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-chat-action", {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["whatsapp-chat-notes", vars.instance_id, vars.chat_jid] });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════
// DASHBOARD ADMIN (métricas/logs/alertas)
// ═══════════════════════════════════════════════════════════════════════

export function useAdminDashboard(action: string, params: Record<string, any> = {}, enabled = true) {
  return useQuery({
    queryKey: ["whatsapp-admin-dashboard", action, params],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("whatsapp-admin-dashboard", {
        body: { action, ...params },
      });
      if (error) throw error;
      return data;
    },
    enabled,
    staleTime: 30_000,
  });
}

// ═══════════════════════════════════════════════════════════════════════
// HISTÓRICO DO ASSOCIADO (integração cross-module)
// ═══════════════════════════════════════════════════════════════════════

export function useAssociadoHistorico(associadoId: string | null) {
  return useQuery({
    queryKey: ["associado-historico", associadoId],
    queryFn: async () => {
      if (!associadoId) return null;
      const [
        { data: associado },
        { data: boletos },
        { data: acordos },
        { data: ligacoes },
        { data: pagamentos },
      ] = await Promise.all([
        (supabase as any).from("associados")
          .select("id, nome, cpf, email, whatsapp, placa, status, situacao, cooperativa")
          .eq("id", associadoId).maybeSingle(),
        (supabase as any).from("boletos")
          .select("id, valor, vencimento, status, mes_referencia, link_boleto, pix_copia_cola")
          .eq("associado_id", associadoId)
          .order("vencimento", { ascending: false })
          .limit(10),
        (supabase as any).from("acordos")
          .select("id, valor_original, valor_acordo, parcelas, status, created_at")
          .eq("associado_id", associadoId)
          .order("created_at", { ascending: false })
          .limit(5),
        (supabase as any).from("ligacoes")
          .select("id, resultado, duracao_segundos, data_hora")
          .eq("associado_id", associadoId)
          .order("data_hora", { ascending: false })
          .limit(10),
        (supabase as any).from("historico_pagamentos")
          .select("id, valor, data_pagamento, forma_pagamento, tipo")
          .eq("associado_id", associadoId)
          .order("data_pagamento", { ascending: false })
          .limit(10),
      ]);

      return {
        associado: associado ?? null,
        boletos: boletos ?? [],
        acordos: acordos ?? [],
        ligacoes: ligacoes ?? [],
        pagamentos: pagamentos ?? [],
      };
    },
    enabled: !!associadoId,
    staleTime: 60_000,
  });
}

// ═══════════════════════════════════════════════════════════════════════
// WEBHOOK URLS
// ═══════════════════════════════════════════════════════════════════════

export function useWebhookUrls() {
  const supabaseUrl = useMemo(
    () => (supabase as any)?.supabaseUrl || "https://ptmttmqprbullvgulyhb.supabase.co",
    [],
  );
  return {
    uazapi: `${supabaseUrl}/functions/v1/whatsapp-webhook-uazapi`,
    meta: `${supabaseUrl}/functions/v1/whatsapp-webhook-meta`,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// META: conversations (CSW 24h) + assignments + templates
// ═══════════════════════════════════════════════════════════════════════

export function useMetaConversation(instanceId: string | null, telefone: string | null) {
  return useQuery({
    queryKey: ["meta_conv", instanceId, telefone],
    queryFn: async () => {
      if (!instanceId || !telefone) return null;
      const { data } = await supabase
        .from("whatsapp_meta_conversations")
        .select("*")
        .eq("instance_id", instanceId)
        .eq("telefone", telefone)
        .maybeSingle();
      return data ?? null;
    },
    enabled: !!instanceId && !!telefone,
    staleTime: 15_000,
    refetchInterval: 30_000, // atualiza countdown CSW
  });
}

export interface ChatAssignment {
  id: string;
  colaborador_id: string;
  status: string;
  atribuido_em: string;
  expires_at: string | null;
  liberado_em: string | null;
  provider_tipo: string;
  profiles?: { full_name: string | null } | null;
}

export function useChatAssignment(
  instanceId: string | null,
  target: string | null,
  providerTipo: "uazapi" | "meta" = "uazapi",
) {
  return useQuery({
    queryKey: ["chat_assignment", instanceId, target, providerTipo],
    queryFn: async () => {
      if (!instanceId || !target) return null;
      const { data, error } = await supabase.functions.invoke("whatsapp-assignment", {
        body: {
          instance_id: instanceId,
          provider_tipo: providerTipo,
          action: "get_current",
          ...(providerTipo === "meta" ? { telefone: target } : { chat_jid: target }),
        },
      });
      if (error) throw error;
      return (data?.assignment ?? null) as ChatAssignment | null;
    },
    enabled: !!instanceId && !!target,
    staleTime: 10_000,
  });
}

export function useAssumeChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      instance_id: string;
      provider_tipo: "uazapi" | "meta";
      chat_jid?: string;
      telefone?: string;
      colaborador_id: string;
      atribuido_por?: string;
      auto_release_minutes?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-assignment", {
        body: { action: "assign", ...input },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["chat_assignment"] });
      qc.invalidateQueries({ queryKey: ["meta_unassigned", vars.instance_id] });
    },
  });
}

export function useReleaseChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      instance_id: string;
      provider_tipo: "uazapi" | "meta";
      chat_jid?: string;
      telefone?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-assignment", {
        body: { action: "release", ...input },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat_assignment"] });
      qc.invalidateQueries({ queryKey: ["meta_unassigned"] });
    },
  });
}

export function useTransferChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      instance_id: string;
      provider_tipo: "uazapi" | "meta";
      chat_jid?: string;
      telefone?: string;
      from_colaborador_id?: string;
      to_colaborador_id: string;
      motivo?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-assignment", {
        body: { action: "transfer", ...input },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat_assignment"] });
    },
  });
}

export function useUnassignedMeta(instanceId: string | null) {
  return useQuery({
    queryKey: ["meta_unassigned", instanceId],
    queryFn: async () => {
      if (!instanceId) return [];
      const { data, error } = await supabase.functions.invoke("whatsapp-assignment", {
        body: { instance_id: instanceId, provider_tipo: "meta", action: "list_unassigned" },
      });
      if (error) throw error;
      return data?.chats ?? [];
    },
    enabled: !!instanceId,
    staleTime: 10_000,
    refetchInterval: 20_000,
  });
}

export function useMetaTemplatesLocal(instanceId: string | null, status?: string) {
  return useQuery({
    queryKey: ["meta_templates_local", instanceId, status],
    queryFn: async () => {
      if (!instanceId) return [];
      const { data, error } = await supabase.functions.invoke("whatsapp-meta-templates", {
        body: { instance_id: instanceId, action: "list_local", status: status ?? "APPROVED" },
      });
      if (error) throw error;
      return data?.templates ?? [];
    },
    enabled: !!instanceId,
    staleTime: 60_000,
  });
}

// Re-exports pra compat com código existente
export { useSendMessage as useSend };
