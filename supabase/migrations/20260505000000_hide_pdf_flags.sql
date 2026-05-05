-- Adicionar flags para ocultar exportação em PDF
INSERT INTO public.feature_flags_global (feature_key, enabled, label) VALUES
  ('hide-pdf-trabalho', false, 'Ocultar PDF: Trabalho Escolar'),
  ('hide-pdf-resumo', false, 'Ocultar PDF: Resumo'),
  ('hide-pdf-plano-aula', false, 'Ocultar PDF: Plano de Aula'),
  ('hide-pdf-questionario', false, 'Ocultar PDF: Questionário')
ON CONFLICT (feature_key) DO UPDATE SET label = EXCLUDED.label;
