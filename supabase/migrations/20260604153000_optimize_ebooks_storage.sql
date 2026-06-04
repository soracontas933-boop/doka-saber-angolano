-- 1. Criar o bucket 'ebooks' se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('ebooks', 'ebooks', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Configurar políticas de acesso para o storage
-- Permitir leitura pública
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'ebooks');

-- Permitir upload apenas para administradores (usando a função is_admin() já existente no projeto)
CREATE POLICY "Admin Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ebooks' AND (SELECT is_admin()));
CREATE POLICY "Admin Update" ON storage.objects FOR UPDATE USING (bucket_id = 'ebooks' AND (SELECT is_admin()));
CREATE POLICY "Admin Delete" ON storage.objects FOR DELETE USING (bucket_id = 'ebooks' AND (SELECT is_admin()));

-- 3. Criar a tabela 'ebooks' conforme solicitado
CREATE TABLE IF NOT EXISTS public.ebooks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    file_url text NOT NULL,
    cover_url text,
    category text,
    created_at timestamptz DEFAULT now()
);

-- 4. Habilitar RLS na tabela ebooks
ALTER TABLE public.ebooks ENABLE ROW LEVEL SECURITY;

-- 5. Políticas para a tabela ebooks
CREATE POLICY "ebooks_public_read" ON public.ebooks FOR SELECT USING (true);
CREATE POLICY "ebooks_admin_all" ON public.ebooks FOR ALL TO authenticated USING (is_admin());

-- 6. Sincronização entre 'ebooks' e 'books'
-- Para garantir que o frontend não quebre, vamos criar triggers que mantêm as duas tabelas sincronizadas
-- ou simplesmente garantir que a tabela 'books' tenha os mesmos campos necessários.

-- Adicionar trigger para manter 'ebooks' atualizada quando 'books' mudar
CREATE OR REPLACE FUNCTION sync_books_to_ebooks()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.ebooks (id, title, description, file_url, cover_url, category, created_at)
    VALUES (
        NEW.id, 
        NEW.titulo, 
        NEW.descricao, 
        NEW.ficheiro_path, 
        NEW.capa_url, 
        (SELECT nome FROM public.book_categories WHERE id = NEW.category_id),
        NEW.criado_em
    )
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        file_url = EXCLUDED.file_url,
        cover_url = EXCLUDED.cover_url,
        category = EXCLUDED.category;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_books_ebooks
AFTER INSERT OR UPDATE ON public.books
FOR EACH ROW EXECUTE FUNCTION sync_books_to_ebooks();

-- 7. Migração inicial de dados
INSERT INTO public.ebooks (id, title, description, file_url, cover_url, category, created_at)
SELECT 
    b.id, 
    b.titulo, 
    b.descricao, 
    b.ficheiro_path, 
    b.capa_url, 
    c.nome,
    b.criado_em
FROM public.books b
LEFT JOIN public.book_categories c ON b.category_id = c.id
ON CONFLICT (id) DO NOTHING;
