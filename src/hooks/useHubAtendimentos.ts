// CollectPro — atendimentos por setor (Hub = própio Supabase)
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const SETOR = "cobranca";
export type SetorSlug = "cobranca" | "evento" | "track" | "gestao";
export const SETORES_VALIDOS: SetorSlug[] = ["cobranca", "evento", "track", "gestao"];

export interface Atendimento {
  id: string;
  instance_id: string;
  telefone: string;
  setor: string;
  status: "aberto" | "em_ia" | "em_humano" | "aguardando_cliente" | "resolvido" | "transferido" | "arquivado";
  atendente_nome: string | null;
  sistema_origem: string | null;
  protocolo: string | null;
  ultima_msg_em: string;
}

/**
 * Hook de atendimentos por setor.
 * @param status filtros de status
 * @param setorOverride opcional — quando supervisor/admin/ceo/diretor/cs vê outro setor.
 *                     Quando omitido, usa SETOR padrão ("cobranca" no CollectPro).
 *                     Passa "*" pra ver TODOS os setores.
 */
export function useAtendimentos(status?: string[], setorOverride?: SetorSlug | "*") {
  const qc = useQueryClient();
  const setor = setorOverride ?? SETOR;
  const query = useQuery<Atendimento[]>({
    queryKey: ["atendimentos", setor, status],
    queryFn: async () => {
      let q = (supabase as any).from("whatsapp_atendimentos")
        .select("*")
        .order("ultima_msg_em", { ascending: false }).limit(500);
      if (setor !== "*") q = q.eq("setor", setor);
      if (status?.length) q = q.in("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Atendimento[];
    },
    staleTime: 5_000,
  });
  useEffect(() => {
    const filter = setor === "*" ? undefined : `setor=eq.${setor}`;
    const ch = supabase.channel(`atend-${setor}`)
      .on("postgres_changes" as any,
        { event: "*", schema: "public", table: "whatsapp_atendimentos", ...(filter ? { filter } : {}) },
        () => qc.invalidateQueries({ queryKey: ["atendimentos", setor] }),
      ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc, setor]);
  return query;
}

export function useAssumir() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { atendimento_id: string; atendente_nome?: string; atendente_id?: string }) => {
      const { error } = await (supabase as any).from("whatsapp_atendimentos").update({
        status: "em_humano",
        atendente_nome: args.atendente_nome,
        atendente_id: args.atendente_id,
        sistema_origem: "collectpro",
        assumido_em: new Date().toISOString(),
      }).eq("id", args.atendimento_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atendimentos"] }),
  });
}

export function useTransferir() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { atendimento_id: string; para_setor: string; motivo?: string }) => {
      const { data: at } = await (supabase as any).from("whatsapp_atendimentos")
        .select("setor").eq("id", args.atendimento_id).single();
      await (supabase as any).from("whatsapp_atendimentos").update({
        setor: args.para_setor, status: "transferido", notas: args.motivo,
      }).eq("id", args.atendimento_id);
      await (supabase as any).from("whatsapp_handoffs").insert({
        atendimento_id: args.atendimento_id, tipo: "setor_to_setor",
        de_setor: at?.setor, para_setor: args.para_setor, motivo: args.motivo,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atendimentos"] }),
  });
}

export function useFilas() {
  return useQuery({
    queryKey: ["hub-filas"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("whatsapp_filas_setor").select("*");
      if (error) throw error;
      return data || [];
    },
    staleTime: 10_000,
  });
}
