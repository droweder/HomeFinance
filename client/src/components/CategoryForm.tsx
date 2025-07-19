import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useSettings } from '../context/SettingsContext';
import { Category } from '../types';

interface CategoryFormProps {
  category?: Category | null;
  onClose: () => void;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ category, onClose }) => {
  const { addCategory, updateCategory } = useFinance();
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'expense' | 'income',
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        type: category.type,
      });
    }
  }, [category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert(settings.language === 'pt-BR' ? 'Por favor, digite um nome para a categoria' : 'Please enter a category name');
      return;
    }

    const categoryData = {
      name: formData.name.trim(),
      type: formData.type,
    };

    if (category) {
      updateCategory(category.id, categoryData);
    } else {
      addCategory(categoryData);
    }

    onClose();
  };

  const labels = {
    title: category ? 
      (settings.language === 'pt-BR' ? 'Editar Categoria' : 'Edit Category') :
      (settings.language === 'pt-BR' ? 'Adicionar Nova Categoria' : 'Add New Category'),
    name: settings.language === 'pt-BR' ? 'Nome da Categoria' : 'Category Name',
    type: settings.language === 'pt-BR' ? 'Tipo' : 'Type',
    expense: settings.language === 'pt-BR' ? 'Despesa' : 'Expense',
    income: settings.language === 'pt-BR' ? 'Receita' : 'Income',
    cancel: settings.language === 'pt-BR' ? 'Cancelar' : 'Cancel',
    save: category ? 
      (settings.language === 'pt-BR' ? 'Atualizar' : 'Update') :
      (settings.language === 'pt-BR' ? 'Adicionar' : 'Add'),
    placeholder: settings.language === 'pt-BR' ? 'Ex: Alimentação, Transporte' : 'e.g., Food & Dining, Transport',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {labels.name} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              placeholder={labels.placeholder}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {labels.type} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'expense' | 'income' })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="expense">{labels.expense}</option>
              <option value="income">{labels.income}</option>
            </select>
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
              className="flex-1 px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
            >
              {labels.save} {settings.language === 'pt-BR' ? 'Categoria' : 'Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryForm;