import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const PLAN_CONFIGS: Record<string, {
  limite_trabalhos: number;
  limite_resumos: number;
  limite_questionarios: number;
  limite_planos_aula: number;
  limite_tfc: number;
  creditos_totais: number;
  suporte_prioritario: boolean;
}> = {
  basico: {
    limite_trabalhos: 3,
    limite_resumos: 4,
    limite_questionarios: -1,
    limite_planos_aula: 0,
    limite_tfc: 0,
    creditos_totais: 0,
    suporte_prioritario: false,
  },
  intermedio: {
    limite_trabalhos: 5,
    limite_resumos: 7,
    limite_questionarios: 7,
    limite_planos_aula: 5,
    limite_tfc: 2,
    creditos_totais: 300,
    suporte_prioritario: false,
  },
  profissional: {
    limite_trabalhos: 10,
    limite_resumos: 16,
    limite_questionarios: 16,
    limite_planos_aula: 10,
    limite_tfc: 8,
    creditos_totais: 500,
    suporte_prioritario: false,
  },
  premium: {
    limite_trabalhos: -1,
    limite_resumos: -1,
    limite_questionarios: -1,
    limite_planos_aula: -1,
    limite_tfc: -1,
    creditos_totais: -1,
    suporte_prioritario: true,
  },
};

const VALID_EVENTS = [
  "compra_realizada",
  "compra_abandonada",
  "pagamento_referencia",
  "pagamento_express",
  "pagamento_internacional",
  "compra_iniciada",
] as const;

const VALID_PLANS = ["basico", "intermedio", "profissional", "premium"] as const;

const PLAN_LABELS: Record<string, string> = {
  basico: "Básico",
  intermedio: "Intermédio",
  profissional: "Profissional",
  premium: "Premium",
};

const EVENT_LABELS: Record<string, string> = {
  compra_realizada: "Compra Realizada",
  compra_abandonada: "Compra Abandonada",
  pagamento_referencia: "Pagamento por Referência",
  pagamento_express: "Pagamento via Express",
  pagamento_internacional: "Pagamento Internacional",
  compra_iniciada: "Compra Iniciada",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate webhook secret
    const webhookSecret = req.headers.get("x-webhook-secret") || "";

    const { data: secretRow } = await supabaseAdmin
      .from("payment_settings")
      .select("valor")
      .eq("chave", "webhook_secret")
      .single();

    const storedSecret = secretRow?.valor || "";

    if (!storedSecret || webhookSecret !== storedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate body
    const body = await req.json();
    const { event, plan, email, amount, reference } = body;

    if (!event || !plan || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: event, plan, email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!VALID_EVENTS.includes(event)) {
      return new Response(
        JSON.stringify({ error: `Invalid event. Valid: ${VALID_EVENTS.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!VALID_PLANS.includes(plan)) {
      return new Response(
        JSON.stringify({ error: `Invalid plan. Valid: ${VALID_PLANS.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find user by email
    const { data: userData } = await supabaseAdmin.rpc("find_user_by_email", {
      _email: email,
    });

    const user = userData?.[0];
    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found with this email" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.user_id;
    const planConfig = PLAN_CONFIGS[plan];
    const planLabel = PLAN_LABELS[plan] || plan;
    const eventLabel = EVENT_LABELS[event] || event;

    if (event === "compra_realizada") {
      // Auto-update plan + reset credits
      const { error: updateError } = await supabaseAdmin
        .from("user_plans")
        .update({
          plano: plan,
          limite_trabalhos: planConfig.limite_trabalhos,
          limite_resumos: planConfig.limite_resumos,
          limite_questionarios: planConfig.limite_questionarios,
          limite_planos_aula: planConfig.limite_planos_aula,
          limite_tfc: planConfig.limite_tfc,
          creditos_totais: planConfig.creditos_totais,
          creditos_usados: 0,
          suporte_prioritario: planConfig.suporte_prioritario,
          pago_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
          periodo_inicio: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating plan:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update plan" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Notify user
      await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        titulo: "Plano Activado! 🎉",
        mensagem: `O seu plano ${planLabel} foi activado automaticamente. Os seus créditos e limites foram actualizados. Aproveite!`,
        tipo: "sucesso",
      });

      return new Response(
        JSON.stringify({ success: true, action: "plan_updated", plan, email }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For all other events: notify admins
    // Get admin user IDs
    const { data: adminProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id");

    // We need to find admin emails — use the is_admin function logic
    const adminEmails = ["kenymatos943@gmail.com", "manuelmatosjose67@gmail.com"];
    
    // Get admin user IDs from auth
    for (const adminEmail of adminEmails) {
      const { data: adminUser } = await supabaseAdmin.rpc("find_user_by_email", {
        _email: adminEmail,
      });

      if (adminUser?.[0]) {
        const amountStr = amount ? ` | Valor: ${amount} Kz` : "";
        const refStr = reference ? ` | Ref: ${reference}` : "";

        await supabaseAdmin.from("notifications").insert({
          user_id: adminUser[0].user_id,
          titulo: `⚠️ Evento de Pagamento: ${eventLabel}`,
          mensagem: `Email: ${email} | Plano: ${planLabel}${amountStr}${refStr}. Verifique e confirme manualmente o reset de créditos se necessário.`,
          tipo: "aviso",
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, action: "admin_notified", event, plan, email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
