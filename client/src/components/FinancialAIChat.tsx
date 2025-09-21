import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bot, Send, User, Loader2, AlertCircle, TrendingUp, DollarSign, Calendar, Lightbulb, Trash2, BarChart3 } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useFinance } from '../context/FinanceContext';
import { useAccounts } from '../context/AccountContext';
import { useAIChatHistory } from '../hooks/useAIChatHistory';
import { useToast } from './ui/toast';
import { formatDateForInput } from '../utils/dateUtils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
      allExpenses: expenses, // Pass all expenses for reconciliation
    };
  }, [expenses, income, transfers, accounts]);

  const callGeminiAPI = async (
    userMessage: string,
    statementData: any[] | null,
    onStream: (chunk: string) => void
  ): Promise<void> => {
    if (!settings.geminiApiKey) {
      throw new Error('Chave da API Gemini não configurada. Configure nas Configurações.');
    }

    if (!financialContext) {
      throw new Error('Dados financeiros não estão prontos.');
    }

    let contextPrompt;
    if (statementData) {
      // Reconciliation Task
      contextPrompt = `TAREFA DE CONCILIAÇÃO DE FATURA:
O usuário forneceu a seguinte fatura de cartão de crédito:
--- INÍCIO DA FATURA ---
${JSON.stringify(statementData, null, 2)}
--- FIM DA FATURA ---

Abaixo estão TODAS AS DESPESAS já registradas no aplicativo do usuário:
--- INÍCIO DE TODAS AS DESPESAS ---
${JSON.stringify(financialContext.allExpenses, null, 2)}
--- FIM DE TODAS AS DESPESAS ---

Por favor, compare as duas listas e identifique os lançamentos da fatura que não estão nas despesas do aplicativo.`;
    } else {
      // General Analysis Task
      contextPrompt = `Contexto financeiro detalhado do usuário para ${financialContext.summary.currentMonth}:

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
    }

    const systemPrompt = `Você é um assistente financeiro especializado em análise de dados pessoais.
Seu papel é fornecer insights práticos, sugestões de economia, identificar padrões de gastos, ajudar com planejamento financeiro e realizar conciliação de faturas de cartão de crédito.

INSTRUÇÕES GERAIS:
- Use SEMPRE os dados reais fornecidos no contexto.
- Forneça análises específicas e práticas.
- Sugira ações concretas baseadas nos dados.
- Use valores em Reais (R$) e formato brasileiro.
- Seja conciso mas detalhado.
- Identifique oportunidades de economia e destaque padrões importantes nos gastos.
- Se não houver dados suficientes para uma análise, explique isso claramente.

INSTRUÇÕES DETALHADAS PARA CONCILIAÇÃO DE FATURA:
- Sua tarefa é agir como um robô de conciliação. Você deve comparar DUAS listas: a 'FATURA DO USUÁRIO' (que virá na pergunta) e as 'TODAS AS DESPESAS' (do contexto).
- NÃO use nenhuma suposição sobre datas de fechamento de fatura. A sua única tarefa é comparar os itens um a um.

- SIGA ESTE PROCESSO PARA CADA ITEM NA 'FATURA DO USUÁRIO':
- 1. **Foco no Valor e Descrição:** Pegue o valor e a descrição do item da fatura.
- 2. **Busca nas Despesas do App:** Procure por uma despesa na lista 'TODAS AS DESPESAS' que tenha um valor QUASE IDÊNTICO (pequenas diferenças de centavos são aceitáveis) E uma descrição PARECIDA (ex: 'AmazonMktpl' é o mesmo que 'AMAZON MARKETPLACE'). A data também deve ser próxima.
- 3. **Marcar como Encontrado:** Se encontrar uma correspondência forte, considere o item da fatura como 'encontrado'.
- 4. **Repetir:** Faça isso para todos os itens da fatura.

- SUA RESPOSTA FINAL:
- - Liste APENAS os itens da 'FATURA DO USUÁRIO' para os quais você NÃO encontrou uma correspondência forte nas 'DESPESAS DO APP'.
- - Apresente essa lista de forma clara sob um título como 'Lançamentos a serem adicionados:'.
- - Se todos os itens forem encontrados, simplesmente responda: 'Análise completa: Todos os lançamentos da fatura já parecem estar registrados no aplicativo.'

${contextPrompt}

Responda de forma clara e útil baseando-se nos dados reais fornecidos:`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${settings.geminiModel || 'gemini-1.5-flash'}:streamGenerateContent?key=${settings.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\nPergunta do usuário: ${userMessage}` }] }],
            generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 1024 }
          })
        }
      );

      if (!response.ok || !response.body) {
        const errorData = await response.json();
        throw new Error(`Erro da API: ${errorData.error?.message || 'Erro desconhecido'}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        // The stream can send multiple JSON objects, sometimes separated by commas,
        // and might not be perfectly formed in each chunk. We need to handle this.
        // A simple and robust way is to try to parse JSON objects from the chunk.
        // We'll replace commas between curly braces to create a parsable array.
        const jsonObjects = `[${chunk.replace(/}\s*,\s*{/g, '},{')}]`;

        try {
          const parsedChunk = JSON.parse(jsonObjects);
          if (Array.isArray(parsedChunk)) {
            for (const item of parsedChunk) {
              if (item.candidates?.[0]?.content?.parts?.[0]?.text) {
                onStream(item.candidates[0].content.parts[0].text);
              }
            }
          }
        } catch (e) {
          // This can happen if a chunk is incomplete. We'll ignore parsing errors
          // and wait for the next chunk to form a complete object.
          // For debugging, we can log this, but in production, we might want to be silent.
          console.warn("Ignorando chunk de stream malformado:", e);
        }
      }
    } catch (error: any) {
      console.error('❌ Erro ao chamar Gemini (stream):', error);
      throw new Error(error.message || 'Erro ao conectar com a API Gemini');
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isSending) return;

    const userMessage = input.trim();
    let statementData = null;

    // Simple regex to detect if the input is likely a TSV statement
    const tsvRegex = /(\d{2}\/\d{2}\/\d{4})\t(.*?)\t(.*?)\t(.*?)\t(.*?)/;
    if (tsvRegex.test(userMessage)) {
      try {
        statementData = userMessage.split('\n').map(line => {
          const parts = line.split('\t');
          if (parts.length >= 5) {
            return {
              date: parts[0],
              description: parts[1],
              city: parts[2],
              card: parts[3],
              amount: parseFloat(parts[4].replace(',', '.').replace(/.*?\s/, ''))
            };
          }
          return null;
        }).filter(Boolean); // Filter out nulls from lines that don't parse
        console.log("Statement data parsed:", statementData);
      } catch (e) {
        console.error("Failed to parse statement data, sending as plain text.", e);
        statementData = null; // Reset on error
      }
    }

    setInput('');
    setIsSending(true);

    // Add user message and a placeholder for AI response
    addMessage(userMessage, 'user');
    const aiMessageId = addMessage("...", 'ai'); // Get ID of the new message

    try {
      await callGeminiAPI(userMessage, statementData, (chunk) => {
        // Update the AI message content with the new chunk
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === aiMessageId ? { ...msg, content: msg.content === "..." ? chunk : msg.content + chunk } : msg
          )
        );
      });
    } catch (error: any) {
      console.error('❌ Erro na IA:', error);
      showError('Erro na IA', error.message);
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === aiMessageId ? { ...msg, content: `❌ Desculpe, ocorreu um erro: ${error.message}` } : msg
        )
      );
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
                    <div className="text-sm prose dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
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
        <div className="flex items-center gap-3">
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
          <div className="flex flex-col gap-2">
            <button
              onClick={handleSendMessage}
              disabled={!settings.geminiApiKey || !input.trim() || isSending || isFinanceLoading}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
            {messages.length > 1 && (
              <button
                onClick={handleClearHistory}
                title="Limpar histórico"
                className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default FinancialAIChat;