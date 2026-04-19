import { useAdminDashboard } from "@/hooks/useWhatsApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity, AlertTriangle, MessageSquare, Send, Users, Ban,
  TrendingUp, CheckCheck, XCircle, Wifi, WifiOff, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminDashboardTab() {
  const overview = useAdminDashboard("overview", { period_days: 7 });
  const instances = useAdminDashboard("instance_metrics", {});
  const attendants = useAdminDashboard("attendant_metrics", {});
  const alerts = useAdminDashboard("alerts", {});

  const m = overview.data?.metrics;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Alertas ativos */}
      {alerts.data?.alerts?.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-warning">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Alertas ativos ({alerts.data.total})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.data.alerts.map((a: any, i: number) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 text-sm p-2 rounded border",
                  a.severity === "critical"
                    ? "bg-destructive/5 border-destructive/20 text-destructive"
                    : "bg-warning/5 border-warning/20 text-warning",
                )}
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1">{a.title}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* KPIs gerais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={<Send className="h-4 w-4" />}
          label="Enviadas (7d)"
          value={m?.sent ?? 0}
          loading={overview.isLoading}
        />
        <KpiCard
          icon={<MessageSquare className="h-4 w-4" />}
          label="Recebidas (7d)"
          value={m?.received ?? 0}
          loading={overview.isLoading}
        />
        <KpiCard
          icon={<CheckCheck className="h-4 w-4 text-success" />}
          label="Taxa de entrega"
          value={`${m?.delivery_rate ?? 0}%`}
          loading={overview.isLoading}
        />
        <KpiCard
          icon={<XCircle className="h-4 w-4 text-destructive" />}
          label="Taxa de erro"
          value={`${m?.failure_rate ?? 0}%`}
          loading={overview.isLoading}
        />
        <KpiCard
          icon={<Wifi className="h-4 w-4 text-success" />}
          label="Instâncias conectadas"
          value={`${m?.connected_instances ?? 0}/${m?.total_instances ?? 0}`}
          loading={overview.isLoading}
        />
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Conversas ativas"
          value={m?.active_conversations ?? 0}
          loading={overview.isLoading}
        />
        <KpiCard
          icon={<MessageSquare className="h-4 w-4" />}
          label="Contatos"
          value={m?.total_contacts ?? 0}
          loading={overview.isLoading}
        />
        <KpiCard
          icon={<Ban className="h-4 w-4 text-destructive" />}
          label="Opt-outs ativos"
          value={m?.active_optouts ?? 0}
          loading={overview.isLoading}
        />
      </div>

      {/* Tabs secundárias */}
      <Tabs defaultValue="instances">
        <TabsList>
          <TabsTrigger value="instances">Instâncias</TabsTrigger>
          <TabsTrigger value="attendants">Atendentes</TabsTrigger>
        </TabsList>

        <TabsContent value="instances" className="mt-3">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Por instância</CardTitle>
            </CardHeader>
            <CardContent>
              {instances.isLoading ? (
                <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <div className="space-y-2">
                  {(instances.data?.instances ?? []).map((i: any) => (
                    <div key={i.instance_id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/30">
                      <div className="shrink-0">
                        {i.status === "connected"
                          ? <Wifi className="h-4 w-4 text-success" />
                          : <WifiOff className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{i.instance_nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {i.telefone || "sem número"} · {i.instance_tipo}
                        </p>
                      </div>
                      <div className="flex gap-4 text-xs text-right">
                        <div>
                          <p className="text-muted-foreground">Enviadas 30d</p>
                          <p className="font-semibold">{i.msgs_enviadas_30d ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Entrega 7d</p>
                          <p className="font-semibold">
                            {i.taxa_entrega_7d ? `${Math.round(i.taxa_entrega_7d)}%` : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Ativas 7d</p>
                          <p className="font-semibold">{i.conversas_ativas_7d ?? 0}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(instances.data?.instances ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma instância</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendants" className="mt-3">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ranking de atendentes</CardTitle>
            </CardHeader>
            <CardContent>
              {attendants.isLoading ? (
                <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <div className="space-y-2">
                  {(attendants.data?.attendants ?? []).map((a: any, idx: number) => (
                    <div key={a.colaborador_id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/30">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.colaborador_nome}</p>
                        <p className="text-xs text-muted-foreground capitalize">{a.role}</p>
                      </div>
                      <div className="flex gap-4 text-xs text-right">
                        <div>
                          <p className="text-muted-foreground">Enviadas 30d</p>
                          <p className="font-semibold">{a.msgs_enviadas_30d ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Conv. 7d</p>
                          <p className="font-semibold">{a.conversas_7d ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Falhas 7d</p>
                          <p className={cn("font-semibold", a.falhas_7d > 0 && "text-destructive")}>
                            {a.falhas_7d ?? 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(attendants.data?.attendants ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum atendente</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ icon, label, value, loading }: {
  icon: React.ReactNode; label: string; value: string | number; loading?: boolean;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          {icon}
          <span>{label}</span>
        </div>
        <p className="text-2xl font-bold">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : value}
        </p>
      </CardContent>
    </Card>
  );
}
