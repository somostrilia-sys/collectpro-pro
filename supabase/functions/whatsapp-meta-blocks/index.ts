// whatsapp-meta-blocks — bloqueio/desbloqueio/listagem de usuários
//
// Body: { instance_id, action, ...params }
// Actions:
//   - block:   { users: string[] }      // números a bloquear
//   - unblock: { users: string[] }
//   - list:    { }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, bad, normalizePhone } from "../_shared/whatsapp.ts";
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

    switch (action) {
      case "block": {
        const users: string[] = (body.users ?? []).map((u: string) => normalizePhone(u));
        if (users.length === 0) return bad("users obrigatório");
        const r = await meta.metaBlockUsers(cfg, users);
        if (r.ok) {
          for (const u of users) {
            await supabase.from("whatsapp_blocks").upsert({
              instance_id,
              jid: `${u}@s.whatsapp.net`,
              telefone: u,
            }, { onConflict: "instance_id,jid" }).then(() => {}).catch(() => {});
          }
        }
        return json({ success: r.ok, data: r.data, error: r.error }, r.ok ? 200 : 502);
      }

      case "unblock": {
        const users: string[] = (body.users ?? []).map((u: string) => normalizePhone(u));
        if (users.length === 0) return bad("users obrigatório");
        const r = await meta.metaUnblockUsers(cfg, users);
        if (r.ok) {
          for (const u of users) {
            await supabase.from("whatsapp_blocks")
              .delete()
              .eq("instance_id", instance_id)
              .eq("telefone", u);
          }
        }
        return json({ success: r.ok, data: r.data, error: r.error }, r.ok ? 200 : 502);
      }

      case "list": {
        const r = await meta.metaListBlockedUsers(cfg);
        return json({ success: r.ok, data: r.data, error: r.error }, r.ok ? 200 : 502);
      }

      default:
        return bad(`ação desconhecida: ${action}`);
    }
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});
