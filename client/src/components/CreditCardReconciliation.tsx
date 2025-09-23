import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import type { CreditCard } from '../types/index';

interface CreditCardReconciliationProps {
  isOpen: boolean;
  onClose: () => void;
  filteredCards: CreditCard[];
  selectedMonth: string;
}

const CreditCardReconciliation: React.FC<CreditCardReconciliationProps> = ({ isOpen, onClose, filteredCards, selectedMonth }) => {
  const [statementText, setStatementText] = useState('');
  const [unmatchedAmounts, setUnmatchedAmounts] = useState<number[]>([]);
  const [isReconciling, setIsReconciling] = useState(false);

  const handleReconcile = () => {
    setIsReconciling(true);
    setUnmatchedAmounts([]);

    // 1. Parse statement text
    const statementAmounts = statementText
      .split('\n')
      .map(line => {
        const parts = line.split(/[\t ]+/); // Split by tabs or multiple spaces
        const lastPart = parts[parts.length - 1];
        if (!lastPart) return null;
        // Replace comma with dot for decimal conversion and remove any non-numeric characters except the decimal separator
        const cleanedAmount = lastPart.replace('.', '').replace(',', '.');
        const amount = parseFloat(cleanedAmount);
        return isNaN(amount) ? null : amount;
      })
      .filter((amount): amount is number => amount !== null);

    // 2. Get amounts from filtered cards
    const cardAmounts = filteredCards.map(card => Math.abs(card.amount));

    // 3. Find unmatched amounts
    const unmatched = statementAmounts.filter(statementAmount => {
      const foundIndex = cardAmounts.findIndex(cardAmount => Math.abs(cardAmount - statementAmount) < 0.01); // Use a tolerance for float comparison
      if (foundIndex > -1) {
        cardAmounts.splice(foundIndex, 1); // Remove found amount to handle duplicates
        return false;
      }
      return true;
    });

    setUnmatchedAmounts(unmatched);
    setIsReconciling(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 pb-4 z-10 flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Conciliação de Cartão de Crédito
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cole aqui o extrato do seu cartão
            </label>
            <textarea
              value={statementText}
              onChange={(e) => setStatementText(e.target.value)}
              className="w-full h-60 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Cole o texto da fatura do seu cartão de crédito aqui..."
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleReconcile}
              disabled={isReconciling}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm disabled:bg-blue-400"
            >
              <Search className="w-4 h-4" />
              {isReconciling ? 'Conciliando...' : 'Conciliar'}
            </button>
          </div>

          {unmatchedAmounts.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Valores não encontrados ({unmatchedAmounts.length})
              </h3>
              <ul className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2 max-h-60 overflow-y-auto">
                {unmatchedAmounts.map((amount, index) => (
                  <li key={index} className="text-red-600 dark:text-red-400 font-mono">
                    R$ {amount.toFixed(2).replace('.', ',')}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreditCardReconciliation;
