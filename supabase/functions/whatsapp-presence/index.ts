// whatsapp-presence — envia presença (digitando, gravando, pausado, online)
//
// Body: {
//   instance_id: string,
//   chat_jid?: string | telefone?: string,  // pra enviar presence na conversa
//   presence: "composing" | "recording" | "paused" | "available" | "unavailable"
// }
//
// Também: endpoint global de presença da instância via ?mode=instance
// Body: { instance_id, presence: "online" | "offline" }

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
    const { instance_id, chat_jid, telefone, presence, mode } = body;
    if (!instance_id) return bad("instance_id obrigatório");
    if (!presence) return bad("presence obrigatória");

    const { data: instance } = await supabase.from("whatsapp_instances")
      .select("*").eq("id", instance_id).maybeSingle();
    if (!instance?.token) return bad("instância sem token", 400);

    const serverUrl = instance.servidor_url || "https://trilhoassist.uazapi.com";

    // Modo instância (global presence)
    if (mode === "instance") {
      const r = await fetch(`${serverUrl}/instance/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: instance.token },
        body: JSON.stringify({ presence }),
      });
      const data = await r.json().catch(() => ({}));
      return json({ success: r.ok, data }, r.ok ? 200 : 502);
    }

    // Modo chat específico
    const number = chat_jid || telefone;
    if (!number) return bad("chat_jid ou telefone obrigatório (ou mode=instance)");

    const r = await fetch(`${serverUrl}/message/presence`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: instance.token },
      body: JSON.stringify({ number, presence }),
    });
    const data = await r.json().catch(() => ({}));
    return json({ success: r.ok, data }, r.ok ? 200 : 502);
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});
