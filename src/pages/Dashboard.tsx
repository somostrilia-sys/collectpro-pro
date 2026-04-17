import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  PieChart,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Handshake,
  Loader2,
} from "lucide-react";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { useAcordosStats, useDashboardKPIs, useSyncGIA } from "@/hooks/useCollectData";

const monthlyData: { mes: string; arrecadacao: number; meta: number }[] = [];
const statusData: { name: string; value: number; color: string }[] = [];
const collaboratorData: { nome: string; recuperado: number; meta: number }[] = [];

const Dashboard = () => {
  const { data: stats, isLoading } = useAcordosStats();
  const { data: kpis } = useDashboardKPIs();
  const syncGIA = useSyncGIA();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visão geral da operação de cobrança
          </p>
        </div>
        <Badge variant="secondary" className="text-xs font-medium">
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-success mr-1.5 inline-block" />
          )}
          Atualizado agora
        </Badge>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total em Aberto"
          value={`R$ ${(kpis?.valorEmAberto || stats?.totalEmAberto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          change={`${kpis?.inadimplentes || 0} inadimplentes`}
          changeType="negative"
          icon={DollarSign}
          gradient="primary"
        />
        <KPICard
          title="Taxa de Inadimplência"
          value={`${kpis?.taxaInadimplencia ?? stats?.taxaRecuperacao ?? 0}%`}
          change={`${kpis?.totalAssociados || 0} associados`}
          changeType={kpis?.taxaInadimplencia && kpis.taxaInadimplencia > 15 ? "negative" : "positive"}
          icon={TrendingUp}
          gradient={kpis?.taxaInadimplencia && kpis.taxaInadimplencia > 15 ? "primary" : "success"}
        />
        <KPICard
          title="Acordos esta Semana"
          value={String(stats?.acordosSemana ?? 0)}
          change={`${stats?.total || 0} total`}
          changeType="positive"
          icon={Users}
          gradient="success"
        />
        <KPICard
          title="Revistorias Pendentes"
          value={String(kpis?.revistoriasPendentes ?? 0)}
          change={kpis?.ultimoSync ? `Sync: ${new Date(kpis.ultimoSync).toLocaleString('pt-BR')}` : "Nunca sincronizado"}
          changeType="positive"
          icon={Handshake}
          gradient="primary"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Evolution - takes 2 cols */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Evolução Mensal</CardTitle>
                <CardDescription className="text-xs">Arrecadação vs Meta</CardDescription>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip formatter={(value: any, name) => [`R$ ${value.toLocaleString()}`, name === "arrecadacao" ? "Arrecadação" : "Meta"]} />
                <Line type="monotone" dataKey="arrecadacao" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
                <Line type="monotone" dataKey="meta" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Status dos Boletos</CardTitle>
            <CardDescription className="text-xs">Distribuição atual</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {statusData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-semibold">{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Collaborator Performance */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Performance da Equipe</CardTitle>
                <CardDescription className="text-xs">Recuperado vs Meta mensal</CardDescription>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={collaboratorData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="nome" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip formatter={(value: any, name) => [`R$ ${value.toLocaleString()}`, name === "recuperado" ? "Recuperado" : "Meta"]} />
                <Legend />
                <Bar dataKey="recuperado" fill="hsl(var(--primary))" name="Recuperado" radius={[4, 4, 0, 0]} />
                <Bar dataKey="meta" fill="hsl(var(--border))" name="Meta" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI Advisor */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              IA Conselheira
            </CardTitle>
            <CardDescription className="text-xs">Insights automáticos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-6 text-center text-xs text-muted-foreground">
              Nenhum insight disponível no momento.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
