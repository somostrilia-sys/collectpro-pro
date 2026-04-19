import { useState } from "react";
import { useWhatsAppInstances, useInstanceConfig } from "@/hooks/useWhatsApp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wifi, WifiOff, RefreshCw, Power, QrCode, Settings, User, Camera, Gauge, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props { instanceId: string | null; }

export function ConfigTab({ instanceId }: Props) {
  const { toast } = useToast();
  const { data: instances = [] } = useWhatsAppInstances();
  const instance = instances.find((i) => i.id === instanceId);
  const config = useInstanceConfig();

  const [profileName, setProfileName] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [delayMin, setDelayMin] = useState("3");
  const [delayMax, setDelayMax] = useState("6");

  if (!instance) return <div className="p-8 text-center text-muted-foreground text-sm">Selecione uma instância</div>;

  const runAction = async (action: string, extra?: any, successMsg?: string) => {
    try {
      await config.mutateAsync({ instance_id: instance.id, action, ...extra });
      toast({ title: successMsg ?? "Ação concluída" });
    } catch (e: any) {
      toast({ title: "Falha", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Status */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {instance.status === "connected" ? (
              <Wifi className="h-4 w-4 text-success" />
            ) : (
              <WifiOff className="h-4 w-4 text-muted-foreground" />
            )}
            Status da Instância
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{instance.nome}</p>
              <p className="text-xs text-muted-foreground">{instance.telefone || "Sem número"}</p>
            </div>
            <Badge
              variant="outline"
              className={
                instance.status === "connected" ? "text-success border-success/30" :
                instance.status === "qr_pending" ? "text-warning border-warning/30" :
                "text-muted-foreground"
              }
            >
              {instance.status === "connected" ? "Conectado" :
                instance.status === "qr_pending" ? "Aguardando QR" :
                instance.status === "banned" ? "Banido" : "Desconectado"}
            </Badge>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => runAction("status", {}, "Status atualizado")}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Atualizar
            </Button>
            {instance.status !== "connected" && (
              <Button size="sm" onClick={() => runAction("connect", {}, "QR Code gerado")}>
                <QrCode className="h-3.5 w-3.5 mr-1" /> Conectar (QR)
              </Button>
            )}
            {instance.status === "connected" && (
              <Button variant="destructive" size="sm" onClick={() => runAction("disconnect", {}, "Desconectado")}>
                <Power className="h-3.5 w-3.5 mr-1" /> Desconectar
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => runAction("reset", {}, "Instância resetada")}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Reset
            </Button>
          </div>
          {instance.qr_code && (
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-2">Escaneie o QR no WhatsApp</p>
              <img src={instance.qr_code} alt="QR" className="mx-auto max-w-[240px]" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Perfil WhatsApp */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" /> Perfil WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Novo nome do perfil"
            />
            <Button
              onClick={() => {
                if (!profileName.trim()) return;
                runAction("profile_name", { name: profileName }, "Nome alterado");
              }}
              disabled={config.isPending}
            >
              Salvar
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              value={profileImage}
              onChange={(e) => setProfileImage(e.target.value)}
              placeholder="URL da nova foto"
            />
            <Button
              variant="outline"
              onClick={() => {
                if (!profileImage.trim()) return;
                runAction("profile_image", { image_url: profileImage }, "Foto alterada");
              }}
              disabled={config.isPending}
            >
              <Camera className="h-4 w-4 mr-1" /> Foto
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Anti-ban / Delay */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4" /> Delay Anti-ban
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Intervalo (em segundos) entre mensagens pra evitar bloqueio.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Mínimo (s)</Label>
              <Input type="number" min="0" value={delayMin} onChange={(e) => setDelayMin(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Máximo (s)</Label>
              <Input type="number" min="0" value={delayMax} onChange={(e) => setDelayMax(e.target.value)} />
            </div>
          </div>
          <Button
            onClick={() => runAction("delay_set", {
              delay_min: parseInt(delayMin) || 3,
              delay_max: parseInt(delayMax) || 6,
            }, "Delay atualizado")}
            disabled={config.isPending}
          >
            Salvar delay
          </Button>
        </CardContent>
      </Card>

      {/* Limites */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" /> Limites e Privacidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" size="sm" onClick={() => runAction("limits", {}, "Limites consultados")}>
            Ver limites atuais
          </Button>
          <Button variant="outline" size="sm" onClick={() => runAction("privacy_get", {}, "Privacidade consultada")}>
            Ver configurações de privacidade
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
