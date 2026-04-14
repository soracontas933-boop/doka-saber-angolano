import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { 
  ArrowLeft, 
  Presentation, 
  Download, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  Image as ImageIcon,
  Sparkles,
  Send,
  RefreshCw,
  Edit2,
  Trash2,
  Plus,
  GripVertical,
  Settings,
  ChevronDown,
  Check,
  X,
  Palette,
  Type,
  Maximize,
  Layout,
  FileDown,
  Copy,
  Eye,
  Save
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { generateWithAI, DELLE_SYSTEM_PROMPT, generateImageAI, generateImageUrl } from "@/lib/ai-service";
import { useUsageTracker } from "@/hooks/use-usage-tracker";
import { saveProject } from "@/lib/save-project";

interface Subtopic {
  id: string;
  text: string;
}

interface Card {
  id: string;
  title: string;
  subtopics: Subtopic[];
  imageUrl?: string;
}

interface Slide {
  titulo: string;
  conteudo: string;
  imageUrl?: string;
}

const VISUAL_THEMES = [
  { name: "Kraft", colors: { bg: "#F5E6D3", title: "#5D4037", body: "#8D6E63", accent: "#A1887F" } },
  { name: "Finesse", colors: { bg: "#F3F3F3", title: "#2C3E50", body: "#34495E", accent: "#3498DB" } },
  { name: "Nova", colors: { bg: "#FFF9F5", title: "#FF6B6B", body: "#4ECDC4", accent: "#FFE66D" } },
  { name: "Tranquil", colors: { bg: "#E8F4F8", title: "#2E7D8F", body: "#5FA8D3", accent: "#B8E0D2" } },
  { name: "Cigar", colors: { bg: "#3D2817", title: "#F5DEB3", body: "#D2B48C", accent: "#8B4513" } },
  { name: "Icebreaker", colors: { bg: "#E6F2FF", title: "#0066CC", body: "#0080FF", accent: "#00BFFF" } },
];

const FONT_STYLES = [
  { name: "Sans Moderno", value: "Inter, sans-serif" },
  { name: "Serif Clássico", value: "Georgia, serif" },
  { name: "Display Elegante", value: "Poppins, sans-serif" },
  { name: "Mono Técnico", value: "monospace" },
];

const POSTER_FORMATS = [
  { name: "Padrão (16:9)", value: "16:9", icon: <Presentation className="h-4 w-4" /> },
  { name: "Retrato (4:5)", value: "4:5", icon: <ImageIcon className="h-4 w-4" /> },
  { name: "Quadrado (1:1)", value: "1:1", icon: <Layout className="h-4 w-4" /> },
  { name: "A4 Vertical", value: "A4", icon: <Maximize className="h-4 w-4" /> },
];

const IMAGE_STYLES = [
  { name: "Ilustração", value: "illustration" },
  { name: "Foto", value: "photo" },
  { name: "Abstrato", value: "abstract" },
  { name: "3D", value: "3d" },
  { name: "Arte linear", value: "line-art" },
  { name: "Personalizado", value: "custom" },
];

const SUGGESTED_KEYWORDS = ["sofisticado", "minimalista", "profissional", "neutro", "vibrante", "moderno"];

// Professional Color Palette
const COLOR_PALETTE = {
  light: {
    bg: "#FFFFFF",
    text: "#000000",
    lightBlue: "#4FA3FF",
    lightBlueBg: "#E8F2FF",
    border: "#E5E5E5",
    hover: "#F5F5F5",
    textMuted: "rgba(0, 0, 0, 0.6)",
    textMutedLight: "rgba(0, 0, 0, 0.4)",
  },
  dark: {
    bg: "#000000",
    text: "#FFFFFF",
    lightBlue: "#4FA3FF",
    lightBlueBg: "#1A2A3A",
    border: "#262626",
    hover: "#1A1A1A",
    textMuted: "rgba(255, 255, 255, 0.7)",
    textMutedLight: "rgba(255, 255, 255, 0.4)",
  }
};

export default function ApresentacaoPage() {
  const navigate = useNavigate();
  const { checkLimit, logUsage } = useUsageTracker();
  
  // Main flow state
  const [step, setStep] = useState<"chat" | "cards" | "customize" | "generating" | "preview">("chat");
  
  // Chat/Config state
  const [chatMessage, setChatMessage] = useState("");
  const [language, setLanguage] = useState("pt");
  const [proportion, setProportion] = useState("16:9");
  const [numCards, setNumCards] = useState("8");
  
  // Cards state
  const [cards, setCards] = useState<Card[]>([]);
  const [mainTopic, setMainTopic] = useState("");
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [editingSubtopicId, setEditingSubtopicId] = useState<string | null>(null);
  const [editingSubtopicText, setEditingSubtopicText] = useState("");
  
  // Customization state
  const [selectedTheme, setSelectedTheme] = useState("Finesse");
  const [selectedFont, setSelectedFont] = useState("Inter, sans-serif");
  const [selectedFormat, setSelectedFormat] = useState("16:9");
  const [imageStyle, setImageStyle] = useState("illustration");
  const [extraKeywords, setExtraKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [textAmount, setTextAmount] = useState("medium");
  
  // Generation state
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);

  const isDarkMode = document.documentElement.classList.contains("dark");
  const palette = isDarkMode ? COLOR_PALETTE.dark : COLOR_PALETTE.light;

  // Handle initial chat submission
  const handleChatSubmit = async () => {
    if (!chatMessage.trim()) {
      toast.error("Descreve o tema da tua apresentação.");
      return;
    }

    setLoading(true);
    try {
      const aiPrompt = `Baseado neste tema: "${chatMessage}", gera um título principal criativo e ${numCards} cartões com múltiplos subtemas.

Retorna APENAS JSON:
{
  "mainTopic": "Título Principal Criativo",
  "cards": [
    { 
      "title": "Cartão 1", 
      "subtopics": ["Subtema 1", "Subtema 2", "Subtema 3"]
    },
    { 
      "title": "Cartão 2", 
      "subtopics": ["Subtema 1", "Subtema 2"]
    }
  ]
}

Cada cartão deve ter entre 2 a 4 subtemas. Conteúdo em Português.`;

      const result = await generateWithAI(DELLE_SYSTEM_PROMPT, aiPrompt, 2000, 0.7);
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch?.[0] || result.content);
      
      setMainTopic(parsed.mainTopic);
      const generatedCards: Card[] = (parsed.cards || []).map((c: any, i: number) => ({
        id: `card-${i}`,
        title: c.title,
        subtopics: (c.subtopics || []).map((s: string, idx: number) => ({
          id: `subtopic-${i}-${idx}`,
          text: s
        }))
      }));
      setCards(generatedCards);
      setStep("cards");
    } catch (err) {
      toast.error("Erro ao processar o tema. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Edit card title
  const startEditCard = (card: Card) => {
    setEditingCardId(card.id);
    setEditingTitle(card.title);
  };

  const saveCardEdit = () => {
    setCards(cards.map(c => 
      c.id === editingCardId 
        ? { ...c, title: editingTitle }
        : c
    ));
    setEditingCardId(null);
  };

  // Delete card
  const deleteCard = (id: string) => {
    setCards(cards.filter(c => c.id !== id));
  };

  // Add new card
  const addCard = () => {
    const newCard: Card = {
      id: `card-${Date.now()}`,
      title: "Novo Cartão",
      subtopics: [
        { id: `subtopic-${Date.now()}-0`, text: "Adiciona um subtema" }
      ]
    };
    setCards([...cards, newCard]);
  };

  // Add subtopic to card
  const addSubtopic = (cardId: string) => {
    setCards(cards.map(c => 
      c.id === cardId 
        ? { 
            ...c, 
            subtopics: [
              ...c.subtopics, 
              { id: `subtopic-${Date.now()}`, text: "Novo subtema" }
            ] 
          }
        : c
    ));
  };

  // Delete subtopic
  const deleteSubtopic = (cardId: string, subtopicId: string) => {
    setCards(cards.map(c => 
      c.id === cardId 
        ? { ...c, subtopics: c.subtopics.filter(s => s.id !== subtopicId) }
        : c
    ));
  };

  // Edit subtopic
  const startEditSubtopic = (subtopic: Subtopic) => {
    setEditingSubtopicId(subtopic.id);
    setEditingSubtopicText(subtopic.text);
  };

  const saveSubtopicEdit = (cardId: string) => {
    setCards(cards.map(c => 
      c.id === cardId 
        ? { 
            ...c, 
            subtopics: c.subtopics.map(s => 
              s.id === editingSubtopicId 
                ? { ...s, text: editingSubtopicText }
                : s
            ) 
          }
        : c
    ));
    setEditingSubtopicId(null);
  };

  // Add keyword
  const addKeyword = () => {
    if (keywordInput.trim() && !extraKeywords.includes(keywordInput.trim())) {
      setExtraKeywords([...extraKeywords, keywordInput.trim()]);
      setKeywordInput("");
    }
  };

  // Remove keyword
  const removeKeyword = (keyword: string) => {
    setExtraKeywords(extraKeywords.filter(k => k !== keyword));
  };

  // Generate slides
  const generateSlides = async () => {
    const allowed = await checkLimit("apresentacao" as any);
    if (!allowed) return;

    setStep("generating");
    setLoading(true);
    setSlides([]);

    try {
      const cardsList = cards.map(c => 
        `${c.title}:\n${c.subtopics.map(s => `- ${s.text}`).join("\n")}`
      ).join("\n\n");
      
      const theme = VISUAL_THEMES.find(t => t.name === selectedTheme);
      const keywordsStr = extraKeywords.join(", ");

      const aiPrompt = `Cria uma apresentação profissional e moderna baseada nesta estrutura:

${cardsList}

Tema principal: ${mainTopic}
Estilo de imagem: ${imageStyle}
Palavras-chave adicionais: ${keywordsStr}
Quantidade de texto: ${textAmount === "low" ? "mínimo" : textAmount === "high" ? "máximo" : "moderado"}
Língua: ${language === "pt" ? "Português de Angola" : "Português do Brasil"}
Proporção: ${selectedFormat}
Estilo visual: Tema ${selectedTheme}, Fonte ${selectedFont}

Retorna APENAS JSON:
{
  "slides": [
    {
      "titulo": "Título",
      "conteudo": "Conteúdo em tópicos (usar \\n para quebras)",
      "image_prompt": "Descrição detalhada para gerar imagem"
    }
  ]
}

IMPORTANTE - Segue este modelo de apresentação profissional:
- Fundo: ${theme?.colors.bg || "#F5F5F0"}
- Estilo: Minimalista, com muito espaço em branco
- Layout: Duas colunas (imagem à esquerda, conteúdo à direita)
- Tipografia: ${selectedFont}, títulos em negrito
- Conteúdo: Profissional, informativo, com dados e tendências
- Estrutura: Cenário → Investimento → Canais → Tendências → Solução

Cria um slide para cada cartão e seus subtemas. O conteúdo deve ser profissional, cativante e seguir o modelo de apresentação premium.`;

      const result = await generateWithAI(DELLE_SYSTEM_PROMPT, aiPrompt, 4000, 0.8);
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch?.[0] || result.content);

      const rawSlides: Slide[] = (parsed.slides || []).map((s: any) => ({
        titulo: s.titulo || "",
        conteudo: s.conteudo || "",
        imageUrl: undefined,
      }));

      setSlides(rawSlides);
      setCurrentSlide(0);
      setStep("preview");
      
      // Start generating images in background
      setGeneratingImages(true);
      const updatedSlides = [...rawSlides];
      for (let i = 0; i < updatedSlides.length; i++) {
        try {
          const imgPrompt = parsed.slides[i].image_prompt || `Professional educational slide about ${updatedSlides[i].titulo}, minimalist, clean`;
          const imgResult = await generateImageAI(imgPrompt);
          updatedSlides[i].imageUrl = imgResult.image_url;
          setSlides([...updatedSlides]);
        } catch (err) {
          console.error("Image generation failed for slide", i);
        }
      }
      setGeneratingImages(false);
      logUsage("apresentacao" as any);
    } catch (err) {
      toast.error("Erro ao gerar a apresentação. Tenta novamente.");
      setStep("customize");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (slides.length === 0) return;
    try {
      await saveProject("trabalho", `Apresentação - ${mainTopic}`, JSON.stringify(slides));
      toast.success("Apresentação guardada com sucesso!");
    } catch (err) {
      toast.error("Erro ao guardar a apresentação.");
    }
  };

  return (
    <div style={{ backgroundColor: palette.bg, color: palette.text }} className="min-h-screen flex flex-col">
      {/* Header */}
      <header style={{ borderColor: palette.border }} className="h-16 border-b flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} style={{ color: palette.textMuted }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Presentation style={{ color: palette.lightBlue }} className="h-6 w-6" />
            <h1 className="font-bold text-lg hidden md:block">Gerador de Apresentações</h1>
          </div>
        </div>

        {step === "preview" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSave} style={{ borderColor: palette.border }}>
              <Save className="h-4 w-4 mr-2" /> Guardar
            </Button>
            <Button size="sm" style={{ backgroundColor: palette.lightBlue, color: isDarkMode ? "#000000" : "#FFFFFF" }}>
              <Download className="h-4 w-4 mr-2" /> Exportar PDF
            </Button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* STEP 1: INITIAL CHAT */}
          {step === "chat" && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto py-12 px-6 space-y-12"
            >
              <div className="text-center space-y-4">
                <div style={{ backgroundColor: palette.lightBlueBg }} className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Sparkles style={{ color: palette.lightBlue }} className="h-8 w-8" />
                </div>
                <h2 className="text-4xl font-bold tracking-tight">O que vamos apresentar hoje?</h2>
                <p style={{ color: palette.textMuted }} className="text-lg">
                  Diz-me o tema e eu crio uma apresentação profissional para ti em segundos.
                </p>
              </div>

              <div className="space-y-6">
                <div style={{ borderColor: palette.border, backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.05)" : "#F9F9F9" }} className="p-2 rounded-2xl border shadow-sm">
                  <textarea 
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Ex: A importância da agricultura sustentável em Angola..."
                    style={{ color: palette.text }}
                    className="w-full bg-transparent border-0 focus:ring-0 p-4 min-h-[120px] text-lg resize-none"
                  />
                  <div className="flex items-center justify-between p-2 border-t" style={{ borderColor: palette.border }}>
                    <div className="flex gap-2">
                      <select 
                        value={numCards}
                        onChange={(e) => setNumCards(e.target.value)}
                        style={{ backgroundColor: isDarkMode ? "#1A1A1A" : "#FFFFFF", borderColor: palette.border }}
                        className="text-sm rounded-lg border px-2 py-1"
                      >
                        <option value="6">6 Cartões</option>
                        <option value="8">8 Cartões</option>
                        <option value="10">10 Cartões</option>
                        <option value="12">12 Cartões</option>
                      </select>
                    </div>
                    <Button 
                      onClick={handleChatSubmit} 
                      disabled={loading || !chatMessage.trim()}
                      style={{ backgroundColor: palette.lightBlue, color: isDarkMode ? "#000000" : "#FFFFFF" }}
                      className="rounded-xl px-6 hover:opacity-90"
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  {["Marketing Digital", "História de Angola", "Energias Renováveis", "Saúde Pública"].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => setChatMessage(suggestion)}
                      style={{ borderColor: palette.border, color: palette.textMuted }}
                      className="px-4 py-2 rounded-full border text-sm hover:bg-muted transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: CARDS EDITOR */}
          {step === "cards" && (
            <motion.div 
              key="cards"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ backgroundColor: palette.bg }}
              className="min-h-full p-6 md:p-12"
            >
              <div className="max-w-5xl mx-auto space-y-8">
                {/* Main Topic */}
                <div className="space-y-4">
                  <h2 className="text-3xl font-bold">{mainTopic}</h2>
                  <p style={{ color: palette.textMuted }}>
                    Edita, move ou adiciona novos cartões. Cada cartão pode ter múltiplos subtemas.
                  </p>
                </div>

                {/* Cards Grid */}
                <div className="space-y-3">
                  <Reorder.Group values={cards} onReorder={setCards} className="space-y-3">
                    {cards.map((card) => (
                      <Reorder.Item key={card.id} value={card} style={{ borderColor: palette.border, backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.05)" : "#F9F9F9" }} className="rounded-xl border overflow-hidden transition-all">
                        <div>
                          {/* Card Header */}
                          <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setExpandedCardId(expandedCardId === card.id ? null : card.id)}>
                            <GripVertical style={{ color: isDarkMode ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)" }} className="h-5 w-5" />
                            
                            {editingCardId === card.id ? (
                              <div className="flex-1 flex gap-2">
                                <Input 
                                  value={editingTitle}
                                  onChange={(e) => setEditingTitle(e.target.value)}
                                  style={{ backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "#F0F0F0", borderColor: palette.border, color: palette.text }}
                                  className="font-bold text-lg flex-1 border"
                                />
                                <Button size="sm" onClick={(e) => { e.stopPropagation(); saveCardEdit(); }} style={{ backgroundColor: palette.lightBlue, color: isDarkMode ? "#000000" : "#FFFFFF" }} className="hover:opacity-90">
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setEditingCardId(null); }} style={{ borderColor: palette.border }} className="hover:opacity-70">
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <p className="font-bold text-lg flex-1">{card.title}</p>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); startEditCard(card); }} className="hover:opacity-70">
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteCard(card.id); }} className="hover:opacity-70 text-red-600">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <ChevronDown className={`h-5 w-5 transition-transform ${expandedCardId === card.id ? "rotate-180" : ""}`} />
                              </>
                            )}
                          </div>

                          {/* Subtopics Expansion */}
                          <AnimatePresence>
                            {expandedCardId === card.id && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                style={{ borderColor: palette.border, backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.02)" : "#FAFAFA" }}
                                className="border-t p-4 space-y-3"
                              >
                                {/* Subtopics List */}
                                <div className="space-y-2">
                                  {card.subtopics.map((subtopic) => (
                                    <div key={subtopic.id} style={{ backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.05)" : "#F5F5F5", borderColor: palette.border }} className="flex items-center gap-3 p-3 rounded-lg border">
                                      {editingSubtopicId === subtopic.id ? (
                                        <>
                                          <Input 
                                            value={editingSubtopicText}
                                            onChange={(e) => setEditingSubtopicText(e.target.value)}
                                            style={{ backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "#F0F0F0", borderColor: palette.border, color: palette.text }}
                                            className="flex-1 border"
                                          />
                                          <Button size="sm" onClick={(e) => { e.stopPropagation(); saveSubtopicEdit(card.id); }} style={{ backgroundColor: palette.lightBlue, color: isDarkMode ? "#000000" : "#FFFFFF" }} className="hover:opacity-90">
                                            <Check className="h-4 w-4" />
                                          </Button>
                                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setEditingSubtopicId(null); }} style={{ borderColor: palette.border }} className="hover:opacity-70">
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <span style={{ color: palette.textMuted }} className="flex-1">• {subtopic.text}</span>
                                          <Button size="sm" variant="ghost" onClick={() => startEditSubtopic(subtopic)} className="hover:opacity-70">
                                            <Edit2 className="h-4 w-4" />
                                          </Button>
                                          <Button size="sm" variant="ghost" onClick={() => deleteSubtopic(card.id, subtopic.id)} className="hover:opacity-70 text-red-600">
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                {/* Add Subtopic Button */}
                                <Button 
                                  onClick={() => addSubtopic(card.id)}
                                  variant="outline"
                                  size="sm"
                                  style={{ borderColor: palette.border }}
                                  className="w-full hover:opacity-70"
                                >
                                  <Plus className="h-4 w-4 mr-2" /> Adicionar Subtema
                                </Button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>

                  <Button 
                    onClick={addCard}
                    variant="outline"
                    style={{ borderColor: palette.border, borderStyle: "dashed" }}
                    className="w-full py-6 hover:opacity-70"
                  >
                    <Plus className="h-5 w-5 mr-2" /> Adicionar Novo Cartão
                  </Button>
                </div>

                {/* Navigation */}
                <div className="flex gap-4 pt-8">
                  <Button variant="outline" onClick={() => setStep("chat")} style={{ borderColor: palette.border }} className="hover:opacity-70">
                    <ChevronLeft className="h-4 w-4 mr-2" /> Voltar
                  </Button>
                  <Button onClick={() => setStep("customize")} style={{ backgroundColor: palette.lightBlue, color: isDarkMode ? "#000000" : "#FFFFFF" }} className="flex-1 hover:opacity-90">
                    Avançar para Personalização <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: CUSTOMIZE */}
          {step === "customize" && (
            <motion.div 
              key="customize"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ backgroundColor: palette.bg }}
              className="min-h-full p-6 md:p-12"
            >
              <div className="max-w-6xl mx-auto space-y-12">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold">Personaliza a tua Apresentação</h2>
                  <div className="flex items-center gap-2 text-sm font-medium" style={{ color: palette.lightBlue }}>
                    <Sparkles className="h-4 w-4" /> Estilo Premium Ativado
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  {/* Left Column: Controls */}
                  <div className="lg:col-span-1 space-y-10">
                    {/* Visual Themes */}
                    <div className="space-y-4">
                      <h3 style={{ color: palette.text }} className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                        <Palette className="h-4 w-4" /> Tema Visual
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {VISUAL_THEMES.map(t => (
                          <button
                            key={t.name}
                            onClick={() => setSelectedTheme(t.name)}
                            style={{
                              borderColor: selectedTheme === t.name ? palette.lightBlue : palette.border,
                              backgroundColor: selectedTheme === t.name ? palette.lightBlueBg : "transparent"
                            }}
                            className="p-3 rounded-xl border-2 transition-all text-left group"
                          >
                            <div className="flex gap-1 mb-2">
                              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.colors.bg }}></div>
                              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.colors.title }}></div>
                              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.colors.accent }}></div>
                            </div>
                            <p className="text-xs font-bold group-hover:text-primary transition-colors">{t.name}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Typography */}
                    <div className="space-y-4">
                      <h3 style={{ color: palette.text }} className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                        <Type className="h-4 w-4" /> Estilo de Letra
                      </h3>
                      <div className="grid grid-cols-1 gap-2">
                        {FONT_STYLES.map(font => (
                          <button
                            key={font.value}
                            onClick={() => setSelectedFont(font.value)}
                            style={{
                              borderColor: selectedFont === font.value ? palette.lightBlue : palette.border,
                              backgroundColor: selectedFont === font.value ? palette.lightBlueBg : "transparent",
                              fontFamily: font.value
                            }}
                            className="p-3 rounded-lg border-2 transition-all text-left text-sm"
                          >
                            {font.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Poster Formats */}
                    <div className="space-y-4">
                      <h3 style={{ color: palette.text }} className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                        <Layout className="h-4 w-4" /> Formato dos Cartazes
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {POSTER_FORMATS.map(format => (
                          <button
                            key={format.value}
                            onClick={() => setSelectedFormat(format.value)}
                            style={{
                              borderColor: selectedFormat === format.value ? palette.lightBlue : palette.border,
                              backgroundColor: selectedFormat === format.value ? palette.lightBlueBg : "transparent"
                            }}
                            className="p-3 rounded-lg border-2 transition-all flex items-center gap-2 text-xs font-medium"
                          >
                            {format.icon}
                            {format.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Image Style */}
                    <div className="space-y-4">
                      <h3 style={{ color: palette.text }} className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" /> Estilo de Imagem
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {IMAGE_STYLES.map(style => (
                          <button
                            key={style.value}
                            onClick={() => setImageStyle(style.value)}
                            style={{
                              borderColor: imageStyle === style.value ? palette.lightBlue : palette.border,
                              backgroundColor: imageStyle === style.value ? palette.lightBlueBg : "transparent"
                            }}
                            className="p-3 rounded-lg border-2 transition-all text-xs font-medium"
                          >
                            {style.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Preview & Final Actions */}
                  <div className="lg:col-span-2 space-y-8">
                    <div style={{ borderColor: palette.border }} className="border rounded-2xl overflow-hidden shadow-2xl bg-white aspect-video relative flex items-center justify-center p-12">
                      {/* Live Preview of the selected theme/font */}
                      <div 
                        style={{ 
                          backgroundColor: VISUAL_THEMES.find(t => t.name === selectedTheme)?.colors.bg,
                          fontFamily: selectedFont,
                          width: "100%",
                          height: "100%",
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          padding: "4rem"
                        }}
                      >
                        <div className="w-1/2 flex items-center justify-center pr-8">
                          <div className="w-full h-full rounded-lg bg-gray-200 animate-pulse flex items-center justify-center">
                            <ImageIcon className="h-12 w-12 text-gray-400" />
                          </div>
                        </div>
                        <div className="w-1/2 flex flex-col justify-center">
                          <h4 
                            style={{ color: VISUAL_THEMES.find(t => t.name === selectedTheme)?.colors.title }}
                            className="text-4xl font-bold mb-6"
                          >
                            {mainTopic}
                          </h4>
                          <div 
                            style={{ color: VISUAL_THEMES.find(t => t.name === selectedTheme)?.colors.body }}
                            className="space-y-3"
                          >
                            <div className="h-4 w-full bg-current opacity-20 rounded"></div>
                            <div className="h-4 w-3/4 bg-current opacity-20 rounded"></div>
                            <div className="h-4 w-1/2 bg-current opacity-20 rounded"></div>
                          </div>
                        </div>
                      </div>
                      <div className="absolute bottom-4 right-4 bg-black/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter">
                        Pré-visualização do Tema
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <Button variant="outline" onClick={() => setStep("cards")} style={{ borderColor: palette.border }} className="px-8 h-12">
                          <ChevronLeft className="h-4 w-4 mr-2" /> Voltar
                        </Button>
                        <Button onClick={generateSlides} disabled={loading} style={{ backgroundColor: palette.lightBlue, color: isDarkMode ? "#000000" : "#FFFFFF" }} className="flex-1 h-12 text-lg font-bold shadow-lg shadow-blue-500/20">
                          {loading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Sparkles className="h-5 w-5 mr-2" />}
                          Criar Apresentação Agora
                        </Button>
                      </div>
                      <p className="text-center text-xs" style={{ color: palette.textMuted }}>
                        Ao clicar em criar, a IA irá processar todo o conteúdo e gerar as imagens personalizadas para cada slide.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: GENERATING */}
          {step === "generating" && (
            <motion.div 
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ backgroundColor: palette.bg }}
              className="min-h-full flex flex-col items-center justify-center p-6"
            >
              <div className="text-center space-y-8">
                <div className="relative">
                  <div style={{ borderColor: palette.lightBlue, borderTopColor: palette.lightBlue }} className="h-32 w-32 rounded-full border-4 border-transparent animate-spin mx-auto"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles style={{ color: palette.lightBlue }} className="h-10 w-10 animate-pulse" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold">A criar a tua apresentação...</h2>
                  <p style={{ color: palette.textMuted }} className="animate-pulse">A IA está a processar o conteúdo e as imagens.</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 5: PREVIEW */}
          {step === "preview" && slides.length > 0 && (
            <motion.div 
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ backgroundColor: "#F5F5F0" }}
              className="min-h-full p-6 md:p-12 flex flex-col items-center justify-center"
            >
              <div className="w-full max-w-6xl space-y-6">
                {/* Main Slide - Professional Template Style */}
                <div 
                  style={{ 
                    backgroundColor: VISUAL_THEMES.find(t => t.name === selectedTheme)?.colors.bg || "#F5F5F0", 
                    borderRadius: "16px", 
                    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.1)",
                    fontFamily: selectedFont
                  }} 
                  className="relative overflow-hidden aspect-video flex"
                >
                  {/* Left side: Image/Illustration */}
                  <div className="w-1/2 flex items-center justify-center overflow-hidden">
                    {slides[currentSlide].imageUrl ? (
                      <img src={slides[currentSlide].imageUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div style={{ backgroundColor: "rgba(0,0,0,0.05)" }} className="w-full h-full flex items-center justify-center">
                        <div style={{ color: "#999" }} className="text-center">
                          <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-50 animate-pulse" />
                          <p className="text-sm">A gerar imagem...</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Right side: Content */}
                  <div className="w-1/2 flex flex-col justify-center p-12 md:p-16">
                    <h2 
                      style={{ color: VISUAL_THEMES.find(t => t.name === selectedTheme)?.colors.title || "#000000" }} 
                      className="text-3xl md:text-4xl font-bold mb-6 leading-tight"
                    >
                      {slides[currentSlide].titulo}
                    </h2>
                    <div 
                      style={{ color: VISUAL_THEMES.find(t => t.name === selectedTheme)?.colors.body || "#4A4A4A" }} 
                      className="text-base md:text-lg space-y-3 leading-relaxed"
                    >
                      {slides[currentSlide].conteudo.split("\\n").map((line, idx) => (
                        <p key={idx} className="flex gap-2">
                          <span style={{ color: VISUAL_THEMES.find(t => t.name === selectedTheme)?.colors.accent }}>•</span>
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between gap-4">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    disabled={currentSlide === 0}
                    onClick={() => setCurrentSlide(p => p - 1)}
                    style={{ borderColor: "#DDD", color: "#000" }}
                    className="hover:bg-gray-100 rounded-full h-12 w-12"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>

                  <div className="flex gap-2 flex-wrap justify-center">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        style={{
                          backgroundColor: i === currentSlide ? palette.lightBlue : "#DDD",
                          width: i === currentSlide ? "32px" : "8px"
                        }}
                        className="h-2 rounded-full transition-all"
                      />
                    ))}
                  </div>

                  <Button 
                    variant="outline" 
                    size="icon" 
                    disabled={currentSlide === slides.length - 1}
                    onClick={() => setCurrentSlide(p => p + 1)}
                    style={{ borderColor: "#DDD", color: "#000" }}
                    className="hover:bg-gray-100 rounded-full h-12 w-12"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </div>

                {/* Slide Counter */}
                <div style={{ color: "#999" }} className="text-center text-sm font-medium">
                  Slide {currentSlide + 1} de {slides.length}
                </div>

                {generatingImages && (
                  <div style={{ backgroundColor: palette.lightBlueBg, color: palette.lightBlue }} className="flex items-center justify-center gap-2 p-3 rounded-full max-w-xs mx-auto">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-wider">A gerar visuais HD...</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
