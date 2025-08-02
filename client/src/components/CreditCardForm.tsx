import React, { useState, useEffect } from 'react';
import { X, Calendar, CreditCard as CreditCardIcon, Plus, Minus } from 'lucide-react';
import { useCreditCard } from '../context/CreditCardContext';
import { useFinance } from '../context/FinanceContext';
import { useAccounts } from '../context/AccountContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from './ui/toast';
import type { CreditCard } from '../types/index';

interface CreditCardFormProps {
  creditCard?: CreditCard | null;
  refundData?: Partial<CreditCard> | null;
  onClose: () => void;
  onSave?: () => void;
  onAddRefund?: (refundData: Partial<CreditCard>) => void;
}

const getCurrentDateForInput = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateForInput = (dateStr: string) => {
  if (!dateStr) return getCurrentDateForInput();
  return dateStr;
};

const formatDateForStorage = (dateStr: string) => {
  return dateStr;
};

const CreditCardForm: React.FC<CreditCardFormProps> = ({ creditCard, refundData, onClose, onSave, onAddRefund }) => {
  const { addCreditCard, updateCreditCard } = useCreditCard();
  const { categories } = useFinance();
  const { accounts } = useAccounts();
  const { settings } = useSettings();
  const { showSuccess } = useToast();
  
  const [formData, setFormData] = useState({
    date: getCurrentDateForInput(),
    category: '',
    amount: '',
    account: '',
    description: '',
    location: '',
    isInstallment: false,
    totalInstallments: 1,
    isRefund: false,
  });

  const [installmentDates, setInstallmentDates] = useState<string[]>([]);

  // Função para adicionar extorno
  const handleAddRefund = () => {
    if (!creditCard || !onAddRefund) return;

    // Criar dados do extorno baseados no cartão original
    const refundData = {
      date: creditCard.date,
      category: creditCard.category,
      description: `Extorno - ${creditCard.description}`,
      amount: -Math.abs(creditCard.amount), // Valor negativo
      paymentMethod: creditCard.paymentMethod,
      location: creditCard.location,
      isRefund: true,
      isInstallment: false,
      installmentNumber: undefined,
      totalInstallments: undefined,
      installmentGroup: undefined,
    };

    // Fechar o modal atual
    onClose();

    // Chamar a função callback para abrir novo formulário
    onAddRefund(refundData);
  };

  useEffect(() => {
    if (creditCard) {
      console.log('🔧 Carregando cartão de crédito para edição:', creditCard);
      setFormData({
        date: formatDateForInput(creditCard.date),
        category: creditCard.category,
        amount: creditCard.amount.toString().replace('.', ','),
        account: creditCard.paymentMethod,
        description: creditCard.description,
        location: creditCard.location || '',
        isInstallment: creditCard.isInstallment || false,
        totalInstallments: creditCard.totalInstallments || 1,
        isRefund: creditCard.isRefund || false,
      });

      if (creditCard.isInstallment && creditCard.date) {
        setInstallmentDates([formatDateForInput(creditCard.date)]);
      }
    } else if (refundData) {
      console.log('🔧 Carregando dados de extorno:', refundData);
      setFormData({
        date: formatDateForInput(refundData.date || getCurrentDateForInput()),
        category: refundData.category || '',
        amount: Math.abs(refundData.amount || 0).toString().replace('.', ','), // Mostrar valor positivo no input
        account: refundData.paymentMethod || '',
        description: refundData.description || '',
        location: refundData.location || '',
        isInstallment: false, // Extornos nunca são parcelados
        totalInstallments: 1,
        isRefund: true, // Marcar como extorno por padrão
      });
    }
  }, [creditCard, refundData]);

  const handleAmountChange = (value: string) => {
    // Remove tudo que não é número ou vírgula
    const cleaned = value.replace(/[^\d,]/g, '');
    
    // Garante apenas uma vírgula
    const parts = cleaned.split(',');
    if (parts.length > 2) {
      return;
    }
    
    // Limita casas decimais a 2
    if (parts[1] && parts[1].length > 2) {
      parts[1] = parts[1].substring(0, 2);
    }
    
    const formatted = parts.join(',');
    setFormData({ ...formData, amount: formatted });
  };

  const handleInstallmentChange = (checked: boolean) => {
    setFormData({ ...formData, isInstallment: checked });
    
    if (checked) {
      // Initialize installment dates with current date
      const dates = Array.from({ length: formData.totalInstallments }, (_, i) => {
        const date = new Date(formData.date);
        date.setMonth(date.getMonth() + i);
        return date.toISOString().split('T')[0];
      });
      setInstallmentDates(dates);
    } else {
      setInstallmentDates([]);
    }
  };

  const updateInstallmentDates = (totalInstallments: number) => {
    const dates = Array.from({ length: totalInstallments }, (_, i) => {
      const date = new Date(formData.date);
      date.setMonth(date.getMonth() + i);
      return date.toISOString().split('T')[0];
    });
    setInstallmentDates(dates);
  };

  const updateInstallmentDate = (index: number, newDate: string) => {
    const updatedDates = [...installmentDates];
    updatedDates[index] = newDate;
    setInstallmentDates(updatedDates);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let baseAmount = parseFloat(formData.amount.replace(',', '.'));
    
    if (isNaN(baseAmount) || baseAmount === 0) {
      alert('Por favor, insira um valor válido');
      return;
    }

    // Se for extorno, tornar o valor negativo automaticamente
    if (formData.isRefund) {
      baseAmount = -Math.abs(baseAmount);
    } else {
      // Se não for extorno, garantir que seja positivo
      baseAmount = Math.abs(baseAmount);
    }

    console.log('💾 Salvando cartão de crédito:', { creditCard, formData, baseAmount, isRefund: formData.isRefund });

    if (creditCard) {
      // Editando cartão de crédito existente
      const creditCardData = {
        date: formatDateForStorage(formData.date),
        category: formData.category,
        description: formData.description,
        amount: baseAmount,
        paymentMethod: formData.account,
        location: formData.location,
        isRefund: formData.isRefund,
        // Preservar informações de parcelas se existirem (mas extornos não são parcelados)
        isInstallment: formData.isRefund ? false : creditCard.isInstallment,
        installmentNumber: formData.isRefund ? null : creditCard.installmentNumber,
        totalInstallments: formData.isRefund ? null : creditCard.totalInstallments,
        installmentGroup: formData.isRefund ? null : creditCard.installmentGroup,
      };

      console.log('✏️ Atualizando cartão de crédito:', creditCardData);
      try {
        await updateCreditCard(creditCard.id, creditCardData);
        console.log('✅ Cartão de crédito atualizado com sucesso');
        showSuccess(formData.isRefund ? 'Extorno atualizado com sucesso!' : 'Cartão de crédito atualizado com sucesso!');
        onSave?.();
        onClose();
      } catch (error: any) {
        console.error('❌ Erro ao atualizar cartão de crédito:', error);
        alert(`Erro ao atualizar cartão de crédito: ${error.message || 'Erro desconhecido'}`);
      }
    } else {
      // Criando novo cartão de crédito
      const installmentAmount = formData.isInstallment && !formData.isRefund ? baseAmount / formData.totalInstallments : baseAmount;

      if (formData.isInstallment && !formData.isRefund) {
        // Create multiple installments with clean descriptions (extornos não são parcelados)
        const installmentGroup = Date.now().toString();
        
        for (let i = 0; i < formData.totalInstallments; i++) {
          const creditCardData = {
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
            isRefund: false,
          };

          console.log(`📝 Criando parcela ${i + 1}/${formData.totalInstallments}:`, creditCardData);
          addCreditCard(creditCardData);
        }
      } else {
        // Single credit card expense or refund
        const creditCardData = {
          date: formatDateForStorage(formData.date),
          category: formData.category,
          description: formData.description,
          amount: baseAmount,
          paymentMethod: formData.account,
          location: formData.location,
          isInstallment: false,
          isRefund: formData.isRefund,
        };

        console.log('📝 Criando cartão de crédito único:', creditCardData);
        addCreditCard(creditCardData);
      }
    }

    onClose();
  };

  const expenseCategories = categories.filter(cat => cat.type === 'expense');

  const labels = {
    title: creditCard ? 'Editar Cartão de Crédito' : 'Adicionar Cartão de Crédito',
    date: 'Data',
    category: 'Categoria',
    amount: 'Valor (R$)',
    account: 'Cartão',
    description: 'Descrição',
    location: 'Local/Pessoa',
    installment: 'Parcelar esta despesa',
    installments: 'Número de Parcelas',
    dueDates: 'Datas de Vencimento das Parcelas',
    cancel: 'Cancelar',
    save: creditCard ? 'Atualizar' : 'Adicionar',
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
          {/* Informações da Parcela - Mostrar se for cartão de crédito parcelado */}
          {creditCard && creditCard.isInstallment && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {labels.installmentInfo}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-700 dark:text-blue-400">Parcela:</span>
                  <p className="text-blue-800 dark:text-blue-300">
                    {creditCard.installmentNumber} de {creditCard.totalInstallments}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-blue-700 dark:text-blue-400">Valor da Parcela:</span>
                  <p className="text-blue-800 dark:text-blue-300">
                    R$ {creditCard.amount.toFixed(2).replace('.', ',')}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-blue-700 dark:text-blue-400">Valor Total:</span>
                  <p className="text-blue-800 dark:text-blue-300">
                    R$ {((creditCard.amount || 0) * (creditCard.totalInstallments || 1)).toFixed(2).replace('.', ',')}
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
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
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
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
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
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                placeholder="0,00"
                required
              />
              {formData.isInstallment && formData.amount && (
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium">
                  {labels.perInstallment}: R$ {(parseFloat(formData.amount.replace(',', '.')) / formData.totalInstallments).toFixed(2).replace('.', ',')}
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
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Selecione um cartão</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.name}>{account.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {labels.description} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              placeholder="Descreva a despesa do cartão de crédito"
              rows={3}
              required
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
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              placeholder="Local ou pessoa (opcional)"
            />
          </div>

          {/* Checkbox para marcar como extorno */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="refund"
              checked={formData.isRefund}
              onChange={(e) => setFormData({ ...formData, isRefund: e.target.checked, isInstallment: e.target.checked ? false : formData.isInstallment })}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <label htmlFor="refund" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Marcar como extorno
            </label>
          </div>

          {/* Parcelamento - apenas para novos cartões e se não for extorno */}
          {!creditCard && !formData.isRefund && (
            <>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="installment"
                  checked={formData.isInstallment}
                  onChange={(e) => handleInstallmentChange(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="installment" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {labels.installment}
                </label>
              </div>

              {formData.isInstallment && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {labels.installments}
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const newTotal = Math.max(1, formData.totalInstallments - 1);
                          setFormData({ ...formData, totalInstallments: newTotal });
                          updateInstallmentDates(newTotal);
                        }}
                        className="p-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg min-w-[60px] text-center">
                        {formData.totalInstallments}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const newTotal = Math.min(60, formData.totalInstallments + 1);
                          setFormData({ ...formData, totalInstallments: newTotal });
                          updateInstallmentDates(newTotal);
                        }}
                        className="p-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {labels.dueDates}
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                      {installmentDates.map((date, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 min-w-[20px]">{index + 1}:</span>
                          <input
                            type="date"
                            value={date}
                            onChange={(e) => updateInstallmentDate(index, e.target.value)}
                            className="flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {labels.cancel}
            </button>
            {creditCard && (
              <button
                type="button"
                onClick={handleAddRefund}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Adicionar Extorno
              </button>
            )}
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {labels.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreditCardForm;