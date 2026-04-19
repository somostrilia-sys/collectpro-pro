// whatsapp-quickreply-action — respostas rápidas (snippets)
//
// Body: { instance_id: string, action: string, ...params }
// Actions:
//   - list: { }                                // GET /quickreply/showall (UAZAPI)
//   - list_local: { colaborador_id?, categoria?, global_only? }
//   - create: { atalho, conteudo, categoria?, variaveis?, global? }
//   - update: { id, atalho?, conteudo?, categoria?, variaveis?, ativo? }
//   - delete: { id }
//   - sync_to_uazapi: { id }                    // cria/atualiza no UAZAPI (/quickreply/edit)
//   - sync_from_uazapi: { }                     // puxa todas da UAZAPI pro banco

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
    const { instance_id, action } = body;
    if (!instance_id) return bad("instance_id obrigatório");
    if (!action) return bad("action obrigatória");

    const { data: instance } = await supabase.from("whatsapp_instances")
      .select("*").eq("id", instance_id).maybeSingle();
    if (!instance) return bad("instância não encontrada", 404);

    switch (action) {
      case "list": {
        // Lista do UAZAPI
        if (!instance.token) return bad("instância sem token", 400);
        const serverUrl = instance.servidor_url || "https://trilhoassist.uazapi.com";
        const res = await fetch(`${serverUrl}/quickreply/showall`, {
          headers: { token: instance.token },
        });
        const data = await res.json().catch(() => ({}));
        return json({ success: res.ok, data }, res.ok ? 200 : 502);
      }

      case "list_local": {
        const { colaborador_id, categoria, global_only } = body;
        let q = supabase.from("whatsapp_quick_replies")
          .select("*")
          .eq("ativo", true)
          .eq("instance_id", instance_id);
        if (global_only === true) {
          q = q.eq("global", true);
        } else if (colaborador_id) {
          // Vê suas + globais
          q = q.or(`colaborador_id.eq.${colaborador_id},global.eq.true`);
        }
        if (categoria) q = q.eq("categoria", categoria);
        q = q.order("atalho", { ascending: true });
        const { data, error } = await q;
        if (error) return bad(error.message);
        return json({ success: true, items: data ?? [] });
      }

      case "create": {
        const { atalho, conteudo, categoria, variaveis, global, colaborador_id } = body;
        if (!atalho || !conteudo) return bad("atalho e conteudo obrigatórios");
        const { data, error } = await supabase.from("whatsapp_quick_replies").insert({
          instance_id,
          colaborador_id: global === true ? null : (colaborador_id ?? null),
          atalho,
          conteudo,
          categoria: categoria ?? null,
          variaveis: variaveis ?? [],
          global: global === true,
          ativo: true,
        }).select().single();
        if (error) return bad(error.message);
        return json({ success: true, item: data });
      }

      case "update": {
        const { id, atalho, conteudo, categoria, variaveis, ativo } = body;
        if (!id) return bad("id obrigatório");
        const update: any = {};
        if (atalho !== undefined) update.atalho = atalho;
        if (conteudo !== undefined) update.conteudo = conteudo;
        if (categoria !== undefined) update.categoria = categoria;
        if (variaveis !== undefined) update.variaveis = variaveis;
        if (ativo !== undefined) update.ativo = ativo;
        const { data, error } = await supabase.from("whatsapp_quick_replies")
          .update(update).eq("id", id).select().single();
        if (error) return bad(error.message);
        return json({ success: true, item: data });
      }

      case "delete": {
        const { id } = body;
        if (!id) return bad("id obrigatório");
        await supabase.from("whatsapp_quick_replies").delete().eq("id", id);
        return json({ success: true });
      }

      case "sync_to_uazapi": {
        const { id } = body;
        if (!id) return bad("id obrigatório");
        if (!instance.token) return bad("instância sem token", 400);
        const { data: qr } = await supabase.from("whatsapp_quick_replies")
          .select("*").eq("id", id).single();
        if (!qr) return bad("resposta rápida não encontrada", 404);

        const serverUrl = instance.servidor_url || "https://trilhoassist.uazapi.com";
        const res = await fetch(`${serverUrl}/quickreply/edit`, {
          method: "POST",
          headers: { "Content-Type": "application/json", token: instance.token },
          body: JSON.stringify({
            id: qr.external_id ?? undefined,
            shortCut: qr.atalho,
            type: "text",
            text: qr.conteudo,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.id && !qr.external_id) {
          await supabase.from("whatsapp_quick_replies")
            .update({ external_id: String(data.id) })
            .eq("id", id);
        }
        return json({ success: res.ok, data }, res.ok ? 200 : 502);
      }

      case "sync_from_uazapi": {
        if (!instance.token) return bad("instância sem token", 400);
        const serverUrl = instance.servidor_url || "https://trilhoassist.uazapi.com";
        const res = await fetch(`${serverUrl}/quickreply/showall`, {
          headers: { token: instance.token },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return json({ success: false, data }, 502);

        const list = data?.quickreplies ?? data?.data ?? data ?? [];
        let count = 0;
        for (const qr of (Array.isArray(list) ? list : [])) {
          const extId = String(qr.id ?? qr.shortcut);
          const { data: existing } = await supabase.from("whatsapp_quick_replies")
            .select("id")
            .eq("instance_id", instance_id)
            .eq("external_id", extId)
            .maybeSingle();

          if (existing) {
            await supabase.from("whatsapp_quick_replies").update({
              atalho: qr.shortcut ?? qr.atalho,
              conteudo: qr.message ?? qr.conteudo,
              categoria: qr.category ?? qr.categoria ?? null,
              global: true,
            }).eq("id", existing.id);
          } else {
            await supabase.from("whatsapp_quick_replies").insert({
              instance_id,
              external_id: extId,
              atalho: qr.shortcut ?? qr.atalho ?? "?",
              conteudo: qr.message ?? qr.conteudo ?? "",
              categoria: qr.category ?? qr.categoria ?? null,
              global: true,
              ativo: true,
            });
          }
          count++;
        }
        return json({ success: true, synced: count });
      }

      default:
        return bad(`ação desconhecida: ${action}`);
    }
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});
