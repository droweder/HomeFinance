import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Calendar, DollarSign, Filter, Search, X, ArrowRightLeft, Download, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [selectedTransfers, setSelectedTransfers] = useState<Set<string>>(new Set());
  const [tempFilters, setTempFilters] = useState(filters.transfers);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [transferToDelete, setTransferToDelete] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });

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

  // Check if there are active filters (excluding date filters)
  const hasActiveFilters = useMemo(() => {
    const f = filters.transfers;
    return !!(f.fromAccount || f.toAccount || f.description || (f.sortBy && f.sortBy.length > 0));
  }, [filters.transfers]);

  // PERFORMANCE: Filter data based on active filters
  const baseFilteredTransfers = useMemo(() => {
    // If there are date filters defined, use those
    if (filters.transfers.startDate || filters.transfers.endDate) {
      return transfers.filter(transfer => {
        const transferDate = transfer.date;
        if (filters.transfers.startDate && transferDate < filters.transfers.startDate) return false;
        if (filters.transfers.endDate && transferDate > filters.transfers.endDate) return false;
        return true;
      });
    }
    
    // If there are active filters, show all data (don't filter by month)
    if (hasActiveFilters) {
      return transfers;
    }
    
    // Otherwise, use month filtering for performance
    return transfers.filter(transfer => {
      const transferMonth = transfer.date.substring(0, 7); // YYYY-MM format
      return transferMonth === selectedMonth;
    });
  }, [transfers, selectedMonth, filters.transfers.startDate, filters.transfers.endDate, hasActiveFilters]);

  // Get available months for dropdown
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    const dataToAnalyze = hasActiveFilters ? baseFilteredTransfers : transfers;
    
    dataToAnalyze.forEach(transfer => {
      const month = transfer.date.substring(0, 7);
      months.add(month);
    });
    return Array.from(months).sort().reverse(); // Most recent first
  }, [transfers, baseFilteredTransfers, hasActiveFilters]);

  // Generate period display for month selector when filters are active
  const periodDisplay = useMemo(() => {
    if (!hasActiveFilters || availableMonths.length === 0) {
      return '';
    }
    
    if (availableMonths.length === 1) {
      const [year, month] = availableMonths[0].split('-');
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    }
    
    const newest = availableMonths[0].split('-');
    const oldest = availableMonths[availableMonths.length - 1].split('-');
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    return `${monthNames[parseInt(oldest[1]) - 1]} ${oldest[0]} - ${monthNames[parseInt(newest[1]) - 1]} ${newest[0]}`;
  }, [hasActiveFilters, availableMonths]);

  // Sync selectedMonth with available data only on initial load - allow manual changes after that
  const [hasInitialized, setHasInitialized] = React.useState(false);
  React.useEffect(() => {
    if (availableMonths.length > 0 && !hasInitialized) {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      
      // If current month has data, use it; otherwise use most recent month with data
      if (availableMonths.includes(currentMonth)) {
        setSelectedMonth(currentMonth);
      } else {
        // Use most recent month with data (first in the reversed array)
        setSelectedMonth(availableMonths[0]);
      }
      setHasInitialized(true);
    }
  }, [availableMonths, hasInitialized]);


  // PERFORMANCE: Filter the base data
  const filteredTransfers = baseFilteredTransfers.filter(transfer => {
    const transferFilters = filters.transfers;
    
    if (transferFilters.fromAccount && transfer.fromAccount !== transferFilters.fromAccount) return false;
    if (transferFilters.toAccount && transfer.toAccount !== transferFilters.toAccount) return false;
    if (transferFilters.description && !transfer.description.toLowerCase().includes(transferFilters.description.toLowerCase())) return false;
    
    // Skip date filtering here since it's already done in baseFilteredTransfers
    
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

  const handleSelectTransfer = (transferId: string) => {
    const newSelected = new Set(selectedTransfers);
    if (newSelected.has(transferId)) {
      newSelected.delete(transferId);
    } else {
      newSelected.add(transferId);
    }
    setSelectedTransfers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTransfers.size === sortedTransfers.length) {
      setSelectedTransfers(new Set());
    } else {
      setSelectedTransfers(new Set(sortedTransfers.map(transfer => transfer.id)));
    }
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account ? account.name : 'Conta não encontrada';
  };

  // Calcular total transferido - apenas dos itens selecionados
  const totalTransferred = useMemo(() => {
    if (selectedTransfers.size === 0) {
      // Se nenhum item selecionado, mostrar total geral
      return sortedTransfers.reduce((sum, transfer) => sum + transfer.amount, 0);
    }
    // Se há itens selecionados, mostrar apenas total dos selecionados
    return sortedTransfers
      .filter(transfer => selectedTransfers.has(transfer.id))
      .reduce((sum, transfer) => sum + transfer.amount, 0);
  }, [sortedTransfers, selectedTransfers]);

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
                {/* Month Navigation or Period Display */}
                <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  {filters.transfers.startDate || filters.transfers.endDate ? (
                    // Show period info when filters are active
                    <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      {filters.transfers.startDate && filters.transfers.endDate ? (
                        `Período: ${new Date(filters.transfers.startDate).toLocaleDateString('pt-BR')} - ${new Date(filters.transfers.endDate).toLocaleDateString('pt-BR')} (${sortedTransfers.length} registros)`
                      ) : filters.transfers.startDate ? (
                        `Desde: ${new Date(filters.transfers.startDate).toLocaleDateString('pt-BR')} (${sortedTransfers.length} registros)`
                      ) : (
                        `Até: ${new Date(filters.transfers.endDate).toLocaleDateString('pt-BR')} (${sortedTransfers.length} registros)`
                      )}
                    </div>
                  ) : hasActiveFilters && periodDisplay ? (
                    // Show period when other filters are active
                    <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      {periodDisplay} ({sortedTransfers.length} registros)
                    </div>
                  ) : (
                    // Show month navigation when no filters are active
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const currentIndex = availableMonths.findIndex(month => month === selectedMonth);
                          if (currentIndex < availableMonths.length - 1) {
                            setSelectedMonth(availableMonths[currentIndex + 1]);
                          }
                        }}
                        disabled={availableMonths.findIndex(month => month === selectedMonth) >= availableMonths.length - 1}
                        className="p-1 hover:bg-purple-100 dark:hover:bg-purple-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </button>
                      
                      <select 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="text-sm font-medium text-purple-700 dark:text-purple-300 bg-transparent border-none focus:outline-none"
                      >
                        {availableMonths.map(month => {
                          const [year, monthNum] = month.split('-');
                          const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' });
                          const monthCount = transfers.filter(tr => tr.date.substring(0, 7) === month).length;
                          return (
                            <option key={month} value={month}>
                              {monthName} ({monthCount})
                            </option>
                          );
                        })}
                      </select>
                      
                      <button
                        onClick={() => {
                          const currentIndex = availableMonths.findIndex(month => month === selectedMonth);
                          if (currentIndex > 0) {
                            setSelectedMonth(availableMonths[currentIndex - 1]);
                          }
                        }}
                        disabled={availableMonths.findIndex(month => month === selectedMonth) <= 0}
                        className="p-1 hover:bg-purple-100 dark:hover:bg-purple-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      {selectedTransfers.size > 0 ? 'Total Selecionado: ' : 'Total do Mês: '}
                    </span>
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{formatCurrency(totalTransferred)}</span>
                    <span className="text-xs text-blue-500 dark:text-blue-400 ml-1">
                      ({selectedTransfers.size > 0 ? selectedTransfers.size : sortedTransfers.length} registros)
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Transferência
                  </button>
                  
                  <button
                    onClick={() => setShowFilterModal(true)}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Filter className="w-4 h-4" />
                    Filtros
                    {filteredTransfers.length < baseFilteredTransfers.length && (
                      <span className="bg-gray-500 text-xs px-1.5 py-0.5 rounded-full">
                        {filteredTransfers.length}
                      </span>
                    )}
                  </button>


                </div>
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
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={selectedTransfers.size > 0 && selectedTransfers.size === sortedTransfers.length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
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
                      <input
                        type="checkbox"
                        checked={selectedTransfers.has(transfer.id)}
                        onChange={() => handleSelectTransfer(transfer.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
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
