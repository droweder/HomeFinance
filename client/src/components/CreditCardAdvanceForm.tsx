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
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/components/ui/toast';
import { insertCreditCardAdvanceSchema } from '@shared/schema';

// Stricter validation schema
const formSchema = insertCreditCardAdvanceSchema.omit({ user_id: true, id: true }).extend({
  payment_method: z.string().min(1, { message: "Por favor, selecione um cartão." }),
  amount: z.number().gt(0, { message: "O valor da antecipação deve ser maior que zero." }),
});

interface CreditCardAdvanceFormProps {
  onSuccess: () => void;
}

export function CreditCardAdvanceForm({ onSuccess }: CreditCardAdvanceFormProps) {
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
  const { formState: { errors, isSubmitting } } = form;

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
      onSuccess(); // Close modal on success
    } catch (error) {
      console.error("Failed to add credit card advance:", error);
      showError("Erro ao Salvar", "Ocorreu um erro inesperado. Verifique o console para mais detalhes.");
    }
  }

  return (
    <div className="flex flex-col space-y-6">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Card Selection */}
        <div>
          <Label htmlFor="payment_method">Cartão de Crédito</Label>
          <Select
            onValueChange={(value) => {
              setSelectedCard(value);
              form.setValue('payment_method', value, { shouldValidate: true });
            }}
            value={form.watch('payment_method')}
          >
            <SelectTrigger className="mt-1">
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
          {errors.payment_method && <p className="text-sm text-red-500 mt-1">{errors.payment_method.message}</p>}
        </div>

        {/* Amount and Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              className="mt-1"
              {...form.register('amount', { valueAsNumber: true })}
            />
            {errors.amount && <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <Label htmlFor="date">Data</Label>
            <Input id="date" type="date" className="mt-1" {...form.register('date')} />
            {errors.date && <p className="text-sm text-red-500 mt-1">{errors.date.message}</p>}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Adicionar Antecipação"}
          </Button>
        </div>
      </form>

      {/* Existing Advances Table */}
      {selectedCard && (
        <div className="space-y-2 pt-4 border-t">
          <h3 className="text-md font-semibold">Antecipações Existentes em <span className="text-blue-600">{selectedCard}</span></h3>
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
  );
}
