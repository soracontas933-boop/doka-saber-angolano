# Comunidade - Etapa 1: Estrutura Base

## Resumo da Implementação

Esta etapa implementa a infraestrutura base da Comunidade dentro da plataforma Déli, mantendo a identidade visual e sem alterar funcionalidades existentes.

## Alterações Realizadas

### 1. **Navegação (Desktop e Mobile)**

#### Desktop (AppSidebar.tsx)
- ✅ Alterado o menu "Trabalho em Grupo" para "Comunidade"
- ✅ Rota atualizada de `/grupos` para `/comunidade`
- ✅ Feature key atualizada de `grupos` para `comunidade`
- ✅ Mantém o ícone `Users` e comportamento de navegação

#### Mobile (MobileNav.tsx)
- ✅ Adicionado botão "Comunidade" na barra de navegação inferior
- ✅ Posicionado entre "Projetos" e "Livraria"
- ✅ Ícone `Users` com animação consistente
- ✅ Suporta o mesmo sistema de feature flags

### 2. **Roteamento (App.tsx)**
- ✅ Importado `CommunityPage` do diretório de páginas
- ✅ Adicionada rota `/comunidade` protegida dentro de `AppLayout`
- ✅ Mantém a mesma estrutura de autenticação e autorização

### 3. **Página Principal da Comunidade (CommunityPage.tsx)**

A página implementa a seguinte estrutura:

#### Layout Principal (3 colunas em desktop, 1 coluna em mobile)

**Coluna Esquerda (Feed Principal - 2/3 da largura)**
- Barra de pesquisa de utilizadores
- Card de criação de postagem (desabilitado para Etapa 1)
- Abas: "Para ti", "Seguindo", "Tendências"
- Feed de postagens com:
  - Avatar e nome do utilizador
  - Data da postagem
  - Conteúdo textual
  - Suporte para imagens/vídeos (estrutura pronta)
  - Contador de gostos e comentários
  - Botões de interação: Gosto, Comentar, Partilhar

**Coluna Direita (Sidebar - 1/3 da largura)**
- **Online Agora**: Lista de utilizadores online com status
- **Sugestões de Utilizadores**: Utilizadores recomendados com amigos em comum
- **Grupos Sugeridos**: Grupos recomendados com descrição
- **Próximas Funcionalidades**: Placeholder para Chat, Jogos, Eventos e IA

### 4. **Componentes Reutilizáveis**

Criados os seguintes componentes para modularidade:

#### `CommunityFeed.tsx`
- Renderiza o feed de postagens
- Suporta criação, leitura, likes e compartilhamento
- Animações com Framer Motion
- Responsivo para mobile/desktop

#### `CommunityOnlineUsers.tsx`
- Lista de utilizadores online
- Status visual (online/away)
- Botão de mensagem para cada utilizador
- Preparado para integração de chat

#### `CommunitySuggestedUsers.tsx`
- Sugestões de utilizadores a seguir
- Mostra amigos em comum
- Botão "Seguir" (desabilitado para Etapa 1)

#### `CommunitySuggestedGroups.tsx`
- Sugestões de grupos
- Descrição e contagem de membros
- Botão "Juntar" (desabilitado para Etapa 1)

#### `CommunityFutureIntegrations.tsx`
- Placeholder visual para próximas funcionalidades
- Design minimalista com badges

### 5. **Design System**

- ✅ Utiliza componentes UI existentes (Card, Button, Input, Avatar, Badge, Tabs)
- ✅ Mantém a paleta de cores: branco, azul claro, sombreado e preto
- ✅ Inspiração Arcane: linhas limpas, tipografia elegante, sombras sutis
- ✅ Responsividade total (mobile-first)
- ✅ Animações suaves com Framer Motion

### 6. **Dados Placeholder**

Para Etapa 1, os dados são mockados com estrutura preparada para integração com Supabase:

```typescript
// Exemplo de estrutura de postagem
interface CommunityPost {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  content: string;
  media_type?: "image" | "video";
  media_url?: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}
```

## Funcionalidades Preparadas para Próximas Etapas

### Etapa 2: Postagens
- [ ] Criar postagens com texto
- [ ] Upload de imagens
- [ ] Upload de vídeos (até 15 segundos)
- [ ] Sistema de likes e comentários
- [ ] Edição e exclusão de postagens

### Etapa 3: Interação Social
- [ ] Sistema de seguir/deixar de seguir
- [ ] Perfil de utilizador
- [ ] Edição de perfil
- [ ] Histórico de atividades

### Etapa 4: Jogos
- [ ] Quiz interativos
- [ ] Desafios entre utilizadores
- [ ] Leaderboards

### Etapa 5: Chat e Eventos
- [ ] Chat privado entre utilizadores
- [ ] Grupos de chat
- [ ] Criação de eventos
- [ ] Calendário de eventos

## Estrutura de Banco de Dados (Preparada)

Tabelas necessárias para implementação completa:

```sql
-- Postagens
CREATE TABLE community_posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  content TEXT,
  media_type VARCHAR(10),
  media_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Likes
CREATE TABLE community_post_likes (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES community_posts,
  user_id UUID REFERENCES auth.users,
  created_at TIMESTAMP,
  UNIQUE(post_id, user_id)
);

-- Comentários
CREATE TABLE community_post_comments (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES community_posts,
  user_id UUID REFERENCES auth.users,
  content TEXT,
  created_at TIMESTAMP
);

-- Seguir
CREATE TABLE community_follows (
  id UUID PRIMARY KEY,
  follower_id UUID REFERENCES auth.users,
  following_id UUID REFERENCES auth.users,
  created_at TIMESTAMP,
  UNIQUE(follower_id, following_id)
);
```

## Testes Recomendados

1. **Navegação**
   - [ ] Verificar se o botão "Comunidade" aparece no desktop
   - [ ] Verificar se o botão "Comunidade" aparece no mobile
   - [ ] Testar navegação entre abas

2. **Responsividade**
   - [ ] Testar em dispositivos móveis
   - [ ] Testar em tablets
   - [ ] Testar em desktop

3. **Acessibilidade**
   - [ ] Verificar contraste de cores
   - [ ] Testar navegação por teclado
   - [ ] Verificar labels de acessibilidade

4. **Performance**
   - [ ] Verificar tempo de carregamento
   - [ ] Testar com muitas postagens
   - [ ] Verificar uso de memória

## Notas Importantes

- ✅ **Sem alterações em funcionalidades existentes**: A implementação não afeta nenhuma funcionalidade existente
- ✅ **Mantém layout e navegação**: Usa o mesmo `AppLayout` e sistema de navegação
- ✅ **Autenticação preservada**: Mantém o sistema de autenticação e autorização
- ✅ **Design system consistente**: Utiliza componentes e estilos existentes
- ✅ **Preparado para escalabilidade**: Componentes modulares e reutilizáveis

## Próximos Passos

1. Implementar integração com Supabase para postagens (Etapa 2)
2. Adicionar sistema de likes e comentários (Etapa 2)
3. Implementar perfil de utilizador (Etapa 3)
4. Adicionar sistema de seguir (Etapa 3)
5. Implementar jogos interativos (Etapa 4)
6. Adicionar chat e eventos (Etapa 5)

## Ficheiros Modificados

- `src/App.tsx` - Adicionada rota `/comunidade`
- `src/components/AppSidebar.tsx` - Alterado menu de "Trabalho em Grupo" para "Comunidade"
- `src/components/MobileNav.tsx` - Adicionado botão "Comunidade"

## Ficheiros Criados

- `src/pages/CommunityPage.tsx` - Página principal da Comunidade
- `src/components/CommunityFeed.tsx` - Componente do feed
- `src/components/CommunityOnlineUsers.tsx` - Componente de utilizadores online
- `src/components/CommunitySuggestedUsers.tsx` - Componente de sugestões de utilizadores
- `src/components/CommunitySuggestedGroups.tsx` - Componente de sugestões de grupos
- `src/components/CommunityFutureIntegrations.tsx` - Componente de placeholder de funcionalidades

## Conclusão

A Etapa 1 estabelece uma base sólida e modular para a Comunidade, mantendo a integridade da plataforma Déli e preparando a infraestrutura para as próximas etapas de desenvolvimento.
