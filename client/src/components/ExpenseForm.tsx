import React, { useState, useEffect } from 'react';
import { X, Calendar, Plus, Minus } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAccounts } from '../context/AccountContext';
import { useSettings } from '../context/SettingsContext';
import { Expense } from '../types';
import { formatDateForInput, formatDateForStorage, getCurrentDateForInput } from '../utils/dateUtils';

interface ExpenseFormProps {
  expense?: Expense | null;
  onClose: () => void;
  onSave?: () => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ expense, onClose, onSave }) => {
  const { addExpense, updateExpense, categories } = useFinance();
  const { accounts } = useAccounts();
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    date: getCurrentDateForInput(),
    category: '',
    amount: '',
    account: '',
    description: '',
    location: '',
    isCreditCard: false,
    isInstallment: false,
    totalInstallments: 1,
  });

  const [installmentDates, setInstallmentDates] = useState<string[]>([]);

  useEffect(() => {
    if (expense) {
      console.log('🔧 Carregando despesa para edição:', expense);
      setFormData({
        date: formatDateForInput(expense.dueDate || expense.date),
        category: expense.category,
        amount: expense.amount.toString().replace('.', ','),
        account: expense.paymentMethod,
        description: expense.description,
        location: expense.location || '',
        isCreditCard: expense.isCreditCard || false,
        isInstallment: expense.isInstallment || false,
        totalInstallments: expense.totalInstallments || 1,
      });

      if (expense.isInstallment && expense.dueDate) {
        setInstallmentDates([formatDateForInput(expense.dueDate)]);
      }
    }
  }, [expense]);

  useEffect(() => {
    if (formData.isInstallment) {
      // Generate dates maintaining the same day of month
      const dates = [];
      const baseDate = new Date(formData.date);
      
      for (let i = 0; i < formData.totalInstallments; i++) {
        const installmentDate = new Date(baseDate);
        installmentDate.setMonth(baseDate.getMonth() + i);
        dates.push(installmentDate.toISOString().split('T')[0]);
      }
      
      setInstallmentDates(dates);
    } else {
      setInstallmentDates([]);
    }
  }, [formData.isInstallment, formData.totalInstallments, formData.date]);

  const handleInstallmentDateChange = (index: number, date: string) => {
    const newDates = [...installmentDates];
    newDates[index] = date;
    setInstallmentDates(newDates);
  };

  const handleAmountChange = (value: string) => {
    // Allow only numbers, comma and dot
    const sanitized = value.replace(/[^0-9.,]/g, '');
    setFormData({ ...formData, amount: sanitized });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category || !formData.amount || !formData.account) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    const baseAmount = parseFloat(formData.amount.replace(',', '.'));
    if (isNaN(baseAmount) || baseAmount <= 0) {
      alert('Por favor, insira um valor válido');
      return;
    }

    console.log('💾 Salvando despesa:', { expense, formData, baseAmount });

    if (expense) {
      // Editando despesa existente
      const expenseData = {
        date: formatDateForStorage(formData.date),
        category: formData.category,
        description: formData.description,
        amount: baseAmount, // Usar o valor total para edição
        paymentMethod: formData.account,
        location: formData.location,
        dueDate: formatDateForStorage(formData.date),
        isCreditCard: formData.isCreditCard,
        // Preservar informações de parcelas se existirem
        isInstallment: expense.isInstallment,
        installmentNumber: expense.installmentNumber,
        totalInstallments: expense.totalInstallments,
        installmentGroup: expense.installmentGroup,
      };

      console.log('✏️ Atualizando despesa:', expenseData);
      try {
        await updateExpense(expense.id, expenseData);
        console.log('✅ Despesa atualizada com sucesso');
        onSave?.();
        onClose();
      } catch (error: any) {
        console.error('❌ Erro ao atualizar despesa:', error);
        alert(`Erro ao atualizar despesa: ${error.message || 'Erro desconhecido'}`);
      }
    } else {
      // Criando nova despesa
      const installmentAmount = formData.isInstallment ? baseAmount / formData.totalInstallments : baseAmount;

      if (formData.isInstallment) {
        // Create multiple installments with clean descriptions
        const installmentGroup = Date.now().toString();
        
        for (let i = 0; i < formData.totalInstallments; i++) {
          const expenseData = {
            date: formatDateForStorage(installmentDates[i] || formData.date),
            category: formData.category,
            description: formData.description,
            amount: installmentAmount,
            paymentMethod: formData.account,
            location: formData.location,
            isInstallment: true,
            installmentNumber: i + 1,
            totalInstallments: formData.totalInstallments,
            installmentGroup: installmentGroup,
            dueDate: formatDateForStorage(installmentDates[i] || formData.date),
            isCreditCard: formData.isCreditCard,
            paid: false,
          };

          console.log(`📝 Criando parcela ${i + 1}/${formData.totalInstallments}:`, expenseData);
          addExpense(expenseData);
        }
      } else {
        // Single expense
        const expenseData = {
          date: formatDateForStorage(formData.date),
          category: formData.category,
          description: formData.description,
          amount: baseAmount,
          paymentMethod: formData.account,
          location: formData.location,
          isInstallment: false,
          dueDate: formatDateForStorage(formData.date),
          isCreditCard: formData.isCreditCard,
          paid: false,
        };

        console.log('📝 Criando despesa única:', expenseData);
        addExpense(expenseData);
      }
    }

    onClose();
  };

  const expenseCategories = categories.filter(cat => cat.type === 'expense');

  const labels = {
    title: expense ? 'Editar Despesa' : 'Adicionar Despesa',
    date: 'Data',
    category: 'Categoria',
    amount: 'Valor (R$)',
    account: 'Conta',
    description: 'Descrição',
    location: 'Local/Pessoa',
    creditCard: 'Cartão de Crédito',
    installment: 'Parcelar esta despesa',
    installments: 'Número de Parcelas',
    dueDates: 'Datas de Vencimento das Parcelas',
    cancel: 'Cancelar',
    save: expense ? 'Atualizar' : 'Adicionar',
    perInstallment: 'Valor por parcela',
    installmentInfo: 'Informações da Parcela',
    installmentDetails: 'Detalhes da Parcela',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 pb-4 z-10 flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {labels.title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Informações da Parcela - Mostrar se for despesa parcelada */}
          {expense && expense.isInstallment && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {labels.installmentInfo}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-700 dark:text-blue-400">Parcela:</span>
                  <p className="text-blue-800 dark:text-blue-300">
                    {expense.installmentNumber} de {expense.totalInstallments}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-blue-700 dark:text-blue-400">Valor da Parcela:</span>
                  <p className="text-blue-800 dark:text-blue-300">
                    R$ {expense.amount.toFixed(2).replace('.', ',')}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-blue-700 dark:text-blue-400">Valor Total:</span>
                  <p className="text-blue-800 dark:text-blue-300">
                    R$ {((expense.amount || 0) * (expense.totalInstallments || 1)).toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>
              <div className="mt-3 text-xs text-blue-600 dark:text-blue-400">
                💡 Ao editar uma parcela, as alterações afetarão apenas esta parcela específica.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {labels.date} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {labels.category} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Selecione uma categoria</option>
                {expenseCategories.map(category => (
                  <option key={category.id} value={category.name}>{category.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {labels.amount} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="0,00"
                required
              />
              {formData.isInstallment && formData.amount && !expense && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                  {labels.perInstallment}: R$ {(parseFloat(formData.amount.replace(',', '.')) / formData.totalInstallments).toFixed(2).replace('.', ',')}
                </p>
              )}
              {expense && expense.isInstallment && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  💡 Este é o valor desta parcela específica
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {labels.account} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.account}
                onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Selecione uma conta</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.name}>{account.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {labels.description}
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Notas opcionais sobre esta despesa"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {labels.location}
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Ex: Supermercado, João Silva, etc."
            />
          </div>

          {/* Credit Card Option */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isCreditCard"
              checked={formData.isCreditCard}
              onChange={(e) => setFormData({ ...formData, isCreditCard: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="isCreditCard" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {labels.creditCard}
            </label>
          </div>

          {/* Installment Section - Only for new expenses */}
          {!expense && (
            <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="isInstallment"
                  checked={formData.isInstallment}
                  onChange={(e) => setFormData({ ...formData, isInstallment: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="isInstallment" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {labels.installment}
                </label>
              </div>

              {formData.isInstallment && (
                <div className="space-y-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {labels.installments}
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ 
                          ...formData, 
                          totalInstallments: Math.max(1, formData.totalInstallments - 1) 
                        })}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        disabled={formData.totalInstallments <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={formData.totalInstallments}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          totalInstallments: Math.max(1, parseInt(e.target.value) || 1) 
                        })}
                        className="w-20 text-center border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ 
                          ...formData, 
                          totalInstallments: Math.min(60, formData.totalInstallments + 1) 
                        })}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      {labels.dueDates}
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                      {Array.from({ length: formData.totalInstallments }, (_, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-400 w-16">
                            {index + 1}/{formData.totalInstallments}:
                          </span>
                          <input
                            type="date"
                            value={installmentDates[index] || ''}
                            onChange={(e) => handleInstallmentDateChange(index, e.target.value)}
                            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {labels.cancel}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {labels.save} Despesa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseForm;