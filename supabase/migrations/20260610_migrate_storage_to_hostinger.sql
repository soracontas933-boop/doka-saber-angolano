-- Migração: Atualizar URLs do Storage do Supabase para Hostinger
-- Data: 2026-06-10
-- 
-- Esta migração atualiza os campos de URL nas tabelas para refletir as novas
-- URLs do armazenamento da Hostinger. As URLs antigas do Supabase serão
-- substituídas por URLs da Hostinger.
--
-- IMPORTANTE: Esta migração deve ser executada APÓS os arquivos serem
-- migrados para a Hostinger. Recomenda-se fazer um backup do banco de dados
-- antes de executar esta migração.

-- Função auxiliar para converter URLs do Supabase para Hostinger
CREATE OR REPLACE FUNCTION public.convert_supabase_url_to_hostinger(
  supabase_url text,
  bucket_name text
) RETURNS text AS $$
DECLARE
  v_file_path text;
  v_base_url text;
BEGIN
  -- Extrai o caminho do arquivo da URL do Supabase
  -- Exemplo: https://xxxx.supabase.co/storage/v1/object/public/ebooks/files/book-123.pdf
  -- Resultado: files/book-123.pdf
  
  IF supabase_url IS NULL OR supabase_url = '' THEN
    RETURN supabase_url;
  END IF;

  -- Verifica se é uma URL do Supabase
  IF supabase_url NOT LIKE '%supabase.co%' THEN
    RETURN supabase_url;
  END IF;

  -- Extrai o caminho após o bucket
  v_file_path := substring(supabase_url FROM position('/' || bucket_name || '/' in supabase_url) + length(bucket_name) + 2);
  
  IF v_file_path IS NULL OR v_file_path = '' THEN
    RETURN supabase_url;
  END IF;

  -- Determina a URL base baseado no bucket
  CASE bucket_name
    WHEN 'ebooks' THEN
      v_base_url := 'https://cdn.seu-dominio.com/storage/public'; -- Será substituído pela URL real
    WHEN 'book-covers' THEN
      v_base_url := 'https://cdn.seu-dominio.com/storage/public';
    WHEN 'book-files' THEN
      v_base_url := 'https://api.seu-dominio.com/storage/private';
    WHEN 'comprovativos' THEN
      v_base_url := 'https://api.seu-dominio.com/storage/private';
    WHEN 'button-covers' THEN
      v_base_url := 'https://cdn.seu-dominio.com/storage/public';
    WHEN 'hero-images' THEN
      v_base_url := 'https://cdn.seu-dominio.com/storage/public';
    WHEN 'landing-images' THEN
      v_base_url := 'https://cdn.seu-dominio.com/storage/public';
    WHEN 'avatars' THEN
      v_base_url := 'https://cdn.seu-dominio.com/storage/public';
    ELSE
      RETURN supabase_url;
  END CASE;

  RETURN v_base_url || '/' || v_file_path;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Atualizar capas de livros na tabela 'books'
-- Nota: Apenas atualiza URLs que começam com https://xxxx.supabase.co
UPDATE public.books
SET capa_url = public.convert_supabase_url_to_hostinger(capa_url, 'book-covers')
WHERE capa_url IS NOT NULL 
  AND capa_url LIKE '%supabase.co%'
  AND capa_url LIKE '%book-covers%';

-- Atualizar caminhos de arquivo na tabela 'books'
-- Para arquivos que começam com 'files/' (novo bucket 'ebooks')
UPDATE public.books
SET ficheiro_path = 'hostinger-private://ebooks/' || ficheiro_path
WHERE ficheiro_path IS NOT NULL
  AND ficheiro_path LIKE 'files/%'
  AND ficheiro_path NOT LIKE 'hostinger-private://%';

-- Para arquivos que começam com user_id/ (bucket 'book-files')
UPDATE public.books
SET ficheiro_path = 'hostinger-private://book-files/' || ficheiro_path
WHERE ficheiro_path IS NOT NULL
  AND ficheiro_path NOT LIKE 'files/%'
  AND ficheiro_path NOT LIKE 'hostinger-private://%'
  AND ficheiro_path LIKE '%/%'; -- Contém pelo menos um /

-- Atualizar URLs de capas de botões
UPDATE public.button_covers
SET image_url = public.convert_supabase_url_to_hostinger(image_url, 'button-covers')
WHERE image_url IS NOT NULL
  AND image_url LIKE '%supabase.co%';

-- Atualizar URLs de imagens de herói
UPDATE public.hero_images
SET url = public.convert_supabase_url_to_hostinger(url, 'hero-images')
WHERE url IS NOT NULL
  AND url LIKE '%supabase.co%';

-- Atualizar URLs de avatares
UPDATE public.profiles
SET avatar_url = public.convert_supabase_url_to_hostinger(avatar_url, 'avatars')
WHERE avatar_url IS NOT NULL
  AND avatar_url LIKE '%supabase.co%';

-- Criar uma tabela de log para rastrear as migrações
CREATE TABLE IF NOT EXISTS public.storage_migration_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela text NOT NULL,
  campo text NOT NULL,
  url_antiga text,
  url_nova text,
  migrado_em timestamptz DEFAULT now(),
  status text DEFAULT 'sucesso'
);

-- Registrar a migração
INSERT INTO public.storage_migration_log (tabela, campo, status)
VALUES 
  ('books', 'capa_url', 'sucesso'),
  ('books', 'ficheiro_path', 'sucesso'),
  ('button_covers', 'image_url', 'sucesso'),
  ('hero_images', 'url', 'sucesso'),
  ('profiles', 'avatar_url', 'sucesso');

-- Comentário final
COMMENT ON FUNCTION public.convert_supabase_url_to_hostinger(text, text) IS 
'Converte URLs do Supabase Storage para URLs da Hostinger. Útil durante a migração de storage.';
