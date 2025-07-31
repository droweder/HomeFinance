import React, { useState, useEffect } from 'react';
import { X, Calendar, Plus, Minus } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAccounts } from '../context/AccountContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from './ui/toast';
import { Income } from '../types';

interface IncomeFormProps {
  income?: Income | null;
  onClose: () => void;
}

const IncomeForm: React.FC<IncomeFormProps> = ({ income, onClose }) => {
  const { addIncome, updateIncome, categories } = useFinance();
  const { accounts } = useAccounts();
  const { settings } = useSettings();
  const { showSuccess } = useToast();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    amount: '',
    account: '',
    description: '',
    location: '',
    isCreditCard: false,
    isRecurring: false,
    totalRecurrences: 1,
  });

  const [recurrenceDates, setRecurrenceDates] = useState<string[]>([]);

  useEffect(() => {
    if (income) {
      setFormData({
        date: income.date,
        category: income.source,
        amount: income.amount.toString().replace('.', ','),
        account: income.account || '',
        description: income.notes || '',
        location: income.location || '',
        isCreditCard: false, // Nota: precisa adicionar coluna no banco
        isRecurring: false,
        totalRecurrences: 1,
      });
    }
  }, [income]);

  useEffect(() => {
    if (formData.isRecurring) {
      // Generate dates maintaining the same day of month
      const dates = [];
      const baseDate = new Date(formData.date);
      
      for (let i = 0; i < formData.totalRecurrences; i++) {
        const recurrenceDate = new Date(baseDate);
        recurrenceDate.setMonth(baseDate.getMonth() + i);
        dates.push(recurrenceDate.toISOString().split('T')[0]);
      }
      
      setRecurrenceDates(dates);
    } else {
      setRecurrenceDates([]);
    }
  }, [formData.isRecurring, formData.totalRecurrences, formData.date]);

  const handleRecurrenceDateChange = (index: number, date: string) => {
    const newDates = [...recurrenceDates];
    newDates[index] = date;
    setRecurrenceDates(newDates);
  };

  const handleAmountChange = (value: string) => {
    // Allow only numbers, comma and dot
    const sanitized = value.replace(/[^0-9.,]/g, '');
    setFormData({ ...formData, amount: sanitized });
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    if (formData.isRecurring && !income) {
      // Create multiple recurring incomes
      for (let i = 0; i < formData.totalRecurrences; i++) {
        const incomeData = {
          date: recurrenceDates[i] || formData.date,
          source: formData.category,
          amount: baseAmount,
          notes: formData.description,
          location: formData.location,
          account: formData.account,
        };

        addIncome(incomeData);
      }
    } else {
      // Single income or update existing
      const incomeData = {
        date: formData.date,
        source: formData.category,
        amount: baseAmount,
        notes: formData.description,
        location: formData.location,
        account: formData.account,
      };

      if (income) {
        updateIncome(income.id, incomeData);
        showSuccess('Receita atualizada com sucesso!');
      } else {
        addIncome(incomeData);
      }
    }

    onClose();
  };

  const incomeCategories = categories.filter(cat => cat.type === 'income');

  const labels = {
    title: income ? 'Editar Receita' : 'Adicionar Receita',
    date: 'Data',
    category: 'Categoria',
    amount: 'Valor (R$)',
    account: 'Conta',
    description: 'Descrição',
    location: 'Local/Pessoa',
    creditCard: 'Cartão de Crédito',
    recurring: 'Receita recorrente',
    recurrences: 'Número de Recorrências',
    recurrenceDates: 'Datas das Recorrências',
    cancel: 'Cancelar',
    save: income ? 'Atualizar' : 'Adicionar',
    perRecurrence: 'Valor por recorrência',
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {labels.date} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
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
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Selecione uma categoria</option>
                {incomeCategories.map(category => (
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
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                placeholder="0,00"
                required
              />
              {formData.isRecurring && formData.amount && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                  {labels.perRecurrence}: R$ {parseFloat(formData.amount.replace(',', '.')).toFixed(2).replace('.', ',')}
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
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
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
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              placeholder="Observações opcionais sobre esta receita"
              rows={3}
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
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              placeholder="Ex: Empresa, Cliente, João Silva, etc."
            />
          </div>

          {/* Credit Card Option */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isCreditCard"
              checked={formData.isCreditCard}
              onChange={(e) => setFormData({ ...formData, isCreditCard: e.target.checked })}
              className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="isCreditCard" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {labels.creditCard}
            </label>
          </div>

          {/* Recurring Section */}
          <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="isRecurring"
                checked={formData.isRecurring}
                onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600"
                disabled={!!income} // Disable for editing existing income
              />
              <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {labels.recurring}
              </label>
            </div>

            {formData.isRecurring && (
              <div className="space-y-4 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {labels.recurrences}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ 
                        ...formData, 
                        totalRecurrences: Math.max(1, formData.totalRecurrences - 1) 
                      })}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      disabled={formData.totalRecurrences <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={formData.totalRecurrences}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        totalRecurrences: Math.max(1, parseInt(e.target.value) || 1) 
                      })}
                      className="w-20 text-center border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ 
                        ...formData, 
                        totalRecurrences: Math.min(60, formData.totalRecurrences + 1) 
                      })}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {labels.recurrenceDates}
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                    {Array.from({ length: formData.totalRecurrences }, (_, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400 w-16">
                          {index + 1}/{formData.totalRecurrences}:
                        </span>
                        <input
                          type="date"
                          value={recurrenceDates[index] || ''}
                          onChange={(e) => handleRecurrenceDateChange(index, e.target.value)}
                          className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

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
              className="flex-1 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              {labels.save} Receita
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IncomeForm;