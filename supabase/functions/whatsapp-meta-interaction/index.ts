// whatsapp-meta-interaction — mark as read + typing indicator outbound
//
// Body: { instance_id, action, ...params }
// Actions:
//   - mark_read:  { message_wamid, with_typing? }
//   - typing:     { message_wamid }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, bad } from "../_shared/whatsapp.ts";
import * as meta from "../_shared/providers/meta.ts";

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

    const { data: instance } = await supabase.from("whatsapp_instances")
      .select("*").eq("id", instance_id).maybeSingle();
    if (!instance) return bad("instância não encontrada", 404);
    if (instance.tipo !== "meta_oficial") return bad("instância não é Meta oficial", 400);

    const cfg = (instance.meta_config || {}) as meta.MetaConfig;

    if (!body.message_wamid) return bad("message_wamid obrigatório");

    switch (action) {
      case "mark_read": {
        const r = await meta.metaMarkAsRead(cfg, body.message_wamid, body.with_typing === true);
        return json({ success: r.ok, data: r.data, error: r.error }, r.ok ? 200 : 502);
      }
      case "typing": {
        const r = await meta.metaMarkAsRead(cfg, body.message_wamid, true);
        return json({ success: r.ok, data: r.data, error: r.error }, r.ok ? 200 : 502);
      }
      default:
        return bad(`ação desconhecida: ${action}`);
    }
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});
