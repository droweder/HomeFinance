import { useState, useEffect } from 'react';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export function useAIChatHistory() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const storageKey = 'finance-app-ai-chat-history';

  // Carregar histórico do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const messagesWithDates = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(messagesWithDates);
        console.log('📖 Histórico da IA carregado:', messagesWithDates.length, 'mensagens');
      } else {
        // Adicionar mensagem de boas-vindas se não houver histórico
        const welcomeMessage: ChatMessage = {
          id: 'welcome',
          type: 'ai',
          content: 'Olá! Sou seu assistente financeiro. Posso ajudar você a analisar suas finanças, encontrar padrões de gastos, sugerir economias e responder perguntas sobre seus dados. Como posso ajudar hoje?',
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar histórico da IA:', error);
      setMessages([]);
    }
  }, [storageKey]);

  // Salvar no localStorage quando mensagens mudarem
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages));
        console.log('💾 Histórico da IA salvo:', messages.length, 'mensagens');
      } catch (error) {
        console.error('❌ Erro ao salvar histórico da IA:', error);
      }
    }
  }, [messages, storageKey]);

  const addMessage = (content: string, type: 'user' | 'ai') => {
    const newMessage: ChatMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type,
      content,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(storageKey);
    console.log('🧹 Histórico da IA limpo');
  };

  const removeMessage = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  return {
    messages,
    addMessage,
    clearHistory,
    removeMessage,
    messageCount: messages.length
  };
}