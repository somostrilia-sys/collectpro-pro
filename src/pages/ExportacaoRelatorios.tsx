import { Download, FileSpreadsheet, FileText, Calendar, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const relatorios = [
  { id: "metricas", nome: "Métricas Mensais", descricao: "KPIs de arrecadação, inadimplência e performance", formatos: ["excel", "pdf"], icon: "📊" },
  { id: "ranking", nome: "Ranking de Colaboradores", descricao: "Performance individual por período selecionado", formatos: ["excel", "pdf"], icon: "🏆" },
  { id: "associados", nome: "Lista de Associados", descricao: "Cadastro completo com status e score", formatos: ["excel"], icon: "👥" },
  { id: "boletos", nome: "Relatório de Boletos", descricao: "Boletos por status, período e valor", formatos: ["excel", "pdf"], icon: "📄" },
  { id: "acordos", nome: "Acordos e Parcelamentos", descricao: "Acordos vigentes e finalizados com valores", formatos: ["excel", "pdf"], icon: "🤝" },
  { id: "negativacoes", nome: "Negativações", descricao: "Histórico de negativações e retiradas SPC/Serasa", formatos: ["excel"], icon: "⚠️" },
  { id: "ligacoes", nome: "Registro de Ligações", descricao: "Chamadas realizadas com resultado e duração", formatos: ["excel"], icon: "📞" },
  { id: "auditoria", nome: "Log de Auditoria", descricao: "Todas as alterações realizadas no sistema", formatos: ["excel", "pdf"], icon: "📋" },
];

const historicoExportacoes = [
  { nome: "Métricas Mensais - Fevereiro 2026", formato: "PDF", data: "2026-03-01 10:30", tamanho: "2.4 MB", usuario: "Maria Gestora" },
  { nome: "Ranking Colaboradores - Fevereiro 2026", formato: "Excel", data: "2026-03-01 10:32", tamanho: "856 KB", usuario: "Maria Gestora" },
  { nome: "Boletos Vencidos - Fevereiro 2026", formato: "Excel", data: "2026-02-28 16:00", tamanho: "1.1 MB", usuario: "Maria Gestora" },
  { nome: "Lista Associados Ativos", formato: "Excel", data: "2026-02-25 09:15", tamanho: "3.2 MB", usuario: "Admin Sistema" },
];

export default function ExportacaoRelatorios() {
  const [periodo, setPeriodo] = useState("mes-atual");
  const { toast } = useToast();

  const handleExport = (nome: string, formato: string) => {
    toast({
      title: "Exportação iniciada",
      description: `Gerando ${nome} em ${formato.toUpperCase()}...`,
    });
    setTimeout(() => {
      toast({
        title: "Download pronto!",
        description: `${nome}.${formato === "excel" ? "xlsx" : "pdf"} foi gerado com sucesso.`,
      });
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Exportação de Relatórios</h1>
        <p className="text-muted-foreground">Exporte métricas, rankings e listas em Excel e PDF</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes-atual">Mês Atual</SelectItem>
                <SelectItem value="mes-anterior">Mês Anterior</SelectItem>
                <SelectItem value="trimestre">Último Trimestre</SelectItem>
                <SelectItem value="semestre">Último Semestre</SelectItem>
                <SelectItem value="ano">Ano 2026</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            {periodo === "personalizado" && (
              <>
                <Input type="date" className="w-[180px]" />
                <Input type="date" className="w-[180px]" />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {relatorios.map((r) => (
          <Card key={r.id}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <span className="text-3xl">{r.icon}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{r.nome}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{r.descricao}</p>
                  <div className="flex gap-2">
                    {r.formatos.includes("excel") && (
                      <Button size="sm" variant="outline" onClick={() => handleExport(r.nome, "excel")} className="gap-1">
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                        Excel
                      </Button>
                    )}
                    {r.formatos.includes("pdf") && (
                      <Button size="sm" variant="outline" onClick={() => handleExport(r.nome, "pdf")} className="gap-1">
                        <FileText className="h-4 w-4 text-red-600" />
                        PDF
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Histórico de Exportações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0 divide-y">
            {historicoExportacoes.map((h, i) => (
              <div key={i} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {h.formato === "Excel" ? (
                    <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <FileText className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{h.nome}</p>
                    <p className="text-xs text-muted-foreground">{h.data} • {h.tamanho} • {h.usuario}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
