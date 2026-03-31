import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Status mapping from DB values to UI values
function mapStatus(dbStatus: string | null): "Pendente" | "Pago" | "Cancelado" | "Vencido" {
  switch (dbStatus) {
    case "pago": return "Pago";
    case "cancelado": return "Cancelado";
    case "vencido": return "Vencido";
    default: return "Pendente";
  }
}

function mapStatusToDb(uiStatus: string): string {
  switch (uiStatus) {
    case "Pago": return "pago";
    case "Cancelado": return "cancelado";
    case "Vencido": return "vencido";
    default: return "ativo";
  }
}

// Dashboard KPI stats from acordos table
export function useAcordosStats() {
  return useQuery({
    queryKey: ["acordos-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acordos")
        .select("id, valor_original, valor_acordo, status, created_at");
      if (error) return { totalEmAberto: 0, taxaRecuperacao: 0, acordosSemana: 0, total: 0 };
      const acordos = data || [];
      const semanaAtras = new Date();
      semanaAtras.setDate(semanaAtras.getDate() - 7);
      const pagos = acordos.filter((a) => a.status === "pago");
      const emAberto = acordos.filter((a) => !["pago", "cancelado"].includes(a.status ?? ""));
      const acordosSemana = acordos.filter((a) => new Date(a.created_at) >= semanaAtras);
      return {
        totalEmAberto: emAberto.reduce((sum, a) => sum + (a.valor_original || 0), 0),
        taxaRecuperacao: acordos.length > 0 ? Math.round((pagos.length / acordos.length) * 100) : 0,
        acordosSemana: acordosSemana.length,
        total: acordos.length,
      };
    },
    staleTime: 60_000,
  });
}

// Acordos list for Acordos page
export interface AcordoRow {
  id: string;
  associado: string;
  cpf: string;
  valorOriginal: number;
  valorAcordo: number;
  status: "Pendente" | "Pago" | "Cancelado" | "Vencido";
  dataAcordo: string;
  dataVencimento: string;
  atendente: string;
  observacao: string;
  comentarios: { id: string; autor: string; dataHora: string; texto: string }[];
  historico: { id: string; descricao: string; dataHora: string }[];
}

export function useAcordosList() {
  return useQuery<AcordoRow[]>({
    queryKey: ["acordos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acordos")
        .select("id, associado_id, valor_original, valor_acordo, parcelas, parcelas_detalhes, status, created_at, associados(nome)")
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data || []).map((a: any) => ({
        id: String(a.id),
        associado: a.associados?.nome || (a.associado_id ? `Associado ${a.associado_id}` : "—"),
        cpf: "",
        valorOriginal: a.valor_original || 0,
        valorAcordo: a.valor_acordo || 0,
        status: mapStatus(a.status),
        dataAcordo: a.created_at ? a.created_at.split("T")[0] : "",
        dataVencimento: Array.isArray(a.parcelas_detalhes) && a.parcelas_detalhes[0]?.vencimento
          ? a.parcelas_detalhes[0].vencimento
          : "",
        atendente: "",
        observacao: "",
        comentarios: [],
        historico: [],
      }));
    },
    staleTime: 30_000,
  });
}

export function useCreateAcordo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      valorOriginal: number;
      valorAcordo: number;
      dataVencimento: string;
      associadoNome?: string;
      atendente?: string;
      observacao?: string;
    }) => {
      const parcelasDetalhes = [{
        numero: 1,
        valor: payload.valorAcordo,
        vencimento: payload.dataVencimento,
        status: "pendente",
      }];
      const { data, error } = await supabase.from("acordos").insert({
        valor_original: payload.valorOriginal,
        valor_acordo: payload.valorAcordo,
        parcelas: 1,
        parcelas_detalhes: parcelasDetalhes,
        status: "ativo",
        created_at: new Date().toISOString(),
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acordos"] });
      queryClient.invalidateQueries({ queryKey: ["acordos-stats"] });
    },
  });
}

export function useUpdateAcordo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; status: string; valorOriginal: number; valorAcordo: number; dataVencimento: string }) => {
      const { error } = await supabase
        .from("acordos")
        .update({
          status: mapStatusToDb(payload.status),
          valor_original: payload.valorOriginal,
          valor_acordo: payload.valorAcordo,
        })
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acordos"] });
      queryClient.invalidateQueries({ queryKey: ["acordos-stats"] });
    },
  });
}
