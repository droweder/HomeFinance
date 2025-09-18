import React, { createContext, useContext, useState, useEffect } from 'react';
import { CreditCard, CreditCardAdvance } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useFinance } from './FinanceContext';

interface CreditCardContextType {
  creditCards: CreditCard[];
  creditCardAdvances: CreditCardAdvance[];
  addCreditCard: (creditCard: Omit<CreditCard, 'id' | 'createdAt'>) => Promise<void>;
  addCreditCardAdvance: (advance: Omit<CreditCardAdvance, 'id'>) => Promise<void>;
  updateCreditCard: (id: string, creditCard: Partial<CreditCard>) => Promise<void>;
  updateCreditCardAdvance: (id: string, updates: Partial<CreditCardAdvance>) => Promise<void>;
  deleteCreditCard: (id: string) => Promise<void>;
  deleteCreditCardAdvance: (id: string) => Promise<void>;
  syncAllInvoicesToExpenses: () => Promise<void>;
  loading: boolean;
}

const CreditCardContext = createContext<CreditCardContextType | undefined>(undefined);

export const useCreditCard = () => {
  const context = useContext(CreditCardContext);
  if (!context) {
    throw new Error('useCreditCard must be used within a CreditCardProvider');
  }
  return context;
};

export const CreditCardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [creditCardAdvances, setCreditCardAdvances] = useState<CreditCardAdvance[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser: user } = useAuth();
  const { addExpense, deleteExpense: deleteExpenseFromFinance } = useFinance();

  const loadCreditCards = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('💳 Loading ALL credit cards...');
      
      let allCreditCards: CreditCard[] = [];
      let from = 0;
      const batchSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('cartao')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .range(from, from + batchSize - 1);

        if (error) {
          console.error('Erro ao carregar cartões de crédito:', error);
          break;
        }

        if (!data || data.length === 0) break;

        const formattedCreditCards = data.map(cc => ({
          id: cc.id,
          date: cc.date,
          category: cc.category,
          description: cc.description,
          amount: parseFloat(cc.amount),
          paymentMethod: cc.payment_method,
          location: cc.location,
          paid: cc.paid,
          isInstallment: cc.is_installment,
          installmentNumber: cc.installment_number,
          totalInstallments: cc.total_installments,
          installmentGroup: cc.installment_group,
          createdAt: cc.created_at,
        }));

        allCreditCards = [...allCreditCards, ...formattedCreditCards];
        console.log(`📦 Loaded batch: ${data.length} credit cards (total: ${allCreditCards.length})`);

        if (data.length < batchSize) break;
        from += batchSize;
      }

      console.log(`✅ ALL Credit Cards loaded: ${allCreditCards.length}`);
      setCreditCards(allCreditCards);

      // Load credit card advances
      const { data: advancesData, error: advancesError } = await supabase
        .from('credit_card_advances')
        .select('*')
        .eq('user_id', user.id);

      if (advancesError) {
        console.error('Erro ao carregar antecipações de cartão de crédito:', advancesError);
      } else {
        const formattedAdvances = advancesData.map(adv => ({
          id: adv.id,
          user_id: adv.user_id,
          payment_method: adv.payment_method,
          amount: parseFloat(adv.amount),
          date: adv.date,
          remaining_amount: parseFloat(adv.remaining_amount),
        }));
        setCreditCardAdvances(formattedAdvances);
        console.log(`✅ ALL Credit Card Advances loaded: ${formattedAdvances.length}`);
      }

    } catch (error) {
      console.error('Erro ao carregar dados do cartão de crédito:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCreditCards();
  }, [user]);

  const addCreditCard = async (creditCardData: Omit<CreditCard, 'id' | 'createdAt'>) => {
    if (!user) return;

    try {
      console.log('🔄 Tentativa 1/3 da operação Supabase');
      const { data, error } = await supabase
        .from('cartao')
        .insert([{
          date: creditCardData.date,
          category: creditCardData.category,
          description: creditCardData.description,
          amount: creditCardData.amount,
          payment_method: creditCardData.paymentMethod,
          location: creditCardData.location || null,
          paid: creditCardData.paid || false,
          is_installment: creditCardData.isInstallment || false,
          installment_number: creditCardData.installmentNumber || null,
          total_installments: creditCardData.totalInstallments || null,
          installment_group: creditCardData.installmentGroup || null,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      const newCreditCard: CreditCard = {
        id: data.id,
        date: data.date,
        category: data.category,
        description: data.description,
        amount: parseFloat(data.amount),
        paymentMethod: data.payment_method,
        location: data.location,
        paid: data.paid,
        isInstallment: data.is_installment,
        installmentNumber: data.installment_number,
        totalInstallments: data.total_installments,
        installmentGroup: data.installment_group,
        createdAt: data.created_at,
      };

      setCreditCards(prev => [newCreditCard, ...prev]);
      
      // Sync all invoices to ensure data integrity
      await syncAllInvoicesToExpenses();
      
      console.log('✅ Credit card added');
    } catch (error) {
      console.error('Erro ao adicionar cartão de crédito:', error);
      throw error;
    }
  };

  const updateCreditCard = async (id: string, updates: Partial<CreditCard>) => {
    if (!user) return;

    try {
      console.log('🔄 Tentativa 1/3 da operação Supabase');
      const updateData: any = {};
      
      if (updates.date !== undefined) updateData.date = updates.date;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod;
      if (updates.location !== undefined) updateData.location = updates.location;
      if (updates.paid !== undefined) updateData.paid = updates.paid;
      if (updates.isInstallment !== undefined) updateData.is_installment = updates.isInstallment;
      if (updates.installmentNumber !== undefined) updateData.installment_number = updates.installmentNumber;
      if (updates.totalInstallments !== undefined) updateData.total_installments = updates.totalInstallments;
      if (updates.installmentGroup !== undefined) updateData.installment_group = updates.installmentGroup;

      const { error } = await supabase
        .from('cartao')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setCreditCards(prev => prev.map(cc => 
        cc.id === id ? { ...cc, ...updates } : cc
      ));

      // Sync all invoices to ensure data integrity
      await syncAllInvoicesToExpenses();

      console.log('✅ Credit card updated');
    } catch (error) {
      console.error('Erro ao atualizar cartão de crédito:', error);
      throw error;
    }
  };

  const deleteCreditCard = async (id: string) => {
    if (!user) return;

    try {
      console.log('🔄 Tentativa 1/3 da operação Supabase');
      
      // Get the card before deleting to know which invoice to sync
      const cardToDelete = creditCards.find(cc => cc.id === id);
      
      const { error } = await supabase
        .from('cartao')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setCreditCards(prev => prev.filter(cc => cc.id !== id));
      
      // Sync all invoices to ensure data integrity
      await syncAllInvoicesToExpenses();
      
      console.log('✅ Credit card deleted');
    } catch (error) {
      console.error('Erro ao deletar cartão de crédito:', error);
      throw error;
    }
  };

  // Function to sync ALL existing credit card records to expenses as invoices
  const syncAllInvoicesToExpenses = async () => {
    if (!user) return;

    try {
      console.log('🔄 Starting bulk sync of ALL credit card invoices...');
      
      // Get all advances with a remaining balance, sorted by date.
      // Make a mutable copy to track remaining amounts during this bulk operation.
      let availableAdvances = creditCardAdvances
        .filter(adv => adv.remaining_amount > 0)
        .map(adv => ({ ...adv })) // Create shallow copies
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Get all unique invoices (paymentMethod + paymentDate) and sort them chronologically.
      const invoicePeriods = [...new Set(creditCards.map(cc => {
        return `${cc.paymentMethod}|${cc.date}`;
      }))].sort((a, b) => {
        const dateA = new Date(a.split('|')[1]);
        const dateB = new Date(b.split('|')[1]);
        return dateA.getTime() - dateB.getTime();
      });

      console.log(`💳 Found ${invoicePeriods.length} unique invoice periods to sync.`);

      // Process each invoice period in chronological order.
      for (const period of invoicePeriods) {
        const [paymentMethod, invoiceDateStr] = period.split('|');
        const invoiceDate = new Date(invoiceDateStr + 'T00:00:00');

        const monthCards = creditCards.filter(cc => {
          return cc.paymentMethod === paymentMethod && cc.date === invoiceDateStr;
        });

        let invoiceBalance = monthCards.reduce((sum, cc) => sum + cc.amount, 0);

        if (invoiceBalance > 0) {
          // Find advances applicable to this payment method
          for (const advance of availableAdvances) {
            const advanceDate = new Date(advance.date + 'T00:00:00');
            if (
              advance.payment_method === paymentMethod &&
              advance.remaining_amount > 0 &&
              advanceDate <= invoiceDate
            ) {
              if (invoiceBalance <= 0) break;

              const amountToUse = Math.min(invoiceBalance, advance.remaining_amount);

              // Update balances in our local, mutable copy
              advance.remaining_amount -= amountToUse;
              invoiceBalance -= amountToUse;

              // Persist the change to the database
              await updateCreditCardAdvance(advance.id, { remaining_amount: advance.remaining_amount });
            }
          }
        }

        const finalTotal = invoiceBalance;

        const [year, month, day] = invoiceDateStr.split('-');
        const monthNames = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        const monthName = monthNames[parseInt(month) - 1];
        
        const invoiceDescription = `Fatura ${paymentMethod.trim()} - Venc. ${day}/${month}/${year}`;
        
        try {
          // Check if an expense for this invoice already exists.
          const { data: existingInvoices, error: searchError } = await supabase
            .from('expenses')
            .select('*')
            .eq('user_id', user.id)
            .eq('description', invoiceDescription)
            .limit(1);

          if (searchError) {
            console.error(`Error searching for invoice ${invoiceDescription}:`, searchError);
            continue;
          }

          const groupCards = creditCards.filter(cc => cc.paymentMethod === paymentMethod && cc.date === invoiceDateStr);
          const representativeCard = groupCards[Math.floor(groupCards.length / 2)];
          const invoicePaymentMethod = representativeCard?.paymentMethod || paymentMethod;

          if (existingInvoices && existingInvoices.length > 0) {
            const existingInvoiceId = existingInvoices[0].id;
            if (finalTotal <= 0) {
              // Invoice is paid off, delete the expense.
              await deleteExpenseFromFinance(existingInvoiceId);
              console.log(`✅ Deleted zero-balance invoice: ${invoiceDescription}`);
            } else {
              // Invoice exists, update its amount.
              const { error: updateError } = await supabase
                .from('expenses')
                .update({
                  amount: finalTotal,
                  date: invoiceDateStr,
                  payment_method: invoicePaymentMethod,
                })
                .eq('id', existingInvoiceId);

              if (updateError) {
                console.error(`Error updating invoice ${invoiceDescription}:`, updateError);
              } else {
                console.log(`✅ Updated invoice: ${invoiceDescription} - R$ ${finalTotal.toFixed(2)}`);
              }
            }
          } else if (finalTotal > 0) {
            // No existing invoice, create a new one.
            await addExpense({
              date: invoiceDateStr,
              category: 'Cartão de Crédito',
              description: invoiceDescription,
              amount: finalTotal,
              paymentMethod: invoicePaymentMethod,
              location: 'Fatura Automática',
              isCreditCard: false,
              paid: false,
            });
            console.log(`✅ Created new invoice: ${invoiceDescription} - R$ ${finalTotal.toFixed(2)}`);
          }
        } catch (error) {
          console.error(`Error processing invoice ${invoiceDescription}:`, error);
        }
      }

      console.log(`🎉 Bulk sync completed!`);
      
    } catch (error) {
      console.error('Error in bulk sync:', error);
    }
  };

  const addCreditCardAdvance = async (advanceData: Omit<CreditCardAdvance, 'id'>) => {
    console.log("Context: addCreditCardAdvance called with:", advanceData);
    if (!user) {
      console.error("Context: User not authenticated.");
      throw new Error("User not authenticated.");
    }

    try {
      console.log("Context: Attempting to insert into Supabase...");
      const { data, error } = await supabase
        .from('credit_card_advances')
        .insert([{ ...advanceData, user_id: user.id }])
        .select()
        .single();

      console.log("Context: Supabase response:", { data, error });

      if (error) {
        console.error("Context: Supabase insert error:", error);
        throw error;
      }

      const expenseForAdvance = {
        date: advanceData.date,
        category: 'Adiantamento',
        description: `Adiantamento de Fatura ${advanceData.payment_method}`,
        amount: advanceData.amount,
        paymentMethod: advanceData.payment_method,
        paid: true,
        isCreditCard: false,
      };

      // Add the expense and get the created record
      const newExpense = await addExpense(expenseForAdvance);

      const { data: insertedAdvance, error: insertAdvanceError } = await supabase
        .from('credit_card_advances')
        .insert([{ ...advanceData, user_id: user.id, expense_id: newExpense.id }])
        .select()
        .single();

      if (insertAdvanceError) {
        console.error("Context: Supabase insert error:", insertAdvanceError);
        // Rollback the expense creation
        await deleteExpenseFromFinance(newExpense.id);
        throw insertAdvanceError;
      }

      const newAdvance: CreditCardAdvance = {
        id: insertedAdvance.id,
        user_id: insertedAdvance.user_id,
        payment_method: insertedAdvance.payment_method,
        amount: parseFloat(insertedAdvance.amount),
        date: insertedAdvance.date,
        remaining_amount: parseFloat(insertedAdvance.remaining_amount),
        expense_id: insertedAdvance.expense_id,
      };

      const newAdvances = [newAdvance, ...creditCardAdvances];
      setCreditCardAdvances(newAdvances);
      console.log('Context: ✅ Credit card advance added to state');

      console.log("Context: Calling syncAllInvoicesToExpenses after adding advance...");
      await syncAllInvoicesToExpenses();
      console.log("Context: syncAllInvoicesToExpenses finished.");
    } catch (error) {
      console.error('Context: Erro ao adicionar antecipação de cartão de crédito:', error);
      throw error;
    }
  };

  const updateCreditCardAdvance = async (id: string, updates: Partial<CreditCardAdvance>) => {
    console.log(`Context: updateCreditCardAdvance called for id: ${id} with updates:`, updates);
    if (!user) {
      console.error("Context: User not authenticated for update.");
      throw new Error("User not authenticated.");
    }

    try {
      console.log("Context: Attempting to update in Supabase...");
      const { error } = await supabase
        .from('credit_card_advances')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      console.log("Context: Supabase update response:", { error });

      if (error) {
        console.error("Context: Supabase update error:", error);
        throw error;
      }

      setCreditCardAdvances(prev =>
        prev.map(adv => (adv.id === id ? { ...adv, ...updates } : adv))
      );
      console.log('Context: ✅ Credit card advance updated in state');
    } catch (error) {
      console.error('Context: Erro ao atualizar antecipação de cartão de crédito:', error);
      throw error;
    }
  };

  const deleteCreditCardAdvance = async (id: string) => {
    if (!user) {
      throw new Error("User not authenticated.");
    }

    const advanceToDelete = creditCardAdvances.find(adv => adv.id === id);
    if (!advanceToDelete) {
      throw new Error("Advance not found.");
    }

    try {
      // First, delete the advance from the database
      const { error } = await supabase
        .from('credit_card_advances')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      // If the advance had a linked expense, delete it
      if (advanceToDelete.expense_id) {
        await deleteExpenseFromFinance(advanceToDelete.expense_id);
      }

      const newAdvances = creditCardAdvances.filter(adv => adv.id !== id);
      setCreditCardAdvances(newAdvances);

      // After deleting, we need to resync all invoices to ensure correctness.
      await syncAllInvoicesToExpenses();

    } catch (error) {
      console.error('Error deleting credit card advance:', error);
      throw error;
    }
  };

  return (
    <CreditCardContext.Provider
      value={{
        creditCards,
        creditCardAdvances,
        addCreditCard,
        addCreditCardAdvance,
        updateCreditCard,
        updateCreditCardAdvance,
        deleteCreditCard,
        deleteCreditCardAdvance,
        syncAllInvoicesToExpenses,
        loading,
      }}
    >
      {children}
    </CreditCardContext.Provider>
  );
};