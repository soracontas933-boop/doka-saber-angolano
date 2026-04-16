# Plano para o Editor Visual Completo

## 1. Análise da Estrutura Existente

O projeto `doka-saber-angolano` já possui um CMS para landing pages construído com React, TypeScript, TailwindCSS e Supabase. A estrutura atual permite a criação e edição de seções dinâmicas (`landing_sections`) e blocos de elementos (`ElementBlock`) dentro dessas seções. As funcionalidades existentes incluem:

*   **Gerenciamento de Seções**: Reordenação, ativação/desativação e edição de seções via `AdminLandingTab.tsx`.
*   **Tipos de Blocos**: Suporte para `text`, `image`, `video` e `button`.
*   **Estilização Básica de Blocos**: Posição (x, y), largura, `zIndex`, `fontSize`, `textAlign`.
*   **Animações de Entrada**: `fade-up`, `fade-in`, `zoom-in`, `slide-left`, `slide-right` via `framer-motion`.
*   **Upload de Imagens**: Integrado com Supabase Storage.
*   **Persistência de Dados**: Supabase para `landing_sections` e `landing-images`.

## 2. Requisitos do Usuário e Mapeamento para o Plano

O usuário solicitou as seguintes funcionalidades:

| Funcionalidade Solicitada | Mapeamento para o Plano de Implementação |
| :------------------------ | :--------------------------------------- |
| Personalizar cada seção | Extensão do `LandingSection` e `ElementBlock` para mais propriedades de estilo e conteúdo. |
| Adicionar imagens         | Já parcialmente implementado; expandir controles de redimensionamento e posicionamento. |
| Adicionar vídeos          | Já parcialmente implementado; expandir controles de redimensionamento e posicionamento. |
| Adicionar animações       | Expandir a lista de animações e controles de fluidez (duração, delay, easing). |
| Tipos de texto            | Controle de tipografia avançado (fontes, pesos, estilos). |
| Mais de 20 fontes Google  | Integração com Google Fonts API ou carregamento estático. |
| Elementos minimalistas e variados (mais de 100) | Criação de uma biblioteca de componentes reutilizáveis e configuráveis. |
| Mover e diminuir/aumentar imagens/elementos | Já parcialmente implementado (x, y, width); expandir para altura e drag-and-drop visual. |
| Preview em tempo real     | Já parcialmente implementado; aprimorar a sincronização entre editor e preview. |
| Criar botões e caixas para links | Já parcialmente implementado (botões); adicionar funcionalidade de link e mais opções de estilo. |
| Tudo editável (cores, tipografia, fluidez) | Implementar seletores de cor, seletores de fonte, controles de animação detalhados. |

## 3. Detalhamento das Fases de Implementação

### Fase 2: Planejar e estruturar o editor visual completo (Atual)

*   **Objetivo**: Definir a arquitetura e as tecnologias para as novas funcionalidades.
*   **Ações**: 
    *   Documentar as extensões necessárias para os modelos de dados (`LandingSection`, `ElementBlock`).
    *   Identificar bibliotecas adicionais para fontes, ícones e manipulação de elementos no DOM (se necessário).
    *   Esboçar a estrutura da UI para os novos painéis de controle no `AdminLandingTab.tsx`.

### Fase 3: Implementar o núcleo do editor: canvas de seções, drag & drop, redimensionamento

*   **Objetivo**: Criar a base interativa para manipulação de elementos.
*   **Ações**: 
    *   Aprimorar o sistema de posicionamento e redimensionamento dos `ElementBlock`s para incluir altura e um controle visual mais intuitivo (e.g., com `react-resizable`).
    *   Implementar funcionalidade de drag-and-drop para os blocos dentro de uma seção (e.g., com `react-draggable` ou `dnd-kit`).
    *   Garantir que as alterações de posição e tamanho sejam refletidas no estado e salvas no Supabase.

### Fase 4: Implementar painel de fontes Google (20+), tipografia e cores

*   **Objetivo**: Adicionar controle granular sobre texto e cores.
*   **Ações**: 
    *   Integrar uma seleção de fontes Google. Isso pode ser feito carregando as fontes via `link` no `index.html` ou usando uma biblioteca que gerencie isso dinamicamente. 
    *   Adicionar um seletor de fontes no painel de edição de blocos de texto.
    *   Expandir as opções de estilo de texto para incluir peso da fonte, estilo (itálico, negrito), espaçamento entre letras/linhas.
    *   Implementar um seletor de cores (`color picker`) para texto e fundos de elementos/seções.
    *   Atualizar o modelo `ElementBlock` para incluir `fontFamily`, `fontWeight`, `fontStyle`, `letterSpacing`, `lineHeight`, `color`.

### Fase 5: Implementar biblioteca de elementos (100+), animações e mídia (imagens/vídeos)

*   **Objetivo**: Fornecer uma vasta gama de elementos e animações.
*   **Ações**: 
    *   **Elementos**: Criar uma biblioteca de componentes reutilizáveis (ícones, formas, divisores, etc.) que possam ser adicionados como novos tipos de `ElementBlock`. Isso pode envolver o uso de bibliotecas de ícones (Lucide já está em uso) e a criação de SVGs ou componentes React para formas.
    *   **Animações**: Expandir a lista de animações disponíveis no `framer-motion` e adicionar controles para `ease` (curva de aceleração) e `repeat` (repetição da animação).
    *   **Mídia**: Aprimorar o gerenciamento de imagens e vídeos, permitindo mais opções de `object-fit`, bordas, sombras e filtros.
    *   Atualizar o modelo `ElementBlock` para incluir novos tipos de elementos e propriedades de animação/estilo.

### Fase 6: Implementar criação de botões, caixas de link e pré-visualização em tempo real

*   **Objetivo**: Tornar os botões funcionais e aprimorar a experiência de pré-visualização.
*   **Ações**: 
    *   **Botões**: Adicionar campos para URL de link e `target` (`_blank`, `_self`) aos blocos de botão. Permitir personalização de texto, cor de fundo, cor do texto, borda e estados de hover.
    *   **Caixas de Link**: Criar um novo tipo de `ElementBlock` para caixas de link (retângulos clicáveis) com texto e ícone opcional.
    *   **Pré-visualização em Tempo Real**: Refatorar o componente de preview para que as alterações feitas nos painéis de controle sejam instantaneamente refletidas, sem a necessidade de salvar ou recarregar a página. Isso provavelmente envolverá o uso de `useState` e `useEffect` de forma mais eficiente e talvez um contexto React para o estado do editor.

### Fase 7: Integrar tudo, testar e fazer push para o repositório GitHub

*   **Objetivo**: Garantir que todas as funcionalidades trabalhem em conjunto e que o código seja estável.
*   **Ações**: 
    *   Realizar testes de integração para todas as novas funcionalidades.
    *   Otimizar o desempenho do editor e da página de visualização.
    *   Garantir a responsividade de todos os novos elementos e controles.
    *   Fazer commit das alterações e push para o repositório do GitHub.

### Fase 8: Entregar resultado ao utilizador

*   **Objetivo**: Apresentar o trabalho concluído ao usuário.
*   **Ações**: 
    *   Fornecer um resumo das funcionalidades implementadas.
    *   Instruções sobre como usar o novo editor.
    *   Qualquer observação relevante sobre o desenvolvimento.

## 4. Considerações Técnicas Adicionais

*   **Bibliotecas**: Avaliar a necessidade de `react-draggable`, `react-resizable`, `react-color` ou outras bibliotecas para facilitar a implementação do drag-and-drop, redimensionamento e seleção de cores.
*   **Performance**: Monitorar o desempenho do editor, especialmente com a adição de muitos elementos e animações.
*   **Supabase Schema**: Atualizar o schema do Supabase (`conteudo JSONB`) para refletir as novas propriedades dos blocos e seções.
*   **UX/UI**: Manter a consistência com o design existente (shadcn/ui) e garantir uma experiência de usuário intuitiva para o editor.

Este plano detalha as etapas necessárias para transformar o CMS existente em um editor visual completo e altamente personalizável. A próxima fase será a implementação do núcleo interativo do editor.
