import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { company_id, dias_atraso_min = 5 } = await req.json().catch(() => ({}));
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Calcular data limite de vencimento
    const vencimentoLimite = new Date();
    vencimentoLimite.setDate(vencimentoLimite.getDate() - dias_atraso_min);
    const vencimentoStr = vencimentoLimite.toISOString().slice(0, 10);

    // Buscar boletos vencidos (status aberto/vencido e data anterior ao limite)
    const { data: boletosVencidos } = await supabase
      .from("boletos")
      .select("associado_id, valor, vencimento")
      .in("status", ["aberto", "vencido"])
      .lt("vencimento", vencimentoStr);

    // Agrupar por associado_id
    const associadoIds = [...new Set((boletosVencidos || []).map(b => b.associado_id).filter(Boolean))];

    if (associadoIds.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        total: 0,
        associados: [],
        filtro: { dias_atraso_min, vencimento_antes: vencimentoStr }
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Buscar dados dos associados inadimplentes
    const { data: associados, count } = await supabase
      .from("associados")
      .select("id,nome,telefone,email,situacao", { count: "exact" })
      .in("id", associadoIds.slice(0, 200));

    // Calcular total em aberto por associado
    const debitoPorAssociado: Record<string, number> = {};
    (boletosVencidos || []).forEach(b => {
      if (b.associado_id) {
        debitoPorAssociado[b.associado_id] = (debitoPorAssociado[b.associado_id] || 0) + (b.valor || 0);
      }
    });

    const resultado = (associados || []).map(a => ({
      ...a,
      valor_em_aberto: debitoPorAssociado[a.id] || 0,
    }));

    return new Response(JSON.stringify({
      success: true,
      total: count || 0,
      associados: resultado,
      filtro: { dias_atraso_min, vencimento_antes: vencimentoStr }
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch(e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
