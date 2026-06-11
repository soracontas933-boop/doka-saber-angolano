# Plano de Migração do Supabase Storage para Hostinger

## 1. Introdução

Este documento detalha o plano para migrar os arquivos atualmente armazenados no Supabase Storage para a Hostinger, com o objetivo principal de reduzir o consumo de egress e otimizar custos. A migração será realizada de forma a preservar a autenticação, o banco de dados, as permissões de acesso e a experiência do usuário, sem quebrar as funcionalidades existentes.

## 2. Análise da Arquitetura Atual

O projeto utiliza o Supabase Storage para armazenar diversos tipos de arquivos, que podem ser categorizados em públicos e privados/assinados. A interação com o storage é feita principalmente através do cliente Supabase no frontend e em algumas funções de backend (Edge Functions).

### 2.1. Buckets e Tipos de Arquivos Identificados

| Bucket Supabase | Tipo de Arquivo | Acesso | Uso Principal | Componentes Envolvidos |
|---|---|---|---|---|
| `ebooks` | PDFs e Capas | Misto (PDFs privados, Capas públicas) | Ebooks e suas capas | `ebook-storage.ts`, `LivroDetalhePage.tsx`, `AdminLivrariaTab.tsx` |
| `book-covers` | Capas de livros | Público | Capas de livros submetidos por usuários | `PublicarLivroTab.tsx` |
| `book-files` | PDFs de livros | Privado (URLs assinadas) | PDFs de livros submetidos por usuários | `MeusLivrosTab.tsx`, `LivroDetalhePage.tsx` |
| `comprovativos` | Comprovativos de pagamento | Privado (URLs assinadas) | Comprovativos de pagamento de planos | `AdminPaymentsTab.tsx` |
| `button-covers` | Imagens de botões | Público | Capas para botões administrativos | `AdminButtonCoversTab.tsx` |
| `hero-images` | Imagens de herói | Público | Imagens de destaque na página inicial | `AdminHeroTab.tsx`, `AdminLandingPanelFloat.tsx` |
| `landing-images` | Imagens da landing page | Público | Imagens diversas da landing page | `AdminLandingTab.tsx`, `AdminLandingTabNew.tsx` |
| `avatars` | Avatares de usuário | Público | Imagens de perfil de usuário | `SettingsPage.tsx` |

### 2.2. Dependências de URLs Assinadas

As URLs assinadas são utilizadas para arquivos que requerem controle de acesso, garantindo que apenas usuários autorizados possam visualizá-los ou baixá-los. Os principais pontos de uso são:

*   **PDFs de Ebooks (`ebooks/files`, `book-files`)**: Geradas em `ebook-storage.ts`, `LivroDetalhePage.tsx` e `MeusLivrosTab.tsx` para permitir a leitura e download de livros por usuários que os possuem.
*   **Comprovativos de Pagamento (`comprovativos`)**: Geradas em `AdminPaymentsTab.tsx` para que administradores possam visualizar os comprovativos enviados pelos usuários.

### 2.3. Políticas de Acesso (RLS)

As políticas de Row Level Security (RLS) no Supabase são configuradas para controlar o acesso aos buckets e objetos. Por exemplo, o bucket `ebooks` permite leitura pública para capas, mas o upload é restrito a administradores. Para `book-files`, a leitura é permitida apenas para o proprietário do arquivo ou administradores, utilizando a função `auth.uid()` e verificando a tabela `book_library`.

## 3. Plano de Migração

O plano de migração será dividido em fases para garantir uma transição suave e minimizar interrupções.

### 3.1. Estratégia de Armazenamento na Hostinger

A Hostinger oferece armazenamento de objetos que pode ser configurado para servir arquivos publicamente ou com acesso restrito. Para replicar a funcionalidade do Supabase Storage, propõe-se:

*   **Arquivos Públicos**: Serão armazenados em um bucket da Hostinger configurado para acesso público, idealmente com um CDN para melhor desempenho.
*   **Arquivos Privados (PDFs e Comprovativos)**: Serão armazenados em um bucket da Hostinger com acesso privado. Será necessário implementar um serviço de proxy ou uma função de backend na Hostinger (ou em outro serviço compatível) que autentique as requisições e gere URLs temporárias/assinadas, similar ao `createSignedUrl` do Supabase. Isso pode ser feito através de uma API customizada ou uma função serverless.

### 3.2. Etapas da Migração

#### Fase 1: Preparação e Configuração da Hostinger

1.  **Configurar Armazenamento de Objetos**: Criar os buckets necessários na Hostinger (ex: `doka-public`, `doka-private`).
2.  **Configurar CDN (Opcional, mas recomendado)**: Integrar um CDN com os buckets públicos da Hostinger para otimizar a entrega de conteúdo.
3.  **Desenvolver Serviço de Proxy/Assinatura de URLs**: Criar um endpoint de API na Hostinger (ou em um serviço serverless) que:
    *   Receba o caminho do arquivo e a duração da URL.
    *   Autentique o usuário (verificando o token de sessão do Supabase, se aplicável).
    *   Verifique as permissões do usuário (se o usuário tem direito de acesso ao arquivo, consultando o banco de dados do Supabase).
    *   Gere uma URL temporária para o arquivo no armazenamento privado da Hostinger.

#### Fase 2: Migração de Dados Existentes

1.  **Script de Download do Supabase**: Desenvolver um script para baixar todos os arquivos dos buckets do Supabase Storage para um ambiente local.
2.  **Script de Upload para Hostinger**: Desenvolver um script para fazer o upload dos arquivos baixados para os respectivos buckets na Hostinger.
    *   Arquivos públicos (capas, imagens de herói, etc.) para o bucket público.
    *   Arquivos privados (PDFs, comprovativos) para o bucket privado.
3.  **Atualização do Banco de Dados**: Após a migração dos arquivos, será necessário atualizar os campos `capa_url` e `ficheiro_path` nas tabelas `books`, `ebooks`, `book_purchase_requests`, `button_covers`, `hero_images`, `landing_images` e `profiles` no Supabase para refletir as novas URLs da Hostinger. Isso pode ser feito com um script SQL ou um script de migração de dados.

#### Fase 3: Adaptação do Código Frontend e Backend

1.  **Atualizar Cliente Supabase**: Modificar o código para que as chamadas a `supabase.storage.from(...).getPublicUrl(...)` e `supabase.storage.from(...).createSignedUrl(...)` sejam substituídas por chamadas para o novo serviço de proxy/assinatura de URLs da Hostinger ou para as URLs diretas dos buckets públicos.
    *   **Arquivos Públicos**: Substituir `supabase.storage.from("bucket").getPublicUrl(path)` por uma URL direta da Hostinger (ex: `https://cdn.hostinger.com/bucket/path`).
    *   **Arquivos Privados**: Substituir `supabase.storage.from("bucket").createSignedUrl(path, expiration)` por uma chamada à nova API de proxy da Hostinger (ex: `api.hostinger.com/get-signed-url?path=...`).
2.  **Revisar Edge Functions**: Verificar se alguma Edge Function do Supabase interage diretamente com o Supabase Storage de forma que precise ser adaptada ou reescrita para o novo ambiente.

### 3.3. Requisitos Atendidos

*   **Preservar autenticação**: A autenticação continuará sendo gerenciada pelo Supabase. O serviço de proxy da Hostinger precisará validar o token de sessão do Supabase.
*   **Preservar banco de dados**: O banco de dados principal permanecerá no Supabase, apenas os campos de URL serão atualizados.
*   **Preservar permissões de acesso**: As permissões serão replicadas através da lógica no serviço de proxy da Hostinger, que consultará o banco de dados do Supabase para verificar o acesso.
*   **Preservar experiência do usuário**: A migração será transparente para o usuário final, que continuará acessando os arquivos da mesma forma.
*   **Não remover nada sem confirmar dependências**: A migração será feita em etapas, com backups e testes, e o Supabase Storage só será desativado após a confirmação total da funcionalidade na Hostinger.

## 4. Riscos Potenciais

*   **Complexidade do Serviço de Proxy**: Desenvolver e manter um serviço de proxy seguro e eficiente para URLs assinadas pode ser complexo e exigir recursos adicionais.
*   **Latência**: A introdução de um novo serviço de proxy pode adicionar latência na obtenção de URLs para arquivos privados.
*   **Custo de Desenvolvimento**: O desenvolvimento do serviço de proxy e dos scripts de migração terá um custo inicial.
*   **Segurança**: Garantir que o serviço de proxy seja seguro e que as permissões de acesso sejam corretamente aplicadas é crucial para evitar vazamento de dados.
*   **Integridade dos Dados**: Erros durante a migração de dados podem levar à perda ou corrupção de arquivos.

## 5. Economia Estimada de Egress

A economia exata de egress dependerá do volume de dados e do padrão de acesso. No entanto, ao migrar para a Hostinger, espera-se uma redução significativa nos custos de egress do Supabase, especialmente para arquivos públicos que podem ser servidos diretamente por um CDN da Hostinger a um custo menor.

## 6. Próximos Passos

Após a sua revisão e aprovação deste plano, procederemos com a implementação, começando pela configuração da Hostinger e o desenvolvimento do serviço de proxy/assinatura de URLs.

---

**Autor**: Manus AI
**Data**: 10 de Junho de 2026
