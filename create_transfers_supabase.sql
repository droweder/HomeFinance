-- Create transfers table in Supabase
CREATE TABLE public.transfers (
    id bigserial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    from_account TEXT NOT NULL,
    to_account TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure transfer is between different accounts
    CONSTRAINT different_accounts CHECK (from_account != to_account)
);

-- Create indexes for better performance
CREATE INDEX transfers_user_id_idx ON public.transfers(user_id);
CREATE INDEX transfers_date_idx ON public.transfers(date);
CREATE INDEX transfers_from_account_idx ON public.transfers(from_account);
CREATE INDEX transfers_to_account_idx ON public.transfers(to_account);
CREATE INDEX transfers_created_at_idx ON public.transfers(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

-- Create policy to ensure users can only access their own transfers
CREATE POLICY "Users can only access their own transfers" ON public.transfers
FOR ALL USING (auth.uid() = user_id);

-- Create policy for inserting transfers
CREATE POLICY "Users can insert their own transfers" ON public.transfers
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy for updating transfers
CREATE POLICY "Users can update their own transfers" ON public.transfers
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create policy for deleting transfers
CREATE POLICY "Users can delete their own transfers" ON public.transfers
FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_transfers_updated_at
    BEFORE UPDATE ON public.transfers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
