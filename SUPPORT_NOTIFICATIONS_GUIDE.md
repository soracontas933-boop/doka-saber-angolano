# Guia de Notificações de Suporte - Delle

## Visão Geral

O sistema de notificações de suporte da Delle fornece uma experiência em tempo real para os usuários receberem mensagens do suporte. As notificações aparecem no topo do aplicativo de forma persistente, com som de alerta, e permanecem até serem fechadas ou clicadas.

## Componentes Implementados

### 1. **Migração do Banco de Dados** (`20260604000000_support_notifications_and_welcome.sql`)

- Adiciona coluna `is_read` à tabela `chat_messages` para rastrear notificações lidas
- Cria função `handle_new_user_welcome()` que envia uma mensagem de boas-vindas automática quando um novo usuário se registra
- Implementa trigger `on_profile_created_welcome` que dispara a função de boas-vindas

**Mensagem de Boas-vindas Automática:**
```
👋 Olá! Bem-vindo à Delle! [Nome do Usuário]

Eu sou o assistente da plataforma e vou te ajudar a criar trabalhos escolares, 
resumos, questionários, planos de aula, currículos e muito mais em poucos segundos.

💡 Tudo funciona com créditos — cada geração usa uma pequena parte do seu saldo.

💳 Se os créditos acabarem, é só ir em **Saldo** e escolher um plano para 
continuar usando normalmente.

🚀 Sempre que precisar, estou aqui para te ajudar!
```

### 2. **Hook Customizado** (`src/hooks/useSupportNotifications.ts`)

O hook `useSupportNotifications` gerencia:

- **Busca de mensagens não lidas**: Recupera todas as mensagens não lidas do usuário nas suas conversas de suporte
- **Subscrição em tempo real**: Ouve mudanças na tabela `chat_messages` usando Supabase Realtime
- **Som de notificação**: Reproduz um som de notificação usando Web Audio API (tom de 800Hz)
- **Marcação como lida**: Permite marcar mensagens como lidas

**Funções Principais:**
- `fetchUnreadMessages()`: Busca mensagens não lidas iniciais
- `playNotificationSound()`: Reproduz som de notificação
- `markAsRead(notificationId)`: Marca uma notificação como lida
- `markAllAsRead()`: Marca todas as notificações como lidas

### 3. **Componente de Notificação** (`src/components/SupportNotification.tsx`)

Renderiza as notificações no topo do aplicativo com:

- **Animações suaves**: Entrada e saída com Framer Motion
- **Design responsivo**: Adapta-se a diferentes tamanhos de tela
- **Interatividade**: 
  - Clique na notificação para ir para o chat de suporte
  - Botão X para fechar a notificação
- **Ícone de mensagem**: Indicador visual de mensagem de suporte

### 4. **Edge Function** (`supabase/functions/send-welcome-message/index.ts`)

Função serverless que:

- É disparada quando um novo usuário é criado
- Cria uma conversa de suporte para o novo usuário
- Insere a mensagem de boas-vindas formatada
- Usa o ID do sistema (`00000000-0000-0000-0000-000000000000`) como remetente

## Fluxo de Funcionamento

### Novo Usuário

1. Usuário se registra via `AuthPage`
2. Trigger `on_auth_user_created` cria o perfil
3. Trigger `on_profile_created_welcome` dispara
4. Função `handle_new_user_welcome()` cria:
   - Uma conversa de suporte
   - Uma mensagem de boas-vindas no chat
5. Mensagem aparece como notificação no topo do app

### Mensagem do Suporte

1. Admin envia uma mensagem via `AdminMensagensPage` ou `SuportePage`
2. Mensagem é inserida em `chat_messages`
3. Trigger Realtime notifica o cliente do usuário
4. `useSupportNotifications` detecta a nova mensagem
5. Som de notificação é reproduzido
6. Notificação aparece no topo do app

## Integração no App

O componente `SupportNotification` está integrado no `App.tsx`:

```tsx
<AuthProvider>
  <NoCreditsModal />
  <SupportNotification />
  <Routes>
    {/* ... */}
  </Routes>
</AuthProvider>
```

## Configuração do Supabase

### Tabelas Necessárias

- `support_messages`: Conversas de suporte
- `chat_messages`: Mensagens individuais com coluna `is_read`
- `profiles`: Perfis de usuário

### Realtime Habilitado

Ambas as tabelas devem estar habilitadas para Realtime:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
```

## Som de Notificação

O som é gerado usando Web Audio API:

- **Frequência**: 800 Hz
- **Tipo de onda**: Sine (senoidal)
- **Duração**: 0.5 segundos
- **Volume**: 0.3 (30%)

Este é um tom simples e não intrusivo que funciona em todos os navegadores modernos.

## Melhorias Futuras

1. **Preferências de Som**: Permitir que usuários desabilitem o som
2. **Notificações Push**: Integrar com Web Push API para notificações do navegador
3. **Badge de Contagem**: Mostrar número de notificações não lidas
4. **Categorias de Notificações**: Diferentes sons para diferentes tipos de mensagens
5. **Histórico de Notificações**: Manter registro de notificações fechadas

## Troubleshooting

### Notificações não aparecem

1. Verifique se `is_read` está sendo definido corretamente
2. Confirme que o Realtime está habilitado no Supabase
3. Verifique se o usuário tem permissão para ver as mensagens (RLS)

### Som não toca

1. Verifique se o navegador permite áudio
2. Confirme que o contexto de áudio foi criado corretamente
3. Teste em outro navegador

### Mensagem de boas-vindas não é enviada

1. Verifique se o trigger `on_profile_created_welcome` está ativo
2. Confirme que a função `handle_new_user_welcome()` existe
3. Verifique os logs do Supabase para erros

## Exemplo de Uso

```tsx
import { useSupportNotifications } from "@/hooks/useSupportNotifications";

function MyComponent() {
  const { notifications, markAsRead, markAllAsRead } = useSupportNotifications();

  return (
    <div>
      <p>Notificações não lidas: {notifications.length}</p>
      <button onClick={markAllAsRead}>Marcar todas como lidas</button>
    </div>
  );
}
```
