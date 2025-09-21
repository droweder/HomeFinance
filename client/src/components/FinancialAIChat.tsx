import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bot, Send, User, Loader2, AlertCircle, TrendingUp, DollarSign, Calendar, Lightbulb, Trash2, BarChart3 } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useFinance } from '../context/FinanceContext';
import { useAccounts } from '../context/AccountContext';
import { useAIChatHistory } from '../hooks/useAIChatHistory';
import { useToast } from './ui/toast';
import { formatDateForInput } from '../utils/dateUtils';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

const FinancialAIChat: React.FC = () => {
  const { settings } = useSettings();
  const { expenses, income, transfers, categories, isLoading: isFinanceLoading } = useFinance();
  const { accounts } = useAccounts();
  const { messages, addMessage, clearHistory } = useAIChatHistory();
  const { showError, showSuccess } = useToast();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Generate financial context for AI
  const financialContext = useMemo(() => {
    // Add robust checks to ensure all data arrays are defined
    if (!expenses || !income || !transfers || !accounts) {
      return null;
    }
    if (expenses.length === 0 && income.length === 0) return null;

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    // Filter data for current and previous month
    const currentMonthExpenses = expenses.filter(exp => new Date(formatDateForInput(exp.date)) >= startOfMonth);
    const lastMonthExpenses = expenses.filter(exp => {
      const expDate = new Date(formatDateForInput(exp.date));
      return expDate >= startOfLastMonth && expDate <= endOfLastMonth;
    });
    const currentMonthIncome = income.filter(inc => new Date(formatDateForInput(inc.date)) >= startOfMonth);
    const lastMonthIncome = income.filter(inc => {
      const incDate = new Date(formatDateForInput(inc.date));
      return incDate >= startOfLastMonth && incDate <= endOfLastMonth;
    });

    // --- CALCULATIONS ---

    // Totals for current month
    const totalCurrentMonthExpenses = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalCurrentMonthIncome = currentMonthIncome.reduce((sum, inc) => sum + inc.amount, 0);

    // Totals for last month
    const totalLastMonthExpenses = lastMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalLastMonthIncome = lastMonthIncome.reduce((sum, inc) => sum + inc.amount, 0);

    // Month-over-month comparison
    const expenseChange = totalLastMonthExpenses > 0
      ? ((totalCurrentMonthExpenses - totalLastMonthExpenses) / totalLastMonthExpenses) * 100
      : totalCurrentMonthExpenses > 0 ? 100 : 0;
    const incomeChange = totalLastMonthIncome > 0
      ? ((totalCurrentMonthIncome - totalLastMonthIncome) / totalLastMonthIncome) * 100
      : totalCurrentMonthIncome > 0 ? 100 : 0;

    // Full expense breakdown by category for the current month
    const expensesByCategory = currentMonthExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);
    const fullCategoryBreakdown = Object.entries(expensesByCategory)
      .sort(([,a], [,b]) => b - a)
      .map(([category, amount]) => ({ category, amount: amount.toFixed(2) }));

    // Last 5 transactions
    const last5Expenses = [...expenses].sort((a, b) => new Date(formatDateForInput(b.date)).getTime() - new Date(formatDateForInput(a.date)).getTime()).slice(0, 5);
    const last5Incomes = [...income].sort((a, b) => new Date(formatDateForInput(b.date)).getTime() - new Date(formatDateForInput(a.date)).getTime()).slice(0, 5);

    // Account balances (existing logic)
    const accountBalances = accounts.map(acc => {
      const accIncome = income.filter(inc => inc.account === acc.name).reduce((sum, inc) => sum + inc.amount, 0);
      const accTransfersIn = transfers.filter(trans => trans.toAccount === acc.name).reduce((sum, trans) => sum + trans.amount, 0);
      const accTransfersOut = transfers.filter(trans => trans.fromAccount === acc.name).reduce((sum, trans) => sum + trans.amount, 0);
      return {
        name: acc.name,
        balance: acc.initialBalance + accIncome + accTransfersIn - accTransfersOut
      };
    });

    return {
      summary: {
        currentMonth: today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        monthlyExpenses: totalCurrentMonthExpenses.toFixed(2),
        monthlyIncome: totalCurrentMonthIncome.toFixed(2),
        monthlyBalance: (totalCurrentMonthIncome - totalCurrentMonthExpenses).toFixed(2),
      },
      comparison: {
        expenseChange: expenseChange.toFixed(2),
        incomeChange: incomeChange.toFixed(2),
      },
      breakdown: {
        categories: fullCategoryBreakdown,
      },
      recentTransactions: {
        expenses: last5Expenses.map(e => ({ date: e.date, desc: e.description, amount: e.amount.toFixed(2) })),
        incomes: last5Incomes.map(i => ({ date: i.date, desc: i.source, amount: i.amount.toFixed(2) })),
      },
      accounts: accountBalances.map(acc => ({
        name: acc.name,
        balance: acc.balance.toFixed(2)
      })),
    };
  }, [expenses, income, transfers, accounts]);

  const callGeminiAPI = async (userMessage: string): Promise<string> => {
    if (!settings.geminiApiKey) {
      throw new Error('Chave da API Gemini não configurada. Configure nas Configurações.');
    }

    // Defensive check to prevent crash if context is not ready
    if (!financialContext) {
      return 'Desculpe, os dados financeiros ainda não estão prontos. Por favor, tente novamente em um momento.';
    }

    const contextPrompt = `Contexto financeiro detalhado do usuário para ${financialContext.summary.currentMonth}:

== RESUMO MENSAL ==
- Despesas: R$ ${financialContext.summary.monthlyExpenses}
- Receitas: R$ ${financialContext.summary.monthlyIncome}
- Saldo do Mês: R$ ${financialContext.summary.monthlyBalance}

== COMPARAÇÃO COM MÊS ANTERIOR ==
- Variação de Despesas: ${financialContext.comparison.expenseChange}%
- Variação de Receitas: ${financialContext.comparison.incomeChange}%

== DETALHAMENTO DE DESPESAS POR CATEGORIA ==
${financialContext.breakdown.categories.map(cat => `- ${cat.category}: R$ ${cat.amount}`).join('\n')}

== ÚLTIMAS 5 DESPESAS ==
${financialContext.recentTransactions.expenses.map(e => `- ${e.date}: ${e.desc} (R$ ${e.amount})`).join('\n')}

== ÚLTIMAS 5 RECEITAS ==
${financialContext.recentTransactions.incomes.map(i => `- ${i.date}: ${i.desc} (R$ ${i.amount})`).join('\n')}

== SALDOS DAS CONTAS ==
${financialContext.accounts.map(acc => `- ${acc.name}: R$ ${acc.balance}`).join('\n')}

Por favor, analise estes dados reais e detalhados do usuário e forneça insights financeiros práticos e personalizados.`;

    const systemPrompt = `Você é um assistente financeiro especializado em análise de dados pessoais.
Seu papel é fornecer insights práticos, sugestões de economia, identificar padrões de gastos e ajudar com planejamento financeiro.

INSTRUÇÕES:
- Use SEMPRE os dados reais fornecidos no contexto
- Forneça análises específicas e práticas
- Sugira ações concretas baseadas nos dados
- Use valores em Reais (R$) e formato brasileiro
- Seja conciso mas detalhado
- Identifique oportunidades de economia
- Destaque padrões importantes nos gastos
- Se não houver dados suficientes, explique isso claramente

${contextPrompt}

Responda de forma clara e útil baseando-se nos dados reais fornecidos:`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${settings.geminiModel || 'gemini-2.0-flash'}:generateContent?key=${settings.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: `${systemPrompt}\n\nPergunta do usuário: ${userMessage}` }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erro da API Gemini:', errorData);
        throw new Error(`Erro da API: ${errorData.error?.message || 'Erro desconhecido'}`);
      }

      const data = await response.json();
      
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Resposta vazia da API Gemini');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error: any) {
      console.error('❌ Erro ao chamar Gemini:', error);
      throw new Error(error.message || 'Erro ao conectar com a API Gemini');
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isSending) return;

    const userMessage = input.trim();
    setInput('');
    setIsSending(true);

    // Add user message
    addMessage(userMessage, 'user');

    try {
      const aiResponse = await callGeminiAPI(userMessage);
      addMessage(aiResponse, 'ai');
    } catch (error: any) {
      console.error('❌ Erro na IA:', error);
      showError('Erro na IA', error.message);
      addMessage(`❌ Desculpe, ocorreu um erro: ${error.message}`, 'ai');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Tem certeza que deseja limpar todo o histórico de conversas?')) {
      clearHistory();
      showSuccess('Histórico limpo', 'O histórico de conversas foi removido com sucesso.');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <div className="flex-grow bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-4 overflow-hidden">
        <div className="h-full overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="w-12 h-12 text-purple-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                Olá! Como posso ajudar?
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-500 max-w-md">
                Sou seu assistente financeiro pessoal. Posso analisar seus dados, 
                identificar padrões de gastos e sugerir formas de economizar.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400'
                  }`}>
                    {message.type === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`rounded-2xl px-4 py-3 ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}>
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    <div className={`text-xs mt-1 opacity-70`}>
                      {message.timestamp.toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isSending && (
            <div className="flex gap-3 justify-start">
              <div className="flex gap-3 max-w-[80%]">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="rounded-2xl px-4 py-3 bg-gray-100 dark:bg-gray-700">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Analisando seus dados...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isFinanceLoading ? "Carregando dados financeiros..." : (settings.geminiApiKey ? "Digite sua pergunta sobre suas finanças..." : "Configure a API Gemini nas Configurações primeiro")}
              disabled={!settings.geminiApiKey || isSending || isFinanceLoading}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white resize-none"
              rows={3}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!settings.geminiApiKey || !input.trim() || isSending || isFinanceLoading}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default FinancialAIChat;