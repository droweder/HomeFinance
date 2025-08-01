import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Calendar, CreditCard as CreditCardIcon, Filter, Search, X, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCreditCard } from '../context/CreditCardContext';
import { useSettings } from '../context/SettingsContext';
import { CreditCard } from '../types';
import CreditCardForm from './CreditCardForm';
import ConfirmDialog from './ConfirmDialog';

const CreditCardList: React.FC = () => {
  const { creditCards, deleteCreditCard, syncAllInvoicesToExpenses } = useCreditCard();
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
  const [isSyncing, setIsSyncing] = useState(false);

  // Handler functions
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

  const handleSyncAllInvoices = async () => {
    setIsSyncing(true);
    try {
      await syncAllInvoicesToExpenses();
      console.log('✅ Todas as faturas foram sincronizadas com a aba Despesas!');
    } catch (error) {
      console.error('Erro ao sincronizar faturas:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEditCard = (card: CreditCard) => {
    setEditingCreditCard(card);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCreditCard(null);
  };
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

  // Sort results (no pagination - show all records from month)
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Fixed Header */}
        <div className="fixed top-16 left-0 right-0 z-30 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{labels.title}</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">{labels.subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Month Navigation */}
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const currentIndex = availableMonths.findIndex(month => month === selectedMonth);
                        if (currentIndex < availableMonths.length - 1) {
                          handleMonthChange(availableMonths[currentIndex + 1]);
                        }
                      }}
                      disabled={availableMonths.findIndex(month => month === selectedMonth) >= availableMonths.length - 1}
                      className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </button>
                    
                    <select 
                      value={selectedMonth}
                      onChange={(e) => handleMonthChange(e.target.value)}
                      className="text-sm font-medium text-blue-700 dark:text-blue-300 bg-transparent border-none focus:outline-none"
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
                      className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </button>
                  </div>
                </div>

                {/* Total integrado na barra superior */}
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div>
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                      Total do Mês: 
                    </span>
                    <span className="text-sm font-bold text-red-700 dark:text-red-300">
                      {formatCurrency(totals.total)}
                    </span>
                    <span className="text-xs text-red-500 dark:text-red-400 ml-1">
                      ({filteredCards.length} registros)
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSyncAllInvoices}
                    disabled={isSyncing}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm ${
                      isSyncing 
                        ? 'bg-gray-400 cursor-not-allowed text-white' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar Faturas'}
                  </button>

                  <button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Despesa
                  </button>
                  
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
                      {labels.installments}
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">
                      {labels.actions}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Group by Credit Card */}
                  {(() => {
                    const cardGroups = sortedCards.reduce((groups, card) => {
                      const cardName = card.paymentMethod;
                      if (!groups[cardName]) {
                        groups[cardName] = [];
                      }
                      groups[cardName].push(card);
                      return groups;
                    }, {} as Record<string, CreditCard[]>);

                    return Object.entries(cardGroups).map(([cardName, cards]) => {
                      return [
                        // Card Group Header
                        <tr key={`header-${cardName}`} className="bg-blue-50 dark:bg-blue-900/20">
                          <td colSpan={8} className="py-2 px-4 font-medium text-blue-900 dark:text-blue-100">
                            <div className="flex items-center gap-2">
                              <CreditCardIcon className="w-4 h-4" />
                              <span>{cardName}</span>
                              <span className="text-xs bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded-full">
                                {cards.length} {cards.length === 1 ? 'registro' : 'registros'}
                              </span>
                              <span className="text-xs bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded-full">
                                {formatCurrency(cards.reduce((sum, card) => sum + card.amount, 0))}
                              </span>
                            </div>
                          </td>
                        </tr>,
                        // Card Records
                        ...cards.map((card) => (
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
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                                {card.paymentMethod}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                              {card.location || '-'}
                            </td>
                            <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                              {card.isInstallment ? (
                                card.isGroupRepresentative ? (
                                  `${card.totalInstallments}x`
                                ) : (
                                  `${card.installmentNumber}/${card.totalInstallments}`
                                )
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEditCard(card)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors"
                                  title={card.isGroupRepresentative ? "Editar grupo de parcelas" : "Editar despesa"}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteCard(card)}
                                  className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
                                  title={card.isGroupRepresentative ? "Excluir grupo de parcelas" : "Excluir despesa"}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ];
                    }).flat();
                  })()}
                </tbody>
              </table>
            </div>
            
            {sortedCards.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {labels.noRecords}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Forms and Modals */}
      {showForm && (
        <CreditCardForm
          creditCard={editingCreditCard}
          onClose={handleCloseForm}
          onSave={() => {}}
        />
      )}

      <ConfirmDialog
        isOpen={!!confirmDeleteCard}
        onClose={() => setConfirmDeleteCard(null)}
        onConfirm={handleDeleteCard}
        title="Confirmar Exclusão"
        message={`Tem certeza de que deseja excluir esta despesa de cartão de crédito: "${confirmDeleteCard?.description || ''}"?`}
        type="danger"
        confirmText="Excluir"
        cancelText="Cancelar"
      />
    </div>
  );
};

export default CreditCardList;