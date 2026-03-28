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

// Mapeamento de nomes de eventos da Kuenha para os nossos eventos internos
const EVENT_ALIASES: Record<string, string> = {
  // Nomes exactos nossos
  "compra_realizada": "compra_realizada",
  "compra_abandonada": "compra_abandonada",
  "pagamento_referencia": "pagamento_referencia",
  "pagamento_express": "pagamento_express",
  "pagamento_internacional": "pagamento_internacional",
  "compra_iniciada": "compra_iniciada",
  // Kuenha status values (uppercase)
  "completed": "compra_realizada",
  "paid": "compra_realizada",
  "abandoned": "compra_abandonada",
  "cancelled": "compra_abandonada",
  "pending": "compra_iniciada",
  "pending_reference": "pagamento_referencia",
  "pending_express": "pagamento_express",
  "pending_international": "pagamento_internacional",
  // Variações da Kuenha (lowercase normalizado)
  "compre o prêmio": "compra_realizada",
  "compre o premio": "compra_realizada",
  "compra realizada": "compra_realizada",
  "via expresso": "pagamento_express",
  "via express": "pagamento_express",
  "expresso": "pagamento_express",
  "express": "pagamento_express",
  "compra abandonada": "compra_abandonada",
  "abandonada": "compra_abandonada",
  "referência": "pagamento_referencia",
  "referencia": "pagamento_referencia",
  "pagamento por referência": "pagamento_referencia",
  "pagamento por referencia": "pagamento_referencia",
  "internacional": "pagamento_internacional",
  "pagamento internacional": "pagamento_internacional",
  "compra iniciada": "compra_iniciada",
  "iniciada": "compra_iniciada",
};

// Mapeamento de nomes de planos (flexível)
const PLAN_ALIASES: Record<string, string> = {
  "basico": "basico",
  "básico": "basico",
  "basic": "basico",
  "intermedio": "intermedio",
  "intermédio": "intermedio",
  "intermediate": "intermedio",
  "profissional": "profissional",
  "professional": "profissional",
  "pro": "profissional",
  "premium": "premium",
  "gold": "premium",
};

const VALID_INTERNAL_EVENTS = [
  "compra_realizada",
  "compra_abandonada",
  "pagamento_referencia",
  "pagamento_express",
  "pagamento_internacional",
  "compra_iniciada",
];

const VALID_INTERNAL_PLANS = ["basico", "intermedio", "profissional", "premium"];

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

function normalizeEvent(raw: string): string | null {
  const lower = raw.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // remove accents for matching
  
  // Try exact match first (with accents preserved in alias keys)
  if (EVENT_ALIASES[raw.trim().toLowerCase()]) {
    return EVENT_ALIASES[raw.trim().toLowerCase()];
  }
  
  // Try without accents
  for (const [alias, internal] of Object.entries(EVENT_ALIASES)) {
    const aliasNorm = alias.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (lower === aliasNorm || lower.includes(aliasNorm) || aliasNorm.includes(lower)) {
      return internal;
    }
  }
  
  return null;
}

function normalizePlan(raw: string): string | null {
  const lower = raw.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Exact match first
  if (PLAN_ALIASES[raw.trim().toLowerCase()]) {
    return PLAN_ALIASES[raw.trim().toLowerCase()];
  }
  
  // Check if any alias is contained within the product name (e.g. "Doka Intermédio" contains "intermédio")
  for (const [alias, internal] of Object.entries(PLAN_ALIASES)) {
    const aliasNorm = alias.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (lower === aliasNorm || lower.includes(aliasNorm)) {
      return internal;
    }
  }
  
  return null;
}

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

    if (storedSecret && webhookSecret !== storedSecret) {
      console.log("Webhook rejected: invalid secret");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body - accept any format and try to extract fields
    const body = await req.json();
    console.log("Webhook received body:", JSON.stringify(body));

    // Kuenha sends nested structure: buyer.email, product.name, status
    // Also support flat structure as fallback
    const rawEvent = body.status || body.event || body.evento || body.type || body.action || "";
    const rawPlan = body.product?.name || body.plan || body.plano || body.produto || "";
    const rawEmail = body.buyer?.email || body.email || body.customer_email || body.cliente_email || body.buyer_email || "";
    const amount = body.total || body.valueInAOA || body.amount || body.valor || body.price || null;
    const reference = body.saleId || body.reference || body.referencia || body.ref || body.transaction_id || null;

    console.log(`Webhook parsed: event="${rawEvent}", plan="${rawPlan}", email="${rawEmail}"`);

    if (!rawEvent || !rawPlan || !rawEmail) {
      console.log("Webhook missing fields. Full body:", JSON.stringify(body));
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields",
          received_keys: Object.keys(body),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize event and plan names
    const event = normalizeEvent(rawEvent);
    if (!event) {
      console.log(`Webhook unknown event: "${rawEvent}"`);
      return new Response(
        JSON.stringify({ 
          error: `Unknown event: "${rawEvent}". Could not map to internal event.`,
          valid_examples: ["compra_realizada", "compre o prêmio", "via expresso", "compra abandonada", "referência", "internacional", "compra iniciada"],
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const plan = normalizePlan(rawPlan);
    if (!plan) {
      console.log(`Webhook unknown plan: "${rawPlan}"`);
      return new Response(
        JSON.stringify({ 
          error: `Unknown plan: "${rawPlan}". Could not map to internal plan.`,
          valid_examples: ["basico", "básico", "intermedio", "intermédio", "profissional", "premium"],
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = rawEmail.trim().toLowerCase();
    console.log(`Webhook normalized: event="${event}", plan="${plan}", email="${email}"`);

    // Find user by email
    const { data: userData } = await supabaseAdmin.rpc("find_user_by_email", {
      _email: email,
    });

    const user = userData?.[0];
    if (!user) {
      console.log(`Webhook user not found: ${email}`);
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

      console.log(`Webhook success: plan updated to ${plan} for ${email}`);

      return new Response(
        JSON.stringify({ success: true, action: "plan_updated", plan, email, original_event: rawEvent }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For all other events: notify admins
    const adminEmails = ["kenymatos943@gmail.com", "manuelmatosjose67@gmail.com"];
    
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

    console.log(`Webhook success: admins notified for event ${event} (original: "${rawEvent}")`);

    return new Response(
      JSON.stringify({ success: true, action: "admin_notified", event, plan, email, original_event: rawEvent }),
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
