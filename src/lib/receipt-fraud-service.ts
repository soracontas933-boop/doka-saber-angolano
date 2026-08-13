import { supabase } from "@/integrations/supabase/client";

export interface FraudAnalysisResult {
  isSuspicious: boolean;
  confidence: number;
  reason?: string;
  details?: {
    edited?: boolean;
    mismatchedValue?: boolean;
    duplicate?: boolean;
    extractedText?: string;
  };
}

const FRAUD_SYSTEM_PROMPT = `
Você é um especialista em detecção de fraudes bancárias e análise forense de documentos digitais.
Sua tarefa é analisar o comprovativo de transferência bancária enviado e identificar sinais de falsificação.

SINAIS DE ALERTA:
1. Edição de imagem: fontes inconsistentes, desalinhamento de texto, artefatos de compressão em áreas específicas (como o valor ou data).
2. Inconsistência de dados: o valor no comprovativo não corresponde ao valor solicitado.
3. Elementos ausentes: falta de logotipos oficiais, números de transação ou carimbos digitais esperados em bancos angolanos (BAI, BFA, BIC, etc.).
4. Reuso: o comprovativo parece ser uma captura de tela de outra transação ou de um vídeo.

Responda APENAS com um objeto JSON no seguinte formato:
{
  "isSuspicious": boolean,
  "confidence": number (0 a 1),
  "reason": "breve explicação em português",
  "details": {
    "edited": boolean,
    "mismatchedValue": boolean,
    "extractedValue": number,
    "bankName": "string"
  }
}
`;

export async function analyzeReceiptFraud(
  fileUrl: string,
  expectedValue: number
): Promise<FraudAnalysisResult> {
  try {
    // 1. Verificar duplicados por hash ou URL (opcional, simplificado aqui)
    
    // 2. Chamar a IA Vision para análise profunda
    // Usaremos a Edge Function 'ocr-extract' que já existe ou criaremos uma nova específica.
    // Como o projeto já tem 'ocr-extract', vamos ver se podemos usá-la ou se precisamos de uma chamada direta.
    
    const { data, error } = await supabase.functions.invoke("ai-proxy", {
      body: {
        messages: [
          { role: "system", content: FRAUD_SYSTEM_PROMPT },
          { 
            role: "user", 
            content: [
              { type: "text", text: `Analise este comprovativo. O valor esperado é ${expectedValue} Kz.` },
              { type: "image_url", image_url: { url: fileUrl } }
            ]
          }
        ],
        service: "gemini-vision", // Ou outro modelo vision disponível no proxy
        temperature: 0.1
      }
    });

    if (error || !data?.content) {
      console.error("Erro na análise de fraude:", error);
      return { isSuspicious: false, confidence: 0, reason: "Falha na análise técnica" };
    }

    const result = JSON.parse(data.content.replace(/```json|```/g, "").trim());
    
    // Validação adicional de valor
    if (result.details?.extractedValue && Math.abs(result.details.extractedValue - expectedValue) > 1) {
      result.isSuspicious = true;
      result.details.mismatchedValue = true;
      result.reason = (result.reason || "") + " | O valor no documento não coincide com o valor do plano.";
    }

    return result;
  } catch (err) {
    console.error("Erro ao processar análise de fraude:", err);
    return { isSuspicious: false, confidence: 0, reason: "Erro interno no processamento" };
  }
}

export async function saveFraudAnalysis(paymentId: string, analysis: FraudAnalysisResult) {
  const { error } = await (supabase.from("payment_requests") as any)
    .update({
      fraud_analysis: analysis,
      atualizado_em: new Date().toISOString()
    })
    .eq("id", paymentId);
    
  if (error) console.error("Erro ao salvar análise de fraude:", error);
}
