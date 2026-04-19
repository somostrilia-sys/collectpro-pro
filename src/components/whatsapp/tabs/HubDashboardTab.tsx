// HubDashboardTab — KPIs cross-setor do Hub WhatsApp Meta
// Só admin/gestora/ceo/diretor/cs vê esta aba.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, Clock, Bot, UserCheck, TrendingUp, Shield,
} from "lucide-react";

const SETORES = [
  { slug: "cobranca", nome: "Cobrança",     icon: "💰", color: "bg-blue-500"    },
  { slug: "evento",   nome: "Eventos",      icon: "🚨", color: "bg-rose-500"    },
  { slug: "track",    nome: "Rastreamento", icon: "📍", color: "bg-emerald-500" },
  { slug: "gestao",   nome: "Gestão",       icon: "📋", color: "bg-violet-500"  },
];

interface SetorMetrics {
  setor: string;
  ativos: number;
  abertos: number;
  em_ia: number;
  em_humano: number;
  aguardando: number;
  resolvidos_24h: number;
  tmr_seg: number | null;
  tma_seg: number | null;
}

function useHubMetrics() {
  return useQuery({
    queryKey: ["hub-metrics"],
    queryFn: async (): Promise<SetorMetrics[]> => {
      const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const results: SetorMetrics[] = [];

      for (const s of SETORES) {
        const { data: atens = [] } = await (supabase as any)
          .from("whatsapp_atendimentos")
          .select("status, sla_primeiro_resp_seg, sla_resolucao_seg, resolvido_em")
          .eq("setor", s.slug)
          .limit(2000);

        const ativos = atens.filter((a: any) => !["resolvido", "arquivado"].includes(a.status)).length;
        const abertos = atens.filter((a: any) => a.status === "aberto").length;
        const em_ia = atens.filter((a: any) => a.status === "em_ia").length;
        const em_humano = atens.filter((a: any) => a.status === "em_humano").length;
        const aguardando = atens.filter((a: any) => a.status === "aguardando_cliente").length;
        const resolvidos_24h = atens.filter((a: any) => a.resolvido_em && a.resolvido_em >= ontem).length;

        const tmrs = atens.map((a: any) => a.sla_primeiro_resp_seg).filter((x: any) => typeof x === "number");
        const tmas = atens.map((a: any) => a.sla_resolucao_seg).filter((x: any) => typeof x === "number");
        const tmr_seg = tmrs.length ? Math.round(tmrs.reduce((s: number, v: number) => s + v, 0) / tmrs.length) : null;
        const tma_seg = tmas.length ? Math.round(tmas.reduce((s: number, v: number) => s + v, 0) / tmas.length) : null;

        results.push({ setor: s.slug, ativos, abertos, em_ia, em_humano, aguardando, resolvidos_24h, tmr_seg, tma_seg });
      }
      return results;
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

function fmtDur(seg: number | null) {
  if (seg == null) return "—";
  if (seg < 60) return `${seg}s`;
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function HubDashboardTab() {
  const { data: metrics = [], isLoading } = useHubMetrics();

  const totalAtivos = metrics.reduce((s, m) => s + m.ativos, 0);
  const totalIa = metrics.reduce((s, m) => s + m.em_ia, 0);
  const totalHumano = metrics.reduce((s, m) => s + m.em_humano, 0);
  const totalResolvidos = metrics.reduce((s, m) => s + m.resolvidos_24h, 0);
  const taxaIa = (totalIa + totalHumano) > 0
    ? Math.round((totalIa / (totalIa + totalHumano)) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Cards topo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Users}      label="Atendimentos ativos" value={totalAtivos} hint="em andamento" />
        <KpiCard icon={Bot}        label="Em IA"               value={totalIa}     hint={`${taxaIa}% do total`} />
        <KpiCard icon={UserCheck}  label="Em humano"           value={totalHumano} />
        <KpiCard icon={TrendingUp} label="Resolvidos (24h)"    value={totalResolvidos} />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Por setor</h3>
          <Badge variant="outline" className="text-[10px]">
            Hub Meta — 4 setores
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {SETORES.map((s) => {
            const m = metrics.find((x) => x.setor === s.slug);
            return (
              <Card key={s.slug}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span>{s.icon}</span>
                    <span>{s.nome}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-1 text-xs">
                  <Row label="Ativos"      value={m?.ativos ?? "…"} emph />
                  <Row label="Novos"       value={m?.abertos ?? "—"} />
                  <Row label="Em IA"       value={m?.em_ia ?? "—"} />
                  <Row label="Em humano"   value={m?.em_humano ?? "—"} />
                  <Row label="Aguardando"  value={m?.aguardando ?? "—"} />
                  <Row label="Resolv 24h"  value={m?.resolvidos_24h ?? "—"} />
                  <div className="pt-2 border-t mt-2 space-y-1">
                    <Row label="TMR"       value={fmtDur(m?.tmr_seg ?? null)} muted />
                    <Row label="TMA"       value={fmtDur(m?.tma_seg ?? null)} muted />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {isLoading && (
        <p className="text-xs text-muted-foreground text-center">Carregando métricas…</p>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, hint }: { icon: any; label: string; value: number | string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, emph, muted }: { label: string; value: any; emph?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={emph ? "font-semibold text-sm" : muted ? "text-muted-foreground" : ""}>{value}</span>
    </div>
  );
}
