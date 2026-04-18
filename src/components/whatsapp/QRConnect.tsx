import { useEffect, useState } from "react";
import { Loader2, QrCode, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useConnectInstance, useRefreshStatus } from "@/hooks/useWhatsApp";
import { supabase } from "@/integrations/supabase/client";
import type { WhatsAppInstance } from "@/types/whatsapp";
import { useToast } from "@/hooks/use-toast";

interface Props {
  instance: WhatsAppInstance | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function QRConnect({ instance, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [qr, setQr] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("disconnected");
  const [connecting, setConnecting] = useState(false);
  const connect = useConnectInstance();
  const refresh = useRefreshStatus();

  const handleGenerate = async () => {
    if (!instance) return;
    setConnecting(true);
    try {
      const res: any = await connect.mutateAsync(instance.id);
      setQr(res?.qr_code || null);
      setStatus(res?.status || "qr_pending");
    } catch (e: any) {
      toast({ title: "Falha ao gerar QR", description: e.message, variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  };

  // Quando abrir, já gera QR
  useEffect(() => {
    if (open && instance && instance.status !== "connected") {
      handleGenerate();
    }
    if (open && instance) setStatus(instance.status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, instance?.id]);

  // Polling de status a cada 3s enquanto aberto e não conectado
  useEffect(() => {
    if (!open || !instance) return;
    if (status === "connected") return;
    const iv = setInterval(async () => {
      const res: any = await refresh.mutateAsync(instance.id).catch(() => null);
      if (res?.status) {
        setStatus(res.status);
        if (res.status === "connected") {
          toast({ title: "Conectado!", description: `${instance.nome} pronto pra uso` });
        }
      }
    }, 3000);
    return () => clearInterval(iv);
  }, [open, instance?.id, status, refresh, toast]);

  // Realtime update na row
  useEffect(() => {
    if (!open || !instance) return;
    const ch = supabase.channel(`wa-inst-${instance.id}`)
      .on("postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "whatsapp_instances", filter: `id=eq.${instance.id}` },
        (p: any) => {
          if (p.new?.status) setStatus(p.new.status);
          if (p.new?.qr_code) setQr(p.new.qr_code);
        },
      ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [open, instance?.id]);

  const qrImg = qr?.startsWith("data:") ? qr : qr ? `data:image/png;base64,${qr}` : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Conectar {instance?.nome ?? "instância"}
          </DialogTitle>
          <DialogDescription>
            Abra WhatsApp &gt; Aparelhos Conectados &gt; Conectar dispositivo e leia o QR.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-4 min-h-[320px]">
          {status === "connected" ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <CheckCircle2 className="h-16 w-16 text-success" />
              <p className="text-lg font-semibold">Conectado!</p>
              <p className="text-sm text-muted-foreground">{instance?.telefone}</p>
            </div>
          ) : connecting || (!qrImg && status !== "banned") ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
            </div>
          ) : status === "banned" ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <XCircle className="h-16 w-16 text-destructive" />
              <p className="text-lg font-semibold">Número banido</p>
              <p className="text-sm text-muted-foreground">Este chip foi bloqueado pelo WhatsApp</p>
            </div>
          ) : qrImg ? (
            <>
              <img src={qrImg} alt="QR Code" className="w-64 h-64 border-2 border-border rounded-lg p-2 bg-white" />
              <p className="text-xs text-muted-foreground mt-3">
                QR expira em ~60s. Aguardando leitura...
              </p>
            </>
          ) : null}
        </div>

        <div className="flex gap-2 justify-end">
          {status !== "connected" && (
            <Button variant="outline" size="sm" onClick={handleGenerate} disabled={connecting}>
              <RefreshCw className={`h-4 w-4 mr-2 ${connecting ? "animate-spin" : ""}`} />
              Novo QR
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>
            {status === "connected" ? "Concluir" : "Fechar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
