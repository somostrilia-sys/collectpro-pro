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

// ── BOLETOS ──
export interface BoletoRow {
  id: string;
  gia_id: string | null;
  associado: string;
  cpf: string;
  cooperativa: string;
  whatsapp: string | null;
  vencimento: string;
  mesReferencia: string;
  valor: number;
  status: string;
  dataPagamento: string | null;
  pdfUrl: string | null;
  linkBoleto: string | null;
  linhaDigitavel: string | null;
  pixCopiaCola: string | null;
  nossoNumero: string | null;
}

export function useBoletos(filtro?: { status?: string; mesRef?: string }) {
  return useQuery<BoletoRow[]>({
    queryKey: ["boletos", filtro],
    queryFn: async () => {
      let q = supabase
        .from("boletos")
        .select("id, gia_id, associado_id, valor, vencimento, mes_referencia, status, data_pagamento, pdf_url, link_boleto, linha_digitavel, pix_copia_cola, nosso_numero, associados(nome, cpf, cooperativa, whatsapp)")
        .order("vencimento", { ascending: true });

      if (filtro?.status && filtro.status !== "todos") {
        q = q.eq("status", filtro.status);
      }
      if (filtro?.mesRef) {
        q = q.eq("mes_referencia", filtro.mesRef);
      }

      const { data, error } = await q.limit(500);
      if (error) return [];
      return (data || []).map((b: any) => ({
        id: b.id,
        gia_id: b.gia_id,
        associado: b.associados?.nome || "—",
        cpf: b.associados?.cpf || "",
        cooperativa: b.associados?.cooperativa || "",
        whatsapp: b.associados?.whatsapp || null,
        vencimento: b.vencimento || "",
        mesReferencia: b.mes_referencia || "",
        valor: b.valor || 0,
        status: b.status || "aberto",
        dataPagamento: b.data_pagamento,
        pdfUrl: b.pdf_url,
        linkBoleto: b.link_boleto,
        linhaDigitavel: b.linha_digitavel,
        pixCopiaCola: b.pix_copia_cola,
        nossoNumero: b.nosso_numero,
      }));
    },
    staleTime: 30_000,
  });
}

export function useBoletosKPIs() {
  return useQuery({
    queryKey: ["boletos-kpis"],
    queryFn: async () => {
      const hoje = new Date().toISOString().split("T")[0];
      const mesAtual = hoje.slice(0, 7);

      const [
        { count: totalAbertos },
        { count: totalVencidos },
        { count: totalPagos },
        { count: totalMesAtual },
      ] = await Promise.all([
        supabase.from("boletos").select("id", { count: "exact", head: true }).eq("status", "aberto"),
        supabase.from("boletos").select("id", { count: "exact", head: true }).eq("status", "vencido"),
        supabase.from("boletos").select("id", { count: "exact", head: true }).eq("status", "pago"),
        supabase.from("boletos").select("id", { count: "exact", head: true }).eq("mes_referencia", mesAtual).in("status", ["aberto", "vencido"]),
      ]);

      // Valor em aberto
      const { data: abertos } = await supabase.from("boletos").select("valor").in("status", ["aberto", "vencido"]);
      const valorAberto = (abertos || []).reduce((s: number, b: any) => s + (b.valor || 0), 0);

      // Meses disponíveis
      const { data: meses } = await supabase.from("boletos").select("mes_referencia").not("mes_referencia", "is", null).in("status", ["aberto", "vencido"]);
      const mesesUnicos = [...new Set((meses || []).map((m: any) => m.mes_referencia))].sort().reverse();

      return {
        abertos: totalAbertos || 0,
        vencidos: totalVencidos || 0,
        pagos: totalPagos || 0,
        mesAtual: totalMesAtual || 0,
        valorAberto,
        mesesDisponiveis: mesesUnicos as string[],
      };
    },
    staleTime: 60_000,
  });
}

// ── DASHBOARD ──
export function useDashboardKPIs() {
  return useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: async () => {
      const [
        { count: totalAssociados },
        { count: inadimplentes },
        { count: ativos },
      ] = await Promise.all([
        supabase.from("associados").select("id", { count: "exact", head: true }),
        supabase.from("associados").select("id", { count: "exact", head: true }).eq("status", "inadimplente"),
        supabase.from("associados").select("id", { count: "exact", head: true }).eq("status", "ativo"),
      ]);

      const { data: boletosAbertos } = await supabase.from("boletos").select("valor").in("status", ["aberto", "vencido"]);
      const valorEmAberto = (boletosAbertos || []).reduce((s: number, b: any) => s + (b.valor || 0), 0);

      const { count: revistorias } = await supabase.from("revistorias").select("id", { count: "exact", head: true }).eq("status", "pendente");

      const { data: config } = await supabase.from("integracao_config").select("valor").eq("chave", "ultimo_sync").single();

      return {
        totalAssociados: totalAssociados || 0,
        inadimplentes: inadimplentes || 0,
        ativos: ativos || 0,
        valorEmAberto,
        revistoriasPendentes: revistorias || 0,
        ultimoSync: config?.valor || null,
        taxaInadimplencia: (totalAssociados || 0) > 0
          ? parseFloat((((inadimplentes || 0) / (totalAssociados || 1)) * 100).toFixed(1))
          : 0,
      };
    },
    staleTime: 60_000,
  });
}

// ── SYNC GIA ──
export function useSyncGIA() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tipo: string) => {
      const { data, error } = await supabase.functions.invoke("collect-sync-gia", {
        body: { tipo },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boletos"] });
      queryClient.invalidateQueries({ queryKey: ["boletos-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["associados"] });
    },
  });
}

// ── ENVIAR AÇÃO GIA ──
export function useEnviarAcaoGIA() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { acao: string; associado_id?: string; boleto_id?: string; dados?: any }) => {
      const { data, error } = await supabase.functions.invoke("collect-enviar-gia", {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boletos"] });
      queryClient.invalidateQueries({ queryKey: ["boletos-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["acordos"] });
    },
  });
}

// ── REVISTORIAS ──
export function useRevistorias() {
  return useQuery({
    queryKey: ["revistorias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revistorias")
        .select("id, associado_id, gia_vistoria_id, link, status, resultado, ai_score, motivo, created_at, resolvido_em, associados(nome, cpf, placa)")
        .order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
    staleTime: 30_000,
  });
}

export function useCriarRevistoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { associado_id: string; motivo?: string }) => {
      const { data, error } = await supabase.functions.invoke("collect-revistoria-gia", {
        body: { associado_id: payload.associado_id, motivo: payload.motivo || "boleto_vencido_5dias" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revistorias"] });
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

// ── NOTIFICAÇÕES DE RETIRADA ──

export interface NotificacaoRetirada {
  id: string;
  associado_id: string | null;
  placa: string | null;
  tipo: string;
  status: string;
  descricao: string | null;
  proximos_passos: string | null;
  responsavel_id: string | null;
  resolvido_em: string | null;
  created_at: string;
  associados?: { nome: string; cpf: string; placa: string } | null;
  profiles?: { full_name: string } | null;
}

export function useNotificacoesRetirada() {
  return useQuery<NotificacaoRetirada[]>({
    queryKey: ["notificacoes-retirada"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notificacoes_retirada")
        .select("*, associados(nome, cpf, placa), profiles(full_name)")
        .order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
    staleTime: 30_000,
  });
}

export function useCriarNotificacaoRetirada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      associado_id?: string;
      placa?: string;
      descricao?: string;
      proximos_passos?: string;
      responsavel_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("notificacoes_retirada")
        .insert({
          associado_id: payload.associado_id || null,
          placa: payload.placa || null,
          tipo: "retirada",
          status: "pendente",
          descricao: payload.descricao || null,
          proximos_passos: payload.proximos_passos || null,
          responsavel_id: payload.responsavel_id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes-retirada"] });
    },
  });
}

export function useAtualizarNotificacaoRetirada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; status?: string; proximos_passos?: string; responsavel_id?: string }) => {
      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
      if (payload.status) updateData.status = payload.status;
      if (payload.proximos_passos !== undefined) updateData.proximos_passos = payload.proximos_passos;
      if (payload.responsavel_id) updateData.responsavel_id = payload.responsavel_id;
      if (payload.status === "resolvido") updateData.resolvido_em = new Date().toISOString();

      const { error } = await supabase
        .from("notificacoes_retirada")
        .update(updateData)
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes-retirada"] });
    },
  });
}

// ── HISTÓRICO DE PAGAMENTOS ──

export interface HistoricoPagamento {
  id: string;
  associado_id: string | null;
  tipo: string;
  valor: number;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  referencia: string | null;
  boletos_ids: string[] | null;
  acordo_id: string | null;
  observacao: string | null;
  registrado_por: string | null;
  created_at: string;
  associados?: { nome: string; cpf: string } | null;
  profiles?: { full_name: string } | null;
}

export function useHistoricoPagamentos(filtro?: { associado_id?: string; periodo?: string }) {
  return useQuery<HistoricoPagamento[]>({
    queryKey: ["historico-pagamentos", filtro],
    queryFn: async () => {
      let q = supabase
        .from("historico_pagamentos")
        .select("*, associados(nome, cpf), profiles(full_name)")
        .order("created_at", { ascending: false });

      if (filtro?.associado_id) {
        q = q.eq("associado_id", filtro.associado_id);
      }
      const { data, error } = await q.limit(500);
      if (error) return [];
      return data || [];
    },
    staleTime: 30_000,
  });
}

export function useRegistrarPagamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      associado_id: string;
      tipo: string;
      valor: number;
      data_pagamento: string;
      forma_pagamento?: string;
      referencia?: string;
      boletos_ids?: string[];
      acordo_id?: string;
      observacao?: string;
      registrado_por?: string;
    }) => {
      const { data, error } = await supabase
        .from("historico_pagamentos")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["historico-pagamentos"] });
      queryClient.invalidateQueries({ queryKey: ["boletos"] });
      queryClient.invalidateQueries({ queryKey: ["boletos-kpis"] });
    },
  });
}

// ── UNIFICAÇÃO DE BOLETOS ──

export function useBoletosVencidosPorAssociado(associadoId?: string) {
  return useQuery({
    queryKey: ["boletos-vencidos-associado", associadoId],
    queryFn: async () => {
      if (!associadoId) return [];
      const { data, error } = await supabase
        .from("boletos")
        .select("id, gia_id, valor, vencimento, mes_referencia, status")
        .eq("associado_id", associadoId)
        .in("status", ["aberto", "vencido"])
        .order("vencimento", { ascending: true });
      if (error) return [];
      return data || [];
    },
    enabled: !!associadoId,
    staleTime: 30_000,
  });
}

// ── EXPORTAÇÃO DE DADOS ──

export function useExportData(tipo: string) {
  return useQuery({
    queryKey: ["export", tipo],
    queryFn: async () => {
      if (tipo === "associados") {
        const { data } = await supabase.from("associados").select("*").limit(10000);
        return data || [];
      }
      if (tipo === "boletos") {
        const { data } = await supabase.from("boletos").select("*, associados(nome, cpf, cooperativa)").limit(10000);
        return data || [];
      }
      if (tipo === "acordos") {
        const { data } = await supabase.from("acordos").select("*, associados(nome, cpf)").limit(10000);
        return data || [];
      }
      if (tipo === "pagamentos") {
        const { data } = await supabase.from("historico_pagamentos").select("*, associados(nome, cpf)").limit(10000);
        return data || [];
      }
      return [];
    },
    enabled: false, // Only fetch when triggered
    staleTime: 0,
  });
}
