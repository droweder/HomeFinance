import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Calendar, CreditCard as CreditCardIcon, Filter, Search, X, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCreditCard } from '../context/CreditCardContext';
import { useSettings } from '../context/SettingsContext';
import { CreditCard } from '../types';
import CreditCardForm from './CreditCardForm';
import ConfirmDialog from './ConfirmDialog';

const CreditCardList: React.FC = () => {
  const { creditCards, deleteCreditCard } = useCreditCard();
  const { formatCurrency, formatDate, settings } = useSettings();
  const [showForm, setShowForm] = useState(false);
  const [editingCreditCard, setEditingCreditCard] = useState<CreditCard | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempFilters, setTempFilters] = useState({
    category: '',
    account: '',
    description: '',
    location: '',
    startDate: '',
    endDate: '',
    installmentGroup: '',
    groupInstallments: false,
    sortBy: [] as Array<{ column: string; direction: 'asc' | 'desc' }>
  });
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [confirmDeleteCard, setConfirmDeleteCard] = useState<CreditCard | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  // PERFORMANCE: First filter by selected month to reduce dataset
  const monthFilteredCards = useMemo(() => {
    return creditCards.filter(card => {
      const cardMonth = card.date.substring(0, 7); // YYYY-MM format
      return cardMonth === selectedMonth;
    });
  }, [creditCards, selectedMonth]);

  // Get available months for dropdown
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    creditCards.forEach(card => {
      const month = card.date.substring(0, 7);
      months.add(month);
    });
    return Array.from(months).sort().reverse(); // Most recent first
  }, [creditCards]);

  // Handle month changes with navigation
  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
  };

  const handleEditCard = (card: CreditCard) => {
    setEditingCreditCard(card);
    setShowForm(true);
  };

  const handleDeleteCard = async () => {
    if (confirmDeleteCard) {
      try {
        await deleteCreditCard(confirmDeleteCard.id);
        setConfirmDeleteCard(null);
      } catch (error) {
        console.error('Erro ao deletar cartão de crédito:', error);
      }
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCreditCard(null);
  };

  const handleSelectCard = (cardId: string) => {
    const newSelected = new Set(selectedCards);
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId);
    } else {
      newSelected.add(cardId);
    }
    setSelectedCards(newSelected);
  };

  const filteredCards = useMemo(() => {
    return monthFilteredCards.filter(card => {
      const matchesCategory = !tempFilters.category || card.category.toLowerCase().includes(tempFilters.category.toLowerCase());
      const matchesAccount = !tempFilters.account || card.paymentMethod.toLowerCase().includes(tempFilters.account.toLowerCase());
      const matchesDescription = !tempFilters.description || card.description.toLowerCase().includes(tempFilters.description.toLowerCase());
      const matchesLocation = !tempFilters.location || (card.location && card.location.toLowerCase().includes(tempFilters.location.toLowerCase()));
      
      const matchesDateRange = (!tempFilters.startDate || card.date >= tempFilters.startDate) &&
                               (!tempFilters.endDate || card.date <= tempFilters.endDate);

      return matchesCategory && matchesAccount && matchesDescription && matchesLocation && matchesDateRange;
    });
  }, [monthFilteredCards, tempFilters]);

  // Grouping logic for installments
  const groupedCards = useMemo(() => {
    if (!tempFilters.groupInstallments) return filteredCards;

    const grouped: CreditCard[] = [];
    const processedGroups = new Set<string>();

    filteredCards.forEach(card => {
      if (card.isInstallment && card.installmentGroup && !processedGroups.has(card.installmentGroup)) {
        // Find all cards in this installment group
        const groupCards = filteredCards.filter(c => 
          c.installmentGroup === card.installmentGroup
        ).sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0));

        if (groupCards.length > 1) {
          // Create group representative
          const representative: CreditCard = {
            ...groupCards[0],
            isGroupRepresentative: true,
            groupedExpenses: groupCards,
            totalGroupAmount: groupCards.reduce((sum, c) => sum + c.amount, 0),
            groupStartDate: groupCards[0].date,
            groupEndDate: groupCards[groupCards.length - 1].date,
            description: `${groupCards[0].description} (${groupCards.length}x)`,
          };
          grouped.push(representative);
          processedGroups.add(card.installmentGroup);
        } else {
          grouped.push(card);
        }
      } else if (!card.isInstallment || !processedGroups.has(card.installmentGroup || '')) {
        grouped.push(card);
      }
    });

    return grouped;
  }, [filteredCards, tempFilters.groupInstallments]);

  // Calculate totals
  const totals = useMemo(() => {
    const total = filteredCards.reduce((sum, card) => sum + card.amount, 0);
    const paid = filteredCards.filter(card => card.paid).reduce((sum, card) => sum + card.amount, 0);
    const pending = total - paid;
    
    return { total, paid, pending };
  }, [filteredCards]);

  const labels = {
    title: 'Cartão de Crédito',
    subtitle: 'Gerencie suas despesas de cartão de crédito',
    add: 'Adicionar Despesa',
    totalCards: 'Total em Cartões',
    paidCards: 'Pago',
    pendingCards: 'Pendente',
    filters: 'Filtros',
    category: 'Categoria',
    allCategories: 'Todas as Categorias',
    startDate: 'Data Inicial',
    endDate: 'Data Final',
    account: 'Cartão',
    allAccounts: 'Todos os Cartões',
    date: 'Data',
    amount: 'Valor',
    location: 'Local/Pessoa',
    description: 'Descrição',
    installments: 'Parcelas',
    actions: 'Ações',
    noRecords: 'Nenhuma despesa de cartão encontrada.',
    search: 'Buscar...',
    groupInstallments: 'Agrupar Parcelas',
    status: 'Status',
    paid: 'Pago',
    pending: 'Pendente',
  };

  // Sort and paginate results
  const sortedCards = useMemo(() => {
    let sorted = [...groupedCards];
    
    if (tempFilters.sortBy.length > 0) {
      sorted.sort((a, b) => {
        for (const sort of tempFilters.sortBy) {
          let aVal: any = a[sort.column as keyof CreditCard];
          let bVal: any = b[sort.column as keyof CreditCard];
          
          if (sort.column === 'amount') {
            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
          }
          
          if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return sorted;
  }, [groupedCards, tempFilters.sortBy]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const totalPages = Math.ceil(sortedCards.length / itemsPerPage);
  const paginatedCards = sortedCards.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 z-30 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-6">
          <div className="py-4">
            {/* Title and Add Button */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <CreditCardIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  {labels.title}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{labels.subtitle}</p>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-5 h-5" />
                {labels.add}
              </button>
            </div>

            {/* Filters and Navigation */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              {/* Month Navigation */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const currentIndex = availableMonths.findIndex(month => month === selectedMonth);
                      if (currentIndex < availableMonths.length - 1) {
                        handleMonthChange(availableMonths[currentIndex + 1]);
                      }
                    }}
                    disabled={availableMonths.findIndex(month => month === selectedMonth) >= availableMonths.length - 1}
                    className="p-1 hover:bg-purple-100 dark:hover:bg-purple-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </button>
                  
                  <select 
                    value={selectedMonth}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    className="text-sm font-medium text-purple-700 dark:text-purple-300 bg-transparent border-none focus:outline-none"
                  >
                    {availableMonths.map(month => {
                      const [year, monthNum] = month.split('-');
                      const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' });
                      const recordCount = creditCards.filter(card => card.date.substring(0, 7) === month).length;
                      return (
                        <option key={month} value={month}>
                          {monthName} ({recordCount})
                        </option>
                      );
                    })}
                  </select>
                  
                  <button
                    onClick={() => {
                      const currentIndex = availableMonths.findIndex(month => month === selectedMonth);
                      if (currentIndex > 0) {
                        handleMonthChange(availableMonths[currentIndex - 1]);
                      }
                    }}
                    disabled={availableMonths.findIndex(month => month === selectedMonth) <= 0}
                    className="p-1 hover:bg-purple-100 dark:hover:bg-purple-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </button>
                </div>
              </div>

              {/* Total Cards */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <CreditCardIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <div>
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">{labels.totalCards}: </span>
                    <span className="text-sm font-bold text-purple-700 dark:text-purple-300">{formatCurrency(totals.total)}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowFilterModal(true)}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Filter className="w-4 h-4" />
                  Filtros
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content with top margin to account for fixed header */}
      <div className="pt-32">
        {/* Credit Cards Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-250px)]">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 sticky top-0 z-20">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    {labels.date}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    {labels.category}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    {labels.description}
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">
                    {labels.amount}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    {labels.account}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    {labels.location}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    {labels.status}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    {labels.installments}
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">
                    {labels.actions}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedCards.map((card) => (
                  <tr key={card.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(card.date)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300">
                        {card.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      <div className="max-w-xs truncate" title={card.description}>
                        {card.description}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">
                      {card.isGroupRepresentative ? (
                        <div>
                          <div className="text-purple-600 dark:text-purple-400">
                            {formatCurrency(card.totalGroupAmount || 0)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {card.groupedExpenses?.length}x parcelas
                          </div>
                        </div>
                      ) : (
                        formatCurrency(card.amount)
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      {card.paymentMethod}
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                      {card.location || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        card.paid 
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                          : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
                      }`}>
                        {card.paid ? labels.paid : labels.pending}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                      {card.isInstallment ? (
                        card.isGroupRepresentative ? (
                          <span className="text-purple-600 dark:text-purple-400 font-medium">
                            {card.groupedExpenses?.length}x
                          </span>
                        ) : (
                          `${card.installmentNumber}/${card.totalInstallments}`
                        )
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditCard(card)}
                          className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteCard(card)}
                          className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {paginatedCards.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <CreditCardIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              {labels.noRecords}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, sortedCards.length)} de {sortedCards.length} registros
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Forms and Modals */}
      {showForm && (
        <CreditCardForm
          creditCard={editingCreditCard}
          onClose={handleCloseForm}
          onSave={() => setCurrentPage(1)}
        />
      )}

      {confirmDeleteCard && (
        <ConfirmDialog
          title="Confirmar Exclusão"
          message={`Tem certeza de que deseja excluir esta despesa de cartão de crédito: "${confirmDeleteCard.description}"?`}
          onConfirm={handleDeleteCard}
          onCancel={() => setConfirmDeleteCard(null)}
        />
      )}
    </div>
  );
};

export default CreditCardList;