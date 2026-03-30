import { useState } from "react";
import { Plus, Search, Edit, Trash2, Copy, MessageSquare, Mail, Smartphone, Sparkles, FileText } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

const mockTemplates = [
  {
    id: "1",
    nome: "Lembrete D+1",
    canal: "WhatsApp",
    categoria: "Utilidade",
    mensagem: "Olá {nome}!\n\nSeu boleto de R$ {valor} vence amanhã ({vencimento}).\n\nLink para pagamento: {link_boleto}\n\nQualquer dúvida, estamos à disposição!",
    variaveis: ["nome", "valor", "vencimento", "link_boleto"],
  },
  {
    id: "2",
    nome: "Lembrete D+5",
    canal: "WhatsApp",
    categoria: "Utilidade",
    mensagem: "Olá {nome}!\n\nIdentificamos que seu boleto no valor de R$ {valor} está pendente desde {vencimento}.\n\nPara sua comodidade, segue o link atualizado: {link_boleto}\n\nPrecisa de ajuda? Estamos aqui!",
    variaveis: ["nome", "valor", "vencimento", "link_boleto"],
  },
  {
    id: "3",
    nome: "Confirmação de Acordo",
    canal: "WhatsApp",
    categoria: "Utilidade",
    mensagem: "Olá {nome}!\n\nSeu acordo foi registrado com sucesso!\n\nDetalhes:\n- Valor total: R$ {valor_acordo}\n- Parcelas: {parcelas}x de R$ {valor_parcela}\n- 1ª parcela: {data_primeira_parcela}\n\nObrigado pela confiança!",
    variaveis: ["nome", "valor_acordo", "parcelas", "valor_parcela", "data_primeira_parcela"],
  },
  {
    id: "4",
    nome: "Aviso de Negativação",
    canal: "E-mail",
    categoria: "Utilidade",
    mensagem: "Prezado(a) {nome},\n\nInformamos que o débito no valor de R$ {valor} referente ao seu plano de proteção veicular encontra-se em aberto há mais de 30 dias.\n\nPara evitar a inclusão nos órgãos de proteção ao crédito (SPC/Serasa), solicitamos a regularização até {data_limite}.\n\nPara negociação, entre em contato pelo telefone {telefone_contato}.\n\nAtenciosamente,\nEquipe CollectPro",
    variaveis: ["nome", "valor", "data_limite", "telefone_contato"],
  },
  {
    id: "5",
    nome: "Lembrete SMS",
    canal: "SMS",
    categoria: "Utilidade",
    mensagem: "CollectPro: {nome}, seu boleto de R$ {valor} vence em {vencimento}. Pague pelo link: {link_curto}",
    variaveis: ["nome", "valor", "vencimento", "link_curto"],
  },
];

const Templates = () => {
  const [templates, setTemplates] = useState(mockTemplates);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const { toast } = useToast();
  const [newTemplate, setNewTemplate] = useState({
    nome: "",
    canal: "WhatsApp",
    categoria: "Utilidade",
    mensagem: "",
  });

  const filteredTemplates = templates.filter((t) =>
    t.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddTemplate = () => {
    const novo = {
      ...newTemplate,
      id: String(templates.length + 1),
      variaveis: newTemplate.mensagem.match(/\{(\w+)\}/g)?.map((v) => v.slice(1, -1)) || [],
    };
    setTemplates([...templates, novo]);
    setIsAddModalOpen(false);
    setNewTemplate({ nome: "", canal: "WhatsApp", categoria: "Utilidade", mensagem: "" });
  };

  const handleCopy = (mensagem: string) => {
    navigator.clipboard.writeText(mensagem);
    toast({
      title: "Copiado!",
      description: "Template copiado para a área de transferência",
    });
  };

  const handleDelete = (id: string) => {
    setTemplates(templates.filter((t) => t.id !== id));
    toast({
      title: "Template removido",
      description: "O template foi excluído com sucesso",
    });
  };

  const getCanalIcon = (canal: string) => {
    switch (canal) {
      case "WhatsApp":
        return <MessageSquare className="h-4 w-4 text-success" />;
      case "E-mail":
        return <Mail className="h-4 w-4 text-primary" />;
      case "SMS":
        return <Smartphone className="h-4 w-4 text-warning" />;
      default:
        return null;
    }
  };

  const generateAITemplate = () => {
    const aiTemplate = {
      nome: "Template Gerado por IA",
      canal: "WhatsApp",
      categoria: "Utilidade",
      mensagem: "Olá {nome}!\n\nEsperamos que esteja bem! Passando para lembrar que seu compromisso financeiro no valor de R$ {valor} encontra-se em aberto.\n\nSabemos que imprevistos acontecem, por isso estamos aqui para ajudar!\n\nAcesse seu boleto: {link_boleto}\n\nPrecisa de condições especiais? Responda esta mensagem que nossa equipe entrará em contato.\n\nContamos com você!",
      id: String(templates.length + 1),
      variaveis: ["nome", "valor", "link_boleto"],
    };
    setTemplates([...templates, aiTemplate]);
    setIsAIModalOpen(false);
    toast({
      title: "Template gerado!",
      description: "IA criou um novo template otimizado anti-ban",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2.5 bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Templates</h1>
            <p className="text-sm text-muted-foreground">Gestão de mensagens SMS, E-mail e WhatsApp</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAIModalOpen} onOpenChange={setIsAIModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-primary text-primary">
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar com IA
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-heading flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Gerador de Templates com IA
                </DialogTitle>
                <DialogDescription>
                  Nossa IA cria templates otimizados para cobranças, seguindo as melhores práticas anti-ban da Meta.
                </DialogDescription>
              </DialogHeader>
              <div className="py-6 space-y-4">
                <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                  <h4 className="font-semibold text-success mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Práticas Anti-Ban
                  </h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>- Mensagens de utilidade (não marketing)</li>
                    <li>- Tom amigável e não ameaçador</li>
                    <li>- Variáveis dinâmicas personalizadas</li>
                    <li>- Opção de resposta/contato</li>
                  </ul>
                </div>
                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <h4 className="font-semibold text-destructive mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Evitar
                  </h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>- Ameaças ou linguagem agressiva</li>
                    <li>- Spam ou mensagens em massa</li>
                    <li>- Conteúdo promocional excessivo</li>
                  </ul>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAIModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={generateAITemplate}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-heading">Criar Novo Template</DialogTitle>
                <DialogDescription>
                  Use variáveis no formato {"{nome}"} para personalização
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Nome do Template</Label>
                    <Input
                      value={newTemplate.nome}
                      onChange={(e) =>
                        setNewTemplate({ ...newTemplate, nome: e.target.value })
                      }
                      placeholder="Ex: Lembrete D+7"
                      className="rounded-lg"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Canal</Label>
                    <Select
                      value={newTemplate.canal}
                      onValueChange={(value) =>
                        setNewTemplate({ ...newTemplate, canal: value })
                      }
                    >
                      <SelectTrigger className="rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                        <SelectItem value="SMS">SMS</SelectItem>
                        <SelectItem value="E-mail">E-mail</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Mensagem</Label>
                  <Textarea
                    value={newTemplate.mensagem}
                    onChange={(e) =>
                      setNewTemplate({ ...newTemplate, mensagem: e.target.value })
                    }
                    placeholder="Digite a mensagem do template..."
                    rows={6}
                    className="rounded-lg"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  <strong>Variáveis disponíveis:</strong> {"{nome}"}, {"{valor}"}, {"{vencimento}"}, {"{link_boleto}"}, {"{parcelas}"}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddTemplate}>Criar Template</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar template..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-lg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {getCanalIcon(template.canal)}
                  <CardTitle className="font-heading text-lg">{template.nome}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleCopy(template.mensagem)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{template.canal}</Badge>
                <Badge variant="secondary">{template.categoria}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                {template.mensagem}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {template.variaveis.map((v) => (
                  <Badge key={v} variant="outline" className="text-xs">
                    {"{" + v + "}"}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Templates;
