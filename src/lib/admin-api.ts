import { supabase } from "@/integrations/supabase/client";

export interface AdminUsersResponse {
  emailMap: Record<string, string>;
  users: {
    id: string;
    email: string;
    nome: string;
    telefone: string;
  }[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    hasNextPage: boolean;
  };
}

export async function fetchAdminUsers(page = 1, perPage = 100, search = "", userIds = ""): Promise<AdminUsersResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Não autenticado");

    const params = new URLSearchParams({
      page: Math.max(1, page).toString(),
      perPage: Math.max(1, Math.min(1000, perPage)).toString(),
    });
    if (search) params.set("search", search.trim());
    if (userIds) params.set("userIds", userIds);

    const { data, error } = await supabase.functions.invoke(`admin-users?${params.toString()}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw error;
    
    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error("Resposta inválida do servidor");
    }

    const response: AdminUsersResponse = {
      users: Array.isArray(data.users) ? data.users : [],
      pagination: {
        page: typeof data.pagination?.page === 'number' ? data.pagination.page : page,
        perPage: typeof data.pagination?.perPage === 'number' ? data.pagination.perPage : perPage,
        total: typeof data.pagination?.total === 'number' ? data.pagination.total : 0,
        hasNextPage: Boolean(data.pagination?.hasNextPage),
      },
      emailMap: typeof data.emailMap === 'object' ? data.emailMap : {},
    };

    return response;
  } catch (err) {
    console.error("Erro em fetchAdminUsers:", err);
    throw err;
  }
}

export async function fetchAllAdminUsers(): Promise<{ id: string; email: string; nome: string; telefone: string }[]> {
  let allUsers: any[] = [];
  let page = 1;
  let hasNext = true;
  let attempts = 0;
  const maxAttempts = 100;

  while (hasNext && attempts < maxAttempts) {
    try {
      const res = await fetchAdminUsers(page, 1000); // Edge function handles up to 1000 per supabase limit
      if (res.users && Array.isArray(res.users)) {
        allUsers = [...allUsers, ...res.users];
      }
      hasNext = res.pagination.hasNextPage;
      page++;
      attempts++;
    } catch (err) {
      console.error(`Erro ao buscar página ${page}:`, err);
      hasNext = false; // Stop on error
    }
  }

  return allUsers;
}
