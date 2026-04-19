// whatsapp-admin-instance — administração multi-instância UAZAPI (admin-only)
// Usa UAZAPI_ADMIN_TOKEN pra endpoints /instance/create, /instance/all,
// /instance/updateAdminFields, /globalwebhook, /admin/restart, DELETE /instance
//
// Body: { action: string, ...params }
// Actions:
//   - create: { instance_name, token?, colaborador_id?, nome? }
//   - list_all: {}
//   - update_admin_fields: { instance_id, fields }
//   - webhook_global_get: {}
//   - webhook_global_set: { url, events }
//   - webhook_global_errors: {}
//   - restart: {}
//   - delete_instance: { instance_id }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, bad } from "../_shared/whatsapp.ts";

const UAZAPI_SERVER = "https://trilhoassist.uazapi.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return bad("Method not allowed", 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Verificar caller é admin/diretor
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return bad("Não autorizado", 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabase.auth.getUser(token);
    if (!caller) return bad("Token inválido", 401);

    const { data: profile } = await supabase.from("profiles")
      .select("role").eq("id", caller.id).single();
    if (!["admin", "diretor", "gestora"].includes(profile?.role || "")) {
      return bad("Acesso negado (requer admin/diretor/gestora)", 403);
    }

    const adminToken = Deno.env.get("UAZAPI_ADMIN_TOKEN");
    if (!adminToken) return bad("UAZAPI_ADMIN_TOKEN não configurado", 500);

    const body = await req.json();
    const { action } = body;

    const adminHeaders = { "Content-Type": "application/json", admintoken: adminToken };

    switch (action) {
      case "create": {
        const { instance_name, token: customToken, colaborador_id, nome } = body;
        if (!instance_name) return bad("instance_name obrigatório");

        const res = await fetch(`${UAZAPI_SERVER}/instance/create`, {
          method: "POST",
          headers: adminHeaders,
          body: JSON.stringify({
            name: instance_name,
            ...(customToken ? { token: customToken } : {}),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return json({ success: false, data }, 502);

        const newToken = data?.token ?? data?.instance?.token;
        // Cria row local
        const { data: newInstance } = await supabase.from("whatsapp_instances").insert({
          nome: nome ?? instance_name,
          tipo: colaborador_id ? "colaborador" : "central",
          servidor_url: UAZAPI_SERVER,
          instance_name,
          token: newToken,
          colaborador_id: colaborador_id ?? null,
          status: "disconnected",
          ativo: true,
        }).select().single();

        // Auditoria
        await supabase.from("whatsapp_audit_log").insert({
          instance_id: newInstance?.id ?? null,
          colaborador_id: caller.id,
          action_type: "instance_create",
          entity_type: "instance",
          entity_id: newInstance?.id ?? null,
          metadata: { instance_name, colaborador_id },
        });

        return json({ success: true, instance: newInstance, uazapi: data });
      }

      case "list_all": {
        const res = await fetch(`${UAZAPI_SERVER}/instance/all`, { headers: adminHeaders });
        const data = await res.json().catch(() => ({}));
        return json({ success: res.ok, data }, res.ok ? 200 : 502);
      }

      case "update_admin_fields": {
        const { instance_id, fields } = body;
        if (!instance_id || !fields) return bad("instance_id e fields obrigatórios");
        const { data: inst } = await supabase.from("whatsapp_instances")
          .select("token").eq("id", instance_id).single();
        if (!inst?.token) return bad("instância sem token", 400);
        const res = await fetch(`${UAZAPI_SERVER}/instance/updateAdminFields`, {
          method: "POST",
          headers: { ...adminHeaders, token: inst.token },
          body: JSON.stringify(fields),
        });
        const data = await res.json().catch(() => ({}));
        return json({ success: res.ok, data }, res.ok ? 200 : 502);
      }

      case "webhook_global_get": {
        const res = await fetch(`${UAZAPI_SERVER}/globalwebhook`, { headers: adminHeaders });
        const data = await res.json().catch(() => ({}));
        return json({ success: res.ok, data }, res.ok ? 200 : 502);
      }

      case "webhook_global_set": {
        const { url, events } = body;
        if (!url) return bad("url obrigatório");
        const res = await fetch(`${UAZAPI_SERVER}/globalwebhook`, {
          method: "POST",
          headers: adminHeaders,
          body: JSON.stringify({ url, events: events ?? ["messages", "messages_update", "connection"] }),
        });
        const data = await res.json().catch(() => ({}));
        return json({ success: res.ok, data }, res.ok ? 200 : 502);
      }

      case "webhook_global_errors": {
        const res = await fetch(`${UAZAPI_SERVER}/globalwebhook/errors`, { headers: adminHeaders });
        const data = await res.json().catch(() => ({}));
        return json({ success: res.ok, data }, res.ok ? 200 : 502);
      }

      case "restart": {
        const res = await fetch(`${UAZAPI_SERVER}/admin/restart`, {
          method: "POST",
          headers: adminHeaders,
        });
        const data = await res.json().catch(() => ({}));
        return json({ success: res.ok, data }, res.ok ? 200 : 502);
      }

      case "delete_instance": {
        const { instance_id } = body;
        if (!instance_id) return bad("instance_id obrigatório");
        const { data: inst } = await supabase.from("whatsapp_instances")
          .select("*").eq("id", instance_id).single();
        if (!inst) return bad("instância não encontrada", 404);

        if (inst.token) {
          await fetch(`${UAZAPI_SERVER}/instance`, {
            method: "DELETE",
            headers: { ...adminHeaders, token: inst.token },
          }).catch(() => {});
        }

        await supabase.from("whatsapp_instances").delete().eq("id", instance_id);
        await supabase.from("whatsapp_audit_log").insert({
          instance_id: null,
          colaborador_id: caller.id,
          action_type: "instance_delete",
          entity_type: "instance",
          entity_id: instance_id,
          metadata: { deleted_instance: inst },
        });
        return json({ success: true });
      }

      default:
        return bad(`ação desconhecida: ${action}`);
    }
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});
