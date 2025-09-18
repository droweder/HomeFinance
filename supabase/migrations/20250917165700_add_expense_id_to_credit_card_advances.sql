-- Add expense_id to credit_card_advances and link it to expenses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_card_advances' AND column_name = 'expense_id'
  ) THEN
    ALTER TABLE public.credit_card_advances
    ADD COLUMN expense_id UUID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'credit_card_advances_expense_id_fkey'
  ) THEN
    ALTER TABLE public.credit_card_advances
    ADD CONSTRAINT credit_card_advances_expense_id_fkey
    FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE SET NULL;
  END IF;
END $$;
