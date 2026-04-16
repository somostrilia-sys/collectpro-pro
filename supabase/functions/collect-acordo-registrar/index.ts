import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { associado_id, valor_original, valor_acordo, parcelas = 1, vencimento_1 } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    
    const valor_parcela = valor_acordo / parcelas;
    const parcelasArr = Array.from({ length: parcelas }, (_, i) => {
      const venc = new Date(vencimento_1 || new Date());
      venc.setMonth(venc.getMonth() + i);
      return { numero: i + 1, valor: valor_parcela, vencimento: venc.toISOString().slice(0, 10), status: "pendente" };
    });
    
    // Salvar acordo
    const { data: acordo, error: insertError } = await supabase.from("acordos").insert([{
      associado_id,
      valor_original,
      valor_acordo,
      parcelas,
      parcelas_detalhes: parcelasArr,
      status: "ativo",
      created_at: new Date().toISOString()
    }]).select().single();
    if (insertError) throw insertError;
    
    return new Response(JSON.stringify({ success: true, acordo_id: acordo?.id, parcelas: parcelasArr }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch(e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
