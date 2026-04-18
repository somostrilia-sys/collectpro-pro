import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  WhatsAppInstance,
  WhatsAppTemplate,
  WhatsAppMessage,
  WhatsAppConversation,
} from "@/types/whatsapp";

// ─── Instâncias ──────────────────────────────────────────────────────
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
        .select("*")
        .eq("id", id).maybeSingle();
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

// ─── Conexão (QR / status) ───────────────────────────────────────────
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

// ─── Templates ───────────────────────────────────────────────────────
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

// ─── Conversas ───────────────────────────────────────────────────────
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
      // Enriquecer com nome do associado
      const ids = Array.from(new Set(convs.map((c) => c.associado_id).filter(Boolean))) as string[];
      if (ids.length > 0) {
        const { data: ass } = await (supabase as any).from("associados")
          .select("id, nome").in("id", ids);
        const map = new Map<string, string>((ass || []).map((a: any) => [a.id, a.nome]));
        for (const c of convs) {
          if (c.associado_id) c.associado_nome = map.get(c.associado_id) || null;
        }
      }
      return convs;
    },
    enabled: !!instanceId,
    staleTime: 5_000,
  });
}

// ─── Mensagens de uma conversa ───────────────────────────────────────
export function useMessages(instanceId: string | null, telefone: string | null) {
  const qc = useQueryClient();
  const query = useQuery<WhatsAppMessage[]>({
    queryKey: ["whatsapp-messages", instanceId, telefone],
    queryFn: async () => {
      if (!instanceId || !telefone) return [];
      const { data, error } = await (supabase as any)
        .from("whatsapp_messages")
        .select("*")
        .eq("instance_id", instanceId)
        .eq("telefone", telefone)
        .order("criado_em", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data || []) as WhatsAppMessage[];
    },
    enabled: !!instanceId && !!telefone,
  });

  // Realtime subscribe
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
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [instanceId, telefone, qc]);

  return query;
}

// Realtime global de instâncias (atualiza status quando webhook chega)
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

// ─── Envio ───────────────────────────────────────────────────────────
export interface SendPayload {
  telefone?: string;
  associado_id?: string;
  boleto_id?: string;
  instance_id?: string;
  template_id?: string;
  texto?: string;
  variaveis?: Record<string, any>;
  media?: { type: "image" | "audio" | "video" | "document"; url: string; caption?: string };
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SendPayload) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", { body: payload });
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

// ─── Util: URL do webhook ────────────────────────────────────────────
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
