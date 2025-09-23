import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import type { CreditCard } from '../types/index';

// This is the structured transaction object we get from the first modal
interface StatementTransaction {
  date: string;
  description: string;
  amount: number;
  raw: string;
}

// This is an augmented transaction object that includes the reconciliation status
interface ReconciledTransaction extends StatementTransaction {
  isMatched: boolean;
}

interface ReconciliationResultsProps {
  isOpen: boolean;
  onClose: () => void;
  // The full list of transactions from the app
  creditCards: CreditCard[];
  // The month and account selected in the first modal
  reconMonth: string;
  reconAccount: string;
  // The transactions parsed from the statement in the first modal
  parsedTransactions: StatementTransaction[];
  // The handler to trigger adding a new expense
  onAddExpense: (cardData: Partial<CreditCard>) => void;
}

const ReconciliationResults: React.FC<ReconciliationResultsProps> = ({
  isOpen,
  onClose,
  creditCards,
  reconMonth,
  reconAccount,
  parsedTransactions,
  onAddExpense,
}) => {
  const [reconciledTransactions, setReconciledTransactions] = useState<ReconciledTransaction[]>([]);
  const [showOnlyUnmatched, setShowOnlyUnmatched] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    // Filter the application's cards based on the selected month and account
    const appTransactions = creditCards.filter(card => {
      const cardMonth = card.date.substring(0, 7);
      return cardMonth === reconMonth && card.paymentMethod === reconAccount;
    });

    const cardAmounts = appTransactions.map(card => Math.abs(card.amount));

    // Determine the matched status for each parsed transaction
    const results = parsedTransactions.map(statementTrans => {
      const foundIndex = cardAmounts.findIndex(cardAmount => Math.abs(cardAmount - statementTrans.amount) < 0.01);
      if (foundIndex > -1) {
        // To handle duplicates, we remove the found amount from the list
        cardAmounts.splice(foundIndex, 1);
        return { ...statementTrans, isMatched: true };
      }
      return { ...statementTrans, isMatched: false };
    });

    setReconciledTransactions(results);
  }, [isOpen, parsedTransactions, creditCards, reconMonth, reconAccount]);

  // The transactions to be displayed in the table, based on the filter
  const displayedTransactions = useMemo(() => {
    if (showOnlyUnmatched) {
      return reconciledTransactions.filter(t => !t.isMatched);
    }
    return reconciledTransactions;
  }, [reconciledTransactions, showOnlyUnmatched]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Resultado da Conciliação</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Fatura de {reconMonth} para o cartão {reconAccount}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-shrink-0 flex justify-end mb-4">
          <button
            onClick={() => setShowOnlyUnmatched(!showOnlyUnmatched)}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {showOnlyUnmatched ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showOnlyUnmatched ? 'Mostrar Todos os Itens' : 'Mostrar Apenas Não Encontrados'}
          </button>
        </div>

        <div className="flex-grow overflow-y-auto">
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                <tr>
                  <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-300 w-24">Status</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-300">Data</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-300">Descrição</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-300">Valor</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600 dark:text-gray-300 w-28">Ação</th>
                </tr>
              </thead>
              <tbody>
                {displayedTransactions.map((trans, index) => (
                  <tr key={index} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <td className="py-2 px-3">
                      {trans.isMatched ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Encontrado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Não Encontrado
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-400">{trans.date}</td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-400">{trans.description}</td>
                    <td className="py-2 px-3 font-mono text-right ${trans.isMatched ? 'text-gray-500' : 'text-red-600 dark:text-red-400 font-bold'}">
                      {trans.amount.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {!trans.isMatched && (
                        <button
                          onClick={() => {
                            const [day, month, year] = trans.date.split('/');
                            const formattedDate = `${year}-${month}-${day}`;
                            onAddExpense({
                              date: formattedDate,
                              description: trans.description,
                              amount: trans.amount,
                              paymentMethod: reconAccount,
                            });
                          }}
                          className="bg-green-600 text-white px-2 py-1 rounded-md hover:bg-green-700 transition-colors text-xs flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Adicionar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {displayedTransactions.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {showOnlyUnmatched ? 'Nenhum item não encontrado.' : 'Nenhum item no extrato.'}
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReconciliationResults;
