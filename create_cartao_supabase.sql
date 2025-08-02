-- Script para criar a tabela 'cartao' no Supabase
-- Execute este script no SQL Editor do Supabase

-- Criar a tabela cartao
CREATE TABLE IF NOT EXISTS public.cartao (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL,
    location TEXT,
    paid BOOLEAN DEFAULT false,
    is_installment BOOLEAN DEFAULT false,
    installment_number INTEGER,
    total_installments INTEGER,
    installment_group TEXT,
    is_refund BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_cartao_user_id ON public.cartao(user_id);
CREATE INDEX IF NOT EXISTS idx_cartao_date ON public.cartao(date);
CREATE INDEX IF NOT EXISTS idx_cartao_category ON public.cartao(category);
CREATE INDEX IF NOT EXISTS idx_cartao_payment_method ON public.cartao(payment_method);
CREATE INDEX IF NOT EXISTS idx_cartao_installment_group ON public.cartao(installment_group);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.cartao ENABLE ROW LEVEL SECURITY;

-- Criar políticas de RLS
CREATE POLICY "Users can view their own credit cards" ON public.cartao
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit cards" ON public.cartao
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit cards" ON public.cartao
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit cards" ON public.cartao
    FOR DELETE USING (auth.uid() = user_id);

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cartao_updated_at
    BEFORE UPDATE ON public.cartao
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();