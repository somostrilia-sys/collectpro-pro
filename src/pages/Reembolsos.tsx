import { useState } from "react";
import { RotateCcw, Search, Eye, FileText, Plus, Copy, Download, Send, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───────────────────────────────────────────────────────────────────
type TipoReembolso = "Integral" | "Parcial";
type StatusReembolso = "Pago" | "Aprovado" | "Aguardando" | "Recusado";
interface Reembolso {
  id: number; data: string; associado: string; cpf: string; cooperativa: string;
  valorOriginal: number; valorReembolso: number; tipo: TipoReembolso; motivo: string;
  status: StatusReembolso; atendente: string; pixOuBanco: "pix" | "banco";
  chavePix?: string; banco?: string; agencia?: string; conta?: string;
  timeline: { data: string; evento: string; usuario: string }[];
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const mockData: Reembolso[] = [
  { id: 1, data: "2026-03-10", associado: "Ana Paula Souza", cpf: "123.456.789-00", cooperativa: "COOP-SP", valorOriginal: 850, valorReembolso: 850, tipo: "Integral", motivo: "Cobrança indevida", status: "Pago", atendente: "Carlos Mendes", pixOuBanco: "pix", chavePix: "ana.paula@email.com", timeline: [{ data: "2026-03-08", evento: "Solicitação criada", usuario: "Carlos Mendes" }, { data: "2026-03-09", evento: "Aprovado", usuario: "Gerente" }, { data: "2026-03-10", evento: "Pago", usuario: "Financeiro" }] },
  { id: 2, data: "2026-03-12", associado: "Roberto Lima", cpf: "234.567.890-11", cooperativa: "COOP-RJ", valorOriginal: 1200, valorReembolso: 600, tipo: "Parcial", motivo: "Serviço não prestado", status: "Aprovado", atendente: "Mariana Silva", pixOuBanco: "banco", banco: "Bradesco", agencia: "1234", conta: "56789-0", timeline: [{ data: "2026-03-11", evento: "Solicitação criada", usuario: "Mariana Silva" }, { data: "2026-03-12", evento: "Aprovado", usuario: "Gerente" }] },
  { id: 3, data: "2026-03-15", associado: "Fernanda Costa", cpf: "345.678.901-22", cooperativa: "COOP-MG", valorOriginal: 500, valorReembolso: 500, tipo: "Integral", motivo: "Desistência dentro do prazo", status: "Aguardando", atendente: "João Paulo", pixOuBanco: "pix", chavePix: "11987654321", timeline: [{ data: "2026-03-15", evento: "Solicitação criada", usuario: "João Paulo" }] },
  { id: 4, data: "2026-03-18", associado: "Marcos Oliveira", cpf: "456.789.012-33", cooperativa: "COOP-SP", valorOriginal: 750, valorReembolso: 250, tipo: "Parcial", motivo: "Produto com defeito", status: "Aguardando", atendente: "Carlos Mendes", pixOuBanco: "banco", banco: "Itaú", agencia: "5678", conta: "12345-6", timeline: [{ data: "2026-03-18", evento: "Solicitação criada", usuario: "Carlos Mendes" }] },
  { id: 5, data: "2026-03-20", associado: "Lucia Ferreira", cpf: "567.890.123-44", cooperativa: "COOP-BA", valorOriginal: 320, valorReembolso: 320, tipo: "Integral", motivo: "Erro administrativo", status: "Pago", atendente: "Mariana Silva", pixOuBanco: "pix", chavePix: "lucia.ferreira@cpf", timeline: [{ data: "2026-03-18", evento: "Solicitação criada", usuario: "Mariana Silva" }, { data: "2026-03-19", evento: "Aprovado", usuario: "Gerente" }, { data: "2026-03-20", evento: "Pago", usuario: "Financeiro" }] },
  { id: 6, data: "2026-03-22", associado: "Paulo Nascimento", cpf: "678.901.234-55", cooperativa: "COOP-RS", valorOriginal: 980, valorReembolso: 490, tipo: "Parcial", motivo: "Cancelamento parcial de plano", status: "Pago", atendente: "João Paulo", pixOuBanco: "banco", banco: "Caixa", agencia: "0007", conta: "98765-4", timeline: [{ data: "2026-03-20", evento: "Solicitação criada", usuario: "João Paulo" }, { data: "2026-03-21", evento: "Aprovado", usuario: "Gerente" }, { data: "2026-03-22", evento: "Pago", usuario: "Financeiro" }] },
  { id: 7, data: "2026-03-25", associado: "Beatriz Santos", cpf: "789.012.345-66", cooperativa: "COOP-SP", valorOriginal: 420, valorReembolso: 420, tipo: "Integral", motivo: "Duplicidade de pagamento", status: "Recusado", atendente: "Carlos Mendes", pixOuBanco: "pix", chavePix: "beatriz.santos@email.com", timeline: [{ data: "2026-03-24", evento: "Solicitação criada", usuario: "Carlos Mendes" }, { data: "2026-03-25", evento: "Recusado — documentação insuficiente", usuario: "Gerente" }] },
];

const motivos = ["Cobrança indevida", "Serviço não prestado", "Produto com defeito", "Duplicidade de pagamento", "Desistência dentro do prazo", "Cancelamento parcial de plano", "Erro administrativo"];
const cooperativas = ["COOP-SP", "COOP-RJ", "COOP-MG", "COOP-BA", "COOP-RS"];

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusBadge = (s: StatusReembolso) => {
  const map: Record<StatusReembolso, string> = { Pago: "bg-blue-100 text-blue-700", Aprovado: "bg-green-100 text-green-700", Aguardando: "bg-yellow-100 text-yellow-700", Recusado: "bg-red-100 text-red-700" };
  return <Badge className={map[s]}>{s}</Badge>;
};
const tipoBadge = (t: TipoReembolso) => (
  <Badge className={t === "Integral" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}>{t}</Badge>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function Reembolsos() {
  const { toast } = useToast();
  const [dados, setDados] = useState<Reembolso[]>(mockData);
  const [busca, setBusca] = useState(""); const [filtroStatus, setFiltroStatus] = useState("todos"); const [filtroTipo, setFiltroTipo] = useState("todos"); const [filtroCoop, setFiltroCoop] = useState("todas");
  const [dlgNovo, setDlgNovo] = useState(false); const [dlgDetalhe, setDlgDetalhe] = useState<Reembolso | null>(null); const [dlgTermo, setDlgTermo] = useState<Reembolso | null>(null);

  // form novo
  const [fAssociado, setFAssociado] = useState(""); const [fCpf, setFCpf] = useState(""); const [fCoop, setFCoop] = useState(""); const [fTipo, setFTipo] = useState<TipoReembolso>("Integral");
  const [fValorOrig, setFValorOrig] = useState(""); const [fValorReemb, setFValorReemb] = useState(""); const [fMotivo, setFMotivo] = useState(""); const [fAtendente, setFAtendente] = useState("");
  const [fPixBanco, setFPixBanco] = useState<"pix" | "banco">("pix"); const [fChavePix, setFChavePix] = useState(""); const [fBanco, setFBanco] = useState(""); const [fAgencia, setFAgencia] = useState(""); const [fConta, setFConta] = useState("");

  const filtrados = dados.filter(r => {
    const q = busca.toLowerCase();
    const matchQ = !q || r.associado.toLowerCase().includes(q) || r.cpf.includes(q);
    const matchS = filtroStatus === "todos" || r.status === filtroStatus;
    const matchT = filtroTipo === "todos" || r.tipo === filtroTipo;
    const matchC = filtroCoop === "todas" || r.cooperativa === filtroCoop;
    return matchQ && matchS && matchT && matchC;
  });

  const handleSolicitar = () => {
    if (!fAssociado || !fCpf || !fMotivo || !fValorOrig || !fValorReemb || !fAtendente) { toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" }); return; }
    const novo: Reembolso = { id: Date.now(), data: new Date().toISOString().split("T")[0], associado: fAssociado, cpf: fCpf, cooperativa: fCoop || "COOP-SP", valorOriginal: parseFloat(fValorOrig), valorReembolso: parseFloat(fValorReemb), tipo: fTipo, motivo: fMotivo, status: "Aguardando", atendente: fAtendente, pixOuBanco: fPixBanco, chavePix: fPixBanco === "pix" ? fChavePix : undefined, banco: fPixBanco === "banco" ? fBanco : undefined, agencia: fPixBanco === "banco" ? fAgencia : undefined, conta: fPixBanco === "banco" ? fConta : undefined, timeline: [{ data: new Date().toISOString().split("T")[0], evento: "Solicitação criada", usuario: fAtendente }] };
    setDados(p => [novo, ...p]); setDlgNovo(false);
    toast({ title: "Reembolso solicitado com sucesso!" });
    setFAssociado(""); setFCpf(""); setFCoop(""); setFValorOrig(""); setFValorReemb(""); setFMotivo(""); setFAtendente(""); setFChavePix(""); setFBanco(""); setFAgencia(""); setFConta("");
  };

  const handleAprovar = (r: Reembolso) => { setDados(p => p.map(x => x.id === r.id ? { ...x, status: "Aprovado", timeline: [...x.timeline, { data: new Date().toISOString().split("T")[0], evento: "Aprovado", usuario: "Gerente" }] } : x)); setDlgDetalhe(null); toast({ title: "Reembolso aprovado!" }); };
  const handleRecusar = (r: Reembolso) => { setDados(p => p.map(x => x.id === r.id ? { ...x, status: "Recusado", timeline: [...x.timeline, { data: new Date().toISOString().split("T")[0], evento: "Recusado", usuario: "Gerente" }] } : x)); setDlgDetalhe(null); toast({ title: "Reembolso recusado.", variant: "destructive" }); };
  const handlePago = (r: Reembolso) => { setDados(p => p.map(x => x.id === r.id ? { ...x, status: "Pago", timeline: [...x.timeline, { data: new Date().toISOString().split("T")[0], evento: "Pago", usuario: "Financeiro" }] } : x)); setDlgDetalhe(null); toast({ title: "Reembolso marcado como pago!" }); };

  const gerarTextoTermo = (r: Reembolso) => `TERMO DE REEMBOLSO

Data: ${r.data}
Protocolo: #${r.id}

ASSOCIADO: ${r.associado}
CPF: ${r.cpf}
COOPERATIVA: ${r.cooperativa}

DADOS DO REEMBOLSO:
Valor Original: ${fmt(r.valorOriginal)}
Valor do Reembolso: ${fmt(r.valorReembolso)} (${r.tipo})
Motivo: ${r.motivo}

DADOS PARA PAGAMENTO:
${r.pixOuBanco === "pix" ? `Chave PIX: ${r.chavePix}` : `Banco: ${r.banco} | Agência: ${r.agencia} | Conta: ${r.conta}`}

Atendente Responsável: ${r.atendente}
Status: ${r.status}

Declaramos que o reembolso acima descrito foi devidamente solicitado, analisado e aprovado conforme política interna da cooperativa.

_______________________________
Assinatura Responsável`;

  const total = dados.reduce((s, r) => s + r.valorReembolso, 0);
  const aguardando = dados.filter(r => r.status === "Aguardando").length;
  const ticket = dados.length ? total / dados.length : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RotateCcw className="h-7 w-7 text-primary" />
          <div><h1 className="text-2xl font-bold">Reembolsos</h1><p className="text-sm text-muted-foreground">Gestão de reembolsos e estornos para associados</p></div>
        </div>
        <Button onClick={() => setDlgNovo(true)}><Plus className="mr-2 h-4 w-4" />Novo Reembolso</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Reembolsos no Mês", value: "8", icon: RotateCcw, color: "text-blue-600" },
          { label: "Valor Total Reembolsado", value: "R$ 3.420", icon: RotateCcw, color: "text-green-600" },
          { label: "Aguardando Aprovação", value: String(aguardando), icon: RotateCcw, color: "text-yellow-600" },
          { label: "Ticket Médio", value: fmt(ticket), icon: RotateCcw, color: "text-purple-600" },
        ].map((k, i) => (
          <Card key={i}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle></CardHeader><CardContent><p className={`text-2xl font-bold ${k.color}`}>{k.value}</p></CardContent></Card>
        ))}
      </div>

      {/* Filtros */}
      <Card><CardContent className="pt-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar por nome ou CPF..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} /></div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}><SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos status</SelectItem><SelectItem value="Pago">Pago</SelectItem><SelectItem value="Aprovado">Aprovado</SelectItem><SelectItem value="Aguardando">Aguardando</SelectItem><SelectItem value="Recusado">Recusado</SelectItem></SelectContent></Select>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}><SelectTrigger className="w-36"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos tipos</SelectItem><SelectItem value="Integral">Integral</SelectItem><SelectItem value="Parcial">Parcial</SelectItem></SelectContent></Select>
          <Select value={filtroCoop} onValueChange={setFiltroCoop}><SelectTrigger className="w-40"><SelectValue placeholder="Cooperativa" /></SelectTrigger><SelectContent><SelectItem value="todas">Todas</SelectItem>{cooperativas.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
        </div>
      </CardContent></Card>

      {/* Tabela */}
      <Card><CardContent className="pt-4 overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Associado</TableHead><TableHead>CPF</TableHead><TableHead>Cooperativa</TableHead><TableHead>Valor Original</TableHead><TableHead>Valor Reembolso</TableHead><TableHead>Tipo</TableHead><TableHead>Motivo</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtrados.map(r => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap">{r.data}</TableCell>
                <TableCell className="font-medium whitespace-nowrap">{r.associado}</TableCell>
                <TableCell className="text-muted-foreground">{r.cpf}</TableCell>
                <TableCell>{r.cooperativa}</TableCell>
                <TableCell>{fmt(r.valorOriginal)}</TableCell>
                <TableCell className="font-semibold">{fmt(r.valorReembolso)}</TableCell>
                <TableCell>{tipoBadge(r.tipo)}</TableCell>
                <TableCell className="max-w-[150px] truncate" title={r.motivo}>{r.motivo}</TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" title="Ver detalhes" onClick={() => setDlgDetalhe(r)}><Eye className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" title="Gerar Termo" onClick={() => setDlgTermo(r)}><FileText className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtrados.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Nenhum reembolso encontrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      {/* Dialog Novo Reembolso */}
      <Dialog open={dlgNovo} onOpenChange={setDlgNovo}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Reembolso</DialogTitle><DialogDescription>Preencha os dados para solicitar um reembolso ou estorno.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Associado *</Label><Input placeholder="Nome do associado" value={fAssociado} onChange={e => setFAssociado(e.target.value)} /></div>
              <div className="space-y-1"><Label>CPF *</Label><Input placeholder="000.000.000-00" value={fCpf} onChange={e => setFCpf(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Cooperativa</Label><Select value={fCoop} onValueChange={setFCoop}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{cooperativas.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Tipo *</Label><Select value={fTipo} onValueChange={v => setFTipo(v as TipoReembolso)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Integral">Integral</SelectItem><SelectItem value="Parcial">Parcial</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Valor Original (R$) *</Label><Input type="number" placeholder="0,00" value={fValorOrig} onChange={e => setFValorOrig(e.target.value)} /></div>
              <div className="space-y-1"><Label>Valor Reembolso (R$) *</Label><Input type="number" placeholder="0,00" value={fValorReemb} onChange={e => setFValorReemb(e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label>Motivo *</Label><Select value={fMotivo} onValueChange={setFMotivo}><SelectTrigger><SelectValue placeholder="Selecionar motivo" /></SelectTrigger><SelectContent>{motivos.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Atendente *</Label><Input placeholder="Nome do atendente" value={fAtendente} onChange={e => setFAtendente(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <div className="flex gap-3">
                <Button type="button" variant={fPixBanco === "pix" ? "default" : "outline"} size="sm" onClick={() => setFPixBanco("pix")}>PIX</Button>
                <Button type="button" variant={fPixBanco === "banco" ? "default" : "outline"} size="sm" onClick={() => setFPixBanco("banco")}>Dados Bancários</Button>
              </div>
              {fPixBanco === "pix" ? (
                <div className="space-y-1"><Label>Chave PIX</Label><Input placeholder="CPF, email, telefone ou chave aleatória" value={fChavePix} onChange={e => setFChavePix(e.target.value)} /></div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1"><Label>Banco</Label><Input placeholder="Nome do banco" value={fBanco} onChange={e => setFBanco(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Agência</Label><Input placeholder="0000" value={fAgencia} onChange={e => setFAgencia(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Conta</Label><Input placeholder="00000-0" value={fConta} onChange={e => setFConta(e.target.value)} /></div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDlgNovo(false)}>Cancelar</Button><Button onClick={handleSolicitar}>Solicitar Reembolso</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhes */}
      {dlgDetalhe && (
        <Dialog open={!!dlgDetalhe} onOpenChange={() => setDlgDetalhe(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Detalhes do Reembolso #{dlgDetalhe.id}</DialogTitle><DialogDescription>{dlgDetalhe.associado} — {dlgDetalhe.cpf}</DialogDescription></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Data:</span><p className="font-medium">{dlgDetalhe.data}</p></div>
                <div><span className="text-muted-foreground">Cooperativa:</span><p className="font-medium">{dlgDetalhe.cooperativa}</p></div>
                <div><span className="text-muted-foreground">Valor Original:</span><p className="font-medium">{fmt(dlgDetalhe.valorOriginal)}</p></div>
                <div><span className="text-muted-foreground">Valor Reembolso:</span><p className="font-semibold text-green-700">{fmt(dlgDetalhe.valorReembolso)}</p></div>
                <div><span className="text-muted-foreground">Tipo:</span><p>{tipoBadge(dlgDetalhe.tipo)}</p></div>
                <div><span className="text-muted-foreground">Status:</span><p>{statusBadge(dlgDetalhe.status)}</p></div>
                <div className="col-span-2"><span className="text-muted-foreground">Motivo:</span><p className="font-medium">{dlgDetalhe.motivo}</p></div>
                <div className="col-span-2"><span className="text-muted-foreground">Atendente:</span><p className="font-medium">{dlgDetalhe.atendente}</p></div>
              </div>
              <div className="border rounded-md p-3 space-y-1 text-sm">
                <p className="font-semibold text-muted-foreground uppercase text-xs mb-2">Dados Bancários</p>
                {dlgDetalhe.pixOuBanco === "pix" ? <p>🔑 Chave PIX: <span className="font-medium">{dlgDetalhe.chavePix}</span></p> : <><p>Banco: <span className="font-medium">{dlgDetalhe.banco}</span></p><p>Agência: <span className="font-medium">{dlgDetalhe.agencia}</span> | Conta: <span className="font-medium">{dlgDetalhe.conta}</span></p></>}
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-muted-foreground uppercase text-xs">Timeline</p>
                {dlgDetalhe.timeline.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm"><div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" /><div><p className="font-medium">{t.evento}</p><p className="text-muted-foreground text-xs">{t.data} · {t.usuario}</p></div></div>
                ))}
              </div>
            </div>
            <DialogFooter className="flex-wrap gap-2">
              {dlgDetalhe.status === "Aguardando" && (<><Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => handleRecusar(dlgDetalhe)}>Recusar</Button><Button className="bg-green-600 hover:bg-green-700" onClick={() => handleAprovar(dlgDetalhe)}>Aprovar</Button></>)}
              {dlgDetalhe.status === "Aprovado" && <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => handlePago(dlgDetalhe)}>Marcar como Pago</Button>}
              <Button variant="outline" onClick={() => setDlgDetalhe(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog Gerar Termo */}
      {dlgTermo && (
        <Dialog open={!!dlgTermo} onOpenChange={() => setDlgTermo(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Termo de Reembolso</DialogTitle><DialogDescription>{dlgTermo.associado} — Protocolo #{dlgTermo.id}</DialogDescription></DialogHeader>
            <Textarea className="font-mono text-xs min-h-[300px]" readOnly value={gerarTextoTermo(dlgTermo)} />
            <DialogFooter className="flex-wrap gap-2">
              <Button variant="outline