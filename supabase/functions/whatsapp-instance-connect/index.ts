// whatsapp-instance-connect — cria/reconecta instância uazapi e retorna QR
// Body: { instance_id: string }
// Fluxo:
//   1. Se instance_name vazio: gera e chama /instance/init (admin token) -> pega token
//   2. Chama /instance/connect -> pega QR
//   3. Persiste qr_code, qr_expires_at, status = 'qr_pending'
//   4. Frontend polla whatsapp-instance-status até status = 'connected'

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders, json, bad,
  uazapiAdminCreateInstance, uazapiConnect, uazapiSetWebhook,
} from "../_shared/whatsapp.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return bad("Method not allowed", 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { instance_id } = await req.json();
    if (!instance_id) return bad("instance_id obrigatório");

    const { data: inst, error } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("id", instance_id)
      .maybeSingle();
    if (error || !inst) return bad("Instância não encontrada", 404);
    if (inst.tipo === "meta_oficial") return bad("Meta não usa QR — configure via painel", 400);

    let token = inst.token;
    let instanceName = inst.instance_name;

    // 1. Criar instância no uazapi se ainda não tem token
    if (!token) {
      instanceName = instanceName || `collectpro-${inst.tipo}-${String(inst.id).slice(0, 8)}`;
      const created = await uazapiAdminCreateInstance(instanceName);
      if (!created.ok || !created.token) {
        return bad(`Falha ao criar instância uazapi: ${JSON.stringify(created.data)}`, 502);
      }
      token = created.token;
      await supabase.from("whatsapp_instances").update({
        instance_name: instanceName,
        token,
        status: "qr_pending",
      }).eq("id", inst.id);
    }

    // 2. Connect -> QR
    const r = await uazapiConnect(token);
    if (!r.ok) {
      return bad(`Falha ao conectar: ${JSON.stringify(r.data)}`, 502);
    }

    const qr = r.qr;
    const qrExpires = new Date(Date.now() + 60_000).toISOString(); // 60s TTL

    await supabase.from("whatsapp_instances").update({
      qr_code: qr,
      qr_expires_at: qrExpires,
      status: qr ? "qr_pending" : "connected",
      last_sync_at: new Date().toISOString(),
    }).eq("id", inst.id);

    // 3. Configurar webhook da instância (aponta pra nosso endpoint)
    //    Fire-and-forget: não falha a conexão se webhook falhar
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://ptmttmqprbullvgulyhb.supabase.co";
    const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook-uazapi`;
    let webhookConfigured = false;
    let webhookError: string | null = null;
    try {
      const wh = await uazapiSetWebhook(token, webhookUrl);
      webhookConfigured = wh.ok;
      if (!wh.ok) webhookError = JSON.stringify(wh.data).slice(0, 200);
    } catch (e: any) {
      webhookError = e.message;
    }

    return json({
      success: true,
      qr_code: qr,
      qr_expires_at: qrExpires,
      instance_name: instanceName,
      status: qr ? "qr_pending" : "connected",
      webhook_configured: webhookConfigured,
      webhook_error: webhookError,
    });
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});
