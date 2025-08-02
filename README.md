# Sistema de Gestão Financeira Pessoal

## Visão Geral

Este é um aplicativo completo de gestão financeira pessoal desenvolvido para ajudar usuários a controlar, analisar e otimizar suas finanças de forma inteligente e eficiente. O sistema oferece uma interface moderna e intuitiva que permite o acompanhamento detalhado de receitas, despesas, transferências e cartões de crédito, com recursos avançados de análise e insights financeiros.

## Principais Funcionalidades

### 📊 Dashboard Inteligente
- **Visão consolidada** das finanças com 7 indicadores principais
- **Análise de cartões de crédito** por mês com detalhamento de gastos
- **Controle de despesas futuras** e receitas programadas
- **Navegação temporal** para análise histórica de diferentes períodos
- **Gráficos interativos** para visualização de tendências e padrões

### 💰 Gestão de Despesas
- **Categorização automática** de gastos por tipo (alimentação, saúde, transporte, etc.)
- **Sistema de parcelamento** com agrupamento inteligente de parcelas
- **Controle por método de pagamento** (dinheiro, cartão, transferência)
- **Filtros avançados** por período, categoria, local e descrição
- **Paginação otimizada** para performance com grandes volumes de dados

### 💳 Sistema de Cartão de Crédito Separado
- **Gestão dedicada** para transações de cartão de crédito
- **Sincronização automática** de faturas com o sistema de despesas
- **Controle de parcelamento** específico para compras no cartão
- **Agrupamento por cartão** para melhor organização
- **Prevenção de duplicidade** na contabilização de gastos

### 💵 Controle de Receitas
- **Registro de fontes de renda** com categorização
- **Vinculação a contas específicas** para rastreamento de origem
- **Análise de padrões** de recebimento
- **Comparação temporal** para avaliação de crescimento

### 🔄 Transferências Entre Contas
- **Controle completo** de movimentações entre contas
- **Validação automática** para evitar transferências inválidas
- **Histórico detalhado** de todas as movimentações
- **Conciliação automática** de saldos

### 📈 Resumo Diário de Contas
- **Saldo inicial e final** de cada período
- **Movimentações detalhadas** dia a dia
- **Análise de fluxo de caixa** com entradas e saídas
- **Projeções de saldo** baseadas em movimentações programadas

### 🤖 Assistente Financeiro com IA
- **Análises personalizadas** usando dados reais do usuário
- **Sugestões de otimização** baseadas em padrões de gastos
- **Perguntas inteligentes** pré-configuradas sobre as finanças
- **Integração com Google Gemini** para insights avançados
- **Histórico de conversas** para acompanhamento de recomendações

### 📁 Importação e Exportação
- **Importação em lote** via arquivos CSV
- **Validação automática** de dados importados
- **Exportação personalizada** de relatórios
- **Suporte a múltiplos formatos** para integração com outros sistemas

## Stack Tecnológico

### Frontend
- **React 18** com TypeScript para interface responsiva
- **Vite** para build otimizado e desenvolvimento rápido
- **Tailwind CSS** com sistema de temas claro/escuro
- **Radix UI** para componentes acessíveis
- **TanStack React Query** para gerenciamento de estado do servidor

### Backend e Dados
- **Supabase** para banco de dados PostgreSQL em tempo real
- **Drizzle ORM** para operações de banco type-safe
- **Supabase Auth** para autenticação segura
- **Google Gemini AI** para insights financeiros inteligentes

### Performance e Otimização
- **Paginação mensal** inteligente para grandes datasets
- **Cache otimizado** com localStorage para filtros e configurações
- **Carregamento incremental** de dados
- **Debouncing** para prevenir recarregamentos desnecessários

## Como Funciona

### Arquitetura do Sistema
O aplicativo utiliza uma arquitetura JAMstack moderna:
- **Frontend**: SPA React com roteamento client-side
- **Backend**: Supabase para APIs e banco de dados
- **Deploy**: Otimizado para Netlify com headers e redirects configurados
- **Estado**: Context API com React Query para cache inteligente

### Fluxo de Dados
1. **Entrada de Dados**: Usuário registra transações via formulários intuitivos
2. **Processamento**: Sistema valida e categoriza automaticamente
3. **Armazenamento**: Dados sincronizados em tempo real com Supabase
4. **Análise**: IA processa informações para gerar insights
5. **Visualização**: Dashboard atualiza automaticamente com novos dados

### Otimizações de Performance
- **Filtragem mensal**: Reduz dataset de 3500+ para ~100 registros por visualização
- **Paginação inteligente**: Apenas 25 registros processados por página
- **Cache otimizado**: Armazenamento local para filtros e configurações
- **Carregamento incremental**: Dados carregados conforme necessário

## Instalação e Configuração

### Pré-requisitos
- Node.js 18+ 
- Conta no Supabase
- Chave da API do Google Gemini (opcional, para IA)

### Configuração do Ambiente

1. Clone o repositório:
```bash
git clone <repository-url>
cd financial-management-app
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Configure as variáveis necessárias
DATABASE_URL=your_supabase_database_url
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key (opcional)
```

4. Configure o banco de dados Supabase:
```bash
# Execute os scripts SQL fornecidos
# - create_cartao_supabase.sql
# - create_transfers_supabase.sql
```

5. Inicie o desenvolvimento:
```bash
npm run dev
```

### Deploy para Produção

#### Netlify (Recomendado)
O projeto está otimizado para deploy no Netlify:

1. Conecte seu repositório ao Netlify
2. Configure as variáveis de ambiente no painel do Netlify
3. O build será executado automaticamente com as configurações em `netlify.toml`

#### Outros Provedores
Para outros provedores, execute:
```bash
npm run build
```
E faça deploy da pasta `dist/` gerada.

## Uso

### Primeiro Acesso
1. Crie uma conta ou faça login
2. Configure suas contas financeiras
3. Defina categorias personalizadas
4. Importe dados existentes (opcional)

### Funcionalidades Principais
- **Dashboard**: Visão geral das finanças
- **Despesas**: Registro e controle de gastos
- **Receitas**: Acompanhamento de entradas
- **Cartão**: Gestão dedicada de cartões de crédito
- **Transferências**: Movimentações entre contas
- **Resumo Diário**: Análise detalhada por período
- **IA Financeira**: Insights e recomendações personalizadas

### Importação de Dados
Suporte para importação via CSV com validação automática para:
- Despesas
- Receitas  
- Transferências
- Transações de cartão de crédito

## Principais Benefícios

### Para o Usuário
- **Controle total** sobre as finanças pessoais
- **Insights automáticos** para tomada de decisões
- **Interface intuitiva** que não requer conhecimento técnico
- **Acesso em tempo real** de qualquer dispositivo
- **Histórico completo** para análise de tendências

### Técnicos
- **Escalabilidade**: Suporta milhares de transações sem perda de performance
- **Segurança**: Autenticação robusta e dados criptografados
- **Confiabilidade**: Backup automático e sincronização em tempo real
- **Flexibilidade**: Filtros e relatórios personalizáveis
- **Integrações**: API aberta para conectar com outros sistemas financeiros

## Casos de Uso

### Controle Pessoal
- Acompanhar gastos mensais e identificar oportunidades de economia
- Planejar orçamentos baseados em dados históricos
- Controlar cartões de crédito e evitar endividamento

### Análise Financeira
- Identificar categorias com maior impacto no orçamento
- Comparar performance financeira entre diferentes períodos
- Receber recomendações personalizadas da IA

### Gestão de Contas
- Manter saldos atualizados em tempo real
- Controlar transferências entre diferentes contas
- Monitorar fluxo de caixa diário

### Planejamento
- Usar dados históricos para projeções futuras
- Definir metas baseadas em padrões identificados
- Receber alertas sobre tendências preocupantes

## Estrutura do Projeto

```
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── context/        # Context providers
│   │   ├── types/          # TypeScript types
│   │   └── ...
├── server/                 # Configurações do servidor
├── shared/                 # Tipos e schemas compartilhados
├── supabase/              # Configurações do Supabase
├── netlify.toml           # Configuração do Netlify
├── _headers               # Headers para deploy
├── _redirects             # Redirects para SPA
└── README.md              # Este arquivo
```

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## Suporte

Para suporte, abra uma issue no GitHub ou entre em contato através dos canais oficiais.

---

Este sistema representa uma solução completa para gestão financeira pessoal, combinando facilidade de uso com recursos avançados de análise, oferecendo aos usuários o controle total sobre suas finanças de forma inteligente e eficiente.