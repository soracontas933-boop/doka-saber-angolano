# Guia do CMS da Landing Page - Delle

## Visão Geral

O novo CMS da landing page permite que administradores editem dinamicamente as secções principais da página inicial sem necessidade de modificar código. Todas as alterações são armazenadas na base de dados Supabase e refletem-se imediatamente no site.

## Funcionalidades Implementadas

### 1. **Painel Administrativo - Aba Landing Page**

Acesse `Admin Panel > Landing Page` para gerenciar todas as secções da landing page.

#### Recursos Principais:

- **Reordenação de Secções**: Use os botões de seta (↑/↓) para mover secções para cima ou para baixo
- **Ativação/Desativação**: Toggle para mostrar ou ocultar secções sem deletá-las
- **Edição em Tempo Real**: Todas as alterações são salvas automaticamente no Supabase

### 2. **Tipos de Secções Editáveis**

#### A. Secção "Sobre" (Tipo: `sobre`)

Permite criar múltiplas linhas com texto e imagem lado a lado.

**Campos Editáveis:**
- **Badge**: Texto pequeno acima do título (ex: "Sobre a Delle")
- **Título**: Heading principal da linha
- **Texto/Descrição**: Parágrafo descritivo
- **Imagem**: Upload com auto-ajuste (object-fit: cover/contain)
- **Inverter Posição**: Alterna imagem de um lado para o outro

**Exemplo de Estrutura:**
```json
{
  "tipo": "sobre",
  "titulo": "Sobre a Delle",
  "conteudo": {
    "rows": [
      {
        "badge": "Sobre a Delle",
        "title": "A primeira plataforma educacional feita em Angola, para Angola",
        "text": "A Delle nasceu da necessidade de modernizar...",
        "image": "https://...",
        "reverse": false
      }
    ]
  }
}
```

#### B. Secção "Funcionalidades" (Tipo: `funcionalidades`)

Exibe um grid de cards com ícones, títulos e descrições.

**Campos Editáveis:**
- **Título da Secção**: Heading principal
- **Itens**: Array de funcionalidades
  - Ícone (nome do ícone Lucide)
  - Título
  - Descrição
- **Número de Colunas**: 1, 2, 3 ou 4 colunas no desktop

**Ícones Disponíveis:**
- FileText, BookOpen, HelpCircle, ClipboardList
- Lightbulb, GraduationCap, Users, Star
- Zap, Shield, Sparkles, ChevronRight, ArrowRight

**Exemplo de Estrutura:**
```json
{
  "tipo": "funcionalidades",
  "titulo": "Tudo o que precisas para brilhar",
  "conteudo": {
    "items": [
      {
        "icon": "FileText",
        "title": "Trabalhos Escolares",
        "desc": "Gere trabalhos completos com capa, índice..."
      }
    ],
    "style": {
      "columns": 4
    }
  }
}
```

#### C. Secção "Você Sabia?" (Tipo: `voce-sabia`)

Apresenta factos e curiosidades com destaque de números/percentagens.

**Campos Editáveis:**
- **Título da Secção**: Heading principal
- **Itens**: Array de curiosidades
  - Ícone
  - Facto/Curiosidade (texto completo)
  - Destaque (parte do texto em negrito/cor primária)
- **Número de Colunas**: 1 ou 2 colunas

**Exemplo de Estrutura:**
```json
{
  "tipo": "voce-sabia",
  "titulo": "Você Sabia?",
  "conteudo": {
    "items": [
      {
        "icon": "Lightbulb",
        "fact": "Estudantes que usam resumos estruturados memorizam até 40% mais conteúdo.",
        "highlight": "40% mais"
      }
    ],
    "style": {
      "columns": 2
    }
  }
}
```

### 3. **Editor de Estilos**

Cada secção possui uma aba "Estilo & Animação" com opções:

#### Cores de Fundo:
- **Padrão**: Cor de fundo padrão do tema
- **Card**: Levemente cinza/escuro
- **Primária**: Azul (cor principal)
- **Muted**: Cinza neutro

#### Animações de Entrada:
- **Deslizar para Cima** (fade-up): Padrão
- **Aparecer Suave** (fade-in): Fade simples
- **Deslizar da Esquerda** (slide-left): Entrada pela esquerda
- **Deslizar da Direita** (slide-right): Entrada pela direita
- **Zoom In**: Zoom de entrada

#### Alinhamento de Texto:
- Esquerda
- Centro
- Direita

#### Colunas (Desktop):
- 1, 2, 3 ou 4 colunas

### 4. **Upload de Imagens**

#### Características:
- **Auto-Ajuste**: Imagens se adaptam automaticamente ao container
- **Object-Fit**: Pode ser configurado para `cover` (padrão) ou `contain`
- **Formatos Suportados**: JPG, PNG, WebP, GIF
- **Armazenamento**: Bucket `landing-images` no Supabase Storage
- **Acesso Público**: Todas as imagens são públicas e acessíveis

#### Processo de Upload:
1. Clique no botão "Mudar Imagem" no card de imagem
2. Selecione o ficheiro do seu computador
3. Aguarde o upload completar
4. A imagem aparecerá automaticamente no preview
5. Clique em "Salvar" para persistir as alterações

### 5. **Movimentação de Elementos**

#### Reordenação de Secções:
- Use os botões ↑ e ↓ no topo de cada card de secção
- A ordem é atualizada automaticamente no banco de dados

#### Reordenação de Itens (dentro de secções):
- **Funcionalidades**: Use o botão X para remover ou + para adicionar
- **Você Sabia**: Use o botão X para remover ou + para adicionar
- **Sobre**: Adicione novas linhas manualmente

### 6. **Responsividade Mobile e Desktop**

#### Comportamento Automático:
- **Mobile**: Grid de 1 coluna, fontes ajustadas, padding reduzido
- **Tablet**: Grid de 2 colunas
- **Desktop**: Grid conforme configurado (1-4 colunas)

#### Breakpoints Utilizados:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px

### 7. **Integração com HomePage**

A HomePage carrega automaticamente as secções ativas da base de dados:

```typescript
// Carrega todas as secções ativas ordenadas
const { data: sections } = await supabase
  .from("landing_sections")
  .select("*")
  .eq("ativo", true)
  .order("ordem", { ascending: true });
```

Cada secção é renderizada dinamicamente com seus estilos e animações configuradas.

## Base de Dados

### Tabela: `landing_sections`

```sql
CREATE TABLE public.landing_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL, -- 'sobre', 'funcionalidades', 'voce-sabia'
  titulo TEXT,
  conteudo JSONB NOT NULL DEFAULT '{}',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Bucket de Storage: `landing-images`

- Público (leitura)
- Apenas admins podem fazer upload, atualizar e deletar

## Permissões

### Quem pode editar?

- **Admins**: Usuários com role `admin_roles` e permissão `all`
- **Masters**: Emails hardcoded em `use-admin.ts` (kenymatos943@gmail.com, manuelmatosjose67@gmail.com)

### Row Level Security (RLS)

- Leitura: Pública (qualquer pessoa pode ver as secções)
- Escrita: Apenas admins/masters

## Como Usar

### Passo 1: Acessar o Painel Admin
1. Faça login como admin
2. Navegue para `Admin Panel`
3. Clique na aba `Landing Page`

### Passo 2: Editar uma Secção
1. Localize a secção que deseja editar
2. Clique na aba `Conteúdo` ou `Estilo & Animação`
3. Faça as alterações desejadas
4. Clique em `Salvar`

### Passo 3: Reordenar Secções
1. Use os botões ↑/↓ para mover secções
2. A ordem é atualizada automaticamente

### Passo 4: Adicionar/Remover Itens
1. Dentro de uma secção, clique em `+ Adicionar` (Funcionalidade/Curiosidade)
2. Preencha os campos
3. Clique em `Salvar`

## Exemplos de Uso

### Adicionar uma Nova Funcionalidade

1. Na secção "Funcionalidades", clique em `+ Adicionar Funcionalidade`
2. Preencha:
   - Título: "Minha Nova Ferramenta"
   - Descrição: "Descrição detalhada"
3. Clique em `Salvar`

### Mudar a Cor de Fundo de uma Secção

1. Abra a secção
2. Clique na aba `Estilo & Animação`
3. Em "Cor de Fundo", selecione a cor desejada
4. Clique em `Salvar`

### Adicionar uma Imagem à Secção Sobre

1. Na secção "Sobre", localize o card de imagem
2. Clique em `Mudar Imagem`
3. Selecione o ficheiro
4. Aguarde o upload
5. Clique em `Salvar`

## Troubleshooting

### Imagem não aparece após upload
- Verifique se o ficheiro é uma imagem válida
- Verifique a conexão com a internet
- Tente fazer refresh da página

### Alterações não são salvas
- Verifique se clicou em `Salvar`
- Verifique se está logado como admin
- Verifique a conexão com o Supabase

### Secção não aparece na landing page
- Verifique se a secção está marcada como `ativa`
- Verifique se a ordem está correta
- Faça refresh da página

## Próximas Melhorias Sugeridas

1. **Preview em Tempo Real**: Mostrar preview da secção enquanto edita
2. **Duplicação de Secções**: Copiar uma secção existente
3. **Histórico de Versões**: Rastrear alterações anteriores
4. **Agendamento**: Agendar publicação de secções
5. **Tradução Multilíngue**: Suporte a múltiplos idiomas
6. **SEO**: Editor de meta tags por secção
7. **Analytics**: Rastrear cliques e interações por secção

## Suporte

Para dúvidas ou problemas, contacte o desenvolvedor ou verifique os logs do Supabase.
