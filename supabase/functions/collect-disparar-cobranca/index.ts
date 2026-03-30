import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { associado_id, canal = "whatsapp", template_nome, mensagem, telefone } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    
    // Registrar disparo
    const { data: disparo } = await supabase.from("cobracas_log").insert([{
      associado_id,
      canal,
      template_nome,
      mensagem,
      telefone,
      status: "enviado",
      created_at: new Date().toISOString()
    }]).select().single().catch(() => ({ data: { id: crypto.randomUUID() } }));
    
    // Se WhatsApp — enviar via UAZAPI (número central Objetivo)
    if (canal === "whatsapp" && telefone) {
      const UAZAPI_URL = Deno.env.get("UAZAPI_URL") || "https://trilhoassist.uazapi.com";
      const UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN") || "";
      if (UAZAPI_TOKEN) {
        await fetch(`${UAZAPI_URL}/send/text`, {
          method: "POST",
          headers: { "token": UAZAPI_TOKEN, "Content-Type": "application/json" },
          body: JSON.stringify({ number: telefone, text: mensagem || `Olá! Identificamos uma pendência em seu cadastro. Entre em contato: (11) 99999-0000` })
        });
      }
    }
    
    return new Response(JSON.stringify({ success: true, disparo_id: disparo?.id, canal, status: "enviado" }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch(e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
