// FilaTab — Painel de Fila do Hub Central (Meta Oficial, 4 setores)
// Admin/Gestora/CEO/Diretor/CS podem alternar entre setores ou ver TODOS.
// Atendente fica fixo no setor dele (cobranca no CollectPro).

import { useState, useMemo } from "react";
import { Inbox, Shield } from "lucide-react";
import { FilaSetor } from "@/components/whatsapp/FilaSetor";
import { ChatWindow } from "@/components/whatsapp/ChatWindow";
import { useAuth } from "@/contexts/AuthContext";
import { useWhatsAppInstances } from "@/hooks/useWhatsApp";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Atendimento } from "@/hooks/useHubAtendimentos";

const SETORES = [
  { slug: "cobranca", nome: "Cobrança",       icon: "💰" },
  { slug: "evento",   nome: "Eventos",        icon: "🚨" },
  { slug: "track",    nome: "Rastreamento",   icon: "📍" },
  { slug: "gestao",   nome: "Gestão",         icon: "📋" },
] as const;

export function FilaTab() {
  const { role } = useAuth();
  const { data: instances = [] } = useWhatsAppInstances();
  const isAdmin = role === "Admin" || role === "Gestora";

  // Default: Admin vê "*" (todos), Atendente vê cobranca
  const [setor, setSetor] = useState<"cobranca" | "evento" | "track" | "gestao" | "*">(
    isAdmin ? "*" : "cobranca",
  );
  const [selected, setSelected] = useState<Atendimento | null>(null);

  const metaInstance = useMemo(
    () => instances.find((i: any) => i.tipo === "meta_oficial" && i.status === "connected")
      ?? instances.find((i: any) => i.tipo === "meta_oficial"),
    [instances],
  );

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-12rem)]">
      {/* Header com seletor */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Fila de Atendimento</h2>
          {isAdmin && (
            <Badge variant="outline" className="text-xs">
              Visão master
            </Badge>
          )}
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Setor:</span>
            <Select value={setor} onValueChange={(v) => { setSetor(v as any); setSelected(null); }}>
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="*">🌐 Todos os setores</SelectItem>
                {SETORES.map((s) => (
                  <SelectItem key={s.slug} value={s.slug}>
                    {s.icon} {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Layout: Fila | Chat */}
      <div className="flex flex-1 min-h-0 border rounded-lg overflow-hidden bg-background">
        <div className="w-80 shrink-0 border-r">
          <FilaSetor
            onSelect={setSelected}
            selectedId={selected?.id ?? null}
            setorOverride={setor}
          />
        </div>

        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <Inbox className="h-16 w-16 opacity-30" />
              <p className="text-sm">Selecione um atendimento da fila</p>
              {isAdmin && setor === "*" && (
                <p className="text-xs">Visualizando todos os 4 setores</p>
              )}
            </div>
          ) : (
            <ChatWindow
              instanceId={selected.instance_id ?? metaInstance?.id ?? null}
              telefone={selected.telefone}
              nome={selected.atendente_nome ?? null}
              associadoId={null}
            />
          )}
        </div>
      </div>

      {/* Dica pra admin */}
      {isAdmin && setor === "*" && (
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-xs text-muted-foreground">
            Você está vendo atendimentos de todos os 4 setores (cobrança, eventos, rastreamento, gestão). Use o seletor acima pra filtrar.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
