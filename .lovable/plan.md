

## Plano: Citações e bibliografia verdadeiramente reais

### Problema raiz
Os modelos de IA usados (Llama 3.3, DeepSeek) inventam referências apesar das instruções no prompt dizerem "usa apenas referências reais". Modelos menores não conseguem distinguir obras reais de fictícias — é uma limitação conhecida.

### Solução: Base de referências reais embutida

Em vez de pedir à IA para "inventar referências reais" (contraditório), vamos fornecer uma base de dados de referências académicas reais por área temática, e forçar a IA a usar APENAS essas.

**1. Criar ficheiro de referências reais (`src/lib/referencias-reais.ts`)**
- Banco com ~80-100 referências reais organizadas por categoria (História, Geografia, Biologia, Matemática, Português, Filosofia, Direito, Educação, etc.)
- Cada referência inclui: autor, ano, título, editora, páginas exemplo
- Fontes verificáveis: Paulo Freire, Ki-Zerbo, Pepetela, Agostinho Neto, Henrique Abranches, Amílcar Cabral, UNESCO, MED Angola, etc.

**2. Alterar o fluxo de geração da bibliografia (`src/lib/ai-service.ts`)**
- O prompt de `bibliografia` recebe a lista de referências reais da categoria correspondente à disciplina
- A IA selecciona 5-8 referências da lista fornecida (não inventa)
- Se a disciplina não tiver correspondência exacta, usa referências de Educação geral

**3. Alterar prompts de subtemas (introdução, capítulos, conclusão)**
- Quando a bibliografia já foi gerada, as citações são extraídas dela (já funciona assim)
- Quando não há bibliografia, em vez do fallback genérico, injeta as referências reais da disciplina para a IA citar

**4. Adicionar validação pós-geração**
- Após gerar a bibliografia, cruza com o banco de referências reais
- Se detectar referências que não estão no banco, substitui por referências reais da mesma categoria

### Ficheiros a criar/alterar
- `src/lib/referencias-reais.ts` — novo, banco de referências verificáveis
- `src/lib/ai-service.ts` — prompts actualizados para injectar referências reais
- `src/pages/TrabalhoPage.tsx` — validação pós-geração da bibliografia

