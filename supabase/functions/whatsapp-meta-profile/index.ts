// whatsapp-meta-profile — Business Profile + Phone Numbers + 2FA
//
// Body: { instance_id, action, ...params }
// Actions:
//   - get_profile:        { }
//   - update_profile:     { about?, address?, description?, email?, websites?, vertical?, profile_picture_handle? }
//   - list_phones:        { }
//   - get_phone:          { }     // detalhes do phone_number_id atual (quality, messaging_limit)
//   - request_code:       { method?, language? }
//   - verify_code:        { code }
//   - register:           { pin }
//   - deregister:         { }
//   - set_2fa_pin:        { pin }

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

    let r: meta.MetaResult;
    switch (action) {
      case "get_profile":
        r = await meta.metaGetBusinessProfile(cfg);
        break;
      case "update_profile":
        r = await meta.metaUpdateBusinessProfile(cfg, body);
        break;
      case "list_phones":
        r = await meta.metaListPhoneNumbers(cfg);
        break;
      case "get_phone":
        r = await meta.metaGetPhoneNumber(cfg);
        // Registra quality rating atual no log se veio
        if (r.ok && r.data) {
          await supabase.from("whatsapp_meta_phone_quality_log").insert({
            instance_id,
            phone_number_id: String(cfg.phone_number_id ?? ""),
            quality_rating: r.data.quality_rating ?? null,
            messaging_limit: r.data.whatsapp_business_manager_messaging_limit ?? null,
          }).then(() => {}).catch(() => {});
        }
        break;
      case "request_code":
        r = await meta.metaRequestCode(cfg, body.method ?? "SMS", body.language ?? "pt_BR");
        break;
      case "verify_code":
        if (!body.code) return bad("code obrigatório");
        r = await meta.metaVerifyCode(cfg, body.code);
        break;
      case "register":
        if (!body.pin) return bad("pin obrigatório");
        r = await meta.metaRegister(cfg, body.pin);
        break;
      case "deregister":
        r = await meta.metaDeregister(cfg);
        break;
      case "set_2fa_pin":
        if (!body.pin) return bad("pin obrigatório");
        r = await meta.metaSet2FAPin(cfg, body.pin);
        break;
      default:
        return bad(`ação desconhecida: ${action}`);
    }

    return json({ success: r.ok, data: r.data, error: r.error }, r.ok ? 200 : 502);
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});
