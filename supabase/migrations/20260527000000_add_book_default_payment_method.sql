-- Adicionar campo para armazenar o método de pagamento pré-definido do autor
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS metodo_pagamento_padrao uuid REFERENCES public.book_payout_methods(id) ON DELETE SET NULL;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_books_metodo_pagamento_padrao ON public.books(metodo_pagamento_padrao);

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.books.metodo_pagamento_padrao IS 'Método de pagamento pré-definido do autor, selecionado automaticamente no diálogo de pagamento do livro';
