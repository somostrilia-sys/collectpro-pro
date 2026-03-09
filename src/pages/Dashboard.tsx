import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  PieChart,
  Calendar,
} from "lucide-react";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

// Mock data for charts
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
  { nome: "Maria Silva", recuperado: 45000, meta: 40000 },
  { nome: "João Santos", recuperado: 38000, meta: 35000 },
  { nome: "Ana Costa", recuperado: 42000, meta: 45000 },
  { nome: "Carlos Lima", recuperado: 35000, meta: 30000 },
];

const Dashboard = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do sistema de cobrança - CollectPro
        </p>
      </div>

      {/* KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Evolution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-collectpro-blue-accent" />
              Evolução Mensal da Arrecadação
            </CardTitle>
            <CardDescription>
              Comparativo entre arrecadação e meta mensal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="mes" />
                <YAxis
                  tickFormatter={(value) =>
                    `R$ ${(value / 1000).toFixed(0)}k`
                  }
                />
                <Tooltip
                  formatter={(value: any, name) => [
                    `R$ ${value.toLocaleString()}`,
                    name === "arrecadacao" ? "Arrecadação" : "Meta",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="arrecadacao"
                  stroke="hsl(var(--collectpro-blue-accent))"
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--collectpro-blue-accent))" }}
                />
                <Line
                  type="monotone"
                  dataKey="meta"
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-collectpro-blue-accent" />
              Distribuição por Status
            </CardTitle>
            <CardDescription>
              Status atual dos boletos no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
              <RechartsPieChart.Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </RechartsPieChart.Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Collaborator Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-collectpro-blue-accent" />
            Performance dos Colaboradores
          </CardTitle>
          <CardDescription>
            Ranking de recuperação vs meta mensal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={collaboratorData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="nome" />
              <YAxis
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: any, name) => [
                  `R$ ${value.toLocaleString()}`,
                  name === "recuperado" ? "Recuperado" : "Meta",
                ]}
              />
              <Legend />
              <Bar
                dataKey="recuperado"
                fill="hsl(var(--success))"
                name="Recuperado"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="meta"
                fill="hsl(var(--muted-foreground))"
                name="Meta"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* AI Advisor */}
      <Card className="bg-gradient-to-r from-collectpro-blue-dark/5 to-collectpro-blue-accent/5 border-collectpro-blue-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-collectpro-blue-dark">
            🤖 IA Conselheira CollectPro
          </CardTitle>
          <CardDescription>
            Insights e recomendações baseadas em dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-4 bg-card rounded-lg border">
            <h4 className="font-semibold text-sm text-collectpro-blue-dark mb-2">
              📈 Prioridade Alta
            </h4>
            <p className="text-sm text-muted-foreground">
              Foque nos 289 boletos vencidos - potencial de recuperação de R$ 156k.
              Recomendo ação imediata via régua D+15.
            </p>
          </div>
          <div className="p-4 bg-card rounded-lg border">
            <h4 className="font-semibold text-sm text-success mb-2">
              ✅ Oportunidade
            </h4>
            <p className="text-sm text-muted-foreground">
              Ana Costa está 7% abaixo da meta. Considere redistribuir 15 casos
              de baixa complexidade para otimizar performance.
            </p>
          </div>
          <div className="p-4 bg-card rounded-lg border">
            <h4 className="font-semibold text-sm text-warning mb-2">
              ⚡ Sugestão Automática
            </h4>
            <p className="text-sm text-muted-foreground">
              127 acordos ativos precisam de follow-up. Configure lembretes
              automáticos para D+7 pós-acordo.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;