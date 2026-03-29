import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";

import Dashboard from "./pages/Dashboard";
import Associados from "./pages/Associados";
import Cooperativas from "./pages/Cooperativas";
import Boletos from "./pages/Boletos";
import Financeiro from "./pages/Financeiro";
import Colaboradores from "./pages/Colaboradores";
import Ligacoes from "./pages/Ligacoes";
import AcoesCobranca from "./pages/AcoesCobranca";
import ReguaCobranca from "./pages/ReguaCobranca";
import Templates from "./pages/Templates";
import Acordos from "./pages/Acordos";
import Negativacoes from "./pages/Negativacoes";
import Cancelamentos from "./pages/Cancelamentos";
import Congelamentos from "./pages/Congelamentos";
import Metricas from "./pages/Metricas";
import Tickets from "./pages/Tickets";
import NotificacoesInternas from "./pages/NotificacoesInternas";
import LogAuditoria from "./pages/LogAuditoria";
import ExportacaoRelatorios from "./pages/ExportacaoRelatorios";
import ControleAcesso from "./pages/ControleAcesso";
import Integracoes from "./pages/Integracoes";
import VeiculosIndenizados from "./pages/VeiculosIndenizados";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/associados" element={<Associados />} />
                      <Route path="/cooperativas" element={<Cooperativas />} />
                      <Route path="/boletos" element={<Boletos />} />
                      <Route path="/financeiro" element={<Financeiro />} />
                      <Route path="/colaboradores" element={<Colaboradores />} />
                      <Route path="/ligacoes" element={<Ligacoes />} />
                      <Route path="/acoes-cobranca" element={<AcoesCobranca />} />
                      <Route path="/regua-cobranca" element={<ReguaCobranca />} />
                      <Route path="/templates" element={<Templates />} />
                      <Route path="/acordos" element={<Acordos />} />
                      <Route path="/negativacoes" element={<Negativacoes />} />
                      <Route path="/cancelamentos" element={<Cancelamentos />} />
                      <Route path="/congelamentos" element={<Congelamentos />} />
                      <Route path="/veiculos-indenizados" element={<VeiculosIndenizados />} />
                      <Route path="/metricas" element={<Metricas />} />
                      <Route path="/tickets" element={<Tickets />} />
                      <Route path="/notificacoes" element={<NotificacoesInternas />} />
                      <Route path="/log-auditoria" element={<LogAuditoria />} />
                      <Route path="/exportacao" element={<ExportacaoRelatorios />} />
                      <Route path="/integracoes" element={<Integracoes />} />
                      <Route path="/controle-acesso" element={<ControleAcesso />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
