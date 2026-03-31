import { useState } from "react";
import { Plus, Search, MessageSquare, Clock, CheckCircle, AlertCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

const mockTickets = [
  {
    id: "T001",
    assunto: "Dúvida sobre segunda via",
    associado: "João Carlos da Silva",
    status: "Aberto",
    prioridade: "Normal",
    colaborador: "Maria Silva",
    dataAbertura: "2024-01-15 09:30",
    ultimaMensagem: "Bom dia, preciso da segunda via do boleto",
    mensagens: [
      { autor: "João Carlos", tipo: "cliente", msg: "Bom dia, preciso da segunda via do boleto", hora: "09:30" },
      { autor: "Maria Silva", tipo: "atendente", msg: "Bom dia João! Estou enviando agora.", hora: "09:35" },
    ],
  },
  {
    id: "T002",
    assunto: "Solicitação de cancelamento",
    associado: "Ana Beatriz Lima",
    status: "Em andamento",
    prioridade: "Alta",
    colaborador: "João Santos",
    dataAbertura: "2024-01-15 10:15",
    ultimaMensagem: "Gostaria de cancelar meu plano",
    mensagens: [
      { autor: "Ana Beatriz", tipo: "cliente", msg: "Gostaria de cancelar meu plano", hora: "10:15" },
      { autor: "João Santos", tipo: "atendente", msg: "Olá Ana, posso entender o motivo?", hora: "10:20" },
      { autor: "Ana Beatriz", tipo: "cliente", msg: "Estou com dificuldades financeiras", hora: "10:25" },
    ],
  },
  {
    id: "T003",
    assunto: "Negociação de dívida",
    associado: "Pedro Henrique Oliveira",
    status: "Aguardando cliente",
    prioridade: "Normal",
    colaborador: "Ana Costa",
    dataAbertura: "2024-01-14 14:00",
    ultimaMensagem: "Proposta enviada, aguardando retorno",
    mensagens: [
      { autor: "Pedro Henrique", tipo: "cliente", msg: "Quero negociar minha dívida", hora: "14:00" },
      { autor: "Ana Costa", tipo: "atendente", msg: "Olá Pedro! Temos condições especiais.", hora: "14:10" },
    ],
  },
  {
    id: "T004",
    assunto: "Reclamação de cobrança indevida",
    associado: "Fernanda Cristina Souza",
    status: "Resolvido",
    prioridade: "Alta",
    colaborador: "Carlos Lima",
    dataAbertura: "2024-01-13 16:30",
    ultimaMensagem: "Problema resolvido, obrigada!",
    mensagens: [],
  },
];

const Tickets = () => {
  const [tickets, setTickets] = useState(mockTickets);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<typeof mockTickets[0] | null>(null);
  const [newMessage, setNewMessage] = useState("");

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.assunto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.associado.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "todos" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Aberto":
        return <Badge className="bg-primary/10 text-primary border-0">Aberto</Badge>;
      case "Em andamento":
        return <Badge className="bg-warning/10 text-warning border-0">Em andamento</Badge>;
      case "Aguardando cliente":
        return <Badge className="bg-muted text-muted-foreground border-0">Aguardando</Badge>;
      case "Resolvido":
        return <Badge className="bg-success/10 text-success border-0">Resolvido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPrioridadeBadge = (prioridade: string) => {
    return prioridade === "Alta" ? (
      <Badge className="bg-destructive/10 text-destructive border-0">Alta</Badge>
    ) : (
      <Badge variant="outline">Normal</Badge>
    );
  };

  const handleSendMessage = () => {
    if (!selectedTicket || !newMessage.trim()) return;

    const updatedTickets = tickets.map((t) =>
      t.id === selectedTicket.id
        ? {
            ...t,
            mensagens: [
              ...t.mensagens,
              {
                autor: "Você",
                tipo: "atendente" as const,
                msg: newMessage,
                hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
              },
            ],
            ultimaMensagem: newMessage,
            status: "Em andamento",
          }
        : t
    );
    setTickets(updatedTickets);
    setSelectedTicket(updatedTickets.find((t) => t.id === selectedTicket.id) || null);
    setNewMessage("");
  };

  const stats = {
    total: tickets.length,
    abertos: tickets.filter((t) => t.status === "Aberto").length,
    emAndamento: tickets.filter((t) => t.status === "Em andamento").length,
    resolvidos: tickets.filter((t) => t.status === "Resolvido").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-heading text-2xl font-bold">Tickets Desk</h1>
          <p className="text-sm text-muted-foreground">Sistema de atendimento ao associado</p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Novo Ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">Criar Novo Ticket</DialogTitle>
              <DialogDescription>
                Registre um novo atendimento
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Associado</Label>
                <Input placeholder="Nome do associado" className="rounded-lg" />
              </div>
              <div className="grid gap-2">
                <Label>Assunto</Label>
                <Input placeholder="Assunto do ticket" className="rounded-lg" />
              </div>
              <div className="grid gap-2">
                <Label>Prioridade</Label>
                <Select defaultValue="Normal">
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Descrição</Label>
                <Textarea placeholder="Descreva o motivo do atendimento..." className="rounded-lg" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancelar
              </Button>
              <Button>Criar Ticket</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl p-2.5 bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl p-2.5 bg-primary/10">
                <AlertCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{stats.abertos}</div>
                <p className="text-sm text-muted-foreground">Abertos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl p-2.5 bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold text-warning">{stats.emAndamento}</div>
                <p className="text-sm text-muted-foreground">Em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl p-2.5 bg-success/10">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold text-success">{stats.resolvidos}</div>
                <p className="text-sm text-muted-foreground">Resolvidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar ticket..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-lg"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Aberto">Aberto</SelectItem>
                    <SelectItem value="Em andamento">Em andamento</SelectItem>
                    <SelectItem value="Aguardando cliente">Aguardando</SelectItem>
                    <SelectItem value="Resolvido">Resolvido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {filteredTickets.length === 0 ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground py-12">
                  <MessageSquare className="h-8 w-8 opacity-40" />
                  <p className="text-sm">Nenhum ticket encontrado.</p>
                </div>
              ) : filteredTickets.map((ticket) => (
                <Card
                  key={ticket.id}
                  className={`cursor-pointer border-0 shadow-sm hover:shadow-md transition-shadow ${
                    selectedTicket?.id === ticket.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-muted-foreground">{ticket.id}</span>
                      {getPrioridadeBadge(ticket.prioridade)}
                    </div>
                    <h4 className="font-medium text-sm mb-1">{ticket.assunto}</h4>
                    <p className="text-xs text-muted-foreground mb-2">{ticket.associado}</p>
                    <div className="flex justify-between items-center">
                      {getStatusBadge(ticket.status)}
                      <span className="text-xs text-muted-foreground">{ticket.dataAbertura}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <Card className="lg:col-span-2 border-0 shadow-sm hover:shadow-md transition-shadow">
          {selectedTicket ? (
            <>
              <CardHeader className="border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="font-heading text-lg">{selectedTicket.assunto}</CardTitle>
                    <CardDescription>
                      {selectedTicket.associado} - {selectedTicket.id}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {getStatusBadge(selectedTicket.status)}
                    {getPrioridadeBadge(selectedTicket.prioridade)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[350px] p-4">
                  <div className="space-y-4">
                    {selectedTicket.mensagens.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-3 ${
                          msg.tipo === "atendente" ? "flex-row-reverse" : ""
                        }`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback
                            className={
                              msg.tipo === "atendente"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }
                          >
                            {msg.autor[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            msg.tipo === "atendente"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{msg.msg}</p>
                          <p
                            className={`text-xs mt-1 ${
                              msg.tipo === "atendente"
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            }`}
                          >
                            {msg.hora}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Digite sua mensagem..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="min-h-[80px] rounded-lg"
                    />
                    <Button onClick={handleSendMessage} className="h-auto">
                      Enviar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="h-[500px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecione um ticket para visualizar</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Tickets;
