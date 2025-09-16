import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreditCard } from '@/context/CreditCardContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/components/ui/toast';
import { insertCreditCardAdvanceSchema } from '@shared/schema';
import { X, CreditCard as CreditCardIcon } from 'lucide-react';

// Stricter validation schema
const formSchema = insertCreditCardAdvanceSchema.omit({ user_id: true, id: true }).extend({
  payment_method: z.string().min(1, { message: "Por favor, selecione um cartão." }),
  amount: z.number().gt(0, { message: "O valor da antecipação deve ser maior que zero." }),
});

interface CreditCardAdvanceFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreditCardAdvanceForm({ isOpen, onClose }: CreditCardAdvanceFormProps) {
  const { creditCards, creditCardAdvances, addCreditCardAdvance } = useCreditCard();
  const { currentUser: user } = useAuth();
  const { formatCurrency, formatDate } = useSettings();
  const { showSuccess, showError } = useToast();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const uniqueCreditCards = useMemo(() => {
    const cardNames = new Set(creditCards.map(card => card.paymentMethod));
    return Array.from(cardNames).map(name => ({ id: name, name: name }));
  }, [creditCards]);

  const advances = selectedCard
    ? creditCardAdvances
        .filter((adv) => adv.payment_method === selectedCard)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      payment_method: '',
      remaining_amount: 0,
    },
  });
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue, watch } = form;

  useEffect(() => {
    if (!isOpen) {
      reset({
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        payment_method: '',
        remaining_amount: 0,
      });
      setSelectedCard(null);
    }
  }, [isOpen, reset]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      showError("Erro de Autenticação", "Usuário não autenticado.");
      return;
    }
    try {
      const advanceData = {
        ...values,
        user_id: user.id,
        remaining_amount: values.amount,
      };
      await addCreditCardAdvance(advanceData);
      showSuccess("Antecipação Adicionada", `${formatCurrency(values.amount)} adicionado para o cartão ${values.payment_method}.`);
      onClose();
    } catch (error) {
      console.error("Failed to add credit card advance:", error);
      showError("Erro ao Salvar", "Ocorreu um erro inesperado ao salvar a antecipação.");
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 pb-4 z-10 flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Adicionar Antecipação de Fatura
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cartão de Crédito <span className="text-red-500">*</span>
              </label>
              <select
                {...register("payment_method")}
                onChange={(e) => {
                  setSelectedCard(e.target.value);
                  setValue('payment_method', e.target.value, { shouldValidate: true });
                }}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Selecione um cartão</option>
                {uniqueCreditCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </select>
              {errors.payment_method && <p className="text-sm text-red-500 mt-1">{errors.payment_method.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Valor <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                {...register('amount', { valueAsNumber: true })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              {errors.amount && <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('date')}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              {errors.date && <p className="text-sm text-red-500 mt-1">{errors.date.message}</p>}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isSubmitting ? "Salvando..." : "Adicionar Antecipação"}
            </button>
          </div>
        </form>

        {selectedCard && (
          <div className="mt-8 space-y-2 pt-4 border-t">
            <h3 className="text-md font-semibold flex items-center gap-2">
              <CreditCardIcon className="w-5 h-5 text-gray-500" />
              Antecipações em <span className="text-blue-600">{selectedCard}</span>
            </h3>
            <div className="max-h-48 overflow-y-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="py-2 px-4 text-left font-medium">Data</th>
                    <th className="py-2 px-4 text-right font-medium">Valor Original</th>
                    <th className="py-2 px-4 text-right font-medium">Saldo Remanescente</th>
                  </tr>
                </thead>
                <tbody>
                  {advances.length > 0 ? (
                    advances.map((advance) => (
                      <tr key={advance.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <td className="py-2 px-4">{formatDate(advance.date)}</td>
                        <td className="py-2 px-4 text-right">{formatCurrency(advance.amount)}</td>
                        <td className="py-2 px-4 text-right font-semibold text-green-600">
                          {formatCurrency(advance.remaining_amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-4 px-4 text-center text-gray-500">
                        Nenhuma antecipação encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
