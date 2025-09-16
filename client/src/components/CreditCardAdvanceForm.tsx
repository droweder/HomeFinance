import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreditCard } from '@/context/CreditCardContext';
import { useAuth } from '@/context/AuthContext';
import { insertCreditCardAdvanceSchema } from '@shared/schema';
import { useSettings } from '@/context/SettingsContext';

const formSchema = insertCreditCardAdvanceSchema.omit({ user_id: true, id: true });

interface CreditCardAdvanceFormProps {
  onSuccess: () => void;
}

export function CreditCardAdvanceForm({ onSuccess }: CreditCardAdvanceFormProps) {
  const { creditCards, creditCardAdvances, addCreditCardAdvance } = useCreditCard();
  const { currentUser: user } = useAuth();
  const { formatCurrency, formatDate } = useSettings();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  // Get a unique list of credit card names (payment methods)
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;

    const advanceData = {
      ...values,
      user_id: user.id,
      remaining_amount: values.amount,
    };

    await addCreditCardAdvance(advanceData);
    form.reset();
    // Keep the selected card so the user can see the new advance in the list
  }

  return (
    <div className="p-1">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="payment_method" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Cartão de Crédito
            </Label>
            <Select
              onValueChange={(value) => {
                setSelectedCard(value);
                form.setValue('payment_method', value);
              }}
              value={form.watch('payment_method')}
            >
              <SelectTrigger className="mt-1 bg-white dark:bg-gray-700">
                <SelectValue placeholder="Selecione um cartão" />
              </SelectTrigger>
              <SelectContent>
                {uniqueCreditCards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount" className="text-sm font-medium text-gray-700 dark:text-gray-300">Valor da Antecipação</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              className="mt-1"
              {...form.register('amount', { valueAsNumber: true })}
            />
          </div>

          <div>
            <Label htmlFor="date" className="text-sm font-medium text-gray-700 dark:text-gray-300">Data</Label>
            <Input id="date" type="date" className="mt-1" {...form.register('date')} />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
            Adicionar Antecipação
          </Button>
        </div>
      </form>

      {selectedCard && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 border-b pb-2">
            Antecipações Existentes para: <span className="text-blue-600">{selectedCard}</span>
          </h3>
          <div className="max-h-60 overflow-y-auto rounded-lg border">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                <tr>
                  <th scope="col" className="px-6 py-3">Data</th>
                  <th scope="col" className="px-6 py-3 text-right">Valor Original</th>
                  <th scope="col" className="px-6 py-3 text-right">Saldo Remanescente</th>
                </tr>
              </thead>
              <tbody>
                {advances.length > 0 ? (
                  advances.map((advance) => (
                    <tr key={advance.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                      <td className="px-6 py-4">{formatDate(advance.date)}</td>
                      <td className="px-6 py-4 text-right">{formatCurrency(advance.amount)}</td>
                      <td className="px-6 py-4 text-right font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(advance.remaining_amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="text-center py-4 text-gray-500">
                      Nenhuma antecipação encontrada para este cartão.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
