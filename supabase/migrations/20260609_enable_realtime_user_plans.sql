-- Ativar realtime para user_plans para sincronização em tempo real
-- Isso garante que mudanças no saldo de créditos sejam notificadas ao frontend instantaneamente

-- Se a tabela já está em realtime, isso é um no-op
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.user_plans;

-- Comentário de auditoria
COMMENT ON TABLE public.user_plans IS 'Tabela de planos do utilizador com suporte a realtime para sincronização em tempo real de créditos. Atualizado em 2026-06-09 para ativar notificações realtime.';
