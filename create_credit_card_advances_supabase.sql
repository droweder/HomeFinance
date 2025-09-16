CREATE TABLE credit_card_advances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    payment_method TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    remaining_amount NUMERIC NOT NULL
);
