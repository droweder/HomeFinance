import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Calendar, DollarSign, Filter, Search, X, ArrowRightLeft, Download } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAccounts } from '../context/AccountContext';
import { useSettings } from '../context/SettingsContext';
import { Transfer } from '../types';
import TransferForm from './TransferForm';
import ConfirmDialog from './ConfirmDialog';

const TransferList: React.FC = () => {
  const { transfers, deleteTransfer, filters, updateFilters } = useFinance();
  const { accounts } = useAccounts();
  const { formatCurrency, formatDate, settings } = useSettings();
  
  const [showForm, setShowForm] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters.transfers);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [transferToDelete, setTransferToDelete] = useState<string | null>(null);

  // Export CSV functionality
  const handleExportCSV = () => {
    if (sortedTransfers.length === 0) {
      alert('Nenhuma transferência para exportar!');
      return;
    }

    const headers = ['Data', 'De', 'Para', 'Valor', 'Descrição'];
    const csvContent = [
      headers.join(','),
      ...sortedTransfers.map(item => {
        const fromAccountName = accounts.find(acc => acc.id === item.fromAccount)?.name || item.fromAccount;
        const toAccountName = accounts.find(acc => acc.id === item.toAccount)?.name || item.toAccount;
        return [
          item.date,
          `"${fromAccountName}"`,
          `"${toAccountName}"`,
          item.amount.toString().replace('.', ','),
          `"${item.description || ''}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transferencias_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTransfers = transfers.filter(transfer => {
    const transferFilters = filters.transfers;
    
    if (transferFilters.fromAccount && transfer.fromAccount !== transferFilters.fromAccount) return false;
    if (transferFilters.toAccount && transfer.toAccount !== transferFilters.toAccount) return false;
    if (transferFilters.description && !transfer.description.toLowerCase().includes(transferFilters.description.toLowerCase())) return false;
    
    if (transferFilters.startDate && transfer.date < transferFilters.startDate) return false;
    if (transferFilters.endDate && transfer.date > transferFilters.endDate) return false;
    
    return true;
  });

  // Aplicar ordenação
  const sortedTransfers = useMemo(() => {
    let sorted = [...filteredTransfers];
    
    if (filters.transfers.sortBy && filters.transfers.sortBy.length > 0) {
      sorted.sort((a, b) => {
        for (const sort of filters.transfers.sortBy!) {
          let aValue: any = a[sort.column as keyof Transfer];
          let bValue: any = b[sort.column as keyof Transfer];
          
          if (sort.column === 'amount') {
            aValue = parseFloat(aValue.toString());
            bValue = parseFloat(bValue.toString());
          }
          
          if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    } else {
      // Ordenação padrão por data (mais recente primeiro)
      sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    
    return sorted;
  }, [filteredTransfers, filters.transfers.sortBy]);

  const handleEdit = (transfer: Transfer) => {
    setEditingTransfer(transfer);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setTransferToDelete(id);
    setShowConfirmDialog(true);
  };

  const confirmDelete = async () => {
    if (transferToDelete) {
      await deleteTransfer(transferToDelete);
      setTransferToDelete(null);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTransfer(null);
  };

  const handleApplyFilters = () => {
    updateFilters('transfers', tempFilters);
    setShowFilterModal(false);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      fromAccount: '',
      toAccount: '',
      description: '',
      startDate: '',
      endDate: '',
      sortBy: []
    };
    setTempFilters(clearedFilters);
    updateFilters('transfers', clearedFilters);
    setShowFilterModal(false);
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account ? account.name : 'Conta não encontrada';
  };

  // Calcular total transferido
  const totalTransferred = sortedTransfers.reduce((sum, transfer) => sum + transfer.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Fixed Header */}
        <div className="fixed top-16 left-0 right-0 z-30 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transferências</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Gerencie suas transferências entre contas</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Total integrado na barra superior */}
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <div>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total Transferido: </span>
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{formatCurrency(totalTransferred)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowFilterModal(true)}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filtros
                </button>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Transferência
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content with top margin to account for fixed header */}
        <div className="pt-32">
          {/* Lista de Transferências */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {sortedTransfers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <ArrowRightLeft className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nenhuma transferência encontrada
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {transfers.length === 0 
                ? 'Comece adicionando sua primeira transferência entre contas.'
                : 'Tente ajustar os filtros para ver mais resultados.'
              }
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Adicionar Transferência
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh] relative">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 sticky top-0 z-20">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Data</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Valor</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">De</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Para</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Descrição</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {sortedTransfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-1 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDate(transfer.date)}
                        </span>
                      </div>
                    </td>
                    <td className="py-1 px-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {formatCurrency(transfer.amount)}
                        </span>
                      </div>
                    </td>
                    <td className="py-1 px-4">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {getAccountName(transfer.fromAccount)}
                      </span>
                    </td>
                    <td className="py-1 px-4">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {getAccountName(transfer.toAccount)}
                      </span>
                    </td>
                    <td className="py-1 px-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {transfer.description || '-'}
                      </span>
                    </td>
                    <td className="py-1 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(transfer)}
                          className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="Editar transferência"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(transfer.id)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Excluir transferência"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Modal de Filtros */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Filtros</h2>
              <button
                onClick={() => setShowFilterModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Conta Origem */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Conta Origem
                </label>
                <select
                  value={tempFilters.fromAccount}
                  onChange={(e) => setTempFilters({ ...tempFilters, fromAccount: e.target.value })}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Todas as contas</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
              </div>

              {/* Conta Destino */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Conta Destino
                </label>
                <select
                  value={tempFilters.toAccount}
                  onChange={(e) => setTempFilters({ ...tempFilters, toAccount: e.target.value })}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Todas as contas</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descrição
                </label>
                <input
                  type="text"
                  value={tempFilters.description || ''}
                  onChange={(e) => setTempFilters({ ...tempFilters, description: e.target.value })}
                  placeholder="Buscar por descrição..."
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Data Início */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Data Início
                </label>
                <input
                  type="date"
                  value={tempFilters.startDate}
                  onChange={(e) => setTempFilters({ ...tempFilters, startDate: e.target.value })}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Data Fim */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Data Fim
                </label>
                <input
                  type="date"
                  value={tempFilters.endDate}
                  onChange={(e) => setTempFilters({ ...tempFilters, endDate: e.target.value })}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={handleClearFilters}
                className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Limpar
              </button>
              <button
                onClick={handleApplyFilters}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Formulário */}
      {showForm && (
        <TransferForm
          transfer={editingTransfer}
          onClose={handleCloseForm}
        />
      )}

      {/* Dialog de Confirmação */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={confirmDelete}
        title="Excluir Transferência"
        message="Tem certeza que deseja excluir esta transferência? Esta ação não pode ser desfeita."
        type="danger"
        confirmText="Excluir"
        cancelText="Cancelar"
      />
    </div>
  );
};

export default TransferList;