/*
  # Add credit card column to income table

  1. Changes
    - Add `is_credit_card` boolean column to income table with default false
    - This allows tracking if income was received via credit card

  2. Security
    - No changes to RLS policies needed
*/

-- Add is_credit_card column to income table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'income' AND column_name = 'is_credit_card'
  ) THEN
    ALTER TABLE income ADD COLUMN is_credit_card boolean DEFAULT false;
  END IF;
END $$;