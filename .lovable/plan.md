

# Mobile Top Bar e Homepage — Melhorias

## O que muda

### 1. Top Bar mobile fixa (`CreditsBar.tsx`)
A top bar mobile actual usa `sticky` e mistura muita informação. Vamos redesenhá-la para mobile com:
- **Posição `fixed`** para ficar sempre visível ao rolar
- **Conteúdo mobile**: foto de perfil (iniciais), créditos (ícone Zap + número), ícone de suporte (link para `/suporte`), sino de notificações
- **Layout limpo**: perfil à esquerda, créditos ao centro, suporte + notificações à direita
- Desktop mantém o layout actual

### 2. Secção de gerações restantes (`UserHomePage.tsx`)
Substituir o "Productivity Score" por uma grelha compacta com os números restantes de cada tipo de geração:
- Trabalhos, Resumos, Questionários, Planos de Aula, TFC — cada um com ícone + número restante em texto pequeno
- Layout em linha horizontal com scroll, estilo pill/badge

### 3. Adicionar botão "Planos de Aula" aos Quick Actions (`UserHomePage.tsx`)
Actualmente há 4 ícones circulares. Adicionar um 5.º para Planos de Aula (rota `/plano-aula`, ícone `ClipboardList`). Ajustar o array `quickActions` e os labels para ficarem correctos.

### 4. Ajustar padding do main (`AppLayout.tsx`)
Adicionar `pt-14` no mobile ao `<main>` para compensar a top bar fixa.

## Ficheiros afectados
1. **`src/components/CreditsBar.tsx`** — redesenhar versão mobile com fixed position, foto perfil, suporte, notificações, créditos
2. **`src/pages/UserHomePage.tsx`** — substituir Productivity Score por grelha de gerações restantes; adicionar Plano de Aula aos quick actions; remover header mobile duplicado (já está na CreditsBar)
3. **`src/components/AppLayout.tsx`** — adicionar padding-top mobile para compensar top bar fixa

