// whatsapp-admin-dashboard — métricas consolidadas pra admin/gestora
//
// Body: { action: string, ...params }
// Actions:
//   - overview: { period_days? }               // visão geral
//   - instance_metrics: { instance_id? }       // métricas de 1 ou todas instâncias
//   - attendant_metrics: { }                   // ranking de atendentes
//   - send_log: { limit?, offset?, instance_id? }
//   - webhook_log: { limit?, offset?, erro_only? }
//   - audit_log: { limit?, offset?, colaborador_id?, action_type? }
//   - optouts: { limit?, offset? }
//   - alerts: { }                              // alertas ativos

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
    // Verificar caller é admin/gestora
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return bad("Não autorizado", 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabase.auth.getUser(token);
    if (!caller) return bad("Token inválido", 401);

    const { data: profile } = await supabase.from("profiles")
      .select("role").eq("id", caller.id).single();
    if (!["admin", "gestora", "diretor"].includes(profile?.role || "")) {
      return bad("Acesso negado (requer admin/gestora)", 403);
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "overview": {
        const periodDays = body.period_days ?? 7;
        const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

        const [
          { count: totalMsgs },
          { count: totalSent },
          { count: totalRcvd },
          { count: totalFailed },
          { count: totalInstances },
          { count: connectedInstances },
          { count: totalContacts },
          { count: totalGroups },
          { count: activeConvs },
          { count: totalOptouts },
        ] = await Promise.all([
          supabase.from("whatsapp_messages").select("id", { count: "exact", head: true }).gte("criado_em", since),
          supabase.from("whatsapp_messages").select("id", { count: "exact", head: true }).eq("direction", "out").gte("criado_em", since),
          supabase.from("whatsapp_messages").select("id", { count: "exact", head: true }).eq("direction", "in").gte("criado_em", since),
          supabase.from("whatsapp_messages").select("id", { count: "exact", head: true }).eq("status", "failed").gte("criado_em", since),
          supabase.from("whatsapp_instances").select("id", { count: "exact", head: true }),
          supabase.from("whatsapp_instances").select("id", { count: "exact", head: true }).eq("status", "connected"),
          supabase.from("whatsapp_contacts").select("id", { count: "exact", head: true }),
          supabase.from("whatsapp_groups").select("id", { count: "exact", head: true }),
          supabase.from("whatsapp_messages").select("telefone", { count: "exact", head: true }).gte("criado_em", since),
          supabase.from("whatsapp_optouts").select("id", { count: "exact", head: true }).is("revogado_em", null),
        ]);

        // Taxa de entrega
        const { data: deliveryData } = await supabase.from("whatsapp_messages")
          .select("status", { count: "exact" })
          .eq("direction", "out")
          .gte("criado_em", since)
          .in("status", ["delivered", "read"]);
        const deliveryRate = totalSent ? ((deliveryData?.length || 0) / totalSent) * 100 : 0;

        return json({
          success: true,
          period_days: periodDays,
          metrics: {
            total_messages: totalMsgs || 0,
            sent: totalSent || 0,
            received: totalRcvd || 0,
            failed: totalFailed || 0,
            total_instances: totalInstances || 0,
            connected_instances: connectedInstances || 0,
            total_contacts: totalContacts || 0,
            total_groups: totalGroups || 0,
            active_conversations: activeConvs || 0,
            active_optouts: totalOptouts || 0,
            delivery_rate: Math.round(deliveryRate * 10) / 10,
            failure_rate: totalSent ? Math.round(((totalFailed || 0) / totalSent) * 1000) / 10 : 0,
          },
        });
      }

      case "instance_metrics": {
        let q = (supabase as any).from("v_whatsapp_instance_metrics").select("*");
        if (body.instance_id) q = q.eq("instance_id", body.instance_id);
        const { data } = await q;
        return json({ success: true, instances: data ?? [] });
      }

      case "attendant_metrics": {
        const { data } = await (supabase as any)
          .from("v_whatsapp_attendant_metrics")
          .select("*")
          .order("msgs_enviadas_30d", { ascending: false });
        return json({ success: true, attendants: data ?? [] });
      }

      case "send_log": {
        const { limit, offset, instance_id } = body;
        let q = supabase.from("whatsapp_send_attempts")
          .select("*")
          .order("criado_em", { ascending: false });
        if (instance_id) q = q.eq("instance_id", instance_id);
        q = q.range(offset ?? 0, (offset ?? 0) + (limit ?? 50) - 1);
        const { data } = await q;
        return json({ success: true, attempts: data ?? [] });
      }

      case "webhook_log": {
        const { limit, offset, erro_only } = body;
        let q = supabase.from("whatsapp_webhooks_raw")
          .select("id, provider_tipo, event_type, processado, erro, criado_em")
          .order("criado_em", { ascending: false });
        if (erro_only) q = q.not("erro", "is", null);
        q = q.range(offset ?? 0, (offset ?? 0) + (limit ?? 50) - 1);
        const { data } = await q;
        return json({ success: true, webhooks: data ?? [] });
      }

      case "audit_log": {
        const { limit, offset, colaborador_id, action_type } = body;
        let q = supabase.from("whatsapp_audit_log")
          .select("*")
          .order("criado_em", { ascending: false });
        if (colaborador_id) q = q.eq("colaborador_id", colaborador_id);
        if (action_type) q = q.eq("action_type", action_type);
        q = q.range(offset ?? 0, (offset ?? 0) + (limit ?? 100) - 1);
        const { data } = await q;
        return json({ success: true, audit: data ?? [] });
      }

      case "optouts": {
        const { limit, offset } = body;
        const { data } = await supabase.from("whatsapp_optouts")
          .select("*")
          .is("revogado_em", null)
          .order("optado_em", { ascending: false })
          .range(offset ?? 0, (offset ?? 0) + (limit ?? 100) - 1);
        return json({ success: true, optouts: data ?? [] });
      }

      case "alerts": {
        const alerts: any[] = [];

        // Instâncias desconectadas
        const { data: disconnected } = await supabase.from("whatsapp_instances")
          .select("id, nome, status, last_sync_at")
          .in("status", ["disconnected", "banned", "error"])
          .eq("ativo", true);
        (disconnected ?? []).forEach((i: any) => {
          alerts.push({
            type: "instance_disconnected",
            severity: i.status === "banned" ? "critical" : "warning",
            title: `Instância ${i.nome} ${i.status}`,
            instance_id: i.id,
            since: i.last_sync_at,
          });
        });

        // Taxa de erro alta (últimas 24h)
        const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: totalSent24 } = await supabase.from("whatsapp_messages")
          .select("id", { count: "exact", head: true })
          .eq("direction", "out")
          .gte("criado_em", since24);
        const { count: totalFailed24 } = await supabase.from("whatsapp_messages")
          .select("id", { count: "exact", head: true })
          .eq("status", "failed")
          .gte("criado_em", since24);

        if (totalSent24 && totalSent24 > 20 && totalFailed24 && (totalFailed24 / totalSent24) > 0.1) {
          alerts.push({
            type: "high_failure_rate",
            severity: "critical",
            title: `Taxa de erro alta: ${Math.round((totalFailed24 / totalSent24) * 100)}% nas últimas 24h`,
            count: totalFailed24,
            total: totalSent24,
          });
        }

        // Mídias com falha
        const { count: mediaFailed } = await supabase.from("whatsapp_media")
          .select("id", { count: "exact", head: true })
          .eq("status", "failed")
          .gte("criado_em", since24);
        if (mediaFailed && mediaFailed > 0) {
          alerts.push({
            type: "media_download_failed",
            severity: "warning",
            title: `${mediaFailed} mídia(s) com falha no download nas últimas 24h`,
            count: mediaFailed,
          });
        }

        // Webhooks com erro
        const { count: webhookErrors } = await supabase.from("whatsapp_webhooks_raw")
          .select("id", { count: "exact", head: true })
          .not("erro", "is", null)
          .gte("criado_em", since24);
        if (webhookErrors && webhookErrors > 0) {
          alerts.push({
            type: "webhook_errors",
            severity: "warning",
            title: `${webhookErrors} webhook(s) com erro nas últimas 24h`,
            count: webhookErrors,
          });
        }

        return json({ success: true, alerts, total: alerts.length });
      }

      default:
        return bad(`ação desconhecida: ${action}`);
    }
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});
