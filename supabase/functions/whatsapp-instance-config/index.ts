// whatsapp-instance-config — configurações avançadas da instância UAZAPI
//
// Body: { instance_id: string, action: string, ...params }
// Actions:
//   - status: { }                              // GET /instance/status
//   - limits: { }                              // GET /instance/wa_messages_limits
//   - privacy_get: { }                         // GET /instance/privacy
//   - privacy_set: { settings }                // POST /instance/privacy
//   - delay_set: { delay_min?, delay_max? }    // POST /instance/updateDelaySettings
//   - rename: { new_name }                     // POST /instance/updateInstanceName
//   - reset: { }                               // POST /instance/reset
//   - connect: { }                             // POST /instance/connect
//   - disconnect: { }                          // POST /instance/disconnect
//   - delete: { }                              // DELETE /instance (admin only)
//   - profile_name: { name }                   // POST /profile/name
//   - profile_image: { image_url }             // POST /profile/image
//   - presence: { presence }                   // POST /instance/presence (online/offline)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, bad, mapUazapiStatus } from "../_shared/whatsapp.ts";

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
    if (!instance_id) return bad("instance_id obrigatório");
    if (!action) return bad("action obrigatória");

    const { data: instance } = await supabase.from("whatsapp_instances")
      .select("*").eq("id", instance_id).maybeSingle();
    if (!instance) return bad("instância não encontrada", 404);
    if (!instance.token) return bad("instância sem token", 400);

    const serverUrl = instance.servidor_url || "https://trilhoassist.uazapi.com";
    const token = instance.token;

    const callPost = async (endpoint: string, payload: any = {}) => {
      const res = await fetch(`${serverUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    };

    const callGet = async (endpoint: string) => {
      const res = await fetch(`${serverUrl}${endpoint}`, {
        method: "GET",
        headers: { token },
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    };

    switch (action) {
      case "status": {
        const r = await callGet("/instance/status");
        if (r.ok && r.data) {
          const rawStatus = r.data?.instance?.status ?? r.data?.status ?? "connected";
          const newStatus = mapUazapiStatus(rawStatus);
          // UAZAPI retorna JID em `owner` ou no `jid` raiz
          const rawJid = r.data?.instance?.owner ?? r.data?.jid ?? "";
          const phone = String(rawJid).split("@")[0].replace(/\D/g, "");
          const update: any = {
            status: newStatus,
            last_sync_at: new Date().toISOString(),
          };
          if (phone) update.telefone = phone;
          if (newStatus === "connected") update.qr_code = null;
          await supabase.from("whatsapp_instances").update(update).eq("id", instance_id);
        }
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "limits": {
        const r = await callGet("/instance/wa_messages_limits");
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "privacy_get": {
        const r = await callGet("/instance/privacy");
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "privacy_set": {
        const { settings } = body;
        if (!settings) return bad("settings obrigatório");
        const r = await callPost("/instance/privacy", settings);
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "delay_set": {
        const { delay_min, delay_max } = body;
        const r = await callPost("/instance/updateDelaySettings", {
          msg_delay_min: delay_min ?? 3,
          msg_delay_max: delay_max ?? 6,
        });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "rename": {
        const { new_name } = body;
        if (!new_name) return bad("new_name obrigatório");
        const r = await callPost("/instance/updateInstanceName", { name: new_name });
        if (r.ok) {
          await supabase.from("whatsapp_instances")
            .update({ instance_name: new_name })
            .eq("id", instance_id);
        }
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "reset": {
        const r = await callPost("/instance/reset", {});
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "connect": {
        const r = await callPost("/instance/connect", {});
        if (r.ok) {
          const qr = r.data?.instance?.qrcode ?? r.data?.qrcode ?? r.data?.qr;
          if (qr) {
            await supabase.from("whatsapp_instances").update({
              qr_code: qr,
              status: "qr_pending",
              qr_expires_at: new Date(Date.now() + 60_000).toISOString(),
            }).eq("id", instance_id);
          }
        }
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "disconnect": {
        const r = await callPost("/instance/disconnect", {});
        if (r.ok) {
          await supabase.from("whatsapp_instances").update({
            status: "disconnected",
            qr_code: null,
          }).eq("id", instance_id);
        }
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "delete": {
        // Requer admintoken — tratamento especial
        const adminToken = Deno.env.get("UAZAPI_ADMIN_TOKEN");
        if (!adminToken) return bad("UAZAPI_ADMIN_TOKEN não configurado", 500);
        const res = await fetch(`${serverUrl}/instance`, {
          method: "DELETE",
          headers: { admintoken: adminToken, token },
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          await supabase.from("whatsapp_instances").delete().eq("id", instance_id);
        }
        return json({ success: res.ok, data }, res.ok ? 200 : 502);
      }

      case "profile_name": {
        const { name } = body;
        if (!name) return bad("name obrigatório");
        const r = await callPost("/profile/name", { name });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "profile_image": {
        const { image_url } = body;
        if (!image_url) return bad("image_url obrigatório");
        const r = await callPost("/profile/image", { image: image_url });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "presence": {
        const { presence } = body;
        if (!presence) return bad("presence obrigatório");
        const r = await callPost("/instance/presence", { presence });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      default:
        return bad(`ação desconhecida: ${action}`);
    }
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});
