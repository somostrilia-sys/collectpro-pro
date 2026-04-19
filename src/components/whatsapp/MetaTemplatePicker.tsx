import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Send } from "lucide-react";
import { useMetaTemplatesLocal, useSendMessage } from "@/hooks/useWhatsApp";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Props {
  instanceId: string;
  telefone: string;
  associadoId?: string | null;
  disabled?: boolean;
  triggerClassName?: string;
  /** Filtro de setor/categoria (ex: "cobranca", "evento", "track", "gestao"). "all" = todos. */
  defaultSetor?: "cobranca" | "evento" | "track" | "gestao" | "all";
}

const SETOR_GROUPS = [
  { slug: "all",       label: "Todos" },
  { slug: "cobranca",  label: "💰 Cobrança"    },
  { slug: "evento",    label: "🚨 Eventos"     },
  { slug: "track",     label: "📍 Rastreamento" },
  { slug: "gestao",    label: "📋 Gestão"      },
  { slug: "boas_vindas", label: "👋 Boas-vindas" },
  { slug: "lembrete",  label: "⏰ Lembrete"    },
  { slug: "aplicativo", label: "📱 Aplicativo" },
  { slug: "outro",     label: "Outros"         },
];

// Extrai variáveis {{nome}} / {{1}} do body do template
function extractVars(template: any): string[] {
  const bodyComp = (template.components || []).find((c: any) => c.type === "BODY");
  if (!bodyComp?.text) return [];
  const matches = String(bodyComp.text).matchAll(/\{\{(\w+)\}\}/g);
  const seen = new Set<string>();
  for (const m of matches) seen.add(m[1]);
  return Array.from(seen);
}

function getBodyPreview(template: any): string {
  const bodyComp = (template.components || []).find((c: any) => c.type === "BODY");
  return bodyComp?.text ?? "";
}

export function MetaTemplatePicker({ instanceId, telefone, associadoId, disabled, triggerClassName, defaultSetor = "cobranca" }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [vars, setVars] = useState<Record<string, string>>({});
  const [setorFilter, setSetorFilter] = useState<string>(defaultSetor);
  const { user } = useAuth();

  const { data: templates = [], isLoading } = useMetaTemplatesLocal(instanceId, "APPROVED");
  const send = useSendMessage();

  const filtered = useMemo(() => {
    if (setorFilter === "all") return templates;
    return templates.filter((t: any) => {
      const cat = (t.categoria || t.category || "").toString().toLowerCase();
      return cat === setorFilter || cat.includes(setorFilter);
    });
  }, [templates, setorFilter]);

  const selected = useMemo(
    () => templates.find((t: any) => t.id === selectedId) ?? null,
    [templates, selectedId],
  );

  const varList = useMemo(() => (selected ? extractVars(selected) : []), [selected]);

  async function handleSend() {
    if (!selected) return;
    try {
      await send.mutateAsync({
        instance_id: instanceId,
        telefone,
        associado_id: associadoId ?? undefined,
        colaborador_id: user?.id,
        template_id: selected.id,
        variaveis: vars,
      } as any);
      toast({ title: "Template enviado" });
      setOpen(false);
      setSelectedId(null);
      setVars({});
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className={triggerClassName}>
          <FileText className="h-4 w-4 mr-1" />
          Enviar template
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar template aprovado</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filtro de setor */}
          <div className="flex items-center gap-2">
            <Label className="text-xs">Setor:</Label>
            <Select value={setorFilter} onValueChange={setSetorFilter}>
              <SelectTrigger className="h-8 w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SETOR_GROUPS.map((s) => (
                  <SelectItem key={s.slug} value={s.slug}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground ml-auto">
              {filtered.length}/{templates.length}
            </span>
          </div>

          {isLoading && <p className="text-sm text-muted-foreground">Carregando templates...</p>}
          {!isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {templates.length === 0
                ? "Nenhum template aprovado. Crie em /integracoes > Templates Meta."
                : "Nenhum template neste setor. Troca o filtro ou use 'Todos'."}
            </p>
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filtered.map((t: any) => (
              <button
                key={t.id}
                onClick={() => { setSelectedId(t.id); setVars({}); }}
                className={`w-full text-left p-2 rounded border text-xs transition ${
                  selectedId === t.id ? "border-primary bg-primary/5" : "border-muted hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{t.name}</span>
                  <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{t.language}</Badge>
                </div>
                <p className="text-muted-foreground line-clamp-2">{getBodyPreview(t)}</p>
              </button>
            ))}
          </div>

          {selected && varList.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <Label className="text-xs font-semibold">Variáveis</Label>
              {varList.map((v) => (
                <div key={v} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{`{{${v}}}`}</Label>
                  <Input
                    value={vars[v] ?? ""}
                    onChange={(e) => setVars({ ...vars, [v]: e.target.value })}
                    placeholder={v === "atendente" ? "Preenchido automaticamente" : ""}
                  />
                </div>
              ))}
            </div>
          )}

          {selected && (
            <div className="border-t pt-3">
              <Label className="text-xs font-semibold mb-1">Prévia</Label>
              <Textarea
                readOnly
                rows={4}
                value={getBodyPreview(selected).replace(
                  /\{\{(\w+)\}\}/g,
                  (_, k) => vars[k] || (k === "atendente" ? "[seu nome]" : `{{${k}}}`),
                )}
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button size="sm" disabled={!selected || send.isPending} onClick={handleSend}>
              <Send className="h-4 w-4 mr-1" />
              Enviar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
