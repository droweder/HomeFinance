import React, { createContext, useContext, useState, useEffect } from 'react';
import { CreditCard, CreditCardAdvance } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface CreditCardContextType {
  creditCards: CreditCard[];
  creditCardAdvances: CreditCardAdvance[];
  addCreditCard: (creditCard: Omit<CreditCard, 'id' | 'createdAt'>) => Promise<void>;
  addCreditCardAdvance: (advance: Omit<CreditCardAdvance, 'id'>) => Promise<void>;
  updateCreditCard: (id: string, creditCard: Partial<CreditCard>) => Promise<void>;
  updateCreditCardAdvance: (id: string, updates: Partial<CreditCardAdvance>) => Promise<void>;
  deleteCreditCard: (id: string) => Promise<void>;
  deleteCreditCardAdvance: (id: string) => Promise<void>;
  syncInvoiceToExpenses: (paymentMethod: string, targetDate: string) => Promise<void>;
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
      const date = new Date(targetDate + 'T00:00:00');
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
      
      console.log(`💳 Syncing invoice for ${paymentMethod} - ${monthKey}`);

      const monthCards = creditCards.filter(cc => {
        const ccDate = new Date(cc.date + 'T00:00:00');
        const ccMonthKey = `${ccDate.getFullYear()}-${(ccDate.getMonth() + 1).toString().padStart(2, '0')}`;
        return cc.paymentMethod === paymentMethod && ccMonthKey === monthKey;
      });

      let invoiceBalance = monthCards.reduce((sum, cc) => sum + cc.amount, 0);

      if (invoiceBalance <= 0) {
        console.log('No invoice balance to sync.');
      } else {
        const applicableAdvances = creditCardAdvances
          .filter(adv => adv.payment_method === paymentMethod && adv.remaining_amount > 0)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        for (const advance of applicableAdvances) {
          if (invoiceBalance <= 0) break;

          const amountToUse = Math.min(invoiceBalance, advance.remaining_amount);

          const newRemainingAmount = advance.remaining_amount - amountToUse;
          invoiceBalance -= amountToUse;

          await updateCreditCardAdvance(advance.id, { remaining_amount: newRemainingAmount });
        }
      }

      const finalInvoiceAmount = invoiceBalance;
      
      // Get month name in Portuguese
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const monthName = monthNames[month - 1];

      // Define invoice description and category
      const invoiceDescription = `Fatura ${paymentMethod} - ${monthName}/${year}`;
      const invoiceCategory = 'Cartão de Crédito';

      // Check if invoice already exists (try both old and new formats)
      const oldInvoiceDescription = `Fatura ${paymentMethod} - ${monthKey}`;
      
      let existingInvoices: any[] = [];
      let searchError: any = null;

      // First try to find with new format
      const { data: newFormatInvoices, error: newError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .eq('description', invoiceDescription)
        .limit(1);

      if (newError) {
        console.error('Error searching for new format invoice:', newError);
        return;
      }

      if (newFormatInvoices && newFormatInvoices.length > 0) {
        existingInvoices = newFormatInvoices;
      } else {
        // If not found, try old format
        const { data: oldFormatInvoices, error: oldError } = await supabase
          .from('expenses')
          .select('*')
          .eq('user_id', user.id)
          .eq('description', oldInvoiceDescription)
          .limit(1);

        if (oldError) {
          console.error('Error searching for old format invoice:', oldError);
          return;
        }

        if (oldFormatInvoices && oldFormatInvoices.length > 0) {
          existingInvoices = oldFormatInvoices;
        }
      }

      if (finalInvoiceAmount > 0) {
        // Use the same payment method and an average date from the card transactions
        const representativeCard = monthCards[Math.floor(monthCards.length / 2)]; // Get middle card as representative
        const invoicePaymentMethod = representativeCard?.paymentMethod || paymentMethod;
        const invoiceDate = representativeCard?.date || new Date(year, month, 0).toISOString().split('T')[0];

        if (existingInvoices && existingInvoices.length > 0) {
          // Update existing invoice with new format
          const { error: updateError } = await supabase
            .from('expenses')
            .update({
              amount: finalInvoiceAmount,
              date: invoiceDate,
              payment_method: invoicePaymentMethod,
              description: invoiceDescription, // Update to new format
            })
            .eq('id', existingInvoices[0].id);

          if (updateError) {
            console.error('Error updating invoice:', updateError);
          } else {
            console.log(`✅ Updated invoice: ${invoiceDescription} - R$ ${finalInvoiceAmount.toFixed(2)}`);
          }
        } else {
          // Create new invoice
          const { error: insertError } = await supabase
            .from('expenses')
            .insert([{
              date: invoiceDate,
              category: invoiceCategory,
              description: invoiceDescription,
              amount: finalInvoiceAmount,
              payment_method: invoicePaymentMethod,
              location: 'Fatura Automática',
              is_credit_card: false, // This is the invoice, not the individual purchase
              paid: false, // Invoice starts as unpaid
              user_id: user.id,
            }]);

          if (insertError) {
            console.error('Error creating invoice:', insertError);
          } else {
            console.log(`✅ Created invoice: ${invoiceDescription} - R$ ${finalInvoiceAmount.toFixed(2)}`);
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

      // Get all unique invoice periods (paymentMethod + month) and sort them chronologically.
      const invoicePeriods = [...new Set(creditCards.map(cc => {
        const date = new Date(cc.date + 'T00:00:00');
        return `${cc.paymentMethod}|${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      }))].sort((a, b) => {
        const dateA = new Date(a.split('|')[1]);
        const dateB = new Date(b.split('|')[1]);
        return dateA.getTime() - dateB.getTime();
      });

      console.log(`💳 Found ${invoicePeriods.length} unique invoice periods to sync.`);

      // Process each invoice period in chronological order.
      for (const period of invoicePeriods) {
        const [paymentMethod, monthKey] = period.split('|');
        
        const monthCards = creditCards.filter(cc => {
          const ccDate = new Date(cc.date + 'T00:00:00');
          const ccMonthKey = `${ccDate.getFullYear()}-${(ccDate.getMonth() + 1).toString().padStart(2, '0')}`;
          return cc.paymentMethod === paymentMethod && ccMonthKey === monthKey;
        });

        let invoiceBalance = monthCards.reduce((sum, cc) => sum + cc.amount, 0);

        if (invoiceBalance > 0) {
          // Find advances applicable to this payment method
          for (const advance of availableAdvances) {
            if (advance.payment_method === paymentMethod && advance.remaining_amount > 0) {
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

        // Get month name in Portuguese
        const [year, month] = monthKey.split('-');
        const monthNames = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        const monthName = monthNames[parseInt(month) - 1];
        
        const invoiceDescription = `Fatura ${paymentMethod} - ${monthName}/${year}`;
        
        try {
          // Check if invoice already exists (try both old and new formats)
          const oldInvoiceDescription = `Fatura ${paymentMethod} - ${monthKey}`;
          
          let existingInvoices: any[] = [];

          // First try to find with new format
          const { data: newFormatInvoices, error: newError } = await supabase
            .from('expenses')
            .select('*')
            .eq('user_id', user.id)
            .eq('description', invoiceDescription)
            .limit(1);

          if (newError) {
            console.error(`Error searching for new format invoice ${invoiceDescription}:`, newError);
            continue;
          }

          if (newFormatInvoices && newFormatInvoices.length > 0) {
            existingInvoices = newFormatInvoices;
          } else {
            // If not found, try old format
            const { data: oldFormatInvoices, error: oldError } = await supabase
              .from('expenses')
              .select('*')
              .eq('user_id', user.id)
              .eq('description', oldInvoiceDescription)
              .limit(1);

            if (oldError) {
              console.error(`Error searching for old format invoice ${oldInvoiceDescription}:`, oldError);
              continue;
            }

            if (oldFormatInvoices && oldFormatInvoices.length > 0) {
              existingInvoices = oldFormatInvoices;
            }
          }

          // Get representative card data for this group
          const groupCards = creditCards.filter(cc => {
            const ccDate = new Date(cc.date + 'T00:00:00');
            const ccMonthKey = `${ccDate.getFullYear()}-${(ccDate.getMonth() + 1).toString().padStart(2, '0')}`;
            return cc.paymentMethod === paymentMethod && ccMonthKey === monthKey;
          });
          
          const representativeCard = groupCards[Math.floor(groupCards.length / 2)]; // Get middle card as representative
          const invoicePaymentMethod = representativeCard?.paymentMethod || paymentMethod;
          const invoiceDate = representativeCard?.date || new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

          if (existingInvoices && existingInvoices.length > 0) {
            // Update existing invoice with new format
            const { error: updateError } = await supabase
              .from('expenses')
              .update({
                amount: finalTotal,
                date: invoiceDate,
                payment_method: invoicePaymentMethod,
                description: invoiceDescription, // Update to new format
              })
              .eq('id', existingInvoices[0].id);

            if (!updateError) {
              console.log(`✅ Updated: ${invoiceDescription} - R$ ${finalTotal.toFixed(2)}`);
              processed++;
            }
          } else if (finalTotal > 0) {
            // Create new invoice only if there's a positive balance
            const { error: insertError } = await supabase
              .from('expenses')
              .insert([{
                date: invoiceDate,
                category: 'Cartão de Crédito',
                description: invoiceDescription,
                amount: finalTotal,
                payment_method: invoicePaymentMethod,
                location: 'Fatura Automática',
                is_credit_card: false,
                paid: false,
                user_id: user.id,
              }]);

            if (!insertError) {
              console.log(`✅ Created: ${invoiceDescription} - R$ ${finalTotal.toFixed(2)}`);
              processed++;
            }
          }
        } catch (error) {
          console.error(`Error processing invoice ${invoiceDescription}:`, error);
        }
      }

      console.log(`🎉 Bulk sync completed! Processed ${processed} invoices from ${creditCards.length} credit card records`);
      
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

      const newAdvance: CreditCardAdvance = {
        id: data.id,
        user_id: data.user_id,
        payment_method: data.payment_method,
        amount: parseFloat(data.amount),
        date: data.date,
        remaining_amount: parseFloat(data.remaining_amount),
      };

      setCreditCardAdvances(prev => [newAdvance, ...prev]);
      console.log('Context: ✅ Credit card advance added to state');

      console.log("Context: Calling syncInvoiceToExpenses...");
      await syncInvoiceToExpenses(newAdvance.payment_method, newAdvance.date);
      console.log("Context: syncInvoiceToExpenses finished.");
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
      const { error } = await supabase
        .from('credit_card_advances')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      setCreditCardAdvances(prev => prev.filter(adv => adv.id !== id));

      // After deleting, we need to resync the invoice of the month the advance belonged to.
      await syncInvoiceToExpenses(advanceToDelete.payment_method, advanceToDelete.date);

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
        syncInvoiceToExpenses,
        syncAllInvoicesToExpenses,
        loading,
      }}
    >
      {children}
    </CreditCardContext.Provider>
  );
};