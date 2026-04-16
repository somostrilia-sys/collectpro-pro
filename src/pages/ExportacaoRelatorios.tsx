import { Download, FileSpreadsheet, FileText, Calendar, Filter, BarChart3, Trophy, Users, Receipt, Handshake, AlertTriangle, Phone, ClipboardList, Upload, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

const relatorios = [
  { id: "associados", nome: "Lista de Associados", descricao: "Cadastro completo com status e cooperativa", formatos: ["excel"], icon: Users, tabela: "associados" },
  { id: "boletos", nome: "Relatório de Boletos", descricao: "Boletos por status, período e valor", formatos: ["excel"], icon: Receipt, tabela: "boletos" },
  { id: "acordos", nome: "Acordos e Parcelamentos", descricao: "Acordos vigentes e finalizados com valores", formatos: ["excel"], icon: Handshake, tabela: "acordos" },
  { id: "pagamentos", nome: "Histórico de Pagamentos", descricao: "Todos os pagamentos registrados", formatos: ["excel"], icon: BarChart3, tabela: "historico_pagamentos" },
];

function formatDate(d: string) {
  if (!d) return "";
  return new Date(d).toLocaleString("pt-BR");
}

export default function ExportacaoRelatorios() {
  const [periodo, setPeriodo] = useState("todos");
  const [exportando, setExportando] = useState<string | null>(null);
  const [dialogImport, setDialogImport] = useState(false);
  const [importData, setImportData] = useState<any[] | null>(null);
  const [importFileName, setImportFileName] = useState("");
  const [importando, setImportando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleExportExcel = async (relatorio: typeof relatorios[0]) => {
    setExportando(relatorio.id);
    try {
      let query;
      if (relatorio.tabela === "associados") {
        query = supabase.from("associados").select("nome, cpf, email, whatsapp, cooperativa, placa, status, situacao, created_at");
      } else if (relatorio.tabela === "boletos") {
        query = supabase.from("boletos").select("gia_id, valor, vencimento, mes_referencia, status, data_pagamento, nosso_numero, associados(nome, cpf, cooperativa)");
      } else if (relatorio.tabela === "acordos") {
        query = supabase.from("acordos").select("id, valor_original, valor_acordo, parcelas, status, created_at, associados(nome, cpf)");
      } else if (relatorio.tabela === "historico_pagamentos") {
        query = supabase.from("historico_pagamentos").select("*, associados(nome, cpf)");
      } else {
        throw new Error("Tipo não suportado");
      }

      const { data, error } = await query.limit(10000);
      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: "Sem dados", description: "Nenhum registro encontrado para exportar.", variant: "destructive" });
        return;
      }

      // Flatten nested objects (e.g., associados.nome)
      const flat = data.map((row: any) => {
        const result: Record<string, any> = {};
        for (const [key, val] of Object.entries(row)) {
          if (val && typeof val === "object" && !Array.isArray(val)) {
            for (const [subKey, subVal] of Object.entries(val as Record<string, any>)) {
              result[`${key}_${subKey}`] = subVal;
            }
          } else {
            result[key] = val;
          }
        }
        return result;
      });

      const ws = XLSX.utils.json_to_sheet(flat);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, relatorio.nome);
      XLSX.writeFile(wb, `${relatorio.id}_${new Date().toISOString().slice(0, 10)}.xlsx`);

      toast({ title: "Exportado!", description: `${data.length} registros exportados em Excel.` });
    } catch (e: any) {
      toast({ title: "Erro na exportação", description: e.message, variant: "destructive" });
    } finally {
      setExportando(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const firstSheet = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
      setImportData(rows);
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (!importData || importData.length === 0) {
      toast({ title: "Nenhum dado", description: "O arquivo está vazio.", variant: "destructive" });
      return;
    }

    setImportando(true);
    try {
      // Detect columns to determine target table
      const columns = Object.keys(importData[0]);
      const hasValor = columns.some(c => c.toLowerCase().includes("valor"));
      const hasCpf = columns.some(c => c.toLowerCase().includes("cpf"));
      const hasNome = columns.some(c => c.toLowerCase().includes("nome"));

      if (hasNome && hasCpf && !hasValor) {
        // Looks like associados
        const mapped = importData.map((row: any) => ({
          nome: row.nome || row.Nome || row.NOME || "",
          cpf: row.cpf || row.CPF || row.Cpf || "",
          email: row.email || row.Email || row.EMAIL || null,
          whatsapp: row.whatsapp || row.Whatsapp || row.telefone || row.Telefone || null,
          cooperativa: row.cooperativa || row.Cooperativa || null,
          placa: row.placa || row.Placa || row.PLACA || null,
          status: row.status || row.Status || "ativo",
          situacao: row.situacao || row.Situacao || "ativo",
        }));

        const { error } = await supabase.from("associados").upsert(mapped, { onConflict: "cpf", ignoreDuplicates: true });
        if (error) throw error;
        toast({ title: "Importado!", description: `${mapped.length} associados processados.` });
      } else {
        toast({ title: "Formato não reconhecido", description: "Certifique-se de que o Excel contém colunas como nome, cpf, email.", variant: "destructive" });
        return;
      }

      setDialogImport(false);
      setImportData(null);
      setImportFileName("");
    } catch (e: any) {
      toast({ title: "Erro na importação", description: e.message, variant: "destructive" });
    } finally {
      setImportando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Exportação de Relatórios</h1>
          <p className="text-sm text-muted-foreground">Exporte dados em Excel ou importe planilhas de cooperativas</p>
        </div>
        <Button variant="outline" onClick={() => setDialogImport(true)} className="gap-2">
          <Upload className="h-4 w-4" />
          Importar Excel
        </Button>
      </div>

      {/* Relatórios para exportar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {relatorios.map((r) => (
          <Card key={r.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="rounded-xl p-2.5 bg-primary/10">
                  <r.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading font-semibold text-lg">{r.nome}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{r.descricao}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExportExcel(r)}
                    disabled={exportando === r.id}
                    className="gap-1"
                  >
                    {exportando === r.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4 text-success" />
                    )}
                    Exportar Excel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog: Importar Excel */}
      <Dialog open={dialogImport} onOpenChange={setDialogImport}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar Planilha Excel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Selecione um arquivo Excel (.xlsx) com dados de associados. O sistema vai detectar automaticamente as colunas.
            </p>
            <p className="text-xs text-muted-foreground">
              Colunas esperadas: <strong>nome, cpf, email, whatsapp, cooperativa, placa, status</strong>
            </p>
            <div className="space-y-1.5">
              <Label>Arquivo Excel</Label>
              <Input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
              />
            </div>
            {importData && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium">{importFileName}</p>
                <p className="text-xs text-muted-foreground">{importData.length} registros encontrados</p>
                <p className="text-xs text-muted-foreground">Colunas: {Object.keys(importData[0] || {}).join(", ")}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogImport(false); setImportData(null); }}>Cancelar</Button>
            <Button onClick={handleImport} disabled={!importData || importando}>
              {importando && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Importar {importData ? `(${importData.length} registros)` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
