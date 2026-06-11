/**
 * Função Edge do Supabase: Proxy para Hostinger Storage
 * 
 * Esta função atua como intermediária entre o frontend e o armazenamento
 * da Hostinger, gerenciando autenticação, autorização e geração de URLs
 * assinadas para arquivos privados.
 * 
 * Endpoints:
 * - POST /api/signed-url: Gera URL assinada para um arquivo
 * - POST /api/upload: Faz upload de um arquivo
 * - DELETE /api/delete: Deleta um arquivo
 * - GET /api/storage-stats: Retorna estatísticas de storage
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-info, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
};

// Configuração da Hostinger (deve ser definida em variáveis de ambiente)
const HOSTINGER_API_KEY = Deno.env.get("HOSTINGER_API_KEY") || "";
const HOSTINGER_STORAGE_URL = Deno.env.get("HOSTINGER_STORAGE_URL") || "https://api.hostinger.com/v1/storage";
const HOSTINGER_PUBLIC_URL = Deno.env.get("HOSTINGER_PUBLIC_URL") || "https://cdn.seu-dominio.com/storage/public";
const HOSTINGER_PRIVATE_URL = Deno.env.get("HOSTINGER_PRIVATE_URL") || "https://api.seu-dominio.com/storage/private";

/**
 * Cria cliente Supabase com privilégios de admin
 */
function createSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Verifica se o usuário tem permissão para acessar um arquivo
 */
async function checkFileAccess(
  userId: string,
  bucket: string,
  filePath: string,
  supabase: any
): Promise<boolean> {
  try {
    // Diferentes regras de acesso por bucket
    switch (bucket) {
      case "ebooks":
      case "book-files": {
        // Usuário pode acessar se:
        // 1. É admin
        // 2. Possui o livro na biblioteca
        // 3. Criou o livro

        // Verificar se é admin
        const { data: adminRole } = await supabase
          .from("admin_roles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (adminRole) return true;

        // Verificar se possui o livro
        const bookIdMatch = filePath.match(/book-(\w+)/);
        if (bookIdMatch) {
          const { data: bookLibrary } = await supabase
            .from("book_library")
            .select("id")
            .eq("user_id", userId)
            .eq("book_id", bookIdMatch[1])
            .maybeSingle();

          if (bookLibrary) return true;
        }

        return false;
      }

      case "comprovativos": {
        // Usuário pode acessar apenas seus próprios comprovativos
        // ou se for admin
        const { data: adminRole } = await supabase
          .from("admin_roles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (adminRole) return true;

        // Comprovativos são organizados como: user_id/filename
        return filePath.startsWith(`${userId}/`);
      }

      case "avatars":
      case "button-covers":
      case "hero-images":
      case "landing-images": {
        // Arquivos públicos, qualquer um pode acessar
        return true;
      }

      default:
        return false;
    }
  } catch (err) {
    console.error("Erro ao verificar acesso:", err);
    return false;
  }
}

/**
 * Gera URL assinada para um arquivo privado
 * 
 * Nota: Esta é uma implementação simplificada. A implementação real
 * dependerá da API da Hostinger e de como ela suporta URLs assinadas.
 */
async function generateSignedUrl(
  bucket: string,
  filePath: string,
  expirationSeconds: number
): Promise<string> {
  // Implementação simplificada: retorna URL com token de acesso
  // Em produção, você precisará integrar com a API da Hostinger
  // para gerar URLs verdadeiramente assinadas

  const baseUrl = bucket.includes("private") ? HOSTINGER_PRIVATE_URL : HOSTINGER_PUBLIC_URL;
  const token = generateAccessToken(bucket, filePath, expirationSeconds);

  return `${baseUrl}/${filePath}?token=${token}&expires=${Date.now() + expirationSeconds * 1000}`;
}

/**
 * Gera um token de acesso para um arquivo
 * 
 * Nota: Esta é uma implementação simplificada usando base64.
 * Em produção, você deve usar JWT ou outro método seguro.
 */
function generateAccessToken(
  bucket: string,
  filePath: string,
  expirationSeconds: number
): string {
  const payload = {
    bucket,
    filePath,
    expiresAt: Date.now() + expirationSeconds * 1000,
  };

  return btoa(JSON.stringify(payload));
}

/**
 * Handler principal da função
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extrair token de autenticação
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createSupabaseAdmin();

    // Verificar token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const pathname = url.pathname;

    // Rotear para o endpoint apropriado
    if (pathname === "/api/signed-url" && req.method === "POST") {
      const { bucket, path, expirationSeconds = 300 } = await req.json();

      // Verificar permissões
      const hasAccess = await checkFileAccess(user.id, bucket, path, supabase);
      if (!hasAccess) {
        return new Response(
          JSON.stringify({ error: "Access denied" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Gerar URL assinada
      const signedUrl = await generateSignedUrl(bucket, path, expirationSeconds);

      return new Response(
        JSON.stringify({ signedUrl }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (pathname === "/api/upload" && req.method === "POST") {
      // Implementar upload para Hostinger
      // Nota: Isso é um placeholder. A implementação real dependerá
      // da API da Hostinger.

      return new Response(
        JSON.stringify({ error: "Upload endpoint not yet implemented" }),
        { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (pathname === "/api/delete" && req.method === "DELETE") {
      // Implementar delete para Hostinger
      // Nota: Isso é um placeholder.

      return new Response(
        JSON.stringify({ error: "Delete endpoint not yet implemented" }),
        { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (pathname === "/api/storage-stats" && req.method === "GET") {
      // Implementar stats para Hostinger
      // Nota: Isso é um placeholder.

      return new Response(
        JSON.stringify({ totalSize: 0, fileCount: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
