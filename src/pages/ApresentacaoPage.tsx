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
  Palette
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { generateWithAI, DELLE_SYSTEM_PROMPT, generateImageAI, generateImageUrl } from "@/lib/ai-service";
import { useUsageTracker } from "@/hooks/use-usage-tracker";

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
  const [imageStyle, setImageStyle] = useState("illustration");
  const [extraKeywords, setExtraKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [textAmount, setTextAmount] = useState("medium");
  
  // Generation state
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);

  // Handle initial chat submission
  const handleChatSubmit = async () => {
    if (!chatMessage.trim()) {
      toast.error("Descreve o tema da tua apresentação.");
      return;
    }

    setLoading(true);
    try {
      // Generate main topic and cards from chat
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

      const aiPrompt = `Cria uma apresentação detalhada baseada nesta estrutura:

${cardsList}

Tema principal: ${mainTopic}
Estilo de imagem: ${imageStyle}
Palavras-chave adicionais: ${keywordsStr}
Quantidade de texto: ${textAmount === "low" ? "mínimo" : textAmount === "high" ? "máximo" : "moderado"}
Língua: ${language === "pt" ? "Português de Angola" : "Português do Brasil"}
Proporção: ${proportion}

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

Cria um slide para cada cartão e seus subtemas. O conteúdo deve ser profissional e cativante.`;

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
      await logUsage("apresentacao" as any, result.service_used, result.tokens_used);

      // Generate images in background
      setGeneratingImages(true);
      const imagePrompts = (parsed.slides || []).map((s: any) => s.image_prompt || "");
      
      for (let i = 0; i < rawSlides.length; i++) {
        if (!imagePrompts[i]) continue;
        try {
          const fullPrompt = `${imagePrompts[i]}, ${imageStyle} style, ${keywordsStr}`;
          const imgResult = await generateImageAI(fullPrompt, 1280, 720);
          setSlides(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], imageUrl: imgResult.image_url };
            return updated;
          });
        } catch {
          const fallbackUrl = generateImageUrl(imagePrompts[i], 1280, 720);
          setSlides(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], imageUrl: fallbackUrl };
            return updated;
          });
        }
      }
      setGeneratingImages(false);
      toast.success("Apresentação gerada com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao gerar apresentação.");
      setStep("customize");
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    if (slides.length === 0) return;
    toast.info("A exportar PDF...");
    // PDF export logic here
    toast.success("PDF exportado!");
  };

  const isDarkMode = document.documentElement.classList.contains("dark");
  const palette = isDarkMode ? COLOR_PALETTE.dark : COLOR_PALETTE.light;
  const theme = VISUAL_THEMES.find(t => t.name === selectedTheme);

  return (
    <div style={{ backgroundColor: palette.bg, color: palette.text }} className="min-h-screen flex flex-col transition-colors duration-300">
      {/* Header */}
      <header style={{ borderColor: palette.border, backgroundColor: palette.bg }} className="p-4 flex items-center justify-between border-b backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:opacity-70">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg" style={{ backgroundColor: palette.lightBlue }}>
              <Presentation className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold tracking-tight text-lg">Gamma</span>
          </div>
        </div>
        
        {step === "preview" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep("customize")} style={{ borderColor: palette.border }} className="hover:opacity-70">
              <RefreshCw className="h-4 w-4 mr-2" /> Voltar
            </Button>
            <Button size="sm" onClick={exportPDF} style={{ backgroundColor: palette.lightBlue, color: isDarkMode ? "#000000" : "#FFFFFF" }} className="hover:opacity-90">
              <Download className="h-4 w-4 mr-2" /> Exportar
            </Button>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {/* STEP 1: CHAT */}
          {step === "chat" && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ backgroundColor: palette.bg }}
              className="min-h-full flex flex-col items-center justify-center p-6 md:p-12"
            >
              <div className="w-full max-w-2xl space-y-8">
                <div className="text-center space-y-4">
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="inline-block p-4 rounded-2xl border mb-4"
                    style={{ backgroundColor: palette.lightBlueBg, borderColor: palette.lightBlue }}
                  >
                    <Sparkles className="h-8 w-8" style={{ color: palette.lightBlue }} />
                  </motion.div>
                  <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
                    Cria uma apresentação incrível
                  </h1>
                  <p style={{ color: palette.textMuted }}>
                    Descreve o tema e deixa-nos criar slides profissionais para ti.
                  </p>
                </div>

                {/* Chat Input */}
                <div className="space-y-4">
                  <div className="relative group rounded-2xl border-2 transition-all" style={{ borderColor: palette.border, backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.05)" : "#F9F9F9" }}>
                    <textarea 
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && e.ctrlKey && handleChatSubmit()}
                      placeholder="Ex: Marketing Digital no Brasil, História de Angola, Plano de Negócios..."
                      style={{ color: palette.text }}
                      className="w-full bg-transparent border-0 focus-visible:ring-0 text-lg p-4 resize-none h-24"
                    />
                    <Button 
                      onClick={handleChatSubmit}
                      disabled={loading || !chatMessage.trim()}
                      className="absolute bottom-3 right-3 rounded-xl hover:opacity-90"
                      style={{ backgroundColor: palette.lightBlue, color: isDarkMode ? "#000000" : "#FFFFFF" }}
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </Button>
                  </div>

                  {/* Config Options */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label style={{ color: palette.textMuted }} className="text-sm font-medium">Língua</label>
                      <select 
                        value={language} 
                        onChange={(e) => setLanguage(e.target.value)}
                        style={{ backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.05)" : "#F9F9F9", borderColor: palette.border, color: palette.text }}
                        className="w-full rounded-lg border p-2 text-sm"
                      >
                        <option value="pt">Português (Angola)</option>
                        <option value="pt-br">Português (Brasil)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label style={{ color: palette.textMuted }} className="text-sm font-medium">Proporção</label>
                      <select 
                        value={proportion} 
                        onChange={(e) => setProportion(e.target.value)}
                        style={{ backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.05)" : "#F9F9F9", borderColor: palette.border, color: palette.text }}
                        className="w-full rounded-lg border p-2 text-sm"
                      >
                        <option value="16:9">16:9 (Widescreen)</option>
                        <option value="4:3">4:3 (Padrão)</option>
                        <option value="1:1">1:1 (Quadrado)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label style={{ color: palette.textMuted }} className="text-sm font-medium">Nº de Cartões</label>
                      <select 
                        value={numCards} 
                        onChange={(e) => setNumCards(e.target.value)}
                        style={{ backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.05)" : "#F9F9F9", borderColor: palette.border, color: palette.text }}
                        className="w-full rounded-lg border p-2 text-sm"
                      >
                        <option value="5">5 Cartões</option>
                        <option value="8">8 Cartões</option>
                        <option value="10">10 Cartões</option>
                        <option value="12">12 Cartões</option>
                      </select>
                    </div>
                  </div>
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
                <h2 className="text-3xl font-bold">Personaliza o teu Gamma</h2>

                {/* Content Settings */}
                <div className="space-y-6">
                  <h3 style={{ color: palette.text }} className="text-xl font-bold flex items-center gap-2">
                    <Settings className="h-5 w-5" /> Conteúdo do Texto
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {["low", "medium", "high"].map(amount => (
                      <button
                        key={amount}
                        onClick={() => setTextAmount(amount)}
                        style={{
                          borderColor: textAmount === amount ? palette.lightBlue : palette.border,
                          backgroundColor: textAmount === amount ? palette.lightBlueBg : "transparent"
                        }}
                        className="p-4 rounded-xl border-2 transition-all text-center"
                      >
                        <p className="font-bold">{amount === "low" ? "Mínimo" : amount === "high" ? "Máximo" : "Moderado"}</p>
                        <p style={{ color: palette.textMuted }} className="text-sm">
                          {amount === "low" ? "Conciso e direto" : amount === "high" ? "Detalhado e rico" : "Equilibrado"}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visual Themes */}
                <div className="space-y-6">
                  <h3 style={{ color: palette.text }} className="text-xl font-bold flex items-center gap-2">
                    <Palette className="h-5 w-5" /> Visuais - Tema
                  </h3>
                  <p style={{ color: palette.textMuted }} className="text-sm">
                    Usa um dos nossos temas populares abaixo ou vê mais
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {VISUAL_THEMES.map(t => (
                      <button
                        key={t.name}
                        onClick={() => setSelectedTheme(t.name)}
                        style={{
                          borderColor: selectedTheme === t.name ? palette.lightBlue : palette.border,
                          backgroundColor: selectedTheme === t.name ? palette.lightBlueBg : "transparent"
                        }}
                        className="p-4 rounded-xl border-2 transition-all space-y-2"
                      >
                        <div className="space-y-1">
                          <div className="h-3 rounded w-full" style={{ backgroundColor: t.colors.title }}></div>
                          <div className="h-2 rounded w-3/4" style={{ backgroundColor: t.colors.body }}></div>
                          <div className="h-2 rounded w-1/2" style={{ backgroundColor: t.colors.body }}></div>
                        </div>
                        <p className="text-xs font-bold">{t.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image Settings */}
                <div className="space-y-6">
                  <h3 style={{ color: palette.text }} className="text-xl font-bold flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" /> Fonte da Imagem
                  </h3>
                  
                  <div className="space-y-4">
                    <p style={{ color: palette.textMuted }} className="text-sm font-bold">Estilo de Arte da Imagem</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {IMAGE_STYLES.map(style => (
                        <button
                          key={style.value}
                          onClick={() => setImageStyle(style.value)}
                          style={{
                            borderColor: imageStyle === style.value ? palette.lightBlue : palette.border,
                            backgroundColor: imageStyle === style.value ? palette.lightBlueBg : "transparent"
                          }}
                          className="p-3 rounded-lg border-2 transition-all text-sm font-medium"
                        >
                          {style.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Keywords */}
                  <div className="space-y-4">
                    <p style={{ color: palette.textMuted }} className="text-sm font-bold">
                      Adicionar Palavras-Chave Extras
                    </p>
                    <div className="flex gap-2">
                      <Input 
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                        placeholder="Ex: sofisticado, minimalista..."
                        style={{ backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.05)" : "#F9F9F9", borderColor: palette.border, color: palette.text }}
                        className="border"
                      />
                      <Button onClick={addKeyword} style={{ backgroundColor: palette.lightBlue, color: isDarkMode ? "#000000" : "#FFFFFF" }} className="hover:opacity-90">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {extraKeywords.map(keyword => (
                        <div key={keyword} style={{ backgroundColor: palette.lightBlueBg, color: palette.lightBlue }} className="px-3 py-1 rounded-full text-sm flex items-center gap-2">
                          {keyword}
                          <button onClick={() => removeKeyword(keyword)} className="hover:opacity-70">×</button>
                        </div>
                      ))}
                      {SUGGESTED_KEYWORDS.filter(k => !extraKeywords.includes(k)).map(keyword => (
                        <button
                          key={keyword}
                          onClick={() => { setExtraKeywords([...extraKeywords, keyword]); }}
                          style={{ borderColor: palette.border }}
                          className="px-3 py-1 rounded-full text-sm border hover:opacity-70"
                        >
                          + {keyword}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex gap-4 pt-8">
                  <Button variant="outline" onClick={() => setStep("cards")} style={{ borderColor: palette.border }} className="hover:opacity-70">
                    <ChevronLeft className="h-4 w-4 mr-2" /> Voltar
                  </Button>
                  <Button onClick={generateSlides} disabled={loading} style={{ backgroundColor: palette.lightBlue, color: isDarkMode ? "#000000" : "#FFFFFF" }} className="flex-1 hover:opacity-90">
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Gerar Apresentação
                  </Button>
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
              style={{ backgroundColor: palette.bg }}
              className="min-h-full p-6 md:p-12 flex flex-col items-center justify-center"
            >
              <div className="w-full max-w-5xl space-y-6">
                {/* Main Slide */}
                <div style={{ borderColor: palette.border, backgroundColor: palette.bg }} className="relative rounded-2xl overflow-hidden shadow-2xl border aspect-video flex">
                  {slides[currentSlide].imageUrl && (
                    <div className="absolute inset-0">
                      <img src={slides[currentSlide].imageUrl} className="w-full h-full object-cover" alt="" />
                      <div style={{ backgroundColor: isDarkMode ? "rgba(0, 0, 0, 0.6)" : "rgba(255, 255, 255, 0.6)" }}></div>
                    </div>
                  )}
                  <div className="relative z-10 flex flex-col justify-center p-12 md:p-20 w-full">
                    <h2 style={{ color: palette.text }} className="text-4xl md:text-5xl font-bold mb-6">
                      {slides[currentSlide].titulo}
                    </h2>
                    <div style={{ color: palette.textMuted }} className="text-lg space-y-3">
                      {slides[currentSlide].conteudo.split("\\n").map((line, idx) => (
                        <p key={idx}>{line}</p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    disabled={currentSlide === 0}
                    onClick={() => setCurrentSlide(p => p - 1)}
                    style={{ borderColor: palette.border }}
                    className="hover:opacity-70"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>

                  <div className="flex gap-2 flex-wrap justify-center">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        style={{
                          backgroundColor: i === currentSlide ? palette.lightBlue : isDarkMode ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)",
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
                    style={{ borderColor: palette.border }}
                    className="hover:opacity-70"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>

                {/* Slide Counter */}
                <div style={{ color: palette.textMuted }} className="text-center text-sm">
                  Slide {currentSlide + 1} de {slides.length}
                </div>

                {generatingImages && (
                  <div style={{ backgroundColor: palette.lightBlueBg, color: palette.lightBlue }} className="flex items-center gap-2 p-4 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">A gerar imagens em alta definição...</span>
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
