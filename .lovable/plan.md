
# Plano de Implementação: Sistema CollectPro

## 1. **Configuração da Identidade Visual**
- Configurar paleta de cores CollectPro no `src/index.css`:
  - Azul escuro #1A3A5C como primary
  - Azul accent #087DBE 
  - Fundo #F4F6F8
  - Verde para status positivos
  - Vermelho para inadimplência
- Configurar variáveis CSS customizadas para cores específicas do sistema

## 2. **Layout Principal e Navegação**
- Criar `AppSidebar.tsx` com 12 módulos usando shadcn/ui sidebar
- Implementar `AppLayout.tsx` como wrapper com sidebar fixa
- Configurar navegação com ícones Lucide e labels em português
- Modificar `App.tsx` para usar layout com sidebar e rotas

**Módulos da Sidebar:**
- 📊 Dashboard
- 👥 Associados  
- 📄 Boletos
- 👤 Colaboradores
- 📞 Ligações
- ⚡ Ações de Cobrança
- 📋 Régua de Cobrança
- 📱 Templates
- 🤝 Acordos
- ⚠️ Negativações
- 📈 Métricas Mensais
- 🎫 Tickets Desk

## 3. **Dashboard (Página Principal)**
- KPIs com gradientes suaves:
  - Total a Receber
  - Taxa de Inadimplência 
  - Acordos Ativos
  - Arrecadação Mensal
- Gráficos Recharts:
  - Evolução mensal da arrecadação
  - Distribuição por status de pagamento
  - Performance de cobrança por colaborador

## 4. **Módulos CRUD Completos**

**Associados:**
- Tabela com busca/filtros/paginação
- Campos: Nome, CPF/CNPJ, Placa, Plano, Status, Contatos
- Score automático (Bom/Regular/Ruim/Crítico)
- Modal de detalhes com histórico

**Boletos:**
- Lista com badges coloridos (Pago/Pendente/Vencido)
- Filtros por data, status, valor
- Funcionalidades de envio e cobrança
- Importação em lote

**Colaboradores:**
- Gestão de usuários do sistema
- Métricas de performance individual
- Ranking por arrecadação

**Ligações:**
- Registro de chamadas com resultado
- Histórico por associado
- Métricas de efetividade

**Ações de Cobrança:**
- Log de todas as ações realizadas
- Timeline por associado
- Categorização por tipo

**Régua de Cobrança:**
- Timeline visual com marcos D+1, D+5, D+10, etc.
- Configuração de ações automáticas
- Status por associado

**Templates:**
- Gestão de templates SMS/Email/WhatsApp
- Editor de mensagens
- Variáveis dinâmicas

**Acordos:**
- Criação de parcelamentos
- Comparativo valor original vs acordo
- Controle de cumprimento

**Negativações:**
- Controle SPC/Serasa
- Histórico de negativações/retiradas
- Integração simulada

**Métricas Mensais:**
- Relatórios consolidados
- Gráficos de performance
- Exportação CSV/PDF

**Tickets Desk:**
- Sistema de atendimento
- Chat integrado
- Controle de SLA

## 5. **Componentes Reutilizáveis**
- `DataTable` com paginação, busca e filtros
- `StatusBadge` para indicadores coloridos  
- `KPICard` com gradientes e animações
- `ActionModal` para formulários CRUD
- `ChartContainer` para gráficos Recharts

## 6. **Dados Mock Realistas**
- Nomes, CPFs, placas e contatos brasileiros
- Valores em Real (R$)
- Datas e prazos realistas
- Status e históricos simulados
- Dados distribuídos por diferentes cenários

## 7. **Design Premium**
- Cards com sombra e bordas arredondadas
- Gradientes suaves nos KPIs
- Animações suaves nas transições
- Tipografia moderna e hierárquica
- Responsividade completa
- Estados de loading e feedback
