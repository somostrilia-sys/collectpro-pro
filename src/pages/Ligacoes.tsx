import { useState } from "react";
import { Plus, Search, Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const mockLigacoes = [
  {
    id: "1",
    associado: "João Carlos da Silva",
    telefone: "(11) 98765-4321",
    tipo: "Saída",
    resultado: "Acordo",
    duracao: "00:05:32",
    colaborador: "Maria Silva",
    dataHora: "2024-01-15 14:30",
    observacoes: "Cliente aceitou parcelamento em 3x",
  },
  {
    id: "2",
    associado: "Maria Aparecida Santos",
    telefone: "(21) 99876-5432",
    tipo: "Saída",
    resultado: "Não atendeu",
    duracao: "00:00:45",
    colaborador: "João Santos",
    dataHora: "2024-01-15 15:10",
    observacoes: "Caixa postal - reagendar",
  },
  {
    id: "3",
    associado: "Pedro Henrique Oliveira",
    telefone: "(31) 97654-3210",
    tipo: "Entrada",
    resultado: "Informações",
    duracao: "00:03:15",
    colaborador: "Ana Costa",
    dataHora: "2024-01-15 16:00",
    observacoes: "Cliente solicitou segunda via do boleto",
  },
  {
    id: "4",
    associado: "Ana Beatriz Lima",
    telefone: "(41) 96543-2109",
    tipo: "Saída",
    resultado: "Promessa",
    duracao: "00:04:28",
    colaborador: "Carlos Lima",
    dataHora: "2024-01-15 10:45",
    observacoes: "Prometeu pagar até sexta-feira",
  },
  {
    id: "5",
    associado: "Carlos Eduardo Ferreira",
    telefone: "(51) 95432-1098",
    tipo: "Saída",
    resultado: "Recusou",
    duracao: "00:02:10",
    colaborador: "Maria Silva",
    dataHora: "2024-01-15 11:20",
    observacoes: "Não quer negociar no momento",
  },
];

const Ligacoes = () => {
  const [ligacoes, setLigacoes] = useState(mockLigacoes);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLigacao, setNewLigacao] = useState({
    associado: "",
    telefone: "",
    tipo: "Saída",
    resultado: "",
    observacoes: "",
  });

  const filteredLigacoes = ligacoes.filter((l) =>
    l.associado.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddLigacao = () => {
    const nova = {
      ...newLigacao,
      id: String(ligacoes.length + 1),
      duracao: "00:00:00",
      colaborador: "Usuário Admin",
      dataHora: new Date().toLocaleString("pt-BR"),
    };
    setLigacoes([nova, ...ligacoes]);
    setIsAddModalOpen(false);
    setNewLigacao({ associado: "", telefone: "", tipo: "Saída", resultado: "", observacoes: "" });
  };

  const getResultadoBadge = (resultado: string) => {
    const colors: Record<string, string> = {
      "Acordo": "bg-success/10 text-success",
      "Promessa": "bg-collectpro-blue-accent/10 text-collectpro-blue-accent",
      "Não atendeu": "bg-warning/10 text-warning",
      "Recusou": "bg-destructive/10 text-destructive",
      "Informações": "bg-muted text-muted-foreground",
    };
    return colors[resultado] || "bg-muted text-muted-foreground";
  };

  const getTipoIcon = (tipo: string) => {
    if (tipo === "Entrada") return <PhoneIncoming className="h-4 w-4 text-success" />;
    return <PhoneOutgoing className="h-4 w-4 text-collectpro-blue-accent" />;
  };

  const stats = {
    total: ligacoes.length,
    acordos: ligacoes.filter((l) => l.resultado === "Acordo").length,
    promessas: ligacoes.filter((l) => l.resultado === "Promessa").length,
    naoAtendeu: ligacoes.filter((l) => l.resultado === "Não atendeu").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ligações</h1>
          <p className="text-muted-foreground">Registro e histórico de chamadas</p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Registrar Ligação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Nova Ligação</DialogTitle>
              <DialogDescription>
                Preencha os dados da ligação realizada
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Associado</Label>
                <Input
                  value={newLigacao.associado}
                  onChange={(e) =>
                    setNewLigacao({ ...newLigacao, associado: e.target.value })
                  }
                  placeholder="Nome do associado"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Telefone</Label>
                  <Input
                    value={newLigacao.telefone}
                    onChange={(e) =>
                      setNewLigacao({ ...newLigacao, telefone: e.target.value })
                    }
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Tipo</Label>
                  <Select
                    value={newLigacao.tipo}
                    onValueChange={(value) =>
                      setNewLigacao({ ...newLigacao, tipo: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Saída">Saída</SelectItem>
                      <SelectItem value="Entrada">Entrada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Resultado</Label>
                <Select
                  value={newLigacao.resultado}
                  onValueChange={(value) =>
                    setNewLigacao({ ...newLigacao, resultado: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o resultado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Acordo">Acordo</SelectItem>
                    <SelectItem value="Promessa">Promessa de Pagamento</SelectItem>
                    <SelectItem value="Não atendeu">Não Atendeu</SelectItem>
                    <SelectItem value="Recusou">Recusou Negociação</SelectItem>
                    <SelectItem value="Informações">Informações</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Observações</Label>
                <Textarea
                  value={newLigacao.observacoes}
                  onChange={(e) =>
                    setNewLigacao({ ...newLigacao, observacoes: e.target.value })
                  }
                  placeholder="Detalhes da conversa..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddLigacao}>Registrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
              <Phone className="h-5 w-5 text-success" />
            </div>
            <div>
              <div className="text-2xl font-bold text-success">{stats.acordos}</div>
              <p className="text-sm text-muted-foreground">Acordos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-collectpro-blue-accent/10 flex items-center justify-center">
              <Phone className="h-5 w-5 text-collectpro-blue-accent" />
            </div>
            <div>
              <div className="text-2xl font-bold text-collectpro-blue-accent">{stats.promessas}</div>
              <p className="text-sm text-muted-foreground">Promessas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
              <PhoneMissed className="h-5 w-5 text-warning" />
            </div>
            <div>
              <div className="text-2xl font-bold text-warning">{stats.naoAtendeu}</div>
              <p className="text-sm text-muted-foreground">Não Atendeu</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por associado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Ligações</CardTitle>
          <CardDescription>
            {filteredLigacoes.length} ligação(ões) registrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Associado</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Data/Hora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLigacoes.map((ligacao) => (
                <TableRow key={ligacao.id}>
                  <TableCell>{getTipoIcon(ligacao.tipo)}</TableCell>
                  <TableCell className="font-medium">{ligacao.associado}</TableCell>
                  <TableCell>{ligacao.telefone}</TableCell>
                  <TableCell>
                    <Badge className={getResultadoBadge(ligacao.resultado)}>
                      {ligacao.resultado}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {ligacao.duracao}
                    </div>
                  </TableCell>
                  <TableCell>{ligacao.colaborador}</TableCell>
                  <TableCell className="text-muted-foreground">{ligacao.dataHora}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Ligacoes;