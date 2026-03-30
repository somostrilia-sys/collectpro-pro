import { useState } from "react";
import { Search, Filter, Zap, MessageSquare, Phone, Mail, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const mockAcoes = [
  {
    id: "1",
    associado: "João Carlos da Silva",
    tipo: "WhatsApp",
    descricao: "Envio de lembrete D+1",
    status: "Enviado",
    colaborador: "Sistema",
    dataHora: "2024-01-15 08:00",
  },
  {
    id: "2",
    associado: "Maria Aparecida Santos",
    tipo: "Ligação",
    descricao: "Contato de cobrança D+5",
    status: "Concluído",
    colaborador: "Maria Silva",
    dataHora: "2024-01-15 10:30",
  },
  {
    id: "3",
    associado: "Pedro Henrique Oliveira",
    tipo: "SMS",
    descricao: "Envio de segunda via",
    status: "Enviado",
    colaborador: "Sistema",
    dataHora: "2024-01-15 09:15",
  },
  {
    id: "4",
    associado: "Ana Beatriz Lima",
    tipo: "E-mail",
    descricao: "Notificação de negativação D+30",
    status: "Enviado",
    colaborador: "Sistema",
    dataHora: "2024-01-14 14:00",
  },
  {
    id: "5",
    associado: "Carlos Eduardo Ferreira",
    tipo: "Ligação",
    descricao: "Follow-up de acordo",
    status: "Pendente",
    colaborador: "João Santos",
    dataHora: "2024-01-15 16:00",
  },
  {
    id: "6",
    associado: "Fernanda Cristina Souza",
    tipo: "WhatsApp",
    descricao: "Confirmação de acordo",
    status: "Lido",
    colaborador: "Sistema",
    dataHora: "2024-01-15 11:45",
  },
];

const AcoesCobranca = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState("todos");

  const filteredAcoes = mockAcoes.filter((a) => {
    const matchesSearch = a.associado.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = tipoFilter === "todos" || a.tipo === tipoFilter;
    return matchesSearch && matchesTipo;
  });

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "WhatsApp":
        return <MessageSquare className="h-4 w-4 text-success" />;
      case "Ligação":
        return <Phone className="h-4 w-4 text-primary" />;
      case "SMS":
        return <MessageSquare className="h-4 w-4 text-warning" />;
      case "E-mail":
        return <Mail className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      "Enviado": "bg-success/10 text-success",
      "Concluído": "bg-primary/10 text-primary",
      "Pendente": "bg-warning/10 text-warning",
      "Lido": "bg-muted text-muted-foreground",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  const stats = {
    total: mockAcoes.length,
    whatsapp: mockAcoes.filter((a) => a.tipo === "WhatsApp").length,
    ligacoes: mockAcoes.filter((a) => a.tipo === "Ligação").length,
    outros: mockAcoes.filter((a) => a.tipo === "SMS" || a.tipo === "E-mail").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Ações de Cobrança</h1>
        <p className="text-muted-foreground">Log de todas as ações realizadas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total de Ações</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-success" />
            </div>
            <div>
              <div className="text-2xl font-bold text-success">{stats.whatsapp}</div>
              <p className="text-sm text-muted-foreground">WhatsApp</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{stats.ligacoes}</div>
              <p className="text-sm text-muted-foreground">Ligações</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-warning" />
            </div>
            <div>
              <div className="text-2xl font-bold text-warning">{stats.outros}</div>
              <p className="text-sm text-muted-foreground">SMS/E-mail</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por associado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Tipos</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="Ligação">Ligação</SelectItem>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="E-mail">E-mail</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Ações</CardTitle>
          <CardDescription>
            {filteredAcoes.length} ação(ões) registrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Associado</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Data/Hora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAcoes.map((acao) => (
                <TableRow key={acao.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTipoIcon(acao.tipo)}
                      <span>{acao.tipo}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{acao.associado}</TableCell>
                  <TableCell>{acao.descricao}</TableCell>
                  <TableCell>
                    <Badge className={getStatusBadge(acao.status)}>{acao.status}</Badge>
                  </TableCell>
                  <TableCell>{acao.colaborador}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {acao.dataHora}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcoesCobranca;