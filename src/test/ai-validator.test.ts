import { fixMarkdownErrors, detectStrangeLanguage, validateAngolanContext } from "../lib/ai-validator";

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

  const input1 = "Este é um texto normal sobre Angola.";
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

// Executar testes
testFixMarkdownErrors();
testDetectStrangeLanguage();
testValidateAngolanContext();
