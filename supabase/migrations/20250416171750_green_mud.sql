/*
  # Remove test_mode from api_keys table

  1. Changes
     - Remove the test_mode column from the api_keys table
     - This column is redundant as we're using the test_mode from the bots table
     - This avoids confusion and potential conflicts
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'test_mode'
  ) THEN
    ALTER TABLE api_keys DROP COLUMN test_mode;
  END IF;
END $$;