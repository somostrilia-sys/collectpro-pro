// whatsapp-meta-analytics — conversation/template/pricing analytics
//
// Body: { instance_id, action, ...params }
// Actions:
//   - conversation: { start, end, granularity?, phone_numbers?, country_codes?, ... }
//   - template:     { start, end, template_ids[], metric_types? }
//   - pricing:      { start, end, granularity?, pricing_categories?, pricing_types?, ... }
//   - local_summary: { period_days? }             // agrega whatsapp_meta_details local

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, bad } from "../_shared/whatsapp.ts";
import * as meta from "../_shared/providers/meta.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return bad("Method not allowed", 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    const { instance_id, action } = body;
    if (!instance_id) return bad("instance_id obrigatório");

    const { data: instance } = await supabase.from("whatsapp_instances")
      .select("*").eq("id", instance_id).maybeSingle();
    if (!instance) return bad("instância não encontrada", 404);
    if (instance.tipo !== "meta_oficial") return bad("instância não é Meta oficial", 400);

    const cfg = (instance.meta_config || {}) as meta.MetaConfig;

    switch (action) {
      case "conversation": {
        const r = await meta.metaConversationAnalytics(cfg, {
          start: body.start, end: body.end,
          granularity: body.granularity ?? "DAILY",
          metric_types: body.metric_types,
          phone_numbers: body.phone_numbers,
          country_codes: body.country_codes,
          conversation_categories: body.conversation_categories,
          conversation_types: body.conversation_types,
          conversation_directions: body.conversation_directions,
          dimensions: body.dimensions,
        });
        return json({ success: r.ok, data: r.data, error: r.error }, r.ok ? 200 : 502);
      }

      case "template": {
        if (!Array.isArray(body.template_ids) || body.template_ids.length === 0) {
          return bad("template_ids obrigatório");
        }
        const r = await meta.metaTemplateAnalytics(cfg, {
          start: body.start, end: body.end,
          template_ids: body.template_ids,
          metric_types: body.metric_types,
          granularity: body.granularity,
        });
        return json({ success: r.ok, data: r.data, error: r.error }, r.ok ? 200 : 502);
      }

      case "pricing": {
        const r = await meta.metaPricingAnalytics(cfg, {
          start: body.start, end: body.end,
          granularity: body.granularity ?? "DAILY",
          metric_types: body.metric_types,
          phone_numbers: body.phone_numbers,
          country_codes: body.country_codes,
          pricing_categories: body.pricing_categories,
          pricing_types: body.pricing_types,
          dimensions: body.dimensions,
        });
        return json({ success: r.ok, data: r.data, error: r.error }, r.ok ? 200 : 502);
      }

      // Agrega dados locais (whatsapp_meta_details) — barato, sem hit na API
      case "local_summary": {
        const periodDays = body.period_days ?? 7;
        const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

        // Mensagens enviadas/recebidas Meta
        const [sent, received, failed, billed, byCategory] = await Promise.all([
          supabase.from("whatsapp_messages").select("id", { count: "exact", head: true })
            .eq("instance_id", instance_id).eq("provider_tipo", "meta")
            .eq("direction", "out").gte("criado_em", since),
          supabase.from("whatsapp_messages").select("id", { count: "exact", head: true })
            .eq("instance_id", instance_id).eq("provider_tipo", "meta")
            .eq("direction", "in").gte("criado_em", since),
          supabase.from("whatsapp_messages").select("id", { count: "exact", head: true })
            .eq("instance_id", instance_id).eq("provider_tipo", "meta")
            .eq("status", "failed").gte("criado_em", since),
          supabase.from("whatsapp_meta_details").select("pricing_category")
            .eq("pricing_billable", true)
            .gte("criado_em", since),
          supabase.from("whatsapp_meta_details")
            .select("pricing_category, pricing_type").gte("criado_em", since),
        ]);

        const byCat: Record<string, number> = {};
        for (const row of (byCategory.data ?? [])) {
          const k = `${row.pricing_category}_${row.pricing_type}`;
          byCat[k] = (byCat[k] ?? 0) + 1;
        }

        return json({
          success: true,
          period_days: periodDays,
          sent: sent.count ?? 0,
          received: received.count ?? 0,
          failed: failed.count ?? 0,
          billable_messages: billed.data?.length ?? 0,
          by_category_and_type: byCat,
        });
      }

      default:
        return bad(`ação desconhecida: ${action}`);
    }
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});
