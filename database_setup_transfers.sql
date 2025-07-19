-- Create transfers table in Supabase
-- Execute this SQL in the Supabase SQL Editor

-- Create the transfers table
CREATE TABLE IF NOT EXISTS public.transfers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    from_account TEXT NOT NULL,
    to_account TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure transfer is between different accounts
    CONSTRAINT different_accounts CHECK (from_account != to_account)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS transfers_user_id_idx ON public.transfers(user_id);
CREATE INDEX IF NOT EXISTS transfers_date_idx ON public.transfers(date);
CREATE INDEX IF NOT EXISTS transfers_from_account_idx ON public.transfers(from_account);
CREATE INDEX IF NOT EXISTS transfers_to_account_idx ON public.transfers(to_account);
CREATE INDEX IF NOT EXISTS transfers_created_at_idx ON public.transfers(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger
DROP TRIGGER IF EXISTS update_transfers_updated_at ON public.transfers;
CREATE TRIGGER update_transfers_updated_at
    BEFORE UPDATE ON public.transfers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own transfers
CREATE POLICY "Users can view own transfers" ON public.transfers
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own transfers
CREATE POLICY "Users can insert own transfers" ON public.transfers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own transfers
CREATE POLICY "Users can update own transfers" ON public.transfers
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own transfers
CREATE POLICY "Users can delete own transfers" ON public.transfers
    FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON public.transfers TO authenticated;
GRANT ALL ON public.transfers TO service_role;

-- Insert some sample data for testing (optional)
-- INSERT INTO public.transfers (user_id, date, amount, from_account, to_account, description)
-- VALUES 
--     (auth.uid(), CURRENT_DATE, 500.00, 'Conta Corrente', 'Poupança', 'Transferência para poupança'),
--     (auth.uid(), CURRENT_DATE - INTERVAL '1 day', 200.00, 'Carteira', 'Conta Corrente', 'Depósito em dinheiro');