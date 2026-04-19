import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Ban, UserX, RefreshCw, Loader2 } from "lucide-react";

interface Props { instanceId: string | null; }

export function MetaBlocksManager({ instanceId }: Props) {
  const qc = useQueryClient();
  const [newNumbers, setNewNumbers] = useState("");

  const { data: blocked = [], isLoading } = useQuery({
    queryKey: ["meta_blocks", instanceId],
    queryFn: async () => {
      if (!instanceId) return [];
      const { data } = await supabase.functions.invoke("whatsapp-meta-blocks", {
        body: { instance_id: instanceId, action: "list" },
      });
      return data?.data?.block_users ?? data?.data?.data ?? [];
    },
    enabled: !!instanceId,
  });

  const blockMutation = useMutation({
    mutationFn: async (users: string[]) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-meta-blocks", {
        body: { instance_id: instanceId, action: "block", users },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Usuários bloqueados" });
      setNewNumbers("");
      qc.invalidateQueries({ queryKey: ["meta_blocks"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const unblockMutation = useMutation({
    mutationFn: async (users: string[]) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-meta-blocks", {
        body: { instance_id: instanceId, action: "unblock", users },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Desbloqueado" });
      qc.invalidateQueries({ queryKey: ["meta_blocks"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const handleBlock = () => {
    const nums = newNumbers.split(/[\n,;]+/).map((s) => s.trim().replace(/\D/g, "")).filter(Boolean);
    if (nums.length === 0) return;
    blockMutation.mutate(nums);
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
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Ban className="h-4 w-4" /> Bloquear usuário</CardTitle>
          <CardDescription>
            Só funciona pra quem escreveu nas últimas 24h. Limite: 64.000 bloqueados por número.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Números (um por linha ou separados por vírgula)</Label>
          <Input
            value={newNumbers}
            onChange={(e) => setNewNumbers(e.target.value)}
            placeholder="5511999999999, 5521988887777"
          />
          <Button onClick={handleBlock} disabled={blockMutation.isPending} size="sm">
            {blockMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserX className="h-3.5 w-3.5 mr-1.5" />}
            Bloquear
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Usuários bloqueados</CardTitle>
              <CardDescription>{blocked.length} bloqueados</CardDescription>
            </div>
            <Button variant="outline" size="sm"
              onClick={() => qc.invalidateQueries({ queryKey: ["meta_blocks"] })}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
          ) : blocked.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum bloqueado.</p>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {blocked.map((b: any, i: number) => {
                const num = b.wa_id ?? b.user ?? b;
                return (
                  <div key={i} className="flex items-center gap-2 p-2 border rounded-lg text-sm">
                    <Badge variant="outline" className="font-mono">{num}</Badge>
                    <Button size="sm" variant="ghost" className="ml-auto h-7"
                      onClick={() => unblockMutation.mutate([num])}
                      disabled={unblockMutation.isPending}>
                      Desbloquear
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
