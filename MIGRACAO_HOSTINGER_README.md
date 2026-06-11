# Guia de Implementação: Migração do Supabase Storage para Hostinger

## Visão Geral

Este guia detalha os passos para implementar a migração do Supabase Storage para a Hostinger, reduzindo o consumo de egress e otimizando custos.

## Arquivos Criados

Durante a análise e planejamento, foram criados os seguintes arquivos:

### 1. Configuração
- **`.env.hostinger.example`**: Exemplo de variáveis de ambiente para a Hostinger

### 2. Serviços e Bibliotecas
- **`src/lib/hostinger-storage.ts`**: Serviço principal para gerenciar armazenamento da Hostinger
- **`src/lib/ebook-storage-hostinger.ts`**: Versão adaptada do ebook-storage.ts para Hostinger

### 3. Backend
- **`supabase/functions/hostinger-proxy/index.ts`**: Edge Function para proxy de URLs assinadas

### 4. Banco de Dados
- **`supabase/migrations/20260610_migrate_storage_to_hostinger.sql`**: Migração SQL para atualizar URLs

### 5. Scripts
- **`scripts/migrate_storage.py`**: Script Python para migrar arquivos

## Plano de Implementação

### Fase 1: Preparação (1-2 dias)

1. **Configurar Hostinger Storage**
   - Criar buckets: `doka-public` e `doka-private`
   - Configurar permissões de acesso
   - Obter credenciais de API

2. **Configurar CDN (Opcional)**
   - Integrar CDN com bucket público
   - Configurar cache e compressão

3. **Configurar Variáveis de Ambiente**
   ```bash
   cp .env.hostinger.example .env.hostinger
   # Editar com valores reais da Hostinger
   ```

### Fase 2: Desenvolvimento (2-3 dias)

1. **Implementar Edge Function**
   - Fazer deploy da função `hostinger-proxy`
   - Testar autenticação e autorização
   - Testar geração de URLs assinadas

2. **Testar Serviço Hostinger**
   - Testar `getPublicUrl()` para arquivos públicos
   - Testar `getSignedUrl()` para arquivos privados
   - Testar compatibilidade com código existente

3. **Preparar Componentes para Migração**
   - Revisar componentes que usam `supabase.storage`
   - Preparar adaptações necessárias

### Fase 3: Migração de Dados (1 dia)

1. **Executar Script de Migração**
   ```bash
   python3 scripts/migrate_storage.py \
     --supabase-url "https://xxxx.supabase.co" \
     --supabase-key "eyJhbGc..." \
     --hostinger-url "https://api.hostinger.com" \
     --hostinger-key "seu-token-aqui"
   ```

2. **Verificar Integridade**
   - Validar que todos os arquivos foram migrados
   - Verificar permissões de acesso
   - Comparar checksums (se disponível)

3. **Atualizar Banco de Dados**
   - Executar migração SQL
   - Verificar que URLs foram atualizadas corretamente

### Fase 4: Adaptação de Código (1-2 dias)

1. **Atualizar Componentes Frontend**
   
   **Antes (Supabase):**
   ```typescript
   const { data: urlData } = supabase.storage.from("ebooks").getPublicUrl(filePath);
   const publicUrl = urlData.publicUrl;
   ```
   
   **Depois (Hostinger):**
   ```typescript
   import { createHostingerStorageClient } from "@/lib/hostinger-storage";
   
   const client = createHostingerStorageClient("ebooks");
   const { data: urlData } = client.getPublicUrl(filePath);
   const publicUrl = urlData.publicUrl;
   ```

2. **Atualizar URLs Assinadas**
   
   **Antes (Supabase):**
   ```typescript
   const { data, error } = await supabase.storage
     .from("book-files")
     .createSignedUrl(filePath, 300);
   ```
   
   **Depois (Hostinger):**
   ```typescript
   import { getSignedUrl } from "@/lib/hostinger-storage";
   
   const result = await getSignedUrl("book-files", filePath, 300);
   if (result.success) {
     const signedUrl = result.signedUrl;
   }
   ```

3. **Componentes Principais a Atualizar**
   - `src/pages/LivroDetalhePage.tsx`
   - `src/components/biblioteca/MeusLivrosTab.tsx`
   - `src/components/AdminLivrariaTab.tsx`
   - `src/components/AdminPaymentsTab.tsx`
   - `src/components/AdminHeroTab.tsx`
   - `src/components/AdminButtonCoversTab.tsx`
   - `src/pages/SettingsPage.tsx`

### Fase 5: Testes (1-2 dias)

1. **Testes Funcionais**
   - Testar download de PDFs
   - Testar visualização de capas
   - Testar upload de novos arquivos
   - Testar permissões de acesso

2. **Testes de Performance**
   - Comparar latência Supabase vs Hostinger
   - Medir velocidade de download
   - Verificar impacto no CDN

3. **Testes de Segurança**
   - Verificar que URLs assinadas expiram
   - Testar acesso não autorizado
   - Validar autenticação

### Fase 6: Deploy (1 dia)

1. **Deploy em Staging**
   - Fazer deploy de todas as mudanças
   - Executar testes completos
   - Coletar feedback

2. **Deploy em Produção**
   - Fazer backup do Supabase Storage
   - Fazer deploy gradual (canary deployment)
   - Monitorar logs e métricas
   - Manter Supabase como fallback por 1-2 semanas

3. **Cleanup**
   - Desabilitar Supabase Storage após confirmar estabilidade
   - Deletar dados antigos do Supabase
   - Atualizar documentação

## Estratégia de Rollback

Se algo der errado durante a migração:

1. **Rollback Imediato**
   - Reverter código para usar Supabase Storage
   - Restaurar banco de dados do backup

2. **Investigação**
   - Analisar logs de erro
   - Identificar causa raiz
   - Corrigir problema

3. **Retry**
   - Planejar nova tentativa
   - Executar com mais cuidado

## Monitoramento

Após a migração, monitorar:

1. **Métricas de Performance**
   - Latência de download
   - Taxa de erro
   - Uso de bandwidth

2. **Custos**
   - Egress do Supabase (deve diminuir)
   - Custos da Hostinger
   - ROI da migração

3. **Alertas**
   - Configurar alertas para erros de acesso
   - Monitorar taxa de erro de URLs assinadas
   - Alertar sobre uso anormal de bandwidth

## Troubleshooting

### Problema: URLs assinadas expiram muito rápido
**Solução**: Aumentar `expirationSeconds` na chamada `getSignedUrl()`

### Problema: Permissões não funcionam corretamente
**Solução**: Verificar lógica de autorização na Edge Function `hostinger-proxy`

### Problema: Arquivos não aparecem após migração
**Solução**: Verificar que URLs foram atualizadas no banco de dados

### Problema: Performance pior que Supabase
**Solução**: 
- Verificar configuração de CDN
- Otimizar tamanho de imagens
- Considerar cache no frontend

## Próximos Passos

1. Revisar este guia com a equipe
2. Configurar Hostinger Storage
3. Fazer deploy da Edge Function
4. Executar testes em staging
5. Agendar migração em produção

## Contato e Suporte

Para dúvidas ou problemas, consultar:
- Documentação da Hostinger: https://www.hostinger.com/
- Documentação do Supabase: https://supabase.com/docs
- Logs da Edge Function: Dashboard do Supabase → Functions

---

**Autor**: Manus AI
**Data**: 10 de Junho de 2026
**Status**: Pronto para implementação
