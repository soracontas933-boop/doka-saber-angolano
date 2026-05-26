# Correção: Erro "could not find the slug column of books"

## Problema
Ao tentar publicar um livro no admin, aparece o erro:
```
could not find the "slug" column of "books" in the schema cache
```

## Causa Raiz
A migração SQL para adicionar a coluna `slug` à tabela `books` não foi executada no Supabase. Embora o arquivo de tipos TypeScript (`types.ts`) já contenha a coluna `slug`, o banco de dados ainda não a possui.

## Solução

### Passo 1: Acessar o Supabase Dashboard
1. Acesse https://app.supabase.com
2. Selecione o seu projeto
3. Vá para **SQL Editor** no menu lateral esquerdo

### Passo 2: Executar a Migração SQL
Copie e execute o seguinte SQL no Supabase SQL Editor:

```sql
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
```

### Passo 3: Verificar a Execução
Após executar o SQL:
1. Vá para **Table Editor** no menu lateral
2. Selecione a tabela `books`
3. Verifique se a coluna `slug` agora aparece na lista de colunas

### Passo 4: Limpar o Cache do Navegador
1. Abra o DevTools do navegador (F12)
2. Vá para **Application** > **Cache Storage**
3. Limpe o cache ou simplesmente faça um hard refresh (Ctrl+Shift+R ou Cmd+Shift+R)

### Passo 5: Testar a Publicação
Tente publicar um livro novamente no admin. O erro não deve mais aparecer.

## Arquivos Afetados
- `supabase/migrations/20260521000000_add_slug_to_books.sql` - Migração SQL (já existe)
- `src/integrations/supabase/types.ts` - Tipos TypeScript (já contém slug)
- `src/components/AdminLivrariaTab.tsx` - Componente que usa slug (já implementado)
- `src/pages/LivroDetalhePage.tsx` - Página de detalhes que busca por slug (já implementado)

## Notas Importantes
- A coluna `slug` é gerada automaticamente a partir do título do livro
- Slugs existentes serão atualizados quando você editar um livro
- O slug é único, portanto dois livros não podem ter o mesmo slug
- Se um slug for duplicado, o sistema adicionará um sufixo automático

## Suporte
Se o erro persistir após executar estes passos:
1. Verifique se a migração foi executada com sucesso no Supabase
2. Limpe o cache do navegador completamente
3. Faça logout e login novamente
4. Tente em um navegador diferente ou em modo incógnito
