import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Send, Check, CheckCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  associadoId: string | null;
}

interface TimelineMessage {
  id: string;
  instance_id: string;
  telefone: string;
  direction: "in" | "out";
  status: string;
  tipo: string;
  body: string | null;
  media_url: string | null;
  provider_tipo: "uazapi" | "meta";
  colaborador_nome_snap: string | null;
  criado_em: string;
  instance_nome?: string;
  instance_tipo?: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function ProviderBadge({ provider, instance_nome }: { provider: string; instance_nome?: string }) {
  if (provider === "meta") {
    return (
      <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-600">
        META · {instance_nome ?? "Oficial"}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-600">
      UAZAPI · {instance_nome ?? ""}
    </Badge>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "read": return <CheckCheck className="h-3 w-3 text-blue-500" />;
    case "delivered": return <CheckCheck className="h-3 w-3 opacity-60" />;
    case "sent": return <Check className="h-3 w-3 opacity-60" />;
    case "failed": return <AlertCircle className="h-3 w-3 text-destructive" />;
    default: return null;
  }
}

export function AssociadoTimeline({ associadoId }: Props) {
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["associado_timeline", associadoId],
    queryFn: async () => {
      if (!associadoId) return [] as TimelineMessage[];
      const { data } = await supabase
        .from("whatsapp_messages")
        .select(`
          id, instance_id, telefone, direction, status, tipo, body,
          media_url, provider_tipo, colaborador_nome_snap, criado_em,
          whatsapp_instances:instance_id (nome, tipo)
        `)
        .eq("associado_id", associadoId)
        .order("criado_em", { ascending: true })
        .limit(500);
      return (data ?? []).map((m: any) => ({
        ...m,
        instance_nome: m.whatsapp_instances?.nome,
        instance_tipo: m.whatsapp_instances?.tipo,
      })) as TimelineMessage[];
    },
    enabled: !!associadoId,
    staleTime: 15_000,
  });

  const grouped = useMemo(() => {
    const byDate = new Map<string, TimelineMessage[]>();
    for (const m of messages) {
      const d = new Date(m.criado_em).toLocaleDateString("pt-BR");
      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d)!.push(m);
    }
    return Array.from(byDate.entries());
  }, [messages]);

  if (!associadoId) {
    return (
      <div className="text-sm text-muted-foreground text-center py-12">
        Selecione um associado
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-12 flex flex-col items-center gap-2">
        <MessageSquare className="h-8 w-8 opacity-30" />
        Nenhuma conversa de WhatsApp registrada.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {grouped.map(([date, msgs]) => (
        <div key={date} className="space-y-2">
          <div className="sticky top-0 bg-background/95 backdrop-blur px-2 py-1 text-xs font-semibold text-muted-foreground border-b">
            {date}
          </div>
          {msgs.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex gap-2 text-sm rounded-lg p-2.5 border",
                m.direction === "out" ? "bg-primary/5 border-primary/20 ml-8" : "bg-muted/30 border-muted mr-8",
              )}
            >
              <div className="flex-shrink-0 pt-0.5">
                {m.direction === "out" ? <Send className="h-3.5 w-3.5 text-primary" /> : <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <ProviderBadge provider={m.provider_tipo} instance_nome={m.instance_nome} />
                  {m.colaborador_nome_snap && m.direction === "out" && (
                    <Badge variant="secondary" className="text-[10px]">{m.colaborador_nome_snap}</Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                    <StatusIcon status={m.status} />
                    {formatTime(m.criado_em)}
                  </span>
                </div>
                {m.body && (
                  <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                )}
                {m.media_url && (
                  <div className="mt-1">
                    {m.tipo === "image" || m.tipo === "sticker" ? (
                      <img src={m.media_url} alt="" className="max-h-48 rounded" />
                    ) : (
                      <a href={m.media_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                        📎 {m.tipo}
                      </a>
                    )}
                  </div>
                )}
                {m.status === "failed" && (
                  <p className="text-xs text-destructive mt-1">❌ Falha no envio</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
