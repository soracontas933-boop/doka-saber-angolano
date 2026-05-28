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

export async function fetchAdminUsers(page = 1, perPage = 100, search = ""): Promise<AdminUsersResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");

  const { data, error } = await supabase.functions.invoke("admin-users", {
    headers: { Authorization: `Bearer ${session.access_token}` },
    query: {
      page: page.toString(),
      perPage: perPage.toString(),
      search: search
    }
  });

  if (error) throw error;
  return data as AdminUsersResponse;
}

export async function fetchAllAdminUsers(): Promise<{ id: string; email: string; nome: string; telefone: string }[]> {
  let allUsers: any[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const res = await fetchAdminUsers(page, 1000); // Edge function handles up to 1000 per supabase limit
    allUsers = [...allUsers, ...res.users];
    hasNext = res.pagination.hasNextPage;
    page++;
    
    // Safety break to prevent infinite loops
    if (page > 100) break;
  }

  return allUsers;
}
