

## Plano: Contagem Diária de Tokens por IA no Dashboard

### Objectivo
Adicionar ao Dashboard admin uma secção dedicada que mostre o consumo de tokens por serviço de IA **por dia**, com renovação diária automática (contagem reseta visualmente a cada dia).

### O que será feito

**Ficheiro: `src/pages/Dashboard.tsx`**

1. **Novo card KPI "Tokens Hoje"** — mostra total de tokens consumidos hoje (todas as APIs somadas), ao lado dos KPIs existentes.

2. **Nova secção "Consumo Diário por IA"** — gráfico de barras empilhadas (StackedBarChart via Recharts) mostrando os últimos 14 dias, com cada serviço de IA como uma cor diferente. Isto permite ver quanto cada API consumiu por dia.

3. **Tabela resumo do dia actual** — lista cada serviço de IA com:
   - Tokens usados hoje
   - Número de gerações hoje
   - Permite estimar quantas gerações restam (baseado na média de tokens por geração)

### Alterações técnicas

- No `fetchData`, filtrar `usage_logs` por `criado_em` para agrupar por dia + serviço de IA
- Criar estrutura `dailyTokensByService`: array de `{ date, [servico]: tokens }` para o gráfico empilhado
- Criar `todaySummary`: array de `{ servico, tokens, geracoes }` para a tabela do dia
- Nenhuma migração de base de dados necessária — os dados já existem na tabela `usage_logs` com `servico_ia`, `tokens_usados` e `criado_em`

### Ficheiros a alterar
- `src/pages/Dashboard.tsx` — adicionar nova secção de gráficos e tabela

