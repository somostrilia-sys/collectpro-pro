import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, TrendingDown, Send, Inbox, XCircle, DollarSign } from "lucide-react";

interface Props { instanceId: string | null; }

export function MetaAnalyticsDashboard({ instanceId }: Props) {
  const [periodDays, setPeriodDays] = useState(7);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["meta_local_summary", instanceId, periodDays],
    queryFn: async () => {
      if (!instanceId) return null;
      const { data } = await supabase.functions.invoke("whatsapp-meta-analytics", {
        body: { instance_id: instanceId, action: "local_summary", period_days: periodDays },
      });
      return data ?? null;
    },
    enabled: !!instanceId,
    staleTime: 30_000,
  });

  const { data: pricing } = useQuery({
    queryKey: ["meta_pricing", instanceId, periodDays],
    queryFn: async () => {
      if (!instanceId) return null;
      const end = Math.floor(Date.now() / 1000);
      const start = end - periodDays * 86400;
      const { data } = await supabase.functions.invoke("whatsapp-meta-analytics", {
        body: {
          instance_id: instanceId, action: "pricing",
          start, end, granularity: "DAILY",
          metric_types: ["COST", "VOLUME"],
          dimensions: ["PRICING_CATEGORY", "PRICING_TYPE"],
        },
      });
      return data?.data ?? null;
    },
    enabled: !!instanceId,
    staleTime: 60_000,
  });

  if (!instanceId) {
    return (
      <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
        Selecione uma instância Meta oficial.
      </CardContent></Card>
    );
  }

  const rate = (num: number, den: number) => den > 0 ? Math.round((num / den) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Analytics Meta</h3>
        <Select value={String(periodDays)} onValueChange={(v) => setPeriodDays(Number(v))}>
          <SelectTrigger className="w-[140px] h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Hoje</SelectItem>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            icon={Send} label="Enviadas" value={summary?.sent ?? 0}
            color="text-blue-600" bg="bg-blue-50"
          />
          <MetricCard
            icon={Inbox} label="Recebidas" value={summary?.received ?? 0}
            color="text-emerald-600" bg="bg-emerald-50"
          />
          <MetricCard
            icon={XCircle} label="Falhas" value={summary?.failed ?? 0}
            color="text-red-600" bg="bg-red-50"
            subtitle={`${rate(summary?.failed ?? 0, summary?.sent ?? 0)}% do total`}
          />
          <MetricCard
            icon={DollarSign} label="Cobradas" value={summary?.billable_messages ?? 0}
            color="text-amber-600" bg="bg-amber-50"
            subtitle="templates pagos"
          />
        </div>
      )}

      {/* Breakdown por categoria/tipo */}
      {summary?.by_category_and_type && Object.keys(summary.by_category_and_type).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Por categoria × tipo</CardTitle>
            <CardDescription>Mensagens Meta dos últimos {periodDays} dias, agrupadas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {Object.entries(summary.by_category_and_type).map(([key, count]: any) => {
              const [cat, type] = key.split("_");
              return (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-[10px] min-w-[110px]">{cat}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{type}</Badge>
                  <span className="ml-auto font-mono text-xs">{count}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Pricing direto da Meta */}
      {pricing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pricing (Meta Graph API)</CardTitle>
            <CardDescription>Dados oficiais de cobrança direto da Meta</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-[10px] overflow-x-auto bg-muted/40 p-2 rounded max-h-60">
              {JSON.stringify(pricing, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color, bg, subtitle }: {
  icon: any; label: string; value: number; color: string; bg: string; subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{value.toLocaleString("pt-BR")}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
