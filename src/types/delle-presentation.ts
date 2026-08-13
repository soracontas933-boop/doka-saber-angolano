export type DelleSlideType = 
  | "title"
  | "agenda"
  | "bullets"
  | "comparison"
  | "stat"
  | "timeline"
  | "quote"
  | "image_focus"
  | "closing";

export interface DelleSlide {
  ordem: number;
  tipo: DelleSlideType;
  headline: string;
  bullets: string[];
  sugestao_visual: string;
  notas_apresentador?: string;
  imageUrl?: string; // Para armazenar a URL da imagem gerada pela IA
}

export interface DellePresentationMeta {
  titulo_apresentacao: string;
  publico_alvo: string;
  tom: string;
  total_slides: number;
}

export interface DellePresentation {
  meta: DellePresentationMeta;
  slides: DelleSlide[];
}
