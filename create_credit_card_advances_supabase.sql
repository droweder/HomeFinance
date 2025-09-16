CREATE TABLE credit_card_advances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    payment_method TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    remaining_amount NUMERIC NOT NULL
);

-- Enable RLS for the table
ALTER TABLE public.credit_card_advances ENABLE ROW LEVEL SECURITY;

-- Create policy for SELECT
CREATE POLICY "Users can view their own credit card advances"
ON public.credit_card_advances FOR SELECT
USING (auth.uid() = user_id);

-- Create policy for INSERT
CREATE POLICY "Users can create their own credit card advances"
ON public.credit_card_advances FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create policy for UPDATE
CREATE POLICY "Users can update their own credit card advances"
ON public.credit_card_advances FOR UPDATE
USING (auth.uid() = user_id);

-- Create policy for DELETE
CREATE POLICY "Users can delete their own credit card advances"
ON public.credit_card_advances FOR DELETE
USING (auth.uid() = user_id);
