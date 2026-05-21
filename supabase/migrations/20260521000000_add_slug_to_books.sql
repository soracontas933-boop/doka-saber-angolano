-- Adicionar coluna slug à tabela books
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Função para gerar slug
CREATE OR REPLACE FUNCTION generate_slug(title TEXT) RETURNS TEXT AS $$
DECLARE
    slug TEXT;
BEGIN
    slug := lower(title);
    slug := regexp_replace(slug, '[^a-z0-9\s-]', '', 'g');
    slug := regexp_replace(slug, '\s+', '-', 'g');
    slug := trim(both '-' from slug);
    RETURN slug;
END;
$$ LANGUAGE plpgsql;

-- Atualizar slugs existentes
UPDATE public.books SET slug = generate_slug(titulo) WHERE slug IS NULL;

-- Trigger para gerar slug automaticamente no insert/update
CREATE OR REPLACE FUNCTION books_generate_slug_trigger() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := generate_slug(NEW.titulo);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_books_generate_slug ON public.books;
CREATE TRIGGER trg_books_generate_slug
BEFORE INSERT OR UPDATE OF titulo ON public.books
FOR EACH ROW EXECUTE FUNCTION books_generate_slug_trigger();
