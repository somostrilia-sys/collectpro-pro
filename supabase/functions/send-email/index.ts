import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is authenticated
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { to, subject, html, text, tipo, associado_id } = await req.json();

    if (!to || !subject) {
      return new Response(JSON.stringify({ error: "Campos 'to' e 'subject' são obrigatórios" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Enviar via Resend (configurar RESEND_API_KEY nas env vars do Supabase)
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (resendKey) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: Deno.env.get("EMAIL_FROM") || "CollectPro <noreply@collectpro.com.br>",
          to: Array.isArray(to) ? to : [to],
          subject,
          html: html || undefined,
          text: text || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Erro ao enviar email via Resend");
      }

      // Log o envio
      await supabase.from("cobracas_log").insert({
        associado_id: associado_id || null,
        canal: "email",
        template_nome: tipo || "email_manual",
        mensagem: subject,
        status: "enviado",
      }).catch(() => {}); // Silently fail log

      return new Response(JSON.stringify({ success: true, id: result.id }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Fallback: SMTP via fetch (se não tiver Resend, loga mas não envia)
    // Log a tentativa
    await supabase.from("cobracas_log").insert({
      associado_id: associado_id || null,
      canal: "email",
      template_nome: tipo || "email_manual",
      mensagem: `[SEM PROVIDER] ${subject} -> ${to}`,
      status: "falha",
    }).catch(() => {});

    return new Response(JSON.stringify({
      success: false,
      error: "RESEND_API_KEY não configurada. Configure nas variáveis de ambiente do Supabase.",
      logged: true,
    }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
