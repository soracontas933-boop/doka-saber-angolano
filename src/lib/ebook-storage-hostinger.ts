/**
 * Serviço de Armazenamento de Ebooks - Versão Hostinger
 * 
 * Este arquivo é uma versão adaptada do ebook-storage.ts para usar
 * o armazenamento da Hostinger em vez do Supabase Storage.
 * 
 * IMPORTANTE: Este arquivo é um guia para a migração. Você pode:
 * 1. Substituir o ebook-storage.ts original por este
 * 2. Ou manter ambos e usar um switch de configuração
 */

import { supabase } from "@/integrations/supabase/client";
import { createHostingerStorageClient, sanitizeFilename } from "./hostinger-storage";

export interface EbookUploadResult {
  success: boolean;
  fileUrl?: string;
  coverUrl?: string;
  error?: string;
}

export interface EbookDownloadResult {
  success: boolean;
  signedUrl?: string;
  error?: string;
}

/**
 * Determina se deve usar Hostinger ou Supabase
 * Pode ser controlado por uma variável de ambiente
 */
const USE_HOSTINGER = import.meta.env.VITE_USE_HOSTINGER_STORAGE === 'true';

/**
 * Upload de arquivo PDF para o armazenamento (Hostinger ou Supabase)
 * 
 * NOTA: Esta função é um placeholder. O upload real para a Hostinger
 * deve ser feito através de uma API de backend, não diretamente do frontend,
 * por razões de segurança.
 */
export const uploadEbookPDF = async (file: File): Promise<EbookUploadResult> => {
  try {
    if (!file || file.type !== "application/pdf") {
      return { success: false, error: "Arquivo deve ser um PDF válido" };
    }

    if (file.size > 100 * 1024 * 1024) {
      return { success: false, error: "Ficheiro não pode exceder 100MB" };
    }

    if (!USE_HOSTINGER) {
      // Usar Supabase (comportamento original)
      const filename = `book-${Date.now()}-${sanitizeFilename(file.name)}`;
      const storagePath = `files/${filename}`;

      const { error } = await supabase.storage.from("ebooks").upload(storagePath, file, {
        upsert: true,
        contentType: "application/pdf",
      });

      if (error) {
        return { success: false, error: `Erro ao enviar PDF: ${error.message}` };
      }

      const { data } = supabase.storage.from("ebooks").getPublicUrl(storagePath);
      return { success: true, fileUrl: data.publicUrl };
    } else {
      // Usar Hostinger (novo comportamento)
      // O upload deve ser feito através de uma API de backend
      const filename = `book-${Date.now()}-${sanitizeFilename(file.name)}`;
      const storagePath = `files/${filename}`;

      // Chamada para API de backend que fará o upload para a Hostinger
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', storagePath);
      formData.append('bucket', 'ebooks');

      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: `Erro ao enviar PDF: ${errorData.error || response.statusText}` };
      }

      const data = await response.json();
      return { success: true, fileUrl: data.fileUrl };
    }
  } catch (err) {
    return { success: false, error: `Erro inesperado: ${String(err)}` };
  }
};

/**
 * Upload de imagem de capa para o armazenamento (Hostinger ou Supabase)
 */
export const uploadEbookCover = async (file: File): Promise<EbookUploadResult> => {
  try {
    if (!file || !file.type.startsWith("image/")) {
      return { success: false, error: "Arquivo deve ser uma imagem válida" };
    }

    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: "Imagem não pode exceder 10MB" };
    }

    if (!USE_HOSTINGER) {
      // Usar Supabase (comportamento original)
      const filename = `cover-${Date.now()}-${sanitizeFilename(file.name)}`;
      const storagePath = `covers/${filename}`;

      const { error } = await supabase.storage.from("ebooks").upload(storagePath, file, {
        upsert: true,
        contentType: file.type || "image/jpeg",
      });

      if (error) {
        return { success: false, error: `Erro ao enviar capa: ${error.message}` };
      }

      const { data } = supabase.storage.from("ebooks").getPublicUrl(storagePath);
      return { success: true, coverUrl: data.publicUrl };
    } else {
      // Usar Hostinger (novo comportamento)
      const filename = `cover-${Date.now()}-${sanitizeFilename(file.name)}`;
      const storagePath = `covers/${filename}`;

      // Chamada para API de backend que fará o upload para a Hostinger
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', storagePath);
      formData.append('bucket', 'ebooks');

      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: `Erro ao enviar capa: ${errorData.error || response.statusText}` };
      }

      const data = await response.json();
      return { success: true, coverUrl: data.fileUrl };
    }
  } catch (err) {
    return { success: false, error: `Erro inesperado: ${String(err)}` };
  }
};

/**
 * Gera URL assinada para download de um ebook
 */
export const getEbookDownloadUrl = async (
  ficheiroPath: string,
  expirationSeconds: number = 300
): Promise<EbookDownloadResult> => {
  try {
    if (!USE_HOSTINGER) {
      // Usar Supabase (comportamento original)
      const bucket = ficheiroPath.startsWith("files/") ? "ebooks" : "book-files";

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(ficheiroPath, expirationSeconds);

      if (error || !data?.signedUrl) {
        return { success: false, error: "Não foi possível gerar URL de download" };
      }

      return { success: true, signedUrl: data.signedUrl };
    } else {
      // Usar Hostinger (novo comportamento)
      // Determina o bucket baseado no caminho
      let bucket = "ebooks";
      if (ficheiroPath.startsWith("hostinger-private://")) {
        const parts = ficheiroPath.split("://")[1].split("/");
        bucket = parts[0];
        ficheiroPath = parts.slice(1).join("/");
      }

      const client = createHostingerStorageClient(bucket);
      const result = await client.createSignedUrl(ficheiroPath, expirationSeconds);

      if (result.error || !result.data?.signedUrl) {
        return { success: false, error: "Não foi possível gerar URL de download" };
      }

      return { success: true, signedUrl: result.data.signedUrl };
    }
  } catch (err) {
    return { success: false, error: `Erro ao gerar URL: ${String(err)}` };
  }
};

/**
 * Deleta um arquivo do storage (não implementado para Hostinger por enquanto)
 */
export const deleteEbookFile = async (storagePath: string): Promise<boolean> => {
  try {
    if (!USE_HOSTINGER) {
      // Usar Supabase (comportamento original)
      const bucket = storagePath.startsWith("files/") ? "ebooks" : "book-files";
      const { error } = await supabase.storage.from(bucket).remove([storagePath]);
      return !error;
    } else {
      // Hostinger: deletar via API de backend
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
        },
        body: JSON.stringify({ path: storagePath }),
      });

      return response.ok;
    }
  } catch {
    return false;
  }
};

/**
 * Obtém informações de uso do storage (para monitoramento)
 */
export const getStorageStats = async (): Promise<{ totalSize: number; fileCount: number }> => {
  try {
    if (!USE_HOSTINGER) {
      // Usar Supabase (comportamento original)
      const { data, error } = await supabase.storage.from("ebooks").list("", {
        limit: 1000,
        offset: 0,
      });

      if (error || !data) {
        return { totalSize: 0, fileCount: 0 };
      }

      let totalSize = 0;
      let fileCount = 0;

      const countFiles = (files: any[]): void => {
        files.forEach((file) => {
          if (file.metadata?.size) {
            totalSize += file.metadata.size;
            fileCount++;
          }
        });
      };

      countFiles(data);

      return { totalSize, fileCount };
    } else {
      // Hostinger: obter stats via API de backend
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/storage-stats`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
        },
      });

      if (!response.ok) {
        return { totalSize: 0, fileCount: 0 };
      }

      const data = await response.json();
      return { totalSize: data.totalSize || 0, fileCount: data.fileCount || 0 };
    }
  } catch {
    return { totalSize: 0, fileCount: 0 };
  }
};
