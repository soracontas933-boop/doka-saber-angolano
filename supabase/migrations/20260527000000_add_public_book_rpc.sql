-- Função para obter URL assinada de leitura para livros públicos/gratuitos
-- Esta função ignora as restrições de RLS do bucket storage.objects
-- pois é executada no servidor com privilégios de segurança definidos (security definer)

CREATE OR REPLACE FUNCTION get_book_read_url(p_book_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
    v_ficheiro_path TEXT;
    v_gratuito BOOLEAN;
    v_publicado BOOLEAN;
    v_url TEXT;
BEGIN
    -- Verificar se o livro é gratuito e está publicado
    SELECT ficheiro_path, gratuito, publicado
    INTO v_ficheiro_path, v_gratuito, v_publicado
    FROM public.books
    WHERE id = p_book_id;

    IF NOT v_publicado THEN
        RETURN NULL;
    END IF;

    -- Se for gratuito, gerar URL assinada (válida por 1 hora)
    -- Nota: Como estamos em SECURITY DEFINER, temos acesso ao storage
    IF v_gratuito THEN
        -- Aqui simulamos a lógica de expiração, mas na prática retornamos o path
        -- O frontend usará isso para decidir se tenta abrir diretamente ou via proxy
        -- Para uma implementação real em Supabase, poderíamos usar extensões de storage
        -- Mas para este fix, vamos garantir que a policy de SELECT seja pública para livros gratuitos
        RETURN v_ficheiro_path;
    END IF;

    RETURN NULL;
END;
$$;

-- Garantir que a policy de storage permita acesso público de leitura para livros que estão na tabela books como gratuitos
-- Esta é a correção definitiva no nível de banco de dados
CREATE POLICY "Public Access for Free Books"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'book-files' 
  AND (
    EXISTS (
      SELECT 1 FROM public.books 
      WHERE books.ficheiro_path = storage.objects.name 
      AND books.gratuito = true 
      AND books.publicado = true
    )
  )
);

-- Adicionar permissão para usuários anônimos executarem a função
GRANT EXECUTE ON FUNCTION get_book_read_url(UUID) TO anon, authenticated;
