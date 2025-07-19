import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mkgrfiucxjalsjadhrtr.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rZ3JmaXVjeGphbHNqYWRocnRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3NzQxMjEsImV4cCI6MjA2NzM1MDEyMX0.y6PENjggA1P3hALkyeTi2lMTB_Xict1_FVT6cnruT28';

// Verificar se as variáveis de ambiente estão configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Variáveis de ambiente do Supabase não configuradas:', {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey,
    urlValue: supabaseUrl ? 'Configurada' : 'Não configurada',
    keyValue: supabaseAnonKey ? 'Configurada' : 'Não configurada'
  });
  
  // Mostrar alerta para o usuário se estiver em produção
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    console.error('🚨 ERRO CRÍTICO: Variáveis do Supabase não configuradas em produção!');
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Database {
  public: {
    Tables: {
      expenses: {
        Row: {
          id: string;
          date: string;
          category: string;
          description: string;
          amount: number;
          payment_method: string;
          location: string | null;
          paid: boolean;
          is_installment: boolean;
          installment_number: number | null;
          total_installments: number | null;
          installment_group: string | null;
          due_date: string | null;
          is_credit_card: boolean;
          created_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          date: string;
          category: string;
          description: string;
          amount: number;
          payment_method: string;
          location?: string | null;
          paid?: boolean;
          is_installment?: boolean;
          installment_number?: number | null;
          total_installments?: number | null;
          installment_group?: string | null;
          due_date?: string | null;
          is_credit_card?: boolean;
          created_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          date?: string;
          category?: string;
          description?: string;
          amount?: number;
          payment_method?: string;
          location?: string | null;
          paid?: boolean;
          is_installment?: boolean;
          installment_number?: number | null;
          total_installments?: number | null;
          installment_group?: string | null;
          due_date?: string | null;
          is_credit_card?: boolean;
          created_at?: string;
          user_id?: string;
        };
      };
      income: {
        Row: {
          id: string;
          date: string;
          source: string;
          amount: number;
          notes: string;
          location: string | null;
          account: string | null;
          created_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          date: string;
          source: string;
          amount: number;
          notes: string;
          location?: string | null;
          account?: string | null;
          created_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          date?: string;
          source?: string;
          amount?: number;
          notes?: string;
          location?: string | null;
          account?: string | null;
          created_at?: string;
          user_id?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          type: 'income' | 'expense';
          created_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: 'income' | 'expense';
          created_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: 'income' | 'expense';
          created_at?: string;
          user_id?: string;
        };
      };
      accounts: {
        Row: {
          id: string;
          name: string;
          initial_balance: number;
          created_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          initial_balance: number;
          created_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          initial_balance?: number;
          created_at?: string;
          user_id?: string;
        };
      };
    };
  };
}