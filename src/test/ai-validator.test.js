function fixMarkdownErrors(content) {
  let fixed = content;
  fixed = fixed.replace(/```markdown\s*---/g, "---");
  fixed = fixed.replace(/```markdown\s*```/g, "```");
  fixed = fixed.replace(/```markdown\s*markdown/g, "```markdown");
  const codeBlockCount = (fixed.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) {
    fixed += "\n```";
  }
  fixed = fixed.replace(/^(#{1,6})([^#\s].*)$/gm, "$1 $2");
  return fixed;
}

function detectStrangeLanguage(content) {
  const errors = [];
  const wordRepetitionMatch = content.match(/\b(\w+)\b(?:\s+\1\b){4,}/gi);
  if (wordRepetitionMatch) {
    errors.push("Repetição excessiva de palavras detetada.");
  }
  const gibberishMatch = content.match(/[bcdfghjklmnpqrstvwxyz]{10,}/gi);
  if (gibberishMatch) {
    errors.push("Sequência de caracteres sem sentido detetada.");
  }
  if (content.length < 100) {
    errors.push("Conteúdo excessivamente curto.");
  }
  return errors;
}

function validateAngolanContext(content, prompt) {
  const errors = [];
  const isAngolanPrompt = prompt.toLowerCase().includes("angola") || 
                          prompt.toLowerCase().includes("angolano");
  if (isAngolanPrompt) {
    const angolanKeywords = ["Angola", "Luanda", "Benguela", "Huambo", "Lubango", "Kwanza", "província", "município"];
    const hasKeywords = angolanKeywords.some(key => content.includes(key));
    if (!hasKeywords) {
      errors.push("Contexto angolano parece estar ausente no conteúdo gerado.");
    }
  }
  return errors;
}

function testFixMarkdownErrors() {
  console.log("Testando fixMarkdownErrors...");
  const input1 = "```markdown --- \n# Título\n```";
  const output1 = fixMarkdownErrors(input1);
  console.log(output1.includes("---") && !output1.includes("```markdown ---") ? "✅ Teste 1 Passou" : "❌ Teste 1 Falhou");
  const input2 = "#Título sem espaço";
  const output2 = fixMarkdownErrors(input2);
  console.log(output2.startsWith("# Título") ? "✅ Teste 2 Passou" : "❌ Teste 2 Falhou");
  const input3 = "```markdown\nConteúdo sem fechar";
  const output3 = fixMarkdownErrors(input3);
  console.log(output3.endsWith("```") ? "✅ Teste 3 Passou" : "❌ Teste 3 Falhou");
}

function testDetectStrangeLanguage() {
  console.log("\nTestando detectStrangeLanguage...");
  const input1 = "Este é um texto normal sobre Angola. ".repeat(5);
  const errors1 = detectStrangeLanguage(input1);
  console.log(errors1.length === 0 ? "✅ Teste 1 Passou (Texto normal)" : "❌ Teste 1 Falhou");
  const input2 = "o o o o o o o o o o";
  const errors2 = detectStrangeLanguage(input2);
  console.log(errors2.length > 0 ? "✅ Teste 2 Passou (Repetição detetada)" : "❌ Teste 2 Falhou");
  const input3 = "asdfghjklmnbvcxz";
  const errors3 = detectStrangeLanguage(input3);
  console.log(errors3.length > 0 ? "✅ Teste 3 Passou (Gibberish detetado)" : "❌ Teste 3 Falhou");
}

function testValidateAngolanContext() {
  console.log("\nTestando validateAngolanContext...");
  const prompt = "Gera um trabalho sobre a história de Angola.";
  const input1 = "A história de Angola é rica e diversa, com Luanda sendo sua capital.";
  const errors1 = validateAngolanContext(input1, prompt);
  console.log(errors1.length === 0 ? "✅ Teste 1 Passou (Contexto presente)" : "❌ Teste 1 Falhou");
  const input2 = "A história da França é marcada pela revolução de 1789 em Paris.";
  const errors2 = validateAngolanContext(input2, prompt);
  console.log(errors2.length > 0 ? "✅ Teste 2 Passou (Contexto ausente detetado)" : "❌ Teste 2 Falhou");
}

testFixMarkdownErrors();
testDetectStrangeLanguage();
testValidateAngolanContext();
