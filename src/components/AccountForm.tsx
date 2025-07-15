import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAccounts } from '../context/AccountContext';
import { useSettings } from '../context/SettingsContext';
import { Account } from '../types';

interface AccountFormProps {
  account?: Account | null;
  onClose: () => void;
}

const AccountForm: React.FC<AccountFormProps> = ({ account, onClose }) => {
  const { addAccount, updateAccount } = useAccounts();
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    name: '',
    initialBalance: '',
  });

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name,
        initialBalance: account.initialBalance.toString().replace('.', ','),
      });
    }
  }, [account]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert(settings.language === 'pt-BR' ? 'Por favor, digite um nome para a conta' : 'Please enter an account name');
      return;
    }

    const accountData = {
      name: formData.name.trim(),
      initialBalance: parseFloat(formData.initialBalance.replace(',', '.')) || 0,
    };

    if (account) {
      updateAccount(account.id, accountData);
    } else {
      addAccount(accountData);
    }

    onClose();
  };

  const labels = {
    title: account ? 
      (settings.language === 'pt-BR' ? 'Editar Conta' : 'Edit Account') :
      (settings.language === 'pt-BR' ? 'Adicionar Nova Conta' : 'Add New Account'),
    name: settings.language === 'pt-BR' ? 'Nome da Conta' : 'Account Name',
    initialBalance: settings.language === 'pt-BR' ? 'Saldo Inicial (R$)' : 'Initial Balance (BRL)',
    cancel: settings.language === 'pt-BR' ? 'Cancelar' : 'Cancel',
    save: account ? 
      (settings.language === 'pt-BR' ? 'Atualizar' : 'Update') :
      (settings.language === 'pt-BR' ? 'Adicionar' : 'Add'),
    placeholder: settings.language === 'pt-BR' ? 'Ex: Banco do Brasil, Nubank, Carteira' : 'e.g., Bank Account, Wallet, Credit Card',
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
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder={labels.placeholder}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {labels.initialBalance}
            </label>
            <input
              type="text"
              value={formData.initialBalance}
              onChange={(e) => setFormData({ ...formData, initialBalance: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="0,00"
            />
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
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {labels.save} {settings.language === 'pt-BR' ? 'Conta' : 'Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountForm;