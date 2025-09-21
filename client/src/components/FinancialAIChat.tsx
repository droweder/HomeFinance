import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bot, Send, User, Loader2, AlertCircle, TrendingUp, DollarSign, Calendar, Lightbulb, Trash2, BarChart3 } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useFinance } from '../context/FinanceContext';
import { useAccounts } from '../context/AccountContext';
import { useAIChatHistory } from '../hooks/useAIChatHistory';
import { useToast } from './ui/toast';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

const FinancialAIChat: React.FC = () => {
  const { settings } = useSettings();
  const { expenses, income, transfers, categories } = useFinance();
  const { accounts } = useAccounts();
  const { messages, addMessage, clearHistory } = useAIChatHistory();
  const { showError, showSuccess } = useToast();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Generate financial context for AI
  const financialContext = useMemo(() => {
    if (!expenses.length && !income.length) return null;

    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

    // Filter current month data
    const currentExpenses = expenses.filter(exp => new Date(exp.date) >= startOfMonth);
    const currentIncome = income.filter(inc => new Date(inc.date) >= startOfMonth);
    const currentTransfers = transfers.filter(trans => new Date(trans.date) >= startOfMonth);

    // Calculate totals
    const monthlyExpenses = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const monthlyIncome = currentIncome.reduce((sum, inc) => sum + inc.amount, 0);
    const yearlyExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const yearlyIncome = income.reduce((sum, inc) => sum + inc.amount, 0);

    // Top expense categories this month
    const expensesByCategory = currentExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    const topExpenseCategories = Object.entries(expensesByCategory)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    // Credit card expenses
    const creditCardExpenses = currentExpenses.filter(exp => exp.paymentMethod?.toLowerCase().includes('crédito'));
    const totalCreditCard = creditCardExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Account balances
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
        monthlyExpenses: monthlyExpenses.toFixed(2),
        monthlyIncome: monthlyIncome.toFixed(2),
        monthlyBalance: (monthlyIncome - monthlyExpenses).toFixed(2),
        yearlyExpenses: yearlyExpenses.toFixed(2),
        yearlyIncome: yearlyIncome.toFixed(2),
        totalTransactions: expenses.length + income.length + transfers.length,
        creditCardTotal: totalCreditCard.toFixed(2)
      },
      topCategories: topExpenseCategories.map(([cat, amount]) => ({
        category: cat,
        amount: amount.toFixed(2)
      })),
      accounts: accountBalances.map(acc => ({
        name: acc.name,
        balance: acc.balance.toFixed(2)
      })),
      period: {
        currentMonth: currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        totalExpenses: expenses.length,
        totalIncome: income.length,
        totalTransfers: transfers.length
      }
    };
  }, [expenses, income, transfers, accounts]);

  const callGeminiAPI = async (userMessage: string): Promise<string> => {
    if (!settings.geminiApiKey) {
      throw new Error('Chave da API Gemini não configurada. Configure nas Configurações.');
    }

    const contextPrompt = financialContext ?
      `Contexto financeiro do usuário:
RESUMO MENSAL (${financialContext.period.currentMonth}):
- Despesas: R$ ${financialContext.summary.monthlyExpenses}
- Receitas: R$ ${financialContext.summary.monthlyIncome}
- Saldo: R$ ${financialContext.summary.monthlyBalance}
- Cartão de crédito: R$ ${financialContext.summary.creditCardTotal}

RESUMO ANUAL:
- Total despesas: R$ ${financialContext.summary.yearlyExpenses}
- Total receitas: R$ ${financialContext.summary.yearlyIncome}
- Total transações: ${financialContext.summary.totalTransactions}

PRINCIPAIS CATEGORIAS DE DESPESA:
${financialContext.topCategories.map(cat => `- ${cat.category}: R$ ${cat.amount}`).join('\n')}

SALDOS DAS CONTAS:
${financialContext.accounts.map(acc => `- ${acc.name}: R$ ${acc.balance}`).join('\n')}

DADOS HISTÓRICOS:
- ${financialContext.period.totalExpenses} despesas registradas
- ${financialContext.period.totalIncome} receitas registradas
- ${financialContext.period.totalTransfers} transferências realizadas

Por favor, analise estes dados reais do usuário e forneça insights financeiros práticos e personalizados.`
      : 'O usuário ainda não possui dados financeiros suficientes para análise detalhada.';

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
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

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
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
  };

  const handleClearHistory = () => {
    if (window.confirm('Tem certeza que deseja limpar todo o histórico de conversas?')) {
      clearHistory();
      showSuccess('Histórico limpo', 'O histórico de conversas foi removido com sucesso.');
    }
  };

  const quickQuestions = useMemo(() => {
    if (!financialContext) {
      return [
        'Como organizar minhas finanças?',
        'Dicas para economizar dinheiro',
        'Como criar um orçamento mensal?',
        'Estratégias de investimento básicas'
      ];
    }

    const questions = [
      'Analise meus gastos deste mês',
      'Onde posso economizar mais?',
      'Qual categoria gasto demais?',
      'Como está meu saldo atual?'
    ];

    // Add specific questions based on data
    if (parseFloat(financialContext.summary.creditCardTotal) > 0) {
      questions.push('Analise meus gastos no cartão de crédito');
    }

    if (parseFloat(financialContext.summary.monthlyBalance) < 0) {
      questions.push('Como equilibrar minhas finanças?');
    }

    if (financialContext.topCategories.length > 0) {
      questions.push(`Dicas para reduzir gastos em ${financialContext.topCategories[0].category}`);
    }

    return questions.slice(0, 6);
  }, [financialContext]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-xl">
              <Bot className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Assistente Financeiro</h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Análises inteligentes dos seus dados financeiros
              </p>
            </div>
          </div>
          {messages.length > 1 && (
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Limpar Histórico
            </button>
          )}
        </div>

        {/* Status da API */}
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${settings.geminiApiKey ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-gray-600 dark:text-gray-400">
            {settings.geminiApiKey ? `Gemini ${settings.geminiModel || 'gemini-2.0-flash'} conectado` : 'API não configurada'}
          </span>
        </div>
      </div>

      {/* Quick Questions */}
      {quickQuestions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Perguntas Rápidas
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleQuickQuestion(question)}
                disabled={loading}
                className="p-3 text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-200 dark:hover:border-purple-700 transition-colors text-sm disabled:opacity-50"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-4">
        <div className="h-96 overflow-y-auto p-4 space-y-4">
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
          
          {loading && (
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={settings.geminiApiKey ? "Digite sua pergunta sobre suas finanças..." : "Configure a API Gemini nas Configurações primeiro"}
              disabled={!settings.geminiApiKey || loading}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white resize-none"
              rows={3}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!settings.geminiApiKey || !input.trim() || loading}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {!settings.geminiApiKey && (
          <div className="mt-3 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-4 h-4" />
            Configure sua chave da API Gemini nas Configurações para usar o assistente
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialAIChat;