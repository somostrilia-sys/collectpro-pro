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

const monthlyData = [
  { mes: "Jan", arrecadacao: 125000, meta: 150000 },
  { mes: "Fev", arrecadacao: 132000, meta: 150000 },
  { mes: "Mar", arrecadacao: 148000, meta: 150000 },
  { mes: "Abr", arrecadacao: 156000, meta: 160000 },
  { mes: "Mai", arrecadacao: 142000, meta: 160000 },
  { mes: "Jun", arrecadacao: 168000, meta: 170000 },
];

const statusData = [
  { name: "Pagos", value: 1847, color: "hsl(var(--success))" },
  { name: "Pendentes", value: 423, color: "hsl(var(--warning))" },
  { name: "Vencidos", value: 289, color: "hsl(var(--destructive))" },
];

const collaboratorData = [
  { nome: "Maria S.", recuperado: 45000, meta: 40000 },
  { nome: "João S.", recuperado: 38000, meta: 35000 },
  { nome: "Ana C.", recuperado: 42000, meta: 45000 },
  { nome: "Carlos L.", recuperado: 35000, meta: 30000 },
];

const Dashboard = () => {
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
          <span className="h-1.5 w-1.5 rounded-full bg-success mr-1.5 inline-block" />
          Atualizado agora
        </Badge>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total a Receber"
          value="R$ 856.420"
          change="+12% vs mês anterior"
          changeType="positive"
          icon={DollarSign}
          gradient="primary"
        />
        <KPICard
          title="Taxa de Inadimplência"
          value="18.2%"
          change="-3.2% vs mês anterior"
          changeType="positive"
          icon={TrendingUp}
          gradient="danger"
        />
        <KPICard
          title="Acordos Ativos"
          value="127"
          change="+8 novos acordos"
          changeType="positive"
          icon={Users}
          gradient="success"
        />
        <KPICard
          title="Arrecadação Mensal"
          value="R$ 168.340"
          change="+15% vs meta"
          changeType="positive"
          icon={BarChart3}
          gradient="success"
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
            <div className="p-3 bg-card rounded-lg border border-destructive/20">
              <div className="flex items-center gap-2 mb-1.5">
                <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
                <span className="text-xs font-semibold text-destructive">Prioridade Alta</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                289 boletos vencidos com potencial de R$ 156k. Acione régua D+15.
              </p>
            </div>
            <div className="p-3 bg-card rounded-lg border border-success/20">
              <div className="flex items-center gap-2 mb-1.5">
                <ArrowUpRight className="h-3.5 w-3.5 text-success" />
                <span className="text-xs font-semibold text-success">Oportunidade</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ana Costa 7% abaixo da meta. Redistribua 15 casos de baixa complexidade.
              </p>
            </div>
            <div className="p-3 bg-card rounded-lg border border-warning/20">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="h-3.5 w-3.5 text-warning" />
                <span className="text-xs font-semibold text-warning">Sugestão</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                127 acordos precisam de follow-up. Configure lembretes D+7.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
