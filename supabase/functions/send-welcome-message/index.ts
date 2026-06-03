import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface WebhookPayload {
  type: string;
  record: {
    id: string;
    email: string;
    created_at: string;
  };
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload: WebhookPayload = await req.json();

    if (payload.type !== "INSERT") {
      return new Response("Not an insert event", { status: 200 });
    }

    const userId = payload.record.id;

    // Get user profile to get the name
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome")
      .eq("id", userId)
      .single();

    const userName = profile?.nome || "Usuário";

    // Create a support conversation for the new user
    const { data: conversation, error: convError } = await supabase
      .from("support_messages")
      .insert({
        user_id: userId,
        assunto: "Bem-vindo à Delle!",
        mensagem: "Mensagem de boas-vindas automática",
        estado: "aberto",
      })
      .select("id")
      .single();

    if (convError) {
      console.error("Error creating support conversation:", convError);
      return new Response(
        JSON.stringify({ error: "Failed to create conversation" }),
        { status: 500 }
      );
    }

    // Insert the welcome message into chat_messages
    const welcomeMessage = `👋 Olá! Bem-vindo à Delle! ${userName}

Eu sou o assistente da plataforma e vou te ajudar a criar trabalhos escolares, resumos, questionários, planos de aula, currículos e muito mais em poucos segundos.

💡 Tudo funciona com créditos — cada geração usa uma pequena parte do seu saldo.

💳 Se os créditos acabarem, é só ir em **Saldo** e escolher um plano para continuar usando normalmente.

🚀 Sempre que precisar, estou aqui para te ajudar!`;

    const { error: messageError } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: conversation.id,
        sender_id: "00000000-0000-0000-0000-000000000000", // System/Support ID
        content: welcomeMessage,
      });

    if (messageError) {
      console.error("Error creating welcome message:", messageError);
      return new Response(
        JSON.stringify({ error: "Failed to create welcome message" }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Welcome message sent successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-welcome-message function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
