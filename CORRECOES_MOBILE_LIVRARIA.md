# Correções Aplicadas - Mobile Livraria e Sincronização Lovable/Produção

## Data: 27 de Maio de 2026
## Versão: 1.0

### Problemas Identificados e Corrigidos

#### 1. **PDFViewer não responde a mudanças de orientação em mobile** ✅
**Arquivo**: `src/components/PDFViewer.tsx`

**Problema**:
- O leitor de PDF não tinha listener para mudanças de orientação
- Quando o usuário rotacionava o dispositivo, o canvas mantinha dimensões antigas
- Resultado: página de livros não abria corretamente em mobile após rotação

**Solução Aplicada**:
- Adicionado `windowWidth` state para rastrear mudanças de largura
- Adicionado listener para evento `orientationchange`
- Adicionado listener para evento `resize`
- Trigger de re-renderização quando `windowWidth` muda
- Desabilitados botões de zoom em mobile (escala automática)
- Melhorado padding e responsividade do layout do viewer

**Mudanças Específicas**:
```typescript
// Novo: Detectar mudanças de orientação
const [windowWidth, setWindowWidth] = useState(window.innerWidth);

useEffect(() => {
  const handleResize = () => setWindowWidth(window.innerWidth);
  const handleOrientationChange = () => {
    setTimeout(() => setWindowWidth(window.innerWidth), 100);
  };
  
  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", handleOrientationChange);
  
  return () => {
    window.removeEventListener("resize", handleResize);
    window.removeEventListener("orientationchange", handleOrientationChange);
  };
}, []);

// Adicionado windowWidth ao dependency array
useEffect(() => {
  // renderPage logic...
}, [pdf, pageNum, scale, windowWidth]); // ← windowWidth adicionado
```

#### 2. **Links de livros não usam slug quando disponível** ✅
**Arquivo**: `src/pages/LivrariaPage.tsx`

**Problema**:
- Links de livros sempre usavam ID, nunca o slug
- Mesmo com slug gerado, o frontend não aproveitava
- Inconsistência entre versão Lovable (com slug) e produção (sem slug)

**Solução Aplicada**:
- Atualizado `BookCardLarge` para usar slug quando disponível
- Atualizado `BookCard` para usar slug quando disponível
- Fallback para ID se slug não existir

**Mudanças Específicas**:
```typescript
// Antes:
<Link to={`/book/${book.id}`} className="group block">

// Depois:
<Link to={`/book/${book.slug ? `slug/${book.slug}` : book.id}`} className="group block">
```

#### 3. **Layout do PDFViewer conflita com navbar fixa em mobile** ✅
**Arquivo**: `src/components/PDFViewer.tsx`

**Problema**:
- PDFViewer usa `fixed inset-0` que ignora padding do AppLayout
- Navbar mobile (pb-20) fica oculta atrás do viewer
- Usuário não consegue fechar o viewer em mobile

**Solução Aplicada**:
- Adicionado `md:pb-0 pb-20` ao container principal
- Ajustado padding em mobile para respeitar navbar fixa
- Melhorado responsividade dos controles

#### 4. **Controles do PDFViewer não são otimizados para mobile** ✅
**Arquivo**: `src/components/PDFViewer.tsx`

**Problema**:
- Botões de zoom muito grandes em mobile
- Texto de percentual visível apenas em desktop
- Espaçamento inadequado em telas pequenas

**Solução Aplicada**:
- Desabilitados botões de zoom em mobile (escala automática)
- Percentual de zoom oculto em mobile
- Ajustado espaçamento e tamanho de fonte dos controles
- Melhorado layout dos botões de navegação

### Sincronização Lovable ↔ Produção

#### Migrações SQL Necessárias em Produção
As seguintes migrações **DEVEM SER EXECUTADAS** no Supabase de produção:

1. **20260526000000_fix_slug_column_constraint.sql**
   - Adiciona coluna `slug` com constraint UNIQUE
   - Cria função `generate_slug()`
   - Cria trigger automático para gerar slugs
   - Cria índice para performance

2. **20260527000000_add_public_book_rpc.sql**
   - Cria função RPC `get_book_read_url()`
   - Cria policy de storage para acesso público a livros gratuitos
   - Permite leitura de livros gratuitos sem autenticação

#### Como Executar as Migrações

1. Acesse https://app.supabase.com
2. Selecione seu projeto
3. Vá para **SQL Editor**
4. Copie e execute o conteúdo de cada arquivo `.sql` em ordem:
   - Primeiro: `20260526000000_fix_slug_column_constraint.sql`
   - Depois: `20260527000000_add_public_book_rpc.sql`

### Testes Recomendados

#### Mobile (iOS/Android)
- [ ] Abrir página de livraria em portrait
- [ ] Rotacionar para landscape - o PDF deve se ajustar
- [ ] Rotacionar de volta para portrait
- [ ] Navegar entre páginas do PDF
- [ ] Fechar o leitor (botão X deve estar acessível)
- [ ] Testar em diferentes tamanhos de tela (iPhone SE, iPhone 12, iPad)

#### Desktop
- [ ] Abrir página de livraria
- [ ] Clicar em um livro
- [ ] Usar botões de zoom
- [ ] Navegar entre páginas
- [ ] Verificar que zoom funciona normalmente

#### Links de Livros
- [ ] Compartilhar livro via link slug
- [ ] Verificar que `/book/slug/nome-do-livro` funciona
- [ ] Fallback para `/book/{id}` se slug não existir

### Arquivos Modificados
- `src/components/PDFViewer.tsx` - Correções de mobile e orientação
- `src/pages/LivrariaPage.tsx` - Links com suporte a slug

### Próximos Passos
1. Fazer commit das mudanças
2. Executar as migrações SQL em produção
3. Fazer deploy para produção
4. Testar em dispositivos reais
5. Monitorar logs de erro por 24-48 horas

### Notas Importantes
- As correções são **retrocompatíveis** - funcionam com ou sem slug
- PDFViewer agora é mais responsivo e trata orientação corretamente
- Não há breaking changes na API ou banco de dados
- Todas as mudanças mantêm a compatibilidade com versões antigas

---

**Autor**: Manus Agent
**Status**: Pronto para produção ✅
