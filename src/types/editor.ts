/**
 * Tipos estendidos para o editor visual de landing pages
 */

export type ElementBlockType = 'text' | 'image' | 'video' | 'button' | 'icon' | 'shape' | 'divider' | 'box';

export interface ElementBlockStyle {
  // Posicionamento e tamanho
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  width: number; // 0-100 percentage
  height?: number; // 0-100 percentage
  zIndex: number;

  // Tipografia
  fontSize?: number;
  fontFamily?: string; // Nome da fonte Google ou fonte do sistema
  fontWeight?: number; // 400, 700, etc.
  fontStyle?: 'normal' | 'italic';
  letterSpacing?: number; // em pixels
  lineHeight?: number; // multiplicador (1.5, 2, etc.)
  textAlign?: 'left' | 'center' | 'right';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';

  // Cores
  color?: string; // Cor do texto (hex, rgb, etc.)
  backgroundColor?: string; // Cor de fundo
  borderColor?: string; // Cor da borda
  borderWidth?: number; // Largura da borda em pixels
  borderRadius?: number; // Raio da borda em pixels
  borderStyle?: 'solid' | 'dashed' | 'dotted';

  // Sombra e efeitos
  boxShadow?: string; // Sombra do elemento
  opacity?: number; // 0-1
  filter?: string; // Filtros CSS (blur, brightness, etc.)

  // Animação
  animation?: string; // Nome da animação
  animationDuration?: number; // Duração em segundos
  animationDelay?: number; // Delay em segundos
  animationEasing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear' | 'cubic-bezier';
  animationRepeat?: number; // Número de repetições (-1 para infinito)

  // Padding e Margin
  padding?: number; // em pixels
  margin?: number; // em pixels

  // Propriedades específicas
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  cursor?: 'pointer' | 'default' | 'text' | 'move';

  // Hover effects
  hoverScale?: number; // Escala ao passar o mouse
  hoverOpacity?: number; // Opacidade ao passar o mouse
  hoverColor?: string; // Cor ao passar o mouse
}

export interface ElementBlockContent {
  // Texto
  text?: string;

  // Imagem/Vídeo
  url?: string;
  alt?: string;

  // Botão
  buttonText?: string;
  buttonLink?: string;
  buttonTarget?: '_blank' | '_self' | '_parent' | '_top';
  buttonIcon?: string; // Nome do ícone Lucide

  // Ícone
  iconName?: string;
  iconSize?: number;

  // Forma/Caixa
  shapeType?: 'rectangle' | 'circle' | 'triangle' | 'line';

  // Divider
  dividerType?: 'line' | 'dots' | 'dashes';
}

export interface ElementBlock {
  id: string;
  type: ElementBlockType;
  content: ElementBlockContent;
  style: ElementBlockStyle;
}

export interface LandingSectionStyle {
  bg?: 'default' | 'card' | 'primary' | 'muted' | 'black' | string; // Cor de fundo
  height?: string; // Altura da seção (px, vh, auto)
  minHeight?: string;
  maxHeight?: string;
  padding?: string; // Padding da seção
  margin?: string; // Margin da seção
  overlay?: number; // Opacidade do overlay (0-1)
  overlayColor?: string; // Cor do overlay
  backgroundImage?: string; // URL da imagem de fundo
  backgroundAttachment?: 'scroll' | 'fixed';
  backgroundPosition?: string; // Posição da imagem de fundo
  backgroundSize?: 'cover' | 'contain' | 'auto';
}

export interface LandingSection {
  id: string;
  tipo: string; // 'custom', 'sobre', 'funcionalidades', etc.
  titulo: string;
  conteudo: {
    blocks: ElementBlock[];
    style: LandingSectionStyle;
  };
  ordem: number;
  ativo: boolean;
  criado_em?: string;
  atualizado_em?: string;
  isNew?: boolean;
}

/**
 * Configurações de animações disponíveis
 */
export const ANIMATION_PRESETS = [
  { value: 'none', label: 'Nenhuma' },
  { value: 'fade-up', label: 'Surgir (Cima)' },
  { value: 'fade-down', label: 'Surgir (Baixo)' },
  { value: 'fade-left', label: 'Surgir (Esquerda)' },
  { value: 'fade-right', label: 'Surgir (Direita)' },
  { value: 'fade-in', label: 'Aparecer Suave' },
  { value: 'zoom-in', label: 'Zoom In' },
  { value: 'zoom-out', label: 'Zoom Out' },
  { value: 'slide-left', label: 'Deslizar Esquerda' },
  { value: 'slide-right', label: 'Deslizar Direita' },
  { value: 'slide-up', label: 'Deslizar Cima' },
  { value: 'slide-down', label: 'Deslizar Baixo' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'flip', label: 'Flip' },
  { value: 'rotate', label: 'Rotar' },
  { value: 'pulse', label: 'Pulsar' },
];

/**
 * Configurações de easing para animações
 */
export const EASING_PRESETS = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease', label: 'Ease' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In Out' },
];

/**
 * Fontes Google disponíveis (mais de 20)
 */
export const GOOGLE_FONTS = [
  { name: 'Inter', family: 'Inter, sans-serif', category: 'sans-serif' },
  { name: 'Roboto', family: 'Roboto, sans-serif', category: 'sans-serif' },
  { name: 'Open Sans', family: '"Open Sans", sans-serif', category: 'sans-serif' },
  { name: 'Lato', family: 'Lato, sans-serif', category: 'sans-serif' },
  { name: 'Montserrat', family: 'Montserrat, sans-serif', category: 'sans-serif' },
  { name: 'Raleway', family: 'Raleway, sans-serif', category: 'sans-serif' },
  { name: 'Poppins', family: 'Poppins, sans-serif', category: 'sans-serif' },
  { name: 'Playfair Display', family: '"Playfair Display", serif', category: 'serif' },
  { name: 'Merriweather', family: 'Merriweather, serif', category: 'serif' },
  { name: 'Lora', family: 'Lora, serif', category: 'serif' },
  { name: 'Cormorant Garamond', family: '"Cormorant Garamond", serif', category: 'serif' },
  { name: 'Crimson Text', family: '"Crimson Text", serif', category: 'serif' },
  { name: 'Pacifico', family: 'Pacifico, cursive', category: 'cursive' },
  { name: 'Great Vibes', family: '"Great Vibes", cursive', category: 'cursive' },
  { name: 'Dancing Script', family: '"Dancing Script", cursive', category: 'cursive' },
  { name: 'Caveat', family: 'Caveat, cursive', category: 'cursive' },
  { name: 'JetBrains Mono', family: '"JetBrains Mono", monospace', category: 'monospace' },
  { name: 'Courier Prime', family: '"Courier Prime", monospace', category: 'monospace' },
  { name: 'IBM Plex Mono', family: '"IBM Plex Mono", monospace', category: 'monospace' },
  { name: 'Source Code Pro', family: '"Source Code Pro", monospace', category: 'monospace' },
  { name: 'Ubuntu', family: 'Ubuntu, sans-serif', category: 'sans-serif' },
  { name: 'Quicksand', family: 'Quicksand, sans-serif', category: 'sans-serif' },
  { name: 'Nunito', family: 'Nunito, sans-serif', category: 'sans-serif' },
  { name: 'Mulish', family: 'Mulish, sans-serif', category: 'sans-serif' },
];

/**
 * Tipos de elementos minimalistas disponíveis
 */
export const ELEMENT_LIBRARY = [
  // Ícones (Lucide)
  { id: 'icon-star', type: 'icon', name: 'Star', category: 'icons' },
  { id: 'icon-heart', type: 'icon', name: 'Heart', category: 'icons' },
  { id: 'icon-check', type: 'icon', name: 'Check', category: 'icons' },
  { id: 'icon-arrow-right', type: 'icon', name: 'ArrowRight', category: 'icons' },
  { id: 'icon-arrow-down', type: 'icon', name: 'ArrowDown', category: 'icons' },
  { id: 'icon-zap', type: 'icon', name: 'Zap', category: 'icons' },
  { id: 'icon-sparkles', type: 'icon', name: 'Sparkles', category: 'icons' },
  { id: 'icon-shield', type: 'icon', name: 'Shield', category: 'icons' },
  { id: 'icon-lock', type: 'icon', name: 'Lock', category: 'icons' },
  { id: 'icon-unlock', type: 'icon', name: 'Unlock', category: 'icons' },
  { id: 'icon-eye', type: 'icon', name: 'Eye', category: 'icons' },
  { id: 'icon-eye-off', type: 'icon', name: 'EyeOff', category: 'icons' },
  { id: 'icon-download', type: 'icon', name: 'Download', category: 'icons' },
  { id: 'icon-upload', type: 'icon', name: 'Upload', category: 'icons' },
  { id: 'icon-trash', type: 'icon', name: 'Trash2', category: 'icons' },
  { id: 'icon-edit', type: 'icon', name: 'Edit', category: 'icons' },
  { id: 'icon-copy', type: 'icon', name: 'Copy', category: 'icons' },
  { id: 'icon-share', type: 'icon', name: 'Share2', category: 'icons' },
  { id: 'icon-settings', type: 'icon', name: 'Settings', category: 'icons' },
  { id: 'icon-menu', type: 'icon', name: 'Menu', category: 'icons' },
  { id: 'icon-search', type: 'icon', name: 'Search', category: 'icons' },
  { id: 'icon-bell', type: 'icon', name: 'Bell', category: 'icons' },
  { id: 'icon-mail', type: 'icon', name: 'Mail', category: 'icons' },
  { id: 'icon-phone', type: 'icon', name: 'Phone', category: 'icons' },
  { id: 'icon-map-pin', type: 'icon', name: 'MapPin', category: 'icons' },
  { id: 'icon-calendar', type: 'icon', name: 'Calendar', category: 'icons' },
  { id: 'icon-clock', type: 'icon', name: 'Clock', category: 'icons' },
  { id: 'icon-user', type: 'icon', name: 'User', category: 'icons' },
  { id: 'icon-users', type: 'icon', name: 'Users', category: 'icons' },
  { id: 'icon-home', type: 'icon', name: 'Home', category: 'icons' },
  { id: 'icon-folder', type: 'icon', name: 'Folder', category: 'icons' },
  { id: 'icon-file', type: 'icon', name: 'File', category: 'icons' },
  { id: 'icon-book', type: 'icon', name: 'BookOpen', category: 'icons' },
  { id: 'icon-lightbulb', type: 'icon', name: 'Lightbulb', category: 'icons' },
  { id: 'icon-target', type: 'icon', name: 'Target', category: 'icons' },
  { id: 'icon-award', type: 'icon', name: 'Award', category: 'icons' },
  { id: 'icon-trending-up', type: 'icon', name: 'TrendingUp', category: 'icons' },
  { id: 'icon-trending-down', type: 'icon', name: 'TrendingDown', category: 'icons' },
  { id: 'icon-pie-chart', type: 'icon', name: 'PieChart', category: 'icons' },
  { id: 'icon-bar-chart', type: 'icon', name: 'BarChart3', category: 'icons' },
  { id: 'icon-activity', type: 'icon', name: 'Activity', category: 'icons' },
  { id: 'icon-wifi', type: 'icon', name: 'Wifi', category: 'icons' },
  { id: 'icon-wifi-off', type: 'icon', name: 'WifiOff', category: 'icons' },
  { id: 'icon-volume', type: 'icon', name: 'Volume2', category: 'icons' },
  { id: 'icon-volume-off', type: 'icon', name: 'VolumeX', category: 'icons' },
  { id: 'icon-play', type: 'icon', name: 'Play', category: 'icons' },
  { id: 'icon-pause', type: 'icon', name: 'Pause', category: 'icons' },
  { id: 'icon-skip-forward', type: 'icon', name: 'SkipForward', category: 'icons' },
  { id: 'icon-skip-back', type: 'icon', name: 'SkipBack', category: 'icons' },
  { id: 'icon-repeat', type: 'icon', name: 'Repeat', category: 'icons' },
  { id: 'icon-shuffle', type: 'icon', name: 'Shuffle', category: 'icons' },
  { id: 'icon-plus', type: 'icon', name: 'Plus', category: 'icons' },
  { id: 'icon-minus', type: 'icon', name: 'Minus', category: 'icons' },
  { id: 'icon-x', type: 'icon', name: 'X', category: 'icons' },
  { id: 'icon-equal', type: 'icon', name: 'Equal', category: 'icons' },

  // Formas
  { id: 'shape-rectangle', type: 'shape', name: 'Retângulo', category: 'shapes' },
  { id: 'shape-circle', type: 'shape', name: 'Círculo', category: 'shapes' },
  { id: 'shape-triangle', type: 'shape', name: 'Triângulo', category: 'shapes' },
  { id: 'shape-line', type: 'shape', name: 'Linha', category: 'shapes' },
  { id: 'shape-rounded-rect', type: 'shape', name: 'Retângulo Arredondado', category: 'shapes' },
  { id: 'shape-diamond', type: 'shape', name: 'Diamante', category: 'shapes' },
  { id: 'shape-star', type: 'shape', name: 'Estrela', category: 'shapes' },
  { id: 'shape-heart', type: 'shape', name: 'Coração', category: 'shapes' },

  // Divisores
  { id: 'divider-line', type: 'divider', name: 'Linha', category: 'dividers' },
  { id: 'divider-dots', type: 'divider', name: 'Pontos', category: 'dividers' },
  { id: 'divider-dashes', type: 'divider', name: 'Tracejado', category: 'dividers' },
  { id: 'divider-gradient', type: 'divider', name: 'Gradiente', category: 'dividers' },

  // Caixas
  { id: 'box-simple', type: 'box', name: 'Caixa Simples', category: 'boxes' },
  { id: 'box-shadow', type: 'box', name: 'Caixa com Sombra', category: 'boxes' },
  { id: 'box-border', type: 'box', name: 'Caixa com Borda', category: 'boxes' },
  { id: 'box-gradient', type: 'box', name: 'Caixa Gradiente', category: 'boxes' },
  { id: 'box-glass', type: 'box', name: 'Caixa Vidro', category: 'boxes' },
];
