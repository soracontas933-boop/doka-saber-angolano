

## Plano: Pré-visualização Editável Tipo Word

### Objectivo
Transformar a pré-visualização A4 (fase "resultado") numa experiência de edição fluida onde o utilizador pode clicar directamente no texto e editá-lo, tal como no Word — sem formulários ou modais separados.

### Alterações Técnicas

**1. Novo componente `src/components/trabalho/EditableSection.tsx`**
- Substitui o `SectionContent` actual com `dangerouslySetInnerHTML` por um componente com `contentEditable`
- Título da secção editável inline (clique para editar)
- Corpo do texto editável inline com formatação preservada
- Barra de ferramentas flutuante (toolbar) que aparece ao seleccionar texto: **Negrito**, *Itálico*, Subtítulo, Lista
- Indicador visual sutil ao passar o rato (borda azul clara) para sinalizar que é editável

**2. Novo componente `src/components/trabalho/FloatingToolbar.tsx`**
- Toolbar flutuante posicionada acima da selecção de texto (tipo Notion/Medium)
- Botões: Bold, Italic, Heading, List, Undo
- Usa `document.execCommand` para formatação rica inline
- Aparece/desaparece automaticamente com a selecção

**3. Actualizar `TrabalhoCompleto.tsx`**
- Aceitar novo prop `editable?: boolean` e callback `onContentChange?: (sections: EditedSection[]) => void`
- Quando `editable=true`, renderizar `EditableSection` em vez do `SectionContent` estático
- Manter sincronização: alterações no `contentEditable` propagam para o estado pai

**4. Actualizar `TrabalhoPage.tsx` (fase resultado)**
- Adicionar toggle "Modo Edição" / "Modo Visualização" na barra de acções
- No modo edição, passar `editable={true}` ao `TrabalhoCompleto`
- Botão "Guardar Alterações" que actualiza o `resultadoCompilado` com o HTML editado
- As exportações PDF/Word usam sempre o conteúdo mais recente (editado)

**5. Actualizar `src/index.css`**
- Estilos para `contentEditable`: cursor de texto, outline sutil ao focar, highlight ao hover
- Estilos para a toolbar flutuante (sombra, fundo escuro, botões compactos)
- Placeholder visual quando uma secção está vazia

### Fluxo do Utilizador
```text
Trabalho compilado → Clica em qualquer texto na página A4
→ Cursor aparece, texto fica editável
→ Selecciona texto → Toolbar flutuante aparece (Bold, Italic, etc.)
→ Edita livremente → Clica "Guardar" ou exporta directamente
```

### Notas
- O `contentEditable` preserva a estrutura HTML existente (parágrafos, listas, subtítulos)
- A conversão HTML→Markdown para exportação Word será feita no momento da exportação
- Funciona em mobile com teclado virtual normalmente

