import React, { createContext, useContext, useState, useEffect } from 'react';
import { CreditCard } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface CreditCardContextType {
  creditCards: CreditCard[];
  addCreditCard: (creditCard: Omit<CreditCard, 'id' | 'createdAt'>) => Promise<void>;
  updateCreditCard: (id: string, creditCard: Partial<CreditCard>) => Promise<void>;
  deleteCreditCard: (id: string) => Promise<void>;
  syncInvoiceToExpenses: (paymentMethod: string, targetDate: string) => Promise<void>;
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
  const [loading, setLoading] = useState(true);
  const { currentUser: user } = useAuth();

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
    } catch (error) {
      console.error('Erro ao carregar cartões de crédito:', error);
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
      
      // Sync invoice after adding
      await syncInvoiceToExpenses(newCreditCard.paymentMethod, newCreditCard.date);
      
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

      // Sync invoice after updating
      const updatedCard = creditCards.find(cc => cc.id === id);
      if (updatedCard) {
        await syncInvoiceToExpenses(updates.paymentMethod || updatedCard.paymentMethod, updates.date || updatedCard.date);
        
        // If payment method changed, also sync the old method
        if (updates.paymentMethod && updates.paymentMethod !== updatedCard.paymentMethod) {
          await syncInvoiceToExpenses(updatedCard.paymentMethod, updatedCard.date);
        }
      }

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
      
      // Sync invoice after deletion
      if (cardToDelete) {
        await syncInvoiceToExpenses(cardToDelete.paymentMethod, cardToDelete.date);
      }
      
      console.log('✅ Credit card deleted');
    } catch (error) {
      console.error('Erro ao deletar cartão de crédito:', error);
      throw error;
    }
  };

  // Function to sync credit card totals to expenses as invoices
  const syncInvoiceToExpenses = async (paymentMethod: string, targetDate: string) => {
    if (!user) return;

    try {
      // Extract year and month from target date
      const date = new Date(targetDate + 'T00:00:00');
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
      
      console.log(`💳 Syncing invoice for ${paymentMethod} - ${monthKey}`);

      // Calculate total for this card in this month
      const monthTotal = creditCards
        .filter(cc => {
          const ccDate = new Date(cc.date + 'T00:00:00');
          const ccMonthKey = `${ccDate.getFullYear()}-${(ccDate.getMonth() + 1).toString().padStart(2, '0')}`;
          return cc.paymentMethod === paymentMethod && ccMonthKey === monthKey;
        })
        .reduce((sum, cc) => sum + cc.amount, 0);

      // Define invoice description and category
      const invoiceDescription = `Fatura ${paymentMethod} - ${monthKey}`;
      const invoiceCategory = 'Cartão de Crédito';

      // Check if invoice already exists in expenses
      const { data: existingInvoices, error: searchError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .eq('description', invoiceDescription)
        .limit(1);

      if (searchError) {
        console.error('Error searching for existing invoice:', searchError);
        return;
      }

      if (monthTotal > 0) {
        // Create invoice date (last day of the month)
        const invoiceDate = new Date(year, month, 0).toISOString().split('T')[0];

        if (existingInvoices && existingInvoices.length > 0) {
          // Update existing invoice
          const { error: updateError } = await supabase
            .from('expenses')
            .update({
              amount: monthTotal,
              date: invoiceDate,
            })
            .eq('id', existingInvoices[0].id);

          if (updateError) {
            console.error('Error updating invoice:', updateError);
          } else {
            console.log(`✅ Updated invoice: ${invoiceDescription} - ${monthTotal}`);
          }
        } else {
          // Create new invoice
          const { error: insertError } = await supabase
            .from('expenses')
            .insert([{
              date: invoiceDate,
              category: invoiceCategory,
              description: invoiceDescription,
              amount: monthTotal,
              payment_method: 'Débito', // Default payment method for invoices
              location: 'Fatura Automática',
              is_credit_card: false, // This is the invoice, not the individual purchase
              paid: false, // Invoice starts as unpaid
              user_id: user.id,
            }]);

          if (insertError) {
            console.error('Error creating invoice:', insertError);
          } else {
            console.log(`✅ Created invoice: ${invoiceDescription} - ${monthTotal}`);
          }
        }
      } else {
        // If total is 0, delete existing invoice if it exists
        if (existingInvoices && existingInvoices.length > 0) {
          const { error: deleteError } = await supabase
            .from('expenses')
            .delete()
            .eq('id', existingInvoices[0].id);

          if (deleteError) {
            console.error('Error deleting empty invoice:', deleteError);
          } else {
            console.log(`✅ Deleted empty invoice: ${invoiceDescription}`);
          }
        }
      }
    } catch (error) {
      console.error('Error syncing invoice to expenses:', error);
    }
  };

  return (
    <CreditCardContext.Provider
      value={{
        creditCards,
        addCreditCard,
        updateCreditCard,
        deleteCreditCard,
        syncInvoiceToExpenses,
        loading,
      }}
    >
      {children}
    </CreditCardContext.Provider>
  );
};