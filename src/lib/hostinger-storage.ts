/**
 * Serviço de Armazenamento da Hostinger
 * 
 * Centraliza toda a lógica de acesso a arquivos armazenados na Hostinger,
 * substituindo o Supabase Storage com as mesmas interfaces.
 * 
 * Estratégia:
 * - Arquivos públicos: URLs diretas do CDN da Hostinger
 * - Arquivos privados: URLs assinadas geradas via API de proxy
 */

import { supabase } from "@/integrations/supabase/client";

export interface HostingerUploadResult {
  success: boolean;
  fileUrl?: string;
  coverUrl?: string;
  error?: string;
}

export interface HostingerDownloadResult {
  success: boolean;
  signedUrl?: string;
  error?: string;
}

/**
 * Configuração dos buckets e seus tipos de acesso
 */
const BUCKET_CONFIG: Record<string, { type: 'public' | 'private'; hostingerBucket: string }> = {
  'ebooks': { type: 'private', hostingerBucket: 'doka-private' },
  'book-covers': { type: 'public', hostingerBucket: 'doka-public' },
  'book-files': { type: 'private', hostingerBucket: 'doka-private' },
  'comprovativos': { type: 'private', hostingerBucket: 'doka-private' },
  'book-receipts': { type: 'private', hostingerBucket: 'doka-private' },
  'button-covers': { type: 'public', hostingerBucket: 'doka-public' },
  'hero-images': { type: 'public', hostingerBucket: 'doka-public' },
  'landing-images': { type: 'public', hostingerBucket: 'doka-public' },
  'avatars': { type: 'public', hostingerBucket: 'doka-public' },
};

/**
 * Obtém a URL base da Hostinger para um bucket
 */
function getHostingerBaseUrl(bucket: string): string {
  const config = BUCKET_CONFIG[bucket];
  if (!config) {
    throw new Error(`Bucket desconhecido: ${bucket}`);
  }

  const baseUrl = config.type === 'public'
    ? import.meta.env.VITE_HOSTINGER_PUBLIC_URL || 'https://cdn.seu-dominio.com/storage/public'
    : import.meta.env.VITE_HOSTINGER_PRIVATE_URL || 'https://api.seu-dominio.com/storage/private';

  return baseUrl;
}

/**
 * Obtém a URL pública de um arquivo
 * Para arquivos públicos, retorna a URL direta
 * Para arquivos privados, retorna uma URL que requer assinatura
 */
export function getPublicUrl(bucket: string, path: string): { publicUrl: string } {
  const config = BUCKET_CONFIG[bucket];
  if (!config) {
    throw new Error(`Bucket desconhecido: ${bucket}`);
  }

  if (config.type === 'public') {
    const baseUrl = getHostingerBaseUrl(bucket);
    return {
      publicUrl: `${baseUrl}/${path}`,
    };
  } else {
    // Para arquivos privados, retornamos uma URL de placeholder
    // que será substituída por uma URL assinada quando necessário
    return {
      publicUrl: `hostinger-private://${bucket}/${path}`,
    };
  }
}

/**
 * Gera uma URL assinada para um arquivo privado
 * Faz uma chamada à API de proxy da Hostinger
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expirationSeconds: number = 300
): Promise<HostingerDownloadResult> {
  try {
    const config = BUCKET_CONFIG[bucket];
    if (!config) {
      return { success: false, error: `Bucket desconhecido: ${bucket}` };
    }

    if (config.type === 'public') {
      // Para arquivos públicos, retornamos a URL direta
      const baseUrl = getHostingerBaseUrl(bucket);
      return { success: true, signedUrl: `${baseUrl}/${path}` };
    }

    // Para arquivos privados, chamamos a API de proxy
    const apiUrl = import.meta.env.VITE_HOSTINGER_SIGNED_URL_API || 'https://api.seu-dominio.com/api/signed-url';
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        bucket,
        path,
        expirationSeconds,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `Erro ao gerar URL assinada: ${errorData.error || response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      signedUrl: data.signedUrl,
    };
  } catch (err) {
    return {
      success: false,
      error: `Erro ao gerar URL assinada: ${String(err)}`,
    };
  }
}

/**
 * Wrapper compatível com a interface do Supabase Storage
 * Substitui supabase.storage.from(bucket).getPublicUrl(path)
 */
export function createHostingerStorageClient(bucket: string) {
  return {
    getPublicUrl: (path: string) => ({
      data: getPublicUrl(bucket, path),
    }),
    createSignedUrl: async (path: string, expirationSeconds: number = 300) => {
      const result = await getSignedUrl(bucket, path, expirationSeconds);
      if (result.success) {
        return {
          data: { signedUrl: result.signedUrl },
          error: null,
        };
      } else {
        return {
          data: null,
          error: new Error(result.error),
        };
      }
    },
  };
}

/**
 * Função auxiliar para converter URLs do Supabase para Hostinger
 * Útil durante a migração para atualizar URLs no banco de dados
 */
export function convertSupabaseUrlToHostinger(supabaseUrl: string, bucket: string): string {
  // Exemplo: https://xxxx.supabase.co/storage/v1/object/public/ebooks/files/book-123.pdf
  // Converter para: https://cdn.seu-dominio.com/storage/public/files/book-123.pdf

  const config = BUCKET_CONFIG[bucket];
  if (!config) {
    return supabaseUrl; // Retorna URL original se bucket desconhecido
  }

  // Extrai o caminho do arquivo da URL do Supabase
  const urlParts = supabaseUrl.split(`/${bucket}/`);
  if (urlParts.length < 2) {
    return supabaseUrl;
  }

  const filePath = urlParts[1];
  const baseUrl = getHostingerBaseUrl(bucket);

  return `${baseUrl}/${filePath}`;
}

/**
 * Sanitiza nomes de arquivo para uso no storage
 */
export const sanitizeFilename = (name: string): string => {
  const ext = name.split(".").pop();
  const base = name.split(".").slice(0, -1).join(".");
  const cleanBase = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 50);
  return `${cleanBase}.${ext}`;
};
