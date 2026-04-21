import {
  fixMarkdownErrors,
  detectStrangeLanguage,
  validateAngolanContext,
  stripReasoningTags,
  stripMetaPhrases,
  stripSymbolNoise,
  detectArtifacts,
} from "../lib/ai-validator";

function testFixMarkdownErrors() {
  console.log("Testando fixMarkdownErrors...");

  const input1 = "```markdown --- \n# Título\n```";
  const output1 = fixMarkdownErrors(input1);
  console.log(!output1.includes("```markdown ---") ? "✅ Teste 1 Passou" : "❌ Teste 1 Falhou");

  const input2 = "#Título sem espaço";
  const output2 = fixMarkdownErrors(input2);
  console.log(output2.startsWith("# Título") ? "✅ Teste 2 Passou" : "❌ Teste 2 Falhou");

  const input3 = "```markdown\nConteúdo sem fechar";
  const output3 = fixMarkdownErrors(input3);
  console.log(output3.endsWith("```") ? "✅ Teste 3 Passou" : "❌ Teste 3 Falhou");
}

function testDetectStrangeLanguage() {
  console.log("\nTestando detectStrangeLanguage...");

  const input1 = "Este é um texto normal sobre Angola, com vários parágrafos e detalhes suficientes para passar a validação mínima de tamanho.";
  const errors1 = detectStrangeLanguage(input1);
  console.log(errors1.length === 0 ? "✅ Teste 1 Passou" : "❌ Teste 1 Falhou");

  const input2 = "o o o o o o o o o o";
  const errors2 = detectStrangeLanguage(input2);
  console.log(errors2.length > 0 ? "✅ Teste 2 Passou" : "❌ Teste 2 Falhou");

  const input3 = "asdfghjklmnbvcxz";
  const errors3 = detectStrangeLanguage(input3);
  console.log(errors3.length > 0 ? "✅ Teste 3 Passou" : "❌ Teste 3 Falhou");
}

function testValidateAngolanContext() {
  console.log("\nTestando validateAngolanContext...");

  const prompt = "Gera um trabalho sobre a história de Angola.";

  const input1 = "A história de Angola é rica e diversa, com Luanda sendo sua capital.";
  const errors1 = validateAngolanContext(input1, prompt);
  console.log(errors1.length === 0 ? "✅ Teste 1 Passou" : "❌ Teste 1 Falhou");

  const input2 = "A história da França é marcada pela revolução de 1789 em Paris.";
  const errors2 = validateAngolanContext(input2, prompt);
  console.log(errors2.length > 0 ? "✅ Teste 2 Passou" : "❌ Teste 2 Falhou");
}

function testStripReasoningTags() {
  console.log("\nTestando stripReasoningTags...");

  const input1 = "<think>devo começar pela introdução</think>\n# Introdução\nConteúdo real.";
  const out1 = stripReasoningTags(input1);
  console.log(!out1.includes("<think>") && out1.includes("Introdução") ? "✅ Teste 1 Passou" : "❌ Teste 1 Falhou");

  const input2 = "Reflexão: vou estruturar assim...\n# Conteúdo";
  const out2 = stripReasoningTags(input2);
  console.log(!out2.includes("Reflexão:") ? "✅ Teste 2 Passou" : "❌ Teste 2 Falhou");

  const input3 = "[REASONING]passo 1[/REASONING]\nTexto final.";
  const out3 = stripReasoningTags(input3);
  console.log(!out3.includes("REASONING") ? "✅ Teste 3 Passou" : "❌ Teste 3 Falhou");
}

function testStripMetaPhrases() {
  console.log("\nTestando stripMetaPhrases...");

  const input1 = "Aqui está o resumo solicitado:\n\n# Conteúdo real";
  const out1 = stripMetaPhrases(input1);
  console.log(out1.startsWith("#") ? "✅ Teste 1 Passou" : "❌ Teste 1 Falhou");

  const input2 = "Sure, here is the work:\n\nConteúdo";
  const out2 = stripMetaPhrases(input2);
  console.log(!out2.toLowerCase().includes("sure, here") ? "✅ Teste 2 Passou" : "❌ Teste 2 Falhou");

  const input3 = "Conteúdo principal\n\nEspero que ajude!";
  const out3 = stripMetaPhrases(input3);
  console.log(!out3.includes("Espero que ajude") ? "✅ Teste 3 Passou" : "❌ Teste 3 Falhou");
}

function testStripSymbolNoise() {
  console.log("\nTestando stripSymbolNoise...");

  const input1 = "Texto && mais texto &&&& fim";
  const out1 = stripSymbolNoise(input1);
  console.log(!out1.includes("&&&&") ? "✅ Teste 1 Passou" : "❌ Teste 1 Falhou");

  const input2 = "Linha 1\n////////\nLinha 2";
  const out2 = stripSymbolNoise(input2);
  console.log(!out2.includes("////////") ? "✅ Teste 2 Passou" : "❌ Teste 2 Falhou");

  const input3 = "Antes\n---\nDepois";
  const out3 = stripSymbolNoise(input3);
  console.log(out3.includes("---") ? "✅ Teste 3 Passou (preserva hr)" : "❌ Teste 3 Falhou");
}

function testDetectArtifacts() {
  console.log("\nTestando detectArtifacts...");

  const input1 = "<think>oi</think>\nConteúdo";
  const errors1 = detectArtifacts(input1);
  console.log(errors1.length > 0 ? "✅ Teste 1 Passou" : "❌ Teste 1 Falhou");

  const input2 = "Aqui está o resumo:\nConteúdo";
  const errors2 = detectArtifacts(input2);
  console.log(errors2.length > 0 ? "✅ Teste 2 Passou" : "❌ Teste 2 Falhou");
}

// Executar
testFixMarkdownErrors();
testDetectStrangeLanguage();
testValidateAngolanContext();
testStripReasoningTags();
testStripMetaPhrases();
testStripSymbolNoise();
testDetectArtifacts();
