import { useAssociadoHistorico } from "@/hooks/useWhatsApp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText, Handshake, Phone, DollarSign, Loader2, ExternalLink, Car,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  associadoId: string | null;
  onSendBoleto?: (boleto: any) => void;
}

function fmtCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

const BOLETO_STATUS_COLORS: Record<string, string> = {
  aberto: "bg-warning/10 text-warning",
  vencido: "bg-destructive/10 text-destructive",
  pago: "bg-success/10 text-success",
  baixado: "bg-success/10 text-success",
  cancelado: "bg-muted text-muted-foreground",
  acordo: "bg-primary/10 text-primary",
};

export function AssociadoHistoricoSection({ associadoId, onSendBoleto }: Props) {
  const { data, isLoading } = useAssociadoHistorico(associadoId);

  if (!associadoId) return null;
  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!data?.associado) return null;

  const { associado, boletos, acordos, ligacoes, pagamentos } = data;
  const abertos = boletos.filter((b: any) => ["aberto", "vencido"].includes(b.status));
  const totalAberto = abertos.reduce((s: number, b: any) => s + (b.valor || 0), 0);

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
          Associado (sistema)
        </p>
        <div className="rounded-lg bg-muted/30 p-2 space-y-0.5 text-xs">
          <div><span className="text-muted-foreground">CPF:</span> <strong>{associado.cpf || "—"}</strong></div>
          {associado.placa && (
            <div className="flex items-center gap-1">
              <Car className="h-3 w-3 text-muted-foreground" />
              <strong>{associado.placa}</strong>
            </div>
          )}
          <div><span className="text-muted-foreground">Cooperativa:</span> {associado.cooperativa || "—"}</div>
          <div><span className="text-muted-foreground">Status:</span>{" "}
            <Badge variant="outline" className="text-[10px]">
              {associado.situacao || associado.status || "—"}
            </Badge>
          </div>
          {totalAberto > 0 && (
            <div className="pt-1 border-t mt-1">
              <span className="text-muted-foreground">Em aberto:</span>{" "}
              <strong className="text-destructive">{fmtCurrency(totalAberto)}</strong>
              <span className="text-muted-foreground"> ({abertos.length} boleto{abertos.length !== 1 ? "s" : ""})</span>
            </div>
          )}
        </div>
      </div>

      {/* Boletos */}
      {boletos.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
            <FileText className="h-3 w-3" /> Boletos ({boletos.length})
          </p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {boletos.map((b: any) => (
              <div key={b.id} className="flex items-center gap-2 rounded-md bg-muted/20 p-1.5 text-xs">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">{fmtCurrency(b.valor)}</span>
                    <Badge
                      className={cn(
                        "text-[9px] px-1.5 py-0 h-4 border-0",
                        BOLETO_STATUS_COLORS[b.status] || "",
                      )}
                    >
                      {b.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Venc. {fmtDate(b.vencimento)} {b.mes_referencia && `· ${b.mes_referencia}`}
                  </p>
                </div>
                {b.link_boleto && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                    <a href={b.link_boleto} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                )}
                {onSendBoleto && ["aberto", "vencido"].includes(b.status) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => onSendBoleto(b)}
                  >
                    Enviar
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acordos */}
      {acordos.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
            <Handshake className="h-3 w-3" /> Acordos ({acordos.length})
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {acordos.map((a: any) => (
              <div key={a.id} className="flex items-center gap-2 rounded-md bg-muted/20 p-1.5 text-xs">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">{fmtCurrency(a.valor_acordo)}</span>
                    <span className="text-[10px] text-muted-foreground">
                      em {a.parcelas}x
                    </span>
                    <Badge variant="outline" className="text-[9px] h-4">{a.status}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{fmtDate(a.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagamentos */}
      {pagamentos.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Pagamentos ({pagamentos.length})
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {pagamentos.map((p: any) => (
              <div key={p.id} className="flex items-center gap-2 rounded-md bg-success/5 border border-success/20 p-1.5 text-xs">
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-success">{fmtCurrency(p.valor)}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{p.forma_pagamento}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{fmtDate(p.data_pagamento)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ligações */}
      {ligacoes.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
            <Phone className="h-3 w-3" /> Ligações ({ligacoes.length})
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {ligacoes.map((l: any) => (
              <div key={l.id} className="flex items-center gap-2 rounded-md bg-muted/20 p-1.5 text-xs">
                <div className="flex-1 min-w-0">
                  <Badge variant="outline" className="text-[9px] h-4">{l.resultado}</Badge>
                  <span className="text-[10px] text-muted-foreground ml-2">
                    {l.duracao_segundos ? `${Math.floor(l.duracao_segundos / 60)}m` : "—"}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(l.data_hora).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
