import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";

// Import all pages
import Dashboard from "./pages/Dashboard";
import Associados from "./pages/Associados";
import Boletos from "./pages/Boletos";
import Colaboradores from "./pages/Colaboradores";
import Ligacoes from "./pages/Ligacoes";
import AcoesCobranca from "./pages/AcoesCobranca";
import ReguaCobranca from "./pages/ReguaCobranca";
import Templates from "./pages/Templates";
import Acordos from "./pages/Acordos";
import Negativacoes from "./pages/Negativacoes";
import Metricas from "./pages/Metricas";
import Tickets from "./pages/Tickets";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/associados" element={<Associados />} />
            <Route path="/boletos" element={<Boletos />} />
            <Route path="/colaboradores" element={<Colaboradores />} />
            <Route path="/ligacoes" element={<Ligacoes />} />
            <Route path="/acoes-cobranca" element={<AcoesCobranca />} />
            <Route path="/regua-cobranca" element={<ReguaCobranca />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/acordos" element={<Acordos />} />
            <Route path="/negativacoes" element={<Negativacoes />} />
            <Route path="/metricas" element={<Metricas />} />
            <Route path="/tickets" element={<Tickets />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
