// whatsapp-instance-status — consulta status real no uazapi e atualiza tabela
// Body: { instance_id: string } ou GET ?id=...

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, bad, uazapiStatus } from "../_shared/whatsapp.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    let instanceId: string | null = null;
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      instanceId = body.instance_id ?? null;
    } else {
      instanceId = new URL(req.url).searchParams.get("id");
    }
    if (!instanceId) return bad("instance_id obrigatório");

    const { data: inst } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("id", instanceId)
      .maybeSingle();
    if (!inst) return bad("Instância não encontrada", 404);

    if (inst.tipo === "meta_oficial") {
      // Meta: status sempre connected se tiver token
      const hasToken = !!inst.meta_config?.access_token && !!inst.meta_config?.phone_number_id;
      const status = hasToken ? "connected" : "disconnected";
      await supabase.from("whatsapp_instances").update({
        status, last_sync_at: new Date().toISOString(),
      }).eq("id", inst.id);
      return json({ success: true, status });
    }

    if (!inst.token) return json({ success: true, status: "disconnected" });

    const r = await uazapiStatus(inst.token);
    const upd: any = {
      status: r.status,
      last_sync_at: new Date().toISOString(),
    };
    if (r.status === "connected") {
      upd.qr_code = null;
      upd.qr_expires_at = null;
      // UAZAPI retorna JID em `owner` ou `jid` (ex: 5511999998888@s.whatsapp.net)
      const rawJid = r.data?.instance?.owner ?? r.data?.jid ?? r.data?.instance?.jid ?? "";
      const phone = String(rawJid).split("@")[0].replace(/\D/g, "");
      if (phone) upd.telefone = phone;
    }
    await supabase.from("whatsapp_instances").update(upd).eq("id", inst.id);

    return json({ success: true, status: r.status, raw: r.data });
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});
