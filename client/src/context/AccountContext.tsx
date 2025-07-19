import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Account } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { withSupabaseRetry } from '../utils/supabaseRetry';

interface AccountContextType {
  accounts: Account[];
  addAccount: (account: Omit<Account, 'id' | 'createdAt'>) => void;
  updateAccount: (id: string, account: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  isLoading: boolean;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const useAccounts = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccounts must be used within an AccountProvider');
  }
  return context;
};

interface AccountProviderProps {
  children: ReactNode;
}

export const AccountProvider: React.FC<AccountProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Buscar contas do Supabase quando o usuário estiver autenticado
  useEffect(() => {
    const fetchAccounts = async () => {
      if (!currentUser) {
        setAccounts([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const { data, error } = await withSupabaseRetry(() =>
          supabase
            .from('accounts')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: true })
        );

        if (error) {
          console.error('❌ Erro ao buscar contas:', error);
          setAccounts([]);
        } else {
          const mappedAccounts: Account[] = data.map(account => ({
            id: account.id,
            name: account.name,
            initialBalance: parseFloat(account.initial_balance.toString()),
            createdAt: account.created_at,
          }));
          setAccounts(mappedAccounts);
          console.log('✅ Contas carregadas:', mappedAccounts.length);
        }
      } catch (error) {
        console.error('❌ Erro ao buscar contas:', error);
        setAccounts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccounts();
  }, [currentUser]);

  const addAccount = async (account: Omit<Account, 'id' | 'createdAt'>) => {
    if (!currentUser) {
      console.error('❌ Usuário não autenticado');
      return;
    }

    try {
      const { data, error } = await withSupabaseRetry(() =>
        supabase
          .from('accounts')
          .insert({
            name: account.name,
            initial_balance: account.initialBalance,
            user_id: currentUser.id,
          })
          .select()
          .single()
      );

      if (error) {
        console.error('❌ Erro ao adicionar conta:', error);
        return;
      }

      const newAccount: Account = {
        id: data.id,
        name: data.name,
        initialBalance: parseFloat(data.initial_balance.toString()),
        createdAt: data.created_at,
      };

      setAccounts(prev => [...prev, newAccount]);
      console.log('✅ Conta adicionada:', newAccount.name);
    } catch (error) {
      console.error('❌ Erro ao adicionar conta:', error);
    }
  };

  const updateAccount = async (id: string, updatedAccount: Partial<Account>) => {
    if (!currentUser) {
      console.error('❌ Usuário não autenticado');
      return;
    }

    try {
      const updateData: any = {};
      if (updatedAccount.name !== undefined) updateData.name = updatedAccount.name;
      if (updatedAccount.initialBalance !== undefined) updateData.initial_balance = updatedAccount.initialBalance;

      const { error } = await withSupabaseRetry(() =>
        supabase
          .from('accounts')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', currentUser.id)
      );

      if (error) {
        console.error('❌ Erro ao atualizar conta:', error);
        return;
      }

      setAccounts(prev => prev.map(account => 
        account.id === id ? { ...account, ...updatedAccount } : account
      ));
      console.log('✅ Conta atualizada');
    } catch (error) {
      console.error('❌ Erro ao atualizar conta:', error);
    }
  };

  const deleteAccount = async (id: string) => {
    if (!currentUser) {
      console.error('❌ Usuário não autenticado');
      return;
    }

    try {
      const { error } = await withSupabaseRetry(() =>
        supabase
          .from('accounts')
          .delete()
          .eq('id', id)
          .eq('user_id', currentUser.id)
      );

      if (error) {
        console.error('❌ Erro ao deletar conta:', error);
        return;
      }

      setAccounts(prev => prev.filter(account => account.id !== id));
      console.log('✅ Conta deletada');
    } catch (error) {
      console.error('❌ Erro ao deletar conta:', error);
    }
  };

  return (
    <AccountContext.Provider
      value={{
        accounts,
        addAccount,
        updateAccount,
        deleteAccount,
        isLoading,
      }}
    >
      {isLoading ? (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Carregando contas...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AccountContext.Provider>
  );
};