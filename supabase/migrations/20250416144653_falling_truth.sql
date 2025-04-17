/*
  # Remove test_mode from api_keys table

  1. Changes
    - Remove the `test_mode` column from the `api_keys` table
    
  2. Reason
    - The `test_mode` setting should only be controlled by the bot, not at the API key level
    - Having it in both places creates confusion and potential conflicts
*/

-- Remove test_mode column from api_keys table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'test_mode'
  ) THEN
    ALTER TABLE api_keys DROP COLUMN test_mode;
  END IF;
END $$;