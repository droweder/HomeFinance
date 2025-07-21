import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Loader2, AlertCircle, Settings, TrendingUp, TrendingDown, DollarSign, Sparkles, Brain, BarChart3, PieChart, Target, Lightbulb, Calculator, CreditCard } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useFinance } from '../context/FinanceContext';
import { useFinanceCalculations } from '../hooks/useFinanceCalculations';
import { useAIChatHistory } from '../hooks/useAIChatHistory';
import { useToast } from './ui/toast';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'error';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
  error?: {
    message: string;
    code: number;
  };
}

const FinancialAIChat: React.FC = () => {
  const { settings } = useSettings();
  const { expenses, income, categories } = useFinance();
  const { 
    totalExpensesThisMonth, 
    totalIncomeThisMonth, 
    balanceThisMonth, 
    totalUpcomingExpenses,
    expensesByCategory,
    monthlyTrend 
  } = useFinanceCalculations();
  const { showError, showSuccess } = useToast();
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Olá! Sou seu assistente financeiro inteligente powered by Gemini AI.\n\nTenho acesso aos seus dados financeiros e posso fornecer insights personalizados sobre:\n\n• Análise detalhada de gastos e receitas\n• Padrões de consumo e tendências\n• Sugestões específicas de economia\n• Planejamento orçamentário personalizado\n• Identificação de oportunidades financeiras\n\nComo posso ajudar você hoje?',
      timestamp: new Date(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const isAIConfigured = () => {
    return settings.geminiApiKey && settings.geminiApiKey.trim() !== '';
  };

  const buildFinancialContext = () => {
    const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    
    // Dados básicos do mês atual com verificação de segurança
    const basicData = {
      totalExpenses: totalExpensesThisMonth || 0,
      totalIncome: totalIncomeThisMonth || 0,
      balance: balanceThisMonth || 0,
      upcomingExpenses: totalUpcomingExpenses || 0,
    };

    // Top 10 categorias de despesas
    const topCategories = Object.entries(expensesByCategory || {})
      .sort(([,a], [,b]) => (b || 0) - (a || 0))
      .slice(0, 10)
      .map(([category, amount]) => ({
        category,
        amount: Number(amount || 0),
        percentage: (totalExpensesThisMonth || 0) > 0 ? (((amount || 0) / (totalExpensesThisMonth || 1)) * 100).toFixed(1) : '0.0'
      }));

    // Tendência dos últimos 6 meses
    const recentTrend = (monthlyTrend || []).slice(-6);

    // Estatísticas detalhadas com verificação de segurança
    const stats = {
      totalExpenseRecords: expenses?.length || 0,
      totalIncomeRecords: income?.length || 0,
      totalCategories: categories?.length || 0,
      averageExpenseAmount: (expenses?.length || 0) > 0 ? Number((expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0) / expenses.length).toFixed(2)) : 0,
      averageIncomeAmount: (income?.length || 0) > 0 ? Number((income.reduce((sum, inc) => sum + (inc.amount || 0), 0) / income.length).toFixed(2)) : 0,
      mostExpensiveTransaction: (expenses?.length || 0) > 0 ? Math.max(...expenses.map(e => Number(e.amount || 0))) : 0,
      largestIncomeSource: (income?.length || 0) > 0 ? Math.max(...income.map(i => Number(i.amount || 0))) : 0,
      creditCardExpenses: expenses?.filter(e => e.isCreditCard).reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
      unpaidExpenses: expenses?.filter(e => !e.paid).reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
    };

    // Análise de padrões de gastos por dia da semana
    const expensesByDayOfWeek = (expenses || []).reduce((acc, expense) => {
      const dayOfWeek = new Date(expense.date).getDay();
      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const dayName = dayNames[dayOfWeek];
      acc[dayName] = (acc[dayName] || 0) + (expense.amount || 0);
      return acc;
    }, {} as Record<string, number>);

    // Análise de gastos por local (se disponível)
    const expensesByLocation = (expenses || [])
      .filter(e => e.location && e.location.trim() !== '')
      .reduce((acc, expense) => {
        acc[expense.location!] = (acc[expense.location!] || 0) + (expense.amount || 0);
        return acc;
      }, {} as Record<string, number>);

    const topLocations = Object.entries(expensesByLocation)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    // Análise de cartão de crédito
    const creditCardAnalysis = {
      totalCreditCard: expenses?.filter(e => e.isCreditCard).reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
      totalCash: expenses?.filter(e => !e.isCreditCard).reduce((sum, e) => sum + (e.amount || 0), 0) || 0,
      creditCardPercentage: totalExpensesThisMonth > 0 ? ((stats.creditCardExpenses / totalExpensesThisMonth) * 100).toFixed(1) : '0.0'
    };

    // Análise de receitas por fonte
    const incomeBySource = (income || []).reduce((acc, inc) => {
      acc[inc.source || 'Sem categoria'] = (acc[inc.source || 'Sem categoria'] || 0) + (inc.amount || 0);
      return acc;
    }, {} as Record<string, number>);

    const topIncomeSources = Object.entries(incomeBySource)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    // Análise por conta específica (últimos 30 dias)
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    const getAccountStatement = (accountName: string, days: number = 30) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const accountExpenses = expenses?.filter(exp => 
        exp.account === accountName && new Date(exp.date) >= cutoffDate
      ) || [];
      
      const accountIncome = income?.filter(inc => 
        inc.account === accountName && new Date(inc.date) >= cutoffDate
      ) || [];

      const totalExpenses = accountExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const totalIncome = accountIncome.reduce((sum, inc) => sum + (inc.amount || 0), 0);
      
      return {
        accountName,
        period: `${days} dias`,
        totalExpenses,
        totalIncome,
        balance: totalIncome - totalExpenses,
        transactionCount: accountExpenses.length + accountIncome.length,
        expenseTransactions: accountExpenses.map(exp => ({
          date: exp.date,
          description: exp.description || exp.category,
          amount: exp.amount,
          category: exp.category,
          type: 'Despesa'
        })),
        incomeTransactions: accountIncome.map(inc => ({
          date: inc.date,
          description: inc.notes || inc.source,
          amount: inc.amount,
          category: inc.source,
          type: 'Receita'
        }))
      };
    };

    // Lista de todas as contas disponíveis
    const allAccounts = [
      ...new Set([
        ...expenses?.map(e => e.account).filter(Boolean) || [],
        ...income?.map(i => i.account).filter(Boolean) || []
      ])
    ];

    return {
      currentMonth,
      basicData,
      topCategories,
      recentTrend,
      stats,
      expensesByDayOfWeek,
      topLocations,
      creditCardAnalysis,
      topIncomeSources,
      allAccounts,
      getAccountStatement
    };
  };

  const buildPrompt = (userQuestion: string) => {
    const context = buildFinancialContext();
    
    // Verificar se é uma pergunta sobre extrato de conta específica
    const accountStatementRegex = /extrato.*conta\s+([\w\s\-]+).*(\d+)\s*dias?/i;
    const accountMatch = userQuestion.match(accountStatementRegex);
    
    let accountStatement = '';
    if (accountMatch) {
      const accountName = accountMatch[1].trim();
      const days = parseInt(accountMatch[2]) || 30;
      
      // Tentar encontrar conta similar
      const similarAccount = context.allAccounts.find(acc => 
        acc.toLowerCase().includes(accountName.toLowerCase()) ||
        accountName.toLowerCase().includes(acc.toLowerCase())
      );
      
      if (similarAccount) {
        const statement = context.getAccountStatement(similarAccount, days);
        const allTransactions = [
          ...statement.expenseTransactions,
          ...statement.incomeTransactions
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        accountStatement = `
📋 EXTRATO DETALHADO - ${statement.accountName.toUpperCase()}
📅 Período: Últimos ${statement.period}
💰 Resumo: Receitas R$ ${statement.totalIncome.toFixed(2)} | Despesas R$ ${statement.totalExpenses.toFixed(2)} | Saldo R$ ${statement.balance.toFixed(2)}
📊 Total de Transações: ${statement.transactionCount}

📝 TODAS AS TRANSAÇÕES (${allTransactions.length}):
${allTransactions.map((t, i) => 
  `${i + 1}. ${t.date} | ${t.type} | ${t.description} | R$ ${t.amount.toFixed(2)} | ${t.category}`
).join('\n')}

`;
      } else {
        accountStatement = `
❌ CONTA NÃO ENCONTRADA: "${accountName}"
📋 Contas disponíveis: ${context.allAccounts.join(', ')}

`;
      }
    }
    
    return `Você é um assistente financeiro especializado em análise de dados pessoais. Analise os dados financeiros fornecidos e responda à pergunta do usuário de forma clara, objetiva e útil.

${accountStatement}

DADOS FINANCEIROS COMPLETOS DO USUÁRIO (${context.currentMonth}):

📊 RESUMO MENSAL ATUAL:
- Receitas: R$ ${Number(context.basicData.totalIncome || 0).toFixed(2)}
- Despesas: R$ ${Number(context.basicData.totalExpenses || 0).toFixed(2)}
- Saldo: R$ ${Number(context.basicData.balance || 0).toFixed(2)}
- Despesas Futuras/Pendentes: R$ ${Number(context.basicData.upcomingExpenses || 0).toFixed(2)}

📈 ESTATÍSTICAS GERAIS:
- Total de Transações de Despesas: ${context.stats.totalExpenseRecords}
- Total de Transações de Receitas: ${context.stats.totalIncomeRecords}
- Categorias Ativas: ${context.stats.totalCategories}
- Gasto Médio por Transação: R$ ${Number(context.stats.averageExpenseAmount || 0).toFixed(2)}
- Receita Média por Transação: R$ ${Number(context.stats.averageIncomeAmount || 0).toFixed(2)}
- Maior Despesa Individual: R$ ${Number(context.stats.mostExpensiveTransaction || 0).toFixed(2)}
- Maior Receita Individual: R$ ${Number(context.stats.largestIncomeSource || 0).toFixed(2)}
- Gastos no Cartão de Crédito: R$ ${Number(context.stats.creditCardExpenses || 0).toFixed(2)}
- Despesas Não Pagas: R$ ${Number(context.stats.unpaidExpenses || 0).toFixed(2)}

🏆 TOP 10 CATEGORIAS DE DESPESAS:
${context.topCategories.map((cat, i) => 
  `${i + 1}. ${cat.category}: R$ ${Number(cat.amount || 0).toFixed(2)} (${cat.percentage}%)`
).join('\n')}

📅 PADRÃO DE GASTOS POR DIA DA SEMANA:
${Object.entries(context.expensesByDayOfWeek || {}).map(([day, amount]) => 
  `${day}: R$ ${Number(amount || 0).toFixed(2)}`
).join('\n')}

🏪 TOP 5 LOCAIS DE MAIOR GASTO:
${(context.topLocations || []).map(([location, amount], i) => 
  `${i + 1}. ${location}: R$ ${Number(amount || 0).toFixed(2)}`
).join('\n')}

💳 ANÁLISE CARTÃO DE CRÉDITO:
- Gastos no Cartão: R$ ${Number(context.creditCardAnalysis.totalCreditCard || 0).toFixed(2)} (${context.creditCardAnalysis.creditCardPercentage}%)
- Gastos em Dinheiro/Débito: R$ ${Number(context.creditCardAnalysis.totalCash || 0).toFixed(2)}

💰 TOP 5 FONTES DE RECEITA:
${(context.topIncomeSources || []).map(([source, amount], i) => 
  `${i + 1}. ${source}: R$ ${Number(amount || 0).toFixed(2)}`
).join('\n')}

🏦 CONTAS DISPONÍVEIS:
${context.allAccounts.join(', ')}

📊 TENDÊNCIA DOS ÚLTIMOS 6 MESES:
${context.recentTrend.map(month => 
  `${month.month}: Receitas R$ ${Number(month.income || 0).toFixed(2)} | Despesas R$ ${Number(month.expenses || 0).toFixed(2)} | Saldo R$ ${Number((month.income || 0) - (month.expenses || 0)).toFixed(2)}`
).join('\n')}

PERGUNTA DO USUÁRIO: ${userQuestion}

INSTRUÇÕES PARA RESPOSTA:
1. SEMPRE analyze os dados fornecidos e forneça uma resposta precisa e personalizada
2. Para perguntas sobre EXTRATOS DE CONTAS, use o extrato detalhado fornecido acima
3. Seja específico com números reais, datas e valores exatos dos dados do usuário
4. Forneça insights ACIONÁVEIS baseados nos dados reais, não sugestões genéricas
5. Use emojis para tornar a resposta mais visual e amigável
6. Para extratos, organize as informações de forma cronológica e clara
7. Identifique padrões específicos nos gastos, receitas e tendências
8. Sugira ações práticas baseadas nos números apresentados
9. Se perguntarem sobre conta inexistente, liste as contas disponíveis
10. FOQUE nos dados financeiros reais do usuário, não em conselhos genéricos

Responda EXCLUSIVAMENTE em português brasileiro e seja específico com os dados fornecidos:`;
  };

  const callGeminiAPI = async (prompt: string): Promise<string> => {
    const apiKey = settings.geminiApiKey;
    
    if (!apiKey) {
      throw new Error('Chave da API Gemini não configurada');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
    
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        topK: 32,
        topP: 0.8,
        maxOutputTokens: 2048,
        candidateCount: 1
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    console.log('🤖 Enviando requisição para Gemini API...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na API Gemini:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      if (response.status === 400) {
        throw new Error('Chave da API inválida ou requisição malformada');
      } else if (response.status === 403) {
        throw new Error('Acesso negado. Verifique se a chave da API tem as permissões necessárias');
      } else if (response.status === 429) {
        throw new Error('Limite de requisições excedido. Tente novamente em alguns minutos');
      } else {
        throw new Error(`Erro na API Gemini: ${response.status} - ${response.statusText}`);
      }
    }

    const data: GeminiResponse = await response.json();
    console.log('✅ Resposta da API Gemini recebida:', data);

    if (data.error) {
      throw new Error(`Erro da API Gemini: ${data.error.message}`);
    }

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Nenhuma resposta foi gerada pela IA');
    }

    const generatedText = data.candidates[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error('Resposta vazia da IA');
    }

    return generatedText;
  };

  const quickQuestions = [
    {
      icon: <BarChart3 className="w-4 h-4" />,
      text: "Análise detalhada dos meus gastos este mês com números reais",
      category: "análise"
    },
    {
      icon: <Target className="w-4 h-4" />,
      text: "Baseado nos meus dados reais, onde posso economizar?",
      category: "economia"
    },
    {
      icon: <PieChart className="w-4 h-4" />,
      text: "Qual categoria eu mais gasto e quanto representa em percentual?",
      category: "categorias"
    },
    {
      icon: <CreditCard className="w-4 h-4" />,
      text: "Como está o uso do meu cartão de crédito vs dinheiro?",
      category: "cartao"
    },
    {
      icon: <TrendingUp className="w-4 h-4" />,
      text: "Minha situação financeira está melhorando ou piorando?",
      category: "tendência"
    },
    {
      icon: <Calculator className="w-4 h-4" />,
      text: "Relatório completo da minha saúde financeira atual",
      category: "relatório"
    }
  ];

  const handleQuickQuestion = (question: string) => {
    // Auto-send the quick question
    handleSendMessage(question);
  };

  const handleSendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || inputMessage.trim();
    if (!messageToSend || isLoading) return;

    if (!customMessage) setInputMessage('');

    if (!isAIConfigured()) {
      showError('Configure sua chave Gemini nas configurações primeiro.');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: messageToSend,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Adicionar mensagem de loading
    const loadingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: '🤖 Analisando seus dados financeiros...',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, loadingMessage]);

    try {
      const prompt = buildPrompt(userMessage.content);
      console.log('📝 Prompt construído:', prompt.substring(0, 200) + '...');
      
      const aiResponse = await callGeminiAPI(prompt);
      
      // Remover mensagem de loading e adicionar resposta real
      setMessages(prev => {
        const withoutLoading = prev.filter(msg => !msg.isLoading);
        return [...withoutLoading, {
          id: (Date.now() + 2).toString(),
          type: 'ai',
          content: aiResponse,
          timestamp: new Date(),
        }];
      });

      console.log('🎉 Resposta da IA processada com sucesso');

    } catch (error: any) {
      console.error('❌ Erro ao processar mensagem:', error);
      
      // Remover mensagem de loading
      setMessages(prev => prev.filter(msg => !msg.isLoading));
      
      // Exibir notificação toast elegante em vez de mensagem no chat
      showError(`${error.message}. Verifique sua chave API nas configurações.`);
      
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isAIConfigured()) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Assistente Financeiro IA
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Configure a API do Gemini nas configurações para começar a usar análises inteligentes dos seus dados financeiros.
            </p>
            <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 mb-6">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">API do Gemini não configurada</span>
            </div>
            <button
              onClick={() => window.location.hash = '#settings'}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Ir para Configurações
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header - Fixed */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Bot className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Assistente Financeiro IA
                <Sparkles className="w-4 h-4 text-purple-500" />
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Powered by Gemini AI • {expenses.length} despesas • {income.length} receitas
              </p>
            </div>
          </div>
          
          {/* Status Cards - Hidden on mobile */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="text-center px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">R$ {totalIncomeThisMonth.toFixed(0)}</span>
              </div>
              <p className="text-xs text-gray-500">Receitas</p>
            </div>
            <div className="text-center px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm font-medium">R$ {totalExpensesThisMonth.toFixed(0)}</span>
              </div>
              <p className="text-xs text-gray-500">Despesas</p>
            </div>
            <div className="text-center px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className={`flex items-center gap-1 ${balanceThisMonth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-medium">R$ {balanceThisMonth.toFixed(0)}</span>
              </div>
              <p className="text-xs text-gray-500">Saldo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container - Flexible */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Messages Area - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {/* Quick Questions - Show only when no messages */}
          {messages.length === 0 && (
            <div className="mb-8">
              <div className="text-center mb-6">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 rounded-full flex items-center justify-center mb-4">
                  <Brain className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Como posso ajudar?
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Escolha uma pergunta rápida ou digite sua própria questão sobre suas finanças
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {quickQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickQuestion(question.text)}
                    className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all text-left group"
                  >
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-800 transition-colors">
                      {question.icon}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {question.text}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {question.category}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {/* Avatar for AI/Error messages */}
                {(message.type === 'ai' || message.type === 'error') && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.type === 'error' 
                      ? 'bg-red-100 dark:bg-red-900' 
                      : 'bg-purple-100 dark:bg-purple-900'
                  }`}>
                    {message.isLoading ? (
                      <Loader2 className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin" />
                    ) : message.type === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    ) : (
                      <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    )}
                  </div>
                )}
                
                {/* Message Content */}
                <div className={`max-w-2xl ${message.type === 'user' ? 'order-first' : ''}`}>
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      message.type === 'user'
                        ? 'bg-purple-600 text-white ml-auto'
                        : message.type === 'error'
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                  <p className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${
                    message.type === 'user' ? 'text-right' : 'text-left'
                  }`}>
                    {message.timestamp.toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>

                {/* Avatar for User messages */}
                {message.type === 'user' && (
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Questions - Only show when no messages or just welcome message */}
        {messages.length <= 1 && (
          <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">💡 Perguntas rápidas:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {quickQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickQuestion(question.text)}
                  disabled={isLoading}
                  className="text-left px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 border border-gray-200 dark:border-gray-600 flex items-center gap-2"
                >
                  {question.icon}
                  {question.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area - Fixed at bottom */}
        <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua pergunta sobre finanças..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white resize-none max-h-32"
                rows={1}
                disabled={isLoading}
                style={{
                  minHeight: '44px',
                  height: 'auto',
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                }}
              />
            </div>
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              className="p-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
            🔒 Seus dados são processados de forma segura e anônima pela IA
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialAIChat;