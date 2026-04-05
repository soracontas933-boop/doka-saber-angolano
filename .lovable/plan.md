

# Correcção: Resumos de PDF e Word Não Funcionam

## Problemas Identificados

Analisei o fluxo completo — `ResumoPage.tsx` → `ai-service.ts` → `ocr-extract` edge function — e encontrei 3 problemas:

### 1. Documentos Word (.doc/.docx) não são suportados pelo Gemini
O `ocr-extract` envia o ficheiro base64 como `inline_data` para o Gemini. O Gemini suporta PDF via `inline_data`, mas **não suporta** `.doc` nem `.docx`. A chamada falha silenciosamente ou devolve erro.

### 2. Groq Vision é excluído para documentos
Na linha 97 do `ocr-extract`, a condição `!is_document` exclui o Groq como fallback quando `is_document = true`. Se o Gemini falhar (429, quota, mime type inválido), **não há fallback nenhum**.

### 3. Só uma chave por serviço é usada
A função `getApiKeys()` faz `keys[row.servico] = row.chave` — se existem 6 chaves Gemini, só a última é usada. Se essa chave estiver em cooldown ou exausta, a extracção falha.

### 4. PDFs grandes excedem limites da edge function
Enviar um PDF de vários MB como base64 no corpo do request pode exceder o limite de 150MB de memória ou o timeout da edge function.

## Solução

### A. Extrair texto de Word no cliente (sem edge function)
- Instalar `mammoth` no frontend para `.docx`
- Extrair texto de Word **antes** de enviar ao AI — directamente no browser
- Elimina a dependência do Gemini para Word

### B. Rotação de chaves Gemini no `ocr-extract`
- Alterar `getApiKeys()` para devolver **todas** as chaves Gemini (array)
- Tentar cada chave Gemini em sequência até uma funcionar
- Se todas falharem, tentar Groq Vision (remover a exclusão `!is_document` para PDFs)

### C. Manter Gemini para PDFs, com fallback real
- PDFs funcionam via Gemini `inline_data` — manter esse caminho
- Adicionar Groq como fallback para PDFs (pode processar imagens de páginas)
- Adicionar logging para diagnosticar falhas futuras

## Ficheiros afectados

1. **`package.json`** — adicionar dependência `mammoth`
2. **`src/lib/ai-service.ts`** — `extractTextFromDocument()`:
   - Se `.docx`: usar mammoth no cliente, devolver texto directamente
   - Se `.pdf`: manter chamada ao `ocr-extract`
3. **`supabase/functions/ocr-extract/index.ts`**:
   - `getApiKeys()` → devolver array de chaves Gemini
   - Rodar por todas as chaves antes de falhar
   - Remover exclusão de Groq para documentos PDF

## Resultado
- Word (.docx) funciona sempre via extracção local (sem depender de API)
- PDFs usam todas as chaves Gemini disponíveis com fallback Groq
- Resumos de documentos voltam a funcionar de forma fiável

