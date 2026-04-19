// whatsapp-meta-handoff — transição Meta → UAZAPI (opcional)
//
// Fluxo padrão:
//   1. Cliente respondeu pelo Meta oficial (entrou em CSW)
//   2. Admin/Gestora ou atendente decide continuar atendimento pela UAZAPI dele
//   3. Este edge: envia template "handoff" pelo Meta informando, e cria assignment
//      UAZAPI pro chat (colaborador_id do atendente → telefone do cliente).
//
// Body: {
//   meta_instance_id: string,
//   telefone: string,
//   associado_id?: string,
//   colaborador_id: string,                // atendente de destino
//   uazapi_instance_id?: string,           // instância UAZAPI dele (auto-resolve se omitido)
//   handoff_template_name?: string,        // template Meta a enviar (default: "handoff_atendente")
//   handoff_template_language?: string,    // default: pt_BR
//   handoff_variables?: Record<string, string>,
// }

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
    const { meta_instance_id, telefone, colaborador_id } = body;
    if (!meta_instance_id || !telefone || !colaborador_id) {
      return bad("meta_instance_id, telefone e colaborador_id obrigatórios");
    }

    const templateName = body.handoff_template_name ?? "handoff_atendente";
    const templateLang = body.handoff_template_language ?? "pt_BR";

    // Resolve atendente
    const { data: attendant } = await supabase
      .from("profiles").select("id, full_name").eq("id", colaborador_id).maybeSingle();
    if (!attendant) return bad("atendente não encontrado", 404);

    // Resolve instância UAZAPI do atendente
    let uazapiInstanceId = body.uazapi_instance_id as string | null;
    if (!uazapiInstanceId) {
      const { data: inst } = await supabase
        .from("whatsapp_instances")
        .select("id")
        .eq("colaborador_id", colaborador_id)
        .eq("tipo", "colaborador")
        .eq("ativo", true)
        .maybeSingle();
      if (inst) uazapiInstanceId = inst.id;
    }

    // 1. Envia template handoff pelo Meta (via whatsapp-send)
    const sendBody: any = {
      instance_id: meta_instance_id,
      telefone,
      colaborador_id,
      template_id: null,
      // Passamos template "direto" na branch Meta
      variaveis: { atendente: attendant.full_name, ...(body.handoff_variables ?? {}) },
      skip_signature: true,
    };
    // Chama via fetch local pra reusar lógica completa
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Busca template localmente
    const { data: template } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .eq("meta_template_name", templateName)
      .eq("meta_language", templateLang)
      .eq("provider_tipo", "meta")
      .maybeSingle();

    if (!template) {
      return bad(`Template "${templateName}" (${templateLang}) não encontrado em whatsapp_templates`, 404);
    }
    sendBody.template_id = template.id;

    const sendRes = await fetch(`${supaUrl}/functions/v1/whatsapp-send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
      body: JSON.stringify(sendBody),
    });
    const sendData = await sendRes.json().catch(() => ({}));

    // 2. Cria assignment UAZAPI (se instância existir) OU Meta (se atendente continuará pelo Meta)
    let assignmentResult: any = null;
    if (uazapiInstanceId) {
      const assignRes = await fetch(`${supaUrl}/functions/v1/whatsapp-assignment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
        body: JSON.stringify({
          instance_id: uazapiInstanceId,
          action: "assign",
          provider_tipo: "uazapi",
          chat_jid: `${telefone}@s.whatsapp.net`,
          colaborador_id,
        }),
      });
      assignmentResult = await assignRes.json().catch(() => ({}));
    } else {
      // Assign no Meta — atendente vai continuar pelo canal oficial
      const assignRes = await fetch(`${supaUrl}/functions/v1/whatsapp-assignment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
        body: JSON.stringify({
          instance_id: meta_instance_id,
          action: "assign",
          provider_tipo: "meta",
          telefone,
          colaborador_id,
        }),
      });
      assignmentResult = await assignRes.json().catch(() => ({}));
    }

    // 3. Auditoria
    await supabase.from("whatsapp_audit_log").insert({
      instance_id: meta_instance_id,
      colaborador_id,
      action_type: "handoff",
      entity_type: "chat",
      entity_id: telefone,
      metadata: {
        telefone,
        attendant_name: attendant.full_name,
        uazapi_instance_id: uazapiInstanceId,
        send_result: sendData,
        assignment_result: assignmentResult,
      },
    }).then(() => {}).catch(() => {});

    return json({
      success: sendData?.success === true,
      template_sent: sendData,
      assignment: assignmentResult,
      attendant: attendant.full_name,
      routed_to: uazapiInstanceId ? "uazapi" : "meta",
    });
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});
