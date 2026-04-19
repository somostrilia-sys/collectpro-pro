// whatsapp-newsletter-action — canais/newsletters UAZAPI (26 endpoints)
//
// Body: { instance_id: string, action: string, ...params }
// Actions:
//   create, list, info, link, subscribe, messages, messages_edit, messages_delete,
//   updates, viewed, reaction, follow, unfollow, mute, unmute, delete, picture,
//   name, description, settings, search, admin_invite, admin_accept, admin_remove,
//   admin_revoke, owner_transfer

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, bad } from "../_shared/whatsapp.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return bad("Method not allowed", 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    const { instance_id, action } = body;
    if (!instance_id || !action) return bad("instance_id e action obrigatórios");

    const { data: instance } = await supabase.from("whatsapp_instances")
      .select("*").eq("id", instance_id).maybeSingle();
    if (!instance?.token) return bad("instância sem token", 400);

    const serverUrl = instance.servidor_url || "https://trilhoassist.uazapi.com";
    const token = instance.token;

    const call = async (endpoint: string, payload: any = {}, method: string = "POST") => {
      const res = await fetch(`${serverUrl}${endpoint}`, {
        method,
        headers: method === "GET"
          ? { token }
          : { "Content-Type": "application/json", token },
        body: method === "POST" ? JSON.stringify(payload) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    };

    // Tabela de rotas: action → endpoint + método + (opcional) cache-side-effect
    const routes: Record<string, { endpoint: string; method?: string; cache?: "upsert" | "delete" }> = {
      create: { endpoint: "/newsletter/create", cache: "upsert" },
      list: { endpoint: "/newsletter/list", method: "GET", cache: "upsert" },
      info: { endpoint: "/newsletter/info", cache: "upsert" },
      link: { endpoint: "/newsletter/link" },
      subscribe: { endpoint: "/newsletter/subscribe" },
      messages: { endpoint: "/newsletter/messages" },
      messages_edit: { endpoint: "/newsletter/messages/edit" },
      messages_delete: { endpoint: "/newsletter/messages/delete" },
      updates: { endpoint: "/newsletter/updates" },
      viewed: { endpoint: "/newsletter/viewed" },
      reaction: { endpoint: "/newsletter/reaction" },
      follow: { endpoint: "/newsletter/follow" },
      unfollow: { endpoint: "/newsletter/unfollow" },
      mute: { endpoint: "/newsletter/mute" },
      unmute: { endpoint: "/newsletter/unmute" },
      delete: { endpoint: "/newsletter/delete", cache: "delete" },
      picture: { endpoint: "/newsletter/picture" },
      name: { endpoint: "/newsletter/name" },
      description: { endpoint: "/newsletter/description" },
      settings: { endpoint: "/newsletter/settings" },
      search: { endpoint: "/newsletter/search" },
      admin_invite: { endpoint: "/newsletter/admin/invite" },
      admin_accept: { endpoint: "/newsletter/admin/accept" },
      admin_remove: { endpoint: "/newsletter/admin/remove" },
      admin_revoke: { endpoint: "/newsletter/admin/revoke" },
      owner_transfer: { endpoint: "/newsletter/owner/transfer" },
    };

    const route = routes[action];
    if (!route) return bad(`ação desconhecida: ${action}`);

    const { action: _ignore, instance_id: _ignore2, ...payload } = body;
    const r = await call(route.endpoint, payload, route.method);

    // Cache side-effects
    if (r.ok && route.cache) {
      try {
        if (route.cache === "upsert") {
          const items = Array.isArray(r.data?.newsletters ?? r.data?.data ?? r.data)
            ? (r.data.newsletters ?? r.data.data ?? r.data)
            : [r.data?.newsletter ?? r.data];
          for (const n of items) {
            const jid = n?.id ?? n?.JID ?? n?.jid;
            if (!jid) continue;
            await supabase.from("whatsapp_newsletters").upsert({
              instance_id,
              newsletter_jid: String(jid),
              nome: n?.name ?? n?.nome ?? null,
              descricao: n?.description ?? n?.descricao ?? null,
              avatar_url: n?.picture ?? n?.image ?? null,
              role: n?.role ?? null,
              subscribers_count: n?.subscribers_count ?? n?.followers ?? null,
              invite_link: n?.invite_link ?? n?.inviteLink ?? null,
              last_refresh: new Date().toISOString(),
              raw: n,
            }, { onConflict: "instance_id,newsletter_jid" });
          }
        } else if (route.cache === "delete" && payload.jid) {
          await supabase.from("whatsapp_newsletters")
            .delete()
            .eq("instance_id", instance_id)
            .eq("newsletter_jid", payload.jid);
        }
      } catch { /* silencioso */ }
    }

    return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});
