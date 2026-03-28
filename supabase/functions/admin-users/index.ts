import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminEmails = ["kenymatos943@gmail.com", "manuelmatosjose67@gmail.com"];
    if (!adminEmails.includes(caller.email || "")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all users with service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: { users }, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profiles for nome and telefone
    const { data: profiles } = await adminClient.from("profiles").select("id, nome, telefone");
    const profileMap: Record<string, { nome: string | null; telefone: string | null }> = {};
    for (const p of profiles || []) {
      profileMap[p.id] = { nome: p.nome, telefone: p.telefone };
    }

    // Return id -> email map + users array with profile data
    const emailMap: Record<string, string> = {};
    const usersList: { id: string; email: string; nome: string; telefone: string }[] = [];
    for (const u of users) {
      emailMap[u.id] = u.email || "";
      const profile = profileMap[u.id];
      usersList.push({
        id: u.id,
        email: u.email || "",
        nome: profile?.nome || "",
        telefone: profile?.telefone || "",
      });
    }

    return new Response(JSON.stringify({ emailMap, users: usersList }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
