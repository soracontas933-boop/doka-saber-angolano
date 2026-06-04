/**
 * Serviço de Armazenamento de Ebooks
 * 
 * Centraliza toda a lógica de upload, download e gerenciamento de ebooks
 * no Supabase Storage, seguindo a arquitetura otimizada:
 * - PDFs → ebooks/files/
 * - Capas → ebooks/covers/
 * - Banco de dados → apenas URLs públicas e metadados
 */

import { supabase } from "@/integrations/supabase/client";

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

/**
 * Upload de arquivo PDF para o bucket 'ebooks'
 */
export const uploadEbookPDF = async (file: File): Promise<EbookUploadResult> => {
  try {
    if (!file || file.type !== "application/pdf") {
      return { success: false, error: "Arquivo deve ser um PDF válido" };
    }

    if (file.size > 100 * 1024 * 1024) {
      return { success: false, error: "Ficheiro não pode exceder 100MB" };
    }

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
  } catch (err) {
    return { success: false, error: `Erro inesperado: ${String(err)}` };
  }
};

/**
 * Upload de imagem de capa para o bucket 'ebooks'
 */
export const uploadEbookCover = async (file: File): Promise<EbookUploadResult> => {
  try {
    if (!file || !file.type.startsWith("image/")) {
      return { success: false, error: "Arquivo deve ser uma imagem válida" };
    }

    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: "Imagem não pode exceder 10MB" };
    }

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
  } catch (err) {
    return { success: false, error: `Erro inesperado: ${String(err)}` };
  }
};

/**
 * Gera URL assinada para download de um ebook
 * Suporta tanto o novo bucket 'ebooks' quanto o antigo 'book-files' para compatibilidade
 */
export const getEbookDownloadUrl = async (
  ficheiroPath: string,
  expirationSeconds: number = 300
): Promise<EbookDownloadResult> => {
  try {
    // Determina qual bucket usar baseado no caminho
    const bucket = ficheiroPath.startsWith("files/") ? "ebooks" : "book-files";

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(ficheiroPath, expirationSeconds);

    if (error || !data?.signedUrl) {
      return { success: false, error: "Não foi possível gerar URL de download" };
    }

    return { success: true, signedUrl: data.signedUrl };
  } catch (err) {
    return { success: false, error: `Erro ao gerar URL: ${String(err)}` };
  }
};

/**
 * Deleta um arquivo do storage
 */
export const deleteEbookFile = async (storagePath: string): Promise<boolean> => {
  try {
    const bucket = storagePath.startsWith("files/") ? "ebooks" : "book-files";
    const { error } = await supabase.storage.from(bucket).remove([storagePath]);
    return !error;
  } catch {
    return false;
  }
};

/**
 * Obtém informações de uso do storage (para monitoramento)
 */
export const getStorageStats = async (): Promise<{ totalSize: number; fileCount: number }> => {
  try {
    // Listar todos os arquivos no bucket 'ebooks'
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
  } catch {
    return { totalSize: 0, fileCount: 0 };
  }
};
