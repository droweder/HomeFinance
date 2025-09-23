import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Calendar, CreditCard as CreditCardIcon } from 'lucide-react';
import type { CreditCard, Account } from '../types/index';

interface StatementTransaction {
  date: string;
  description: string;
  amount: number;
  raw: string;
}

interface CreditCardReconciliationProps {
  isOpen: boolean;
  onClose: () => void;
  creditCards: CreditCard[];
  accounts: Account[];
  availableMonths: string[];
  selectedMonth: string;
  onAddExpense: (cardData: Partial<CreditCard>) => void;
}

const CreditCardReconciliation: React.FC<CreditCardReconciliationProps> = ({
  isOpen,
  onClose,
  creditCards,
  accounts,
  availableMonths,
  selectedMonth,
  onAddExpense,
}) => {
  const [statementText, setStatementText] = useState('');
  const [unmatchedTransactions, setUnmatchedTransactions] = useState<StatementTransaction[]>([]);
  const [isReconciling, setIsReconciling] = useState(false);
  const [selectedReconMonth, setSelectedReconMonth] = useState(selectedMonth);
  const [selectedReconAccount, setSelectedReconAccount] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedReconMonth(selectedMonth);
      // Reset account selection if the list of accounts changes or on open
      if (accounts.length > 0) {
        setSelectedReconAccount(accounts[0].name);
      } else {
        setSelectedReconAccount('');
      }
    }
  }, [isOpen, selectedMonth, accounts]);

  const handleReconcile = () => {
    setIsReconciling(true);
    setUnmatchedTransactions([]);

    // 1. Parse statement text into structured objects
    const statementTransactions = statementText
      .split('\n')
      .map((line): StatementTransaction | null => {
        if (!line.trim()) return null;

        const parts = line.split('\t');
        if (parts.length < 2) return null; // Expect at least date and amount

        const date = parts[0];
        const amountString = parts[parts.length - 1];
        const description = parts.slice(1, -1).join(' ').trim();

        const cleanedAmount = amountString.replace('.', '').replace(',', '.');
        const amount = parseFloat(cleanedAmount);

        if (isNaN(amount) || !/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
          return null; // Basic validation
        }

        return { date, description, amount, raw: line };
      })
      .filter((trans): trans is StatementTransaction => trans !== null);

    // 2. Filter the application's cards based on the selected month and account
    const appTransactions = creditCards.filter(card => {
      const cardMonth = card.date.substring(0, 7);
      return cardMonth === selectedReconMonth && card.paymentMethod === selectedReconAccount;
    });

    const cardAmounts = appTransactions.map(card => Math.abs(card.amount));

    // 3. Find unmatched transactions
    const unmatched = statementTransactions.filter(statementTrans => {
      const foundIndex = cardAmounts.findIndex(cardAmount => Math.abs(cardAmount - statementTrans.amount) < 0.01);
      if (foundIndex > -1) {
        cardAmounts.splice(foundIndex, 1);
        return false;
      }
      return true;
    });

    setUnmatchedTransactions(unmatched);
    setIsReconciling(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
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

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Mês/Fatura para Conciliar
              </label>
              <select
                value={selectedReconMonth}
                onChange={(e) => setSelectedReconMonth(e.target.value)}
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
                Cartão de Crédito
              </label>
              <select
                value={selectedReconAccount}
                onChange={(e) => setSelectedReconAccount(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Selecione um cartão</option>
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
              className="w-full h-48 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
              placeholder="Cole o texto da fatura do seu cartão de crédito aqui..."
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleReconcile}
              disabled={isReconciling || !statementText}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              <Search className="w-4 h-4" />
              {isReconciling ? 'Conciliando...' : 'Conciliar'}
            </button>
          </div>

          {unmatchedTransactions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Lançamentos não encontrados ({unmatchedTransactions.length})
              </h3>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-300">Data</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-300">Descrição</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-300">Valor</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600 dark:text-gray-300">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unmatchedTransactions.map((trans, index) => (
                      <tr key={index} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
                        <td className="py-2 px-3 text-gray-700 dark:text-gray-400">{trans.date}</td>
                        <td className="py-2 px-3 text-gray-700 dark:text-gray-400">{trans.description}</td>
                        <td className="py-2 px-3 text-red-600 dark:text-red-400 font-mono text-right">
                          {trans.amount.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => {
                              const [day, month, year] = trans.date.split('/');
                              const formattedDate = `${year}-${month}-${day}`;
                              onAddExpense({
                                date: formattedDate,
                                description: trans.description,
                                amount: trans.amount,
                                paymentMethod: selectedReconAccount,
                              });
                            }}
                            className="bg-green-600 text-white px-2 py-1 rounded-md hover:bg-green-700 transition-colors text-xs flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Adicionar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreditCardReconciliation;
