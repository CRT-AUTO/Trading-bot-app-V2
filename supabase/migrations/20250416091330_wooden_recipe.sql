/*
  # Initial database schema for Trading Bot Platform

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `created_at` (timestamp)
    - `bots`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `name` (text)
      - `symbol` (text)
      - `default_quantity` (numeric)
      - `default_order_type` (text)
      - `default_side` (text)
      - `default_stop_loss` (numeric)
      - `default_take_profit` (numeric)
      - `test_mode` (boolean)
      - `status` (text)
      - `description` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `last_trade_at` (timestamp)
      - `trade_count` (integer)
      - `profit_loss` (numeric)
    - `webhooks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `bot_id` (uuid, foreign key)
      - `webhook_token` (text)
      - `expires_at` (timestamp)
      - `created_at` (timestamp)
    - `trades`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `bot_id` (uuid, foreign key)
      - `symbol` (text)
      - `side` (text)
      - `order_type` (text)
      - `quantity` (numeric)
      - `price` (numeric)
      - `order_id` (text)
      - `status` (text)
      - `created_at` (timestamp)
    - `api_keys`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `exchange` (text)
      - `api_key` (text)
      - `api_secret` (text)
      - `test_mode` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  2. Security
    - Enable RLS on all tables
    - Add policy for users to read/update their own data
*/

-- Create tables
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  symbol text NOT NULL,
  default_quantity numeric NOT NULL,
  default_order_type text NOT NULL,
  default_side text,
  default_stop_loss numeric,
  default_take_profit numeric,
  test_mode boolean DEFAULT true,
  status text DEFAULT 'paused',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  last_trade_at timestamptz,
  trade_count integer DEFAULT 0,
  profit_loss numeric DEFAULT 0
);

CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  bot_id uuid REFERENCES bots(id) ON DELETE CASCADE NOT NULL,
  webhook_token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  bot_id uuid REFERENCES bots(id) ON DELETE CASCADE NOT NULL,
  symbol text NOT NULL,
  side text NOT NULL,
  order_type text NOT NULL,
  quantity numeric NOT NULL,
  price numeric NOT NULL,
  order_id text NOT NULL,
  status text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  exchange text NOT NULL,
  api_key text NOT NULL,
  api_secret text NOT NULL,
  test_mode boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Enable row level security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users table policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Bots table policies
CREATE POLICY "Users can read own bots"
  ON bots
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bots"
  ON bots
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bots"
  ON bots
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bots"
  ON bots
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Webhooks table policies
CREATE POLICY "Users can read own webhooks"
  ON webhooks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own webhooks"
  ON webhooks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own webhooks"
  ON webhooks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trades table policies
CREATE POLICY "Users can read own trades"
  ON trades
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can create trades"
  ON trades
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- API keys table policies
CREATE POLICY "Users can read own API keys"
  ON api_keys
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own API keys"
  ON api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
  ON api_keys
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create user trigger to create profile
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at)
  VALUES (new.id, new.email, new.created_at);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();