import { SupabaseClient } from "@supabase/supabase-js";

const CACHE_KEY = 'livros_cache';
const CACHE_TIME_KEY = 'livros_cache_time';
const TTL = 1000 * 60 * 30; // Cache válido por 30 minutos

interface Book {
  id: string;
  titulo: string;
  autor: string;
  descricao: string | null;
  capa_url: string | null;
  category_id: string | null;
  gratuito: boolean;
  preco_kz: number;
  preco_creditos: number;
  paginas: number | null;
  destaque: boolean;
  downloads: number;
  criado_em?: string;
  publicado?: boolean;
}

export async function getLivrosComCache(supabase: SupabaseClient): Promise<Book[]> {
  const cached = localStorage.getItem(CACHE_KEY);
  const cacheTime = localStorage.getItem(CACHE_TIME_KEY);

  if (cached && cacheTime && Date.now() - Number(cacheTime) < TTL) {
    console.log("Livros carregados do cache.");
    return JSON.parse(cached); // Retorna do cache, sem chamar Supabase
  }

  console.log("Cache de livros expirado ou inexistente, buscando no Supabase...");
  // Cache expirado ou inexistente — vai buscar ao Supabase
  const { data, error } = await supabase
    .from('books') // ajustado para 'books' conforme análise
    .select('id, titulo, autor, descricao, capa_url, category_id, gratuito, preco_kz, preco_creditos, paginas, destaque, downloads, criado_em, publicado'); // todos os campos necessários

  if (error) {
    console.error("Erro ao buscar livros do Supabase:", error);
    throw error;
  }

  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  localStorage.setItem(CACHE_TIME_KEY, String(Date.now()));

  return data as Book[];
}

export function limparCacheLivros() {
  console.log("Cache de livros limpo.");
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_TIME_KEY);
}
