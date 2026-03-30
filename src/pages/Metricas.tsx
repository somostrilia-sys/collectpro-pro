import { Download, Calendar, TrendingUp, DollarSign, Users, Phone, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { useToast } from "@/hooks/use-toast";

const monthlyData = [
  { mes: "Jan", arrecadacao: 125000, meta: 150000, acordos: 28, ligacoes: 450 },
  { mes: "Fev", arrecadacao: 132000, meta: 150000, acordos: 32, ligacoes: 520 },
  { mes: "Mar", arrecadacao: 148000, meta: 150000, acordos: 35, ligacoes: 480 },
  { mes: "Abr", arrecadacao: 156000, meta: 160000, acordos: 42, ligacoes: 510 },
  { mes: "Mai", arrecadacao: 142000, meta: 160000, acordos: 38, ligacoes: 490 },
  { mes: "Jun", arrecadacao: 168000, meta: 170000, acordos: 45, ligacoes: 530 },
];

const channelData = [
  { canal: "WhatsApp", efetividade: 78, total: 1250 },
  { canal: "Ligação", efetividade: 65, total: 890 },
  { canal: "SMS", efetividade: 45, total: 420 },
  { canal: "E-mail", efetividade: 32, total: 350 },
];

const Metricas = () => {
  const [periodo, setPeriodo] = useState("6meses");
  const { toast } = useToast();

  const handleExportCSV = () => {
    toast({
      title: "Exportando...",
      description: "Gerando arquivo CSV com as métricas",
    });
  };

  const handleExportPDF = () => {
    toast({
      title: "Exportando...",
      description: "Gerando relatório em PDF",
    });
  };

  const totalArrecadacao = monthlyData.reduce((acc, m) => acc + m.arrecadacao, 0);
  const totalMeta = monthlyData.reduce((acc, m) => acc + m.meta, 0);
  const totalAcordos = monthlyData.reduce((acc, m) => acc + m.acordos, 0);
  const totalLigacoes = monthlyData.reduce((acc, m) => acc + m.ligacoes, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Métricas Mensais</h1>
          <p className="text-muted-foreground">Relatórios consolidados de performance</p>
        </div>
        <div className="flex gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3meses">3 meses</SelectItem>
              <SelectItem value="6meses">6 meses</SelectItem>
              <SelectItem value="12meses">12 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Arrecadação Total</p>
                <div className="text-2xl font-bold text-success">
                  R$ {(totalArrecadacao / 1000).toFixed(0)}k
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Atingimento de Meta</p>
                <div className="text-2xl font-bold">
                  {((totalArrecadacao / totalMeta) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Acordos Fechados</p>
                <div className="text-2xl font-bold">{totalAcordos}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                <Phone className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ligações Realizadas</p>
                <div className="text-2xl font-bold">{totalLigacoes}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Evolution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Evolução da Arrecadação
            </CardTitle>
            <CardDescription>
              Comparativo mensal arrecadação vs meta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="mes" />
                <YAxis
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any, name) => [
                    `R$ ${value.toLocaleString()}`,
                    name === "arrecadacao" ? "Arrecadação" : "Meta",
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="arrecadacao"
                  stroke="hsl(var(--success))"
                  strokeWidth={3}
                  name="Arrecadação"
                />
                <Line
                  type="monotone"
                  dataKey="meta"
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  name="Meta"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Acordos e Ligações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Acordos e Ligações por Mês
            </CardTitle>
            <CardDescription>
              Volume de atividades mensais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="mes" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="acordos"
                  fill="hsl(var(--primary))"
                  name="Acordos"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="right"
                  dataKey="ligacoes"
                  fill="hsl(var(--warning))"
                  name="Ligações"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Channel Effectiveness */}
      <Card>
        <CardHeader>
          <CardTitle>Efetividade por Canal de Cobrança</CardTitle>
          <CardDescription>
            Taxa de sucesso de cada canal de comunicação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {channelData.map((channel) => (
              <div
                key={channel.canal}
                className="p-4 border rounded-lg text-center"
              >
                <p className="text-sm text-muted-foreground mb-2">{channel.canal}</p>
                <div className="text-3xl font-bold text-primary mb-1">
                  {channel.efetividade}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {channel.total} ações
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo por Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Mês</th>
                  <th className="text-right py-3 px-4">Arrecadação</th>
                  <th className="text-right py-3 px-4">Meta</th>
                  <th className="text-right py-3 px-4">% Atingido</th>
                  <th className="text-right py-3 px-4">Acordos</th>
                  <th className="text-right py-3 px-4">Ligações</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((m) => (
                  <tr key={m.mes} className="border-b">
                    <td className="py-3 px-4 font-medium">{m.mes}</td>
                    <td className="text-right py-3 px-4">
                      R$ {m.arrecadacao.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 text-muted-foreground">
                      R$ {m.meta.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4">
                      <span
                        className={
                          m.arrecadacao >= m.meta
                            ? "text-success font-medium"
                            : "text-destructive"
                        }
                      >
                        {((m.arrecadacao / m.meta) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">{m.acordos}</td>
                    <td className="text-right py-3 px-4">{m.ligacoes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Metricas;