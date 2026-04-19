import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Save, Loader2, RefreshCw, Phone } from "lucide-react";

interface Props { instanceId: string | null; }

const VERTICALS = [
  "ALCOHOL","APPAREL","AUTO","BEAUTY","EDU","ENTERTAIN","EVENT_PLAN","FINANCE",
  "GOVT","GROCERY","HEALTH","HOTEL","NONPROFIT","ONLINE_GAMBLING","OTC_DRUGS",
  "OTHER","PHYSICAL_GAMBLING","PROF_SERVICES","RESTAURANT","RETAIL","TRAVEL",
];

export function MetaBusinessProfile({ instanceId }: Props) {
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["meta_profile", instanceId],
    queryFn: async () => {
      if (!instanceId) return null;
      const { data } = await supabase.functions.invoke("whatsapp-meta-profile", {
        body: { instance_id: instanceId, action: "get_profile" },
      });
      return data?.data?.data?.[0] ?? data?.data ?? null;
    },
    enabled: !!instanceId,
  });

  const { data: phoneInfo } = useQuery({
    queryKey: ["meta_phone_info", instanceId],
    queryFn: async () => {
      if (!instanceId) return null;
      const { data } = await supabase.functions.invoke("whatsapp-meta-profile", {
        body: { instance_id: instanceId, action: "get_phone" },
      });
      return data?.data ?? null;
    },
    enabled: !!instanceId,
  });

  const [form, setForm] = useState({
    about: "", address: "", description: "", email: "",
    website: "", vertical: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        about: profile.about ?? "",
        address: profile.address ?? "",
        description: profile.description ?? "",
        email: profile.email ?? "",
        website: profile.websites?.[0] ?? "",
        vertical: profile.vertical ?? "",
      });
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("whatsapp-meta-profile", {
        body: {
          instance_id: instanceId,
          action: "update_profile",
          about: form.about || undefined,
          address: form.address || undefined,
          description: form.description || undefined,
          email: form.email || undefined,
          websites: form.website ? [form.website] : undefined,
          vertical: form.vertical || undefined,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? "Falha");
      return data;
    },
    onSuccess: () => {
      toast({ title: "Perfil atualizado" });
      qc.invalidateQueries({ queryKey: ["meta_profile"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const qualityBadge = (rating?: string) => {
    const color = rating === "GREEN" ? "bg-emerald-100 text-emerald-700"
      : rating === "YELLOW" ? "bg-yellow-100 text-yellow-700"
      : rating === "RED" ? "bg-red-100 text-red-700"
      : "bg-muted text-muted-foreground";
    return <Badge className={color}>Qualidade: {rating ?? "—"}</Badge>;
  };

  if (!instanceId) {
    return (
      <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
        Selecione uma instância Meta oficial.
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Phone info + quality */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Phone className="h-4 w-4" /> Phone Number & Qualidade
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">Display Name</Label>
            <p className="font-mono text-xs">{phoneInfo?.verified_name ?? "—"}</p>
          </div>
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">Número</Label>
            <p className="font-mono text-xs">{phoneInfo?.display_phone_number ?? "—"}</p>
          </div>
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">Qualidade</Label>
            <p>{qualityBadge(phoneInfo?.quality_rating)}</p>
          </div>
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">Messaging Limit</Label>
            <p><Badge variant="outline">{phoneInfo?.whatsapp_business_manager_messaging_limit ?? "—"}</Badge></p>
          </div>
        </CardContent>
      </Card>

      {/* Business profile edit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Perfil do Negócio</CardTitle>
          <CardDescription>Informações mostradas ao cliente quando ele abre o chat.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          <div className="space-y-1.5">
            <Label>Sobre <span className="text-[10px] text-muted-foreground">(máx 139)</span></Label>
            <Input value={form.about} maxLength={139} onChange={(e) => setForm({ ...form, about: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição <span className="text-[10px] text-muted-foreground">(máx 512)</span></Label>
            <Textarea value={form.description} maxLength={512} rows={3}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Endereço <span className="text-[10px] text-muted-foreground">(máx 256)</span></Label>
              <Input value={form.address} maxLength={256} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail <span className="text-[10px] text-muted-foreground">(máx 128)</span></Label>
              <Input type="email" value={form.email} maxLength={128}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Website (com https://)</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://collectpro.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Vertical (categoria)</Label>
              <Select value={form.vertical} onValueChange={(v) => setForm({ ...form, vertical: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {VERTICALS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["meta_profile"] })}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Recarregar
            </Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
