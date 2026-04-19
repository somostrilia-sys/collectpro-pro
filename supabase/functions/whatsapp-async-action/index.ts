// whatsapp-async-action — gestão da fila async UAZAPI
//
// Body: { instance_id: string, action: string, ...params }
// Actions:
//   - get: {}                // GET /message/async — lista fila
//   - clear: {}              // DELETE /message/async — limpa fila

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

    if (action === "get") {
      const res = await fetch(`${serverUrl}/message/async`, { headers: { token } });
      const data = await res.json().catch(() => ({}));
      return json({ success: res.ok, data }, res.ok ? 200 : 502);
    }
    if (action === "clear") {
      const res = await fetch(`${serverUrl}/message/async`, { method: "DELETE", headers: { token } });
      const data = await res.json().catch(() => ({}));
      return json({ success: res.ok, data }, res.ok ? 200 : 502);
    }

    return bad(`ação desconhecida: ${action}`);
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});
