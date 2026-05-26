-- Migração para corrigir a coluna slug na tabela books
-- Esta migração garante que a coluna slug existe e está configurada corretamente

-- Passo 1: Adicionar coluna slug se não existir
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS slug TEXT;

-- Passo 2: Remover constraint UNIQUE anterior se existir (para evitar conflitos)
ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_slug_key;

-- Passo 3: Função para gerar slug a partir do título
CREATE OR REPLACE FUNCTION generate_slug(title TEXT) RETURNS TEXT AS $$
DECLARE
    slug TEXT;
    counter INTEGER := 1;
    base_slug TEXT;
BEGIN
    -- Gerar slug base
    slug := lower(title);
    slug := regexp_replace(slug, '[^a-z0-9\s-]', '', 'g');
    slug := regexp_replace(slug, '\s+', '-', 'g');
    slug := trim(both '-' from slug);
    
    -- Se vazio, usar ID como fallback
    IF slug = '' OR slug IS NULL THEN
        RETURN 'livro-' || gen_random_uuid()::text;
    END IF;
    
    base_slug := slug;
    
    -- Verificar se slug já existe e adicionar sufixo se necessário
    WHILE EXISTS(SELECT 1 FROM public.books WHERE books.slug = slug AND books.titulo != title) LOOP
        slug := base_slug || '-' || counter;
        counter := counter + 1;
    END LOOP;
    
    RETURN slug;
END;
$$ LANGUAGE plpgsql;

-- Passo 4: Atualizar slugs NULL existentes
UPDATE public.books 
SET slug = generate_slug(titulo) 
WHERE slug IS NULL OR slug = '';

-- Passo 5: Adicionar constraint UNIQUE na coluna slug
ALTER TABLE public.books ADD CONSTRAINT books_slug_key UNIQUE (slug);

-- Passo 6: Trigger para gerar slug automaticamente
CREATE OR REPLACE FUNCTION books_generate_slug_trigger() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := generate_slug(NEW.titulo);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Passo 7: Recriar trigger
DROP TRIGGER IF EXISTS trg_books_generate_slug ON public.books;
CREATE TRIGGER trg_books_generate_slug
BEFORE INSERT OR UPDATE ON public.books
FOR EACH ROW EXECUTE FUNCTION books_generate_slug_trigger();

-- Passo 8: Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_books_slug ON public.books(slug);
