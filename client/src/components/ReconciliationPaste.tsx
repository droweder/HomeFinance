import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Calendar, CreditCard as CreditCardIcon } from 'lucide-react';
import type { Account } from '../types/index';

// This is the structured transaction object we will pass to the next modal
interface StatementTransaction {
  date: string;
  description: string;
  amount: number;
  raw: string;
}

interface ReconciliationPasteProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  availableMonths: string[];
  initialMonth: string;
  // This handler will receive the parsed data and trigger the next modal
  onProcessStatement: (data: {
    parsedTransactions: StatementTransaction[];
    reconMonth: string;
    reconAccount: string;
  }) => void;
}

const ReconciliationPaste: React.FC<ReconciliationPasteProps> = ({
  isOpen,
  onClose,
  accounts,
  availableMonths,
  initialMonth,
  onProcessStatement,
}) => {
  const [statementText, setStatementText] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Initialize with the month from the main screen
      setSelectedMonth(initialMonth);
      // Default to the first account if available
      if (accounts.length > 0 && !selectedAccount) {
        setSelectedAccount(accounts[0].name);
      }
    }
  }, [isOpen, initialMonth, accounts]);

  const handleProcess = () => {
    if (!selectedAccount) {
        alert('Por favor, selecione um cartão de crédito.');
        return;
    }
    setIsProcessing(true);

    // Parse statement text into structured objects
    const parsedTransactions = statementText
      .split('\n')
      .map((line): StatementTransaction | null => {
        if (!line.trim()) return null;
        const parts = line.split('\t');
        if (parts.length < 2) return null;

        const date = parts[0];
        const amountString = parts[parts.length - 1];
        const description = parts.slice(1, -1).join(' ').trim();
        const cleanedAmount = amountString.replace(/\./g, '').replace(',', '.');
        const amount = parseFloat(cleanedAmount);

        if (isNaN(amount) || !/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
          console.warn('Linha ignorada no parse:', line);
          return null;
        }
        return { date, description, amount, raw: line };
      })
      .filter((trans): trans is StatementTransaction => trans !== null);

    if (parsedTransactions.length === 0) {
        alert('Nenhuma transação válida foi encontrada no texto. Verifique o formato (deve ser separado por tabulação e ter data e valor válidos).');
        setIsProcessing(false);
        return;
    }

    // Pass the data to the parent component to open the next modal
    onProcessStatement({
      parsedTransactions,
      reconMonth: selectedMonth,
      reconAccount: selectedAccount,
    });

    // No need to set isProcessing to false here, as the component will be closed
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Conciliação de Cartão de Crédito (Passo 1 de 2)
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-grow space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Selecione a Fatura
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {availableMonths.map(month => {
                  const [year, monthNum] = month.split('-');
                  const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' });
                  return (
                    <option key={month} value={month}>
                      {monthName}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <CreditCardIcon className="w-4 h-4 mr-2" />
                Selecione o Cartão
              </label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="" disabled>Selecione um cartão</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.name}>{account.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cole aqui o extrato do seu cartão
            </label>
            <textarea
              value={statementText}
              onChange={(e) => setStatementText(e.target.value)}
              className="w-full h-60 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
              placeholder="Cole o texto da fatura do seu cartão de crédito aqui... O formato esperado é: DATA (dd/mm/aaaa) [TAB] DESCRIÇÃO [TAB] VALOR (0,00)"
            />
          </div>
        </div>

        <div className="flex-shrink-0 flex justify-end pt-6">
          <button
            onClick={handleProcess}
            disabled={isProcessing || !statementText || !selectedAccount}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processando...' : 'Processar Extrato'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReconciliationPaste;
