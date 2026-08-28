-- Registar o gerador de imagens e vídeos no controlo de funcionalidades.
-- Activo por defeito para preservar o comportamento actual; o Master pode desligá-lo globalmente
-- ou definir uma sobreposição por utilizador no painel de funcionalidades.
INSERT INTO public.feature_flags_global (feature_key, enabled, label)
VALUES ('gerador-media', true, 'Geração de Imagens e Vídeos')
ON CONFLICT (feature_key) DO UPDATE
SET label = EXCLUDED.label;
