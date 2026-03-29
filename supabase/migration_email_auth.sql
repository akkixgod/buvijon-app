-- Миграция: переход с phone auth на email auth
-- Запусти в Supabase SQL Editor

-- 1. Добавляем email колонку если нет
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

-- 2. Снимаем NOT NULL с phone (телефон теперь необязателен)
ALTER TABLE public.profiles
  ALTER COLUMN phone DROP NOT NULL;

-- 3. Уникальный индекс по email
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_idx
  ON public.profiles(email)
  WHERE email IS NOT NULL;
