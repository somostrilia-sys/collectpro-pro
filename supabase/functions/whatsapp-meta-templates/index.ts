// whatsapp-meta-templates — CRUD de Message Templates via Business Management API
//
// Body: { instance_id, action, ...params }
// Actions:
//   - list:       { }                                          // lista templates Meta + sync local
//   - list_local: { status?, category? }                       // só leitura local
//   - create:     { name, category, language, components[] }   // cria na Meta
//   - delete:     { name, hsm_id? }                            // deleta na Meta
//   - sync:       { }                                          // sincroniza tudo Meta → local

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
    if (!action) return bad("action obrigatória");

    const { data: instance } = await supabase.from("whatsapp_instances")
      .select("*").eq("id", instance_id).maybeSingle();
    if (!instance) return bad("instância não encontrada", 404);
    if (instance.tipo !== "meta_oficial") return bad("instância não é Meta oficial", 400);

    const cfg = (instance.meta_config || {}) as meta.MetaConfig;
    const wabaId = cfg.waba_id;
    if (!wabaId) return bad("waba_id não configurado", 400);

    switch (action) {
      case "list": {
        const r = await meta.metaListTemplates(cfg, 200);
        if (r.ok) await syncTemplates(supabase, wabaId, r.data?.data ?? []);
        return json({ success: r.ok, templates: r.data?.data ?? [], error: r.error }, r.ok ? 200 : 502);
      }

      case "list_local": {
        let q = supabase.from("whatsapp_meta_templates")
          .select("*")
          .eq("waba_id", wabaId)
          .order("name", { ascending: true });
        if (body.status) q = q.eq("status", body.status);
        if (body.category) q = q.eq("category", body.category);
        const { data } = await q;
        return json({ success: true, templates: data ?? [] });
      }

      case "create": {
        const { name, category, language, components } = body;
        if (!name || !category || !language || !components) {
          return bad("name, category, language, components obrigatórios");
        }
        const r = await meta.metaCreateTemplate(cfg, { name, category, language, components });
        if (r.ok) {
          await supabase.from("whatsapp_meta_templates").upsert({
            waba_id: wabaId,
            external_id: String(r.data?.id ?? ""),
            name, language, category,
            status: r.data?.status ?? "PENDING",
            components,
          }, { onConflict: "waba_id,name,language" });
        }
        return json({ success: r.ok, data: r.data, error: r.error }, r.ok ? 200 : 502);
      }

      case "delete": {
        const { name, hsm_id } = body;
        if (!name) return bad("name obrigatório");
        const r = await meta.metaDeleteTemplate(cfg, name, hsm_id);
        if (r.ok) {
          await supabase.from("whatsapp_meta_templates")
            .update({ status: "DISABLED", atualizado_em: new Date().toISOString() })
            .eq("waba_id", wabaId).eq("name", name);
        }
        return json({ success: r.ok, data: r.data, error: r.error }, r.ok ? 200 : 502);
      }

      case "sync": {
        const r = await meta.metaListTemplates(cfg, 500);
        if (!r.ok) return json({ success: false, error: r.error }, 502);
        const count = await syncTemplates(supabase, wabaId, r.data?.data ?? []);
        return json({ success: true, synced: count });
      }

      default:
        return bad(`ação desconhecida: ${action}`);
    }
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});

async function syncTemplates(supabase: any, wabaId: string, templates: any[]): Promise<number> {
  let count = 0;
  for (const t of templates) {
    await supabase.from("whatsapp_meta_templates").upsert({
      waba_id: wabaId,
      external_id: String(t.id ?? ""),
      name: t.name,
      language: t.language,
      category: t.category,
      status: t.status,
      components: t.components ?? [],
      quality_score: t.quality_score?.score ?? null,
      rejection_reason: t.rejected_reason ?? null,
      last_synced_at: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    }, { onConflict: "waba_id,name,language" });
    count++;
  }
  return count;
}
