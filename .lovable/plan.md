

## Plano: Hero com Background Paths animados (estilo Delle)

### Objectivo
Substituir a secção Hero actual por um design moderno com paths SVG animados flutuantes (componente `BackgroundPaths`), personalizado com a marca Delle e mantendo a funcionalidade existente (carrossel de imagens, botões CTA, stats, tema toggle).

### O que será feito

**1. Criar componente `src/components/ui/background-paths.tsx`**
- Componente `FloatingPaths` com 36 paths SVG animados via `framer-motion`
- Duas instâncias posicionadas para criar profundidade visual
- Cores adaptadas ao tema dark/light usando variáveis CSS do projecto
- Remover o botão genérico "Discover Excellence" — o componente será apenas o fundo animado

**2. Redesenhar o Hero em `src/pages/HomePage.tsx`**
- Adicionar `FloatingPaths` como fundo da secção Hero (atrás do conteúdo e das imagens do carrossel)
- Manter o carrossel de imagens como overlay sobre os paths (quando existir)
- O conteúdo (título, CTA, stats, badge) fica por cima de tudo com `z-index` adequado
- Animar cada letra do título principal com stagger (efeito letra a letra)
- Personalizar texto: "Aprenda mais, estude melhor" com animação por letra
- Manter todos os botões e funcionalidades existentes (Entrar, Começar grátis, Ver funcionalidades, PWA install)

**3. Estilo visual**
- Paths em `slate` translúcido (light mode) e mais claros (dark mode)
- Fundo da secção Hero com gradiente subtil em vez de cor sólida
- Manter compatibilidade com as imagens hero do admin (paths ficam debaixo das imagens)

### Estrutura de camadas (z-index)
```text
z-30  → Navbar (header)
z-20  → Conteúdo do Hero (texto, botões, stats)
z-10  → Overlay escuro (quando há imagens)
z-5   → Imagens do carrossel
z-0   → FloatingPaths (fundo animado - sempre visível quando não há imagens)
```

### Ficheiros a criar/alterar
- `src/components/ui/background-paths.tsx` — novo componente
- `src/pages/HomePage.tsx` — integrar FloatingPaths no Hero

### Dependências
- `framer-motion` — já instalado no projecto

