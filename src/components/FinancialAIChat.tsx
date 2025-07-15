import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Loader2, AlertCircle, Settings, TrendingUp, TrendingDown, DollarSign, Sparkles } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useFinance } from '../context/FinanceContext';
import { useFinanceCalculations } from '../hooks/useFinanceCalculations';

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
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: '🤖 Olá! Sou seu assistente financeiro inteligente powered by Gemini AI.\n\nPosso analisar seus dados financeiros e fornecer insights personalizados sobre:\n\n💰 Análise de gastos e receitas\n📊 Padrões de consumo\n💡 Sugestões de economia\n📈 Tendências financeiras\n🎯 Planejamento orçamentário\n\nComo posso ajudar você hoje?',
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
    const aiSettings = settings.aiSettings;
    return aiSettings?.enableAI && aiSettings.geminiApiKey;
  };

  const buildFinancialContext = () => {
    const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    
    // Dados básicos do mês atual
    const basicData = {
      totalExpenses: totalExpensesThisMonth,
      totalIncome: totalIncomeThisMonth,
      balance: balanceThisMonth,
      upcomingExpenses: totalUpcomingExpenses,
    };

    // Top 5 categorias de despesas
    const topCategories = Object.entries(expensesByCategory)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpensesThisMonth > 0 ? (amount / totalExpensesThisMonth * 100).toFixed(1) : '0'
      }));

    // Tendência dos últimos meses
    const recentTrend = monthlyTrend.slice(-3);

    // Estatísticas gerais
    const stats = {
      totalExpenseRecords: expenses.length,
      totalIncomeRecords: income.length,
      totalCategories: categories.length,
      averageExpenseAmount: expenses.length > 0 ? (expenses.reduce((sum, exp) => sum + exp.amount, 0) / expenses.length) : 0,
      averageIncomeAmount: income.length > 0 ? (income.reduce((sum, inc) => sum + inc.amount, 0) / income.length) : 0,
    };

    return {
      currentMonth,
      basicData,
      topCategories,
      recentTrend,
      stats
    };
  };

  const buildPrompt = (userQuestion: string) => {
    const context = buildFinancialContext();
    
    return `Você é um assistente financeiro especializado em análise de dados pessoais. Analise os dados financeiros fornecidos e responda à pergunta do usuário de forma clara, objetiva e útil.

DADOS FINANCEIROS DO USUÁRIO (${context.currentMonth}):

📊 RESUMO MENSAL:
- Receitas: R$ ${context.basicData.totalIncome.toFixed(2)}
- Despesas: R$ ${context.basicData.totalExpenses.toFixed(2)}
- Saldo: R$ ${context.basicData.balance.toFixed(2)}
- Despesas Futuras: R$ ${context.basicData.upcomingExpenses.toFixed(2)}

🏆 TOP 5 CATEGORIAS DE DESPESAS:
${context.topCategories.map((cat, i) => 
  `${i + 1}. ${cat.category}: R$ ${cat.amount.toFixed(2)} (${cat.percentage}%)`
).join('\n')}

📈 TENDÊNCIA DOS ÚLTIMOS 3 MESES:
${context.recentTrend.map(month => 
  `${month.month}: Receitas R$ ${month.totalIncome.toFixed(2)} | Despesas R$ ${month.totalExpenses.toFixed(2)} | Saldo R$ ${month.balance.toFixed(2)}`
).join('\n')}

📋 ESTATÍSTICAS GERAIS:
- Total de registros de despesas: ${context.stats.totalExpenseRecords}
- Total de registros de receitas: ${context.stats.totalIncomeRecords}
- Categorias cadastradas: ${context.stats.totalCategories}
- Valor médio por despesa: R$ ${context.stats.averageExpenseAmount.toFixed(2)}
- Valor médio por receita: R$ ${context.stats.averageIncomeAmount.toFixed(2)}

PERGUNTA DO USUÁRIO: ${userQuestion}

INSTRUÇÕES PARA RESPOSTA:
1. Use os dados fornecidos para dar uma resposta precisa e personalizada
2. Seja específico com números e percentuais quando relevante
3. Forneça insights acionáveis e sugestões práticas
4. Use emojis para tornar a resposta mais visual e amigável
5. Mantenha um tom profissional mas acessível
6. Se a pergunta não puder ser respondida com os dados disponíveis, explique isso claramente
7. Limite a resposta a no máximo 300 palavras para ser concisa

Responda em português brasileiro:`;
  };

  const callGeminiAPI = async (prompt: string): Promise<string> => {
    const apiKey = settings.aiSettings?.geminiApiKey;
    
    if (!apiKey) {
      throw new Error('Chave da API Gemini não configurada');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;
    
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
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
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
        'X-goog-api-key': apiKey,
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

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    if (!isAIConfigured()) {
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'error',
        content: '❌ Por favor, configure a API do Gemini nas configurações primeiro.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
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
      
      // Remover mensagem de loading e adicionar mensagem de erro
      setMessages(prev => {
        const withoutLoading = prev.filter(msg => !msg.isLoading);
        return [...withoutLoading, {
          id: (Date.now() + 3).toString(),
          type: 'error',
          content: `❌ Erro ao processar sua solicitação: ${error.message}\n\nVerifique se sua chave da API Gemini está correta nas configurações.`,
          timestamp: new Date(),
        }];
      });
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

  const quickQuestions = [
    "Como estão meus gastos este mês?",
    "Onde posso economizar?",
    "Qual categoria gasto mais?",
    "Como está minha tendência financeira?",
    "Tenho um bom controle financeiro?",
    "Quais são meus maiores gastos?"
  ];

  const handleQuickQuestion = (question: string) => {
    setInputMessage(question);
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
                  onClick={() => handleQuickQuestion(question)}
                  disabled={isLoading}
                  className="text-left px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 border border-gray-200 dark:border-gray-600"
                >
                  {question}
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
              onClick={handleSendMessage}
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