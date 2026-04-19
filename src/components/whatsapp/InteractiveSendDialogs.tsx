import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2, MapPin } from "lucide-react";
import { useSendMessage } from "@/hooks/useWhatsApp";
import { useToast } from "@/hooks/use-toast";

interface BaseProps {
  instanceId: string;
  chatJid?: string | null;
  telefone?: string | null;
  associadoId?: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

// ═══════════════════════════════════════════════════════════════════════
// LOCATION
// ═══════════════════════════════════════════════════════════════════════

export function SendLocationDialog({ instanceId, chatJid, telefone, associadoId, open, onOpenChange }: BaseProps) {
  const { toast } = useToast();
  const send = useSendMessage();
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast({ title: "Geolocalização não disponível", variant: "destructive" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
      },
      () => toast({ title: "Permissão negada", variant: "destructive" }),
    );
  };

  const submit = async () => {
    if (!lat || !lng) return;
    try {
      await send.mutateAsync({
        instance_id: instanceId,
        chat_jid: chatJid ?? undefined,
        telefone: telefone ?? undefined,
        associado_id: associadoId ?? undefined,
        location: {
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
          name: name || undefined,
          address: address || undefined,
        },
      });
      toast({ title: "Localização enviada" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Falha", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar Localização</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Button variant="outline" size="sm" className="w-full" onClick={useMyLocation}>
            <MapPin className="h-4 w-4 mr-1" /> Usar minha localização
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Latitude *</Label>
              <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-3.04" />
            </div>
            <div>
              <Label>Longitude *</Label>
              <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-60.13" />
            </div>
          </div>
          <div>
            <Label>Nome do lugar</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Endereço</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={send.isPending || !lat || !lng}>
            {send.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CONTACT (vCard)
// ═══════════════════════════════════════════════════════════════════════

export function SendContactDialog({ instanceId, chatJid, telefone, associadoId, open, onOpenChange }: BaseProps) {
  const { toast } = useToast();
  const send = useSendMessage();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const submit = async () => {
    if (!name || !phone) return;
    try {
      await send.mutateAsync({
        instance_id: instanceId,
        chat_jid: chatJid ?? undefined,
        telefone: telefone ?? undefined,
        associado_id: associadoId ?? undefined,
        contact: { name, phone },
      });
      toast({ title: "Contato enviado" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Falha", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Enviar Contato</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Telefone *</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5511999998888" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={send.isPending || !name || !phone}>
            {send.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PIX BUTTON
// ═══════════════════════════════════════════════════════════════════════

export function SendPixDialog({ instanceId, chatJid, telefone, associadoId, open, onOpenChange }: BaseProps) {
  const { toast } = useToast();
  const send = useSendMessage();
  const [chave, setChave] = useState("");
  const [valor, setValor] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  const submit = async () => {
    if (!chave || !valor || !nome) return;
    try {
      await send.mutateAsync({
        instance_id: instanceId,
        chat_jid: chatJid ?? undefined,
        telefone: telefone ?? undefined,
        associado_id: associadoId ?? undefined,
        pix: {
          chave,
          valor: parseFloat(valor.replace(",", ".")),
          nome,
          descricao: descricao || undefined,
        },
      });
      toast({ title: "Botão PIX enviado" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Falha", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Enviar Botão PIX</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Chave PIX *</Label>
            <Input value={chave} onChange={(e) => setChave(e.target.value)} placeholder="CPF, email, telefone ou chave aleatória" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (R$) *</Label>
              <Input value={valor} onChange={(e) => setValor(e.target.value)} type="number" step="0.01" />
            </div>
            <div>
              <Label>Nome do beneficiário *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={send.isPending || !chave || !valor || !nome}>
            {send.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Enviar PIX
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ENQUETE
// ═══════════════════════════════════════════════════════════════════════

export function SendPollDialog({ instanceId, chatJid, telefone, associadoId, open, onOpenChange }: BaseProps) {
  const { toast } = useToast();
  const send = useSendMessage();
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [multi, setMulti] = useState(false);

  const addOption = () => setOptions([...options, ""]);
  const removeOption = (i: number) => setOptions(options.filter((_, idx) => idx !== i));
  const updateOption = (i: number, v: string) => setOptions(options.map((o, idx) => idx === i ? v : o));

  const submit = async () => {
    const cleanOpts = options.map((o) => o.trim()).filter(Boolean);
    if (!title.trim() || cleanOpts.length < 2) return;
    try {
      await send.mutateAsync({
        instance_id: instanceId,
        chat_jid: chatJid ?? undefined,
        telefone: telefone ?? undefined,
        associado_id: associadoId ?? undefined,
        menu: {
          type: "poll",
          text: title,
          choices: cleanOpts,
          selectableCount: multi ? cleanOpts.length : 1,
        },
      });
      toast({ title: "Enquete enviada" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Falha", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Criar Enquete</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Pergunta *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Opções (mínimo 2)</Label>
            {options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input value={o} onChange={(e) => updateOption(i, e.target.value)} placeholder={`Opção ${i + 1}`} />
                {options.length > 2 && (
                  <Button variant="ghost" size="icon" onClick={() => removeOption(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addOption}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar opção
            </Button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} />
            Múltipla escolha
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={send.isPending || !title || options.filter(o => o.trim()).length < 2}>
            {send.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PAGAMENTO
// ═══════════════════════════════════════════════════════════════════════

export function SendPaymentDialog({ instanceId, chatJid, telefone, associadoId, open, onOpenChange }: BaseProps) {
  const { toast } = useToast();
  const send = useSendMessage();
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [referencia, setReferencia] = useState("");

  const submit = async () => {
    if (!valor) return;
    try {
      await send.mutateAsync({
        instance_id: instanceId,
        chat_jid: chatJid ?? undefined,
        telefone: telefone ?? undefined,
        associado_id: associadoId ?? undefined,
        payment: {
          valor: parseFloat(valor.replace(",", ".")),
          descricao,
          referencia: referencia || undefined,
        },
      });
      toast({ title: "Solicitação de pagamento enviada" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Falha", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Solicitar Pagamento</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Valor (R$) *</Label>
            <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div>
            <Label>Referência externa</Label>
            <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="ID do boleto, contrato..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={send.isPending || !valor}>
            {send.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Solicitar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
