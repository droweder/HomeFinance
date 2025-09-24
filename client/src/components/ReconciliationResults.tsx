import React, { useMemo, useState } from 'react';
import { X, AlertTriangle, CheckCircle, PlusCircle, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import type { CreditCard } from '../types/index';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StatementTransaction {
  date: string;
  description: string;
  amount: number;
  raw: string;
}

interface ReconciliationResultsProps {
  isOpen: boolean;
  onClose: () => void;
  creditCards: CreditCard[];
  reconMonth: string;
  reconAccount: string;
  parsedTransactions: StatementTransaction[];
  onAddExpense: (expense: Partial<CreditCard>) => void;
  onDeleteExpense?: (expenseId: string) => void;
}

const ReconciliationResults: React.FC<ReconciliationResultsProps> = ({
  isOpen,
  onClose,
  creditCards,
  reconMonth,
  reconAccount,
  parsedTransactions,
  onAddExpense,
  onDeleteExpense,
}) => {
  const [filter, setFilter] = useState<'missingInApp' | 'missingInStatement' | 'matched' | 'all'>('missingInApp');

  const { matched, missingInApp, missingInStatement } = useMemo(() => {
    if (!isOpen) return { matched: [], missingInApp: [], missingInStatement: [] };

    const appTransactions = creditCards.filter(card => {
      const cardMonth = card.date.substring(0, 7);
      return cardMonth === reconMonth && card.paymentMethod === reconAccount;
    });

    const matchedPairs: { statement: StatementTransaction; app: CreditCard }[] = [];
    const notFoundInApp: StatementTransaction[] = [];
    const notFoundInStatement = [...appTransactions];

    for (const st of parsedTransactions) {
      const appExpenseIndex = notFoundInStatement.findIndex(ae => {
        const statementAmount = Math.abs(st.amount);
        const appAmount = Math.abs(ae.amount);
        return Math.abs(statementAmount - appAmount) < 0.01;
      });

      if (appExpenseIndex !== -1) {
        const [appExpense] = notFoundInStatement.splice(appExpenseIndex, 1);
        matchedPairs.push({ statement: st, app: appExpense });
      } else {
        notFoundInApp.push(st);
      }
    }

    return { matched: matchedPairs, missingInApp: notFoundInApp, missingInStatement: notFoundInStatement };
  }, [isOpen, parsedTransactions, creditCards, reconMonth, reconAccount]);

  const handleAddClick = (transaction: StatementTransaction) => {
    const [day, month, year] = transaction.date.split('/');
    const formattedDate = `${year}-${month}-${day}`;

    onAddExpense({
      date: formattedDate,
      description: transaction.description,
      amount: transaction.amount,
      paymentMethod: reconAccount,
      category: 'Cartão de Crédito',
    });
  };

  if (!isOpen) {
    return null;
  }

  const renderMissingInApp = () => (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
        Lançamentos na Fatura, mas não no App ({missingInApp.length})
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Estes são os lançamentos que constam na fatura mas não foram encontrados no aplicativo.
      </p>
      <table className="w-full text-left text-sm">
        {/* header */}
        <tbody>
          {missingInApp.map((t, i) => (
            <tr key={`missing-app-${i}`} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td className="py-2 px-3">{t.date}</td>
              <td className="py-2 px-3">{t.description}</td>
              <td className="py-2 px-3 text-right font-mono">{t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
              <td className="py-2 px-3 text-center">
                <button onClick={() => handleAddClick(t)} className="text-blue-500 hover:text-blue-700 p-1">
                  <PlusCircle className="w-5 h-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderMissingInStatement = () => (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-2">
        Lançamentos no App, mas não na Fatura ({missingInStatement.length})
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Estes são os lançamentos registrados no aplicativo que não foram encontrados na fatura.
      </p>
      <table className="w-full text-left text-sm">
        {/* header */}
        <tbody>
          {missingInStatement.map((e, i) => (
            <tr key={`missing-stmt-${i}`} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td className="py-2 px-3">{format(new Date(e.date), 'dd/MM/yyyy', { locale: ptBR })}</td>
              <td className="py-2 px-3">{e.description}</td>
              <td className="py-2 px-3 text-right font-mono">{e.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
              <td className="py-2 px-3 text-center">
                {onDeleteExpense && (
                  <button onClick={() => onDeleteExpense(e.id)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Resultado da Conciliação</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-shrink-0 flex items-center justify-between mb-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
           {/* Info Section */}
        </div>

        <div className="flex-grow overflow-y-auto pr-2">
          {missingInApp.length > 0 && renderMissingInApp()}
          {missingInStatement.length > 0 && renderMissingInStatement()}

          {missingInApp.length === 0 && missingInStatement.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Tudo conciliado!</h3>
              <p className="text-gray-600 dark:text-gray-400">Nenhuma divergência encontrada.</p>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 flex justify-end pt-6 mt-4 border-t dark:border-gray-700">
          <button onClick={onClose} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReconciliationResults;
