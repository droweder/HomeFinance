import React, { useState, useEffect } from 'react';
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
import { creditCardAdvancesApi } from '@/lib/api';
import { insertCreditCardAdvanceSchema } from '@shared/schema';
import type { CreditCardAdvance } from '@shared/schema';

const formSchema = insertCreditCardAdvanceSchema.omit({ user_id: true, id: true });

interface CreditCardAdvanceFormProps {
  onSuccess: () => void;
}

export function CreditCardAdvanceForm({ onSuccess }: CreditCardAdvanceFormProps) {
  const { creditCards, creditCardAdvances, addCreditCardAdvance } = useCreditCard();
  const { currentUser: user } = useAuth();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const advances = selectedCard
    ? creditCardAdvances.filter((adv) => adv.payment_method === selectedCard)
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
      remaining_amount: values.amount, // Set remaining amount to the full amount on creation
    };

    await addCreditCardAdvance(advanceData);
    form.reset();
    onSuccess();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="payment_method">Cartão de Crédito</Label>
        <Select
          onValueChange={(value) => {
            setSelectedCard(value);
            form.setValue('payment_method', value);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione um cartão" />
          </SelectTrigger>
          <SelectContent>
            {creditCards.map((card) => (
              <SelectItem key={card.id} value={card.id}>
                {card.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="amount">Valor</Label>
        <Input id="amount" type="number" {...form.register('amount', { valueAsNumber: true })} />
      </div>

      <div>
        <Label htmlFor="date">Data</Label>
        <Input id="date" type="date" {...form.register('date')} />
      </div>

      <Button type="submit">Adicionar</Button>

      {selectedCard && (
        <div>
          <h3 className="text-lg font-semibold">Antecipações Existentes</h3>
          <ul>
            {advances.map((advance) => (
              <li key={advance.id}>
                {advance.date}: R$ {advance.amount}
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
