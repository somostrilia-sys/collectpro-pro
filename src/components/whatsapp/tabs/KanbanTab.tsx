import { useState, useMemo } from "react";
import { useLeads, useLabelAction } from "@/hooks/useWhatsApp";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, User, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  instanceId: string | null;
}

const DEFAULT_COLUMNS = [
  { key: "novo", label: "Novo", color: "bg-sky-500" },
  { key: "em_atendimento", label: "Em atendimento", color: "bg-amber-500" },
  { key: "aguardando_pagamento", label: "Aguardando pagamento", color: "bg-violet-500" },
  { key: "acordo", label: "Acordo fechado", color: "bg-emerald-500" },
  { key: "resolvido", label: "Resolvido", color: "bg-gray-500" },
  { key: "perdido", label: "Perdido", color: "bg-rose-500" },
];

export function KanbanTab({ instanceId }: Props) {
  const { toast } = useToast();
  const { data: leads = [], isLoading } = useLeads(instanceId);
  const labelAction = useLabelAction();

  const columns = useMemo(() => {
    const grouped = new Map<string, any[]>();
    for (const c of DEFAULT_COLUMNS) grouped.set(c.key, []);
    grouped.set("_sem_status", []);

    for (const lead of leads) {
      const status = lead.lead_status || "_sem_status";
      if (!grouped.has(status)) grouped.set(status, []);
      grouped.get(status)!.push(lead);
    }
    return grouped;
  }, [leads]);

  const moveLead = async (chatJid: string, newStatus: string) => {
    if (!instanceId) return;
    try {
      await labelAction.mutateAsync({
        instance_id: instanceId,
        action: "lead_update_local",
        chat_jid: chatJid,
        status: newStatus,
      });
      toast({ title: "Status atualizado" });
    } catch (e: any) {
      toast({ title: "Falha", description: e.message, variant: "destructive" });
    }
  };

  if (!instanceId) {
    return <div className="p-8 text-center text-muted-foreground text-sm">Selecione uma instância</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 text-sm">
        <MessageSquare className="h-10 w-10 opacity-40" />
        <p>Nenhum lead cadastrado ainda.</p>
        <p className="text-xs">Quando editar dados de lead em um chat, ele aparece aqui.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-x-auto p-4">
      <div className="flex gap-3 h-full min-w-max">
        {DEFAULT_COLUMNS.map((col) => {
          const items = columns.get(col.key) ?? [];
          return (
            <div key={col.key} className="flex-1 min-w-[260px] max-w-[320px] flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("h-2 w-2 rounded-full", col.color)} />
                <p className="font-semibold text-sm">{col.label}</p>
                <span className="text-xs text-muted-foreground">({items.length})</span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto bg-muted/20 rounded-lg p-2">
                {items.map((lead: any) => (
                  <Card key={lead.id} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-move">
                    <CardContent className="pt-3 pb-3">
                      <p className="font-medium text-sm truncate">
                        {lead.lead_name || lead.lead_full_name || "Sem nome"}
                      </p>
                      {lead.lead_personalid && (
                        <p className="text-[11px] text-muted-foreground">{lead.lead_personalid}</p>
                      )}
                      {lead.lead_notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{lead.lead_notes}</p>
                      )}
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {lead.lead_tags?.slice(0, 3).map((t: string, idx: number) => (
                          <span key={idx} className="text-[9px] bg-muted px-1.5 py-0.5 rounded">
                            {t}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-1 mt-2">
                        {DEFAULT_COLUMNS.filter(c => c.key !== col.key).slice(0, 2).map((c) => (
                          <Button
                            key={c.key}
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2"
                            onClick={() => moveLead(lead.chat_jid, c.key)}
                          >
                            → {c.label.split(" ")[0]}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {items.length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-4 italic">Sem leads</p>
                )}
              </div>
            </div>
          );
        })}

        {/* Coluna sem status */}
        {(columns.get("_sem_status")?.length ?? 0) > 0 && (
          <div className="flex-1 min-w-[260px] max-w-[320px] flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-gray-300" />
              <p className="font-semibold text-sm">Sem status</p>
              <span className="text-xs text-muted-foreground">({columns.get("_sem_status")?.length ?? 0})</span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto bg-muted/20 rounded-lg p-2">
              {columns.get("_sem_status")?.map((lead: any) => (
                <Card key={lead.id} className="border-0 shadow-sm">
                  <CardContent className="pt-3 pb-3">
                    <p className="font-medium text-sm truncate">
                      {lead.lead_name || lead.chat_jid}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
