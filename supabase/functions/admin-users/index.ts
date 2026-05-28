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
    if (!authHeader) throw new Error("Missing Authorization header");

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
    
    // Also check admin_roles table for authorized users
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: adminRole } = await adminClient
      .from("admin_roles")
      .select("id")
      .eq("user_id", caller.id)
      .single();

    if (!adminEmails.includes(caller.email || "") && !adminRole) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get params from query or body
    let page = 1;
    let perPage = 100;
    let search = "";
    let userIds: string[] = [];

    const url = new URL(req.url);
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      page = body.page || parseInt(url.searchParams.get("page") || "1");
      perPage = body.perPage || parseInt(url.searchParams.get("perPage") || "100");
      search = body.query || body.search || url.searchParams.get("search") || "";
      userIds = body.userIds || [];
    } else {
      page = parseInt(url.searchParams.get("page") || "1");
      perPage = parseInt(url.searchParams.get("perPage") || "100");
      search = url.searchParams.get("search") || "";
      const idsParam = url.searchParams.get("userIds");
      if (idsParam) userIds = idsParam.split(",");
    }

    let users = [];
    let totalCount = 0;

    if (userIds.length > 0) {
      // Fetch specific users
      for (const id of userIds) {
        const { data: { user }, error } = await adminClient.auth.admin.getUserById(id);
        if (user) users.push(user);
      }
      totalCount = users.length;
    } else {
      // List users with pagination
      // Note: Supabase admin.listUsers doesn't support server-side search yet, 
      // so we fetch and filter if search is provided, or just paginate.
      
      if (search) {
        // If searching, we have to fetch more and filter manually because Auth API is limited
        // For better performance with many users, search should be done on the profiles table first
        const { data: profileMatches } = await adminClient
          .from("profiles")
          .select("id")
          .or(`nome.ilike.%${search}%,telefone.ilike.%${search}%`)
          .limit(100);
        
        const matchedIds = (profileMatches || []).map(p => p.id);
        
        // Also fetch from Auth to find by email
        const { data: { users: allUsers } } = await adminClient.auth.admin.listUsers({
          perPage: 1000
        });
        
        const filteredUsers = allUsers.filter(u => 
          matchedIds.includes(u.id) || 
          (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
        );
        
        totalCount = filteredUsers.length;
        users = filteredUsers.slice((page - 1) * perPage, page * perPage);
      } else {
        const { data: { users: paginatedUsers }, error } = await adminClient.auth.admin.listUsers({
          page: page,
          perPage: perPage,
        });
        if (error) throw error;
        users = paginatedUsers;
        
        const { count } = await adminClient
          .from("profiles")
          .select("*", { count: "exact", head: true });
        totalCount = count || 0;
      }
    }

    // Fetch profiles for the resulting users
    const resultIds = users.map(u => u.id);
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, nome, telefone")
      .in("id", resultIds);

    const profileMap: Record<string, { nome: string | null; telefone: string | null }> = {};
    for (const p of profiles || []) {
      profileMap[p.id] = { nome: p.nome, telefone: p.telefone };
    }

    const emailMap: Record<string, string> = {};
    const usersList: any[] = [];
    
    for (const u of users) {
      emailMap[u.id] = u.email || "";
      const profile = profileMap[u.id];
      usersList.push({
        id: u.id,
        email: u.email || "",
        nome: profile?.nome || "",
        telefone: profile?.telefone || "",
        created_at: u.created_at
      });
    }

    return new Response(JSON.stringify({ 
      emailMap, 
      users: usersList,
      pagination: {
        page,
        perPage,
        total: totalCount,
        hasNextPage: page * perPage < totalCount
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
