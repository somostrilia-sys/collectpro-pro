import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { company_id, dias_atraso_min = 5 } = await req.json().catch(() => ({}));
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    
    // Buscar associados com boletos vencidos
    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() - dias_atraso_min);
    
    const { data: associados, count } = await supabase.from("associados")
      .select("id,nome,telefone,email,situacao", { count: "exact" })
      .eq("situacao", "ativo")
      .limit(200);
    
    // Por enquanto retorna ativos — quando integrar SGA boletos, filtrar inadimplentes
    return new Response(JSON.stringify({
      success: true,
      total: count || 0,
      associados: associados || [],
      filtro: { dias_atraso_min, vencimento_antes: vencimento.toISOString() }
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch(e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
