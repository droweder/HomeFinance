import React, { useState } from 'react';
import { Bot } from 'lucide-react';
import Modal from './Modal';
import FinancialAIChat from './FinancialAIChat';

const FinancialAIChatModal: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 z-40"
        aria-label="Abrir Assistente Financeiro"
      >
        <Bot className="w-6 h-6" />
      </button>

      {/* Chat Modal */}
      <Modal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        title="Assistente Financeiro de IA"
      >
        <FinancialAIChat />
      </Modal>
    </>
  );
};

export default FinancialAIChatModal;
