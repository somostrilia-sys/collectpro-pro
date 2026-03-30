import { History, User, Calendar, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

const logs = [
  { id: 1, usuario: "Maria Gestora", acao: "Alteração de Status", entidade: "Associado", alvo: "João Pereira", de: "Ativo", para: "Inadimplente", data: "2026-03-09 14:32", ip: "192.168.1.45" },
  { id: 2, usuario: "Carlos Mendes", acao: "Registro de Ligação", entidade: "Ligação", alvo: "Ana Costa - (11) 98765-4321", de: "-", para: "Contato Efetivo", data: "2026-03-09 13:15", ip: "192.168.1.22" },
  { id: 3, usuario: "Maria Gestora", acao: "Criação de Acordo", entidade: "Acordo", alvo: "Roberto Lima - #AC-2024-095", de: "-", para: "R$ 2.400,00 em 6x", data: "2026-03-09 11:45", ip: "192.168.1.45" },
  { id: 4, usuario: "Ana Souza", acao: "Envio de Template", entidade: "Template", alvo: "WhatsApp - Lembrete Vencimento", de: "-", para: "Enviado para 45 associados", data: "2026-03-09 10:00", ip: "192.168.1.33" },
  { id: 5, usuario: "Maria Gestora", acao: "Negativação", entidade: "Associado", alvo: "Fernando Dias", de: "Inadimplente", para: "Negativado SPC", data: "2026-03-09 09:30", ip: "192.168.1.45" },
  { id: 6, usuario: "Pedro Alves", acao: "Alteração de Status", entidade: "Boleto", alvo: "BOL-2024-1847", de: "Pendente", para: "Pago", data: "2026-03-08 16:45", ip: "192.168.1.18" },
  { id: 7, usuario: "Carlos Mendes", acao: "Alteração de Status", entidade: "Associado", alvo: "Luciana Ferreira", de: "Inadimplente", para: "Em Acordo", data: "2026-03-08 15:20", ip: "192.168.1.22" },
  { id: 8, usuario: "Maria Gestora", acao: "Exclusão de Template", entidade: "Template", alvo: "SMS - Cobrança Agressiva", de: "Ativo", para: "Excluído", data: "2026-03-08 14:00", ip: "192.168.1.45" },
  { id: 9, usuario: "Ana Souza", acao: "Registro de Ligação", entidade: "Ligação", alvo: "Paulo Santos - (21) 97654-3210", de: "-", para: "Sem Contato", data: "2026-03-08 11:30", ip: "192.168.1.33" },
  { id: 10, usuario: "Maria Gestora", acao: "Alteração de Perfil", entidade: "Colaborador", alvo: "Pedro Alves", de: "Colaborador", para: "Colaborador Sênior", data: "2026-03-08 09:00", ip: "192.168.1.45" },
];

const acaoBadge = (acao: string) => {
  if (acao.includes("Alteração")) return <Badge className="bg-primary/10 text-primary border-0">Alteração</Badge>;
  if (acao.includes("Criação")) return <Badge className="bg-success/10 text-success border-0">Criação</Badge>;
  if (acao.includes("Exclusão")) return <Badge className="bg-destructive/10 text-destructive border-0">Exclusão</Badge>;
  if (acao.includes("Negativação")) return <Badge className="bg-destructive/10 text-destructive border-0">Negativação</Badge>;
  if (acao.includes("Envio")) return <Badge className="bg-warning/10 text-warning border-0">Envio</Badge>;
  return <Badge variant="secondary">{acao}</Badge>;
};

export default function LogAuditoria() {
  const [filtroUsuario, setFiltroUsuario] = useState("todos");
  const [busca, setBusca] = useState("");

  const filtered = logs.filter((l) => {
    if (filtroUsuario !== "todos" && l.usuario !== filtroUsuario) return false;
    if (busca && !JSON.stringify(l).toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const usuarios = [...new Set(logs.map((l) => l.usuario))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Log de Auditoria</h1>
        <p className="text-sm text-muted-foreground">Registro completo de todas as alterações no sistema</p>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar no log..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10 rounded-lg"
          />
        </div>
        <Select value={filtroUsuario} onValueChange={setFiltroUsuario}>
          <SelectTrigger className="w-[200px] rounded-lg">
            <SelectValue placeholder="Filtrar por usuário" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os usuários</SelectItem>
            {usuarios.map((u) => (
              <SelectItem key={u} value={u}>{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <History className="h-5 w-5" />
            Registros ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0 divide-y">
            {filtered.map((log) => (
              <div key={log.id} className="py-4 flex items-start gap-4">
                <div className="rounded-xl p-2.5 bg-primary/10 flex-shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{log.usuario}</span>
                    {acaoBadge(log.acao)}
                    <span className="text-sm text-muted-foreground">em {log.entidade}</span>
                  </div>
                  <p className="text-sm mt-1">
                    <span className="font-medium">{log.alvo}</span>
                    {log.de !== "-" && (
                      <span className="text-muted-foreground">
                        {" "} -- de <span className="line-through">{log.de}</span> para <span className="font-medium text-primary">{log.para}</span>
                      </span>
                    )}
                    {log.de === "-" && (
                      <span className="text-muted-foreground"> -- {log.para}</span>
                    )}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{log.data}</span>
                    <span>IP: {log.ip}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
