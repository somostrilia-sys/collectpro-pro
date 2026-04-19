// whatsapp-scheduler — processa mensagens agendadas (chamado por cron)
//
// Busca whatsapp_scheduled_messages onde status=pending AND scheduled_for <= now
// Envia cada uma via whatsapp-send e atualiza status.
// Pode ser chamada manualmente ou via Supabase cron:
//   SELECT cron.schedule('wa-scheduler', '* * * * *',
//     $$ SELECT net.http_post(
//       url := 'https://<ref>.supabase.co/functions/v1/whatsapp-scheduler',
//       headers := '{"Authorization": "Bearer <service_key>"}'::jsonb
//     ) $$);

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, bad } from "../_shared/whatsapp.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const now = new Date().toISOString();

    // Busca agendadas que venceram
    const { data: scheduled } = await supabase.from("whatsapp_scheduled_messages")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", now)
      .limit(50)
      .order("scheduled_for", { ascending: true });

    if (!scheduled || scheduled.length === 0) {
      return json({ success: true, processed: 0 });
    }

    const results: any[] = [];
    for (const item of scheduled) {
      try {
        // Marca como processing
        await supabase.from("whatsapp_scheduled_messages")
          .update({ status: "processing", tentativas: (item.tentativas ?? 0) + 1 })
          .eq("id", item.id);

        // Se é follow-up automático, checa se cliente respondeu depois que foi agendado
        if (item.automation_id) {
          const { count: hasReplied } = await supabase.from("whatsapp_messages")
            .select("id", { count: "exact", head: true })
            .eq("instance_id", item.instance_id)
            .eq("telefone", item.telefone)
            .eq("direction", "in")
            .gt("criado_em", item.criado_em);
          if (hasReplied && hasReplied > 0) {
            await supabase.from("whatsapp_scheduled_messages")
              .update({ status: "cancelled", erro: "cliente respondeu antes do follow-up" })
              .eq("id", item.id);
            results.push({ id: item.id, status: "cancelled" });
            continue;
          }
        }

        // Envia
        const sendBody: any = {
          instance_id: item.instance_id,
          telefone: item.telefone,
          chat_jid: item.chat_jid ?? undefined,
          associado_id: item.associado_id ?? undefined,
          colaborador_id: item.colaborador_id ?? undefined,
          skip_signature: item.automation_id ? true : false,
          ...item.payload,
        };

        const { data: sendResult, error: sendErr } = await supabase.functions.invoke("whatsapp-send", {
          body: sendBody,
        });

        if (sendErr || !sendResult?.success) {
          await supabase.from("whatsapp_scheduled_messages")
            .update({ status: "failed", erro: sendErr?.message || sendResult?.error || "erro no envio" })
            .eq("id", item.id);
          results.push({ id: item.id, status: "failed", error: sendErr?.message });
        } else {
          await supabase.from("whatsapp_scheduled_messages")
            .update({ status: "sent", message_id: sendResult.message_id })
            .eq("id", item.id);
          results.push({ id: item.id, status: "sent", message_id: sendResult.message_id });
        }
      } catch (e: any) {
        await supabase.from("whatsapp_scheduled_messages")
          .update({ status: "failed", erro: e.message })
          .eq("id", item.id);
        results.push({ id: item.id, status: "failed", error: e.message });
      }
    }

    return json({ success: true, processed: results.length, results });
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});
