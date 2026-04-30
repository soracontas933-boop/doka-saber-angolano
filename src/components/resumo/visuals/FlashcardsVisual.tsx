import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Flashcard {
  frente: string;
  verso: string;
}

export const FlashcardsVisual: React.FC<{ cards: Flashcard[] }> = ({ cards }) => {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (!cards.length) return null;
  const card = cards[idx];

  const next = () => { setFlipped(false); setIdx((i) => (i + 1) % cards.length); };
  const prev = () => { setFlipped(false); setIdx((i) => (i - 1 + cards.length) % cards.length); };

  return (
    <div className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6 md:p-10 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-muted-foreground font-semibold tracking-wide">
          Flashcard {idx + 1} de {cards.length}
        </div>
        <div className="flex gap-1">
          {cards.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === idx ? 24 : 6,
                background: i === idx ? "hsl(var(--primary))" : "hsl(var(--muted))",
              }}
            />
          ))}
        </div>
      </div>

      <div
        className="relative w-full aspect-[16/10] cursor-pointer"
        style={{ perspective: "1200px" }}
        onClick={() => setFlipped((f) => !f)}
      >
        <motion.div
          className="absolute inset-0"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.5 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Frente */}
          <div
            className="absolute inset-0 rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8 text-center"
            style={{
              backfaceVisibility: "hidden",
              background: "linear-gradient(135deg, hsl(199 89% 48%), hsl(220 70% 55%))",
              color: "white",
            }}
          >
            <div className="text-[10px] uppercase tracking-[0.2em] opacity-80 mb-3">Pergunta</div>
            <div className="text-xl md:text-2xl font-bold leading-snug max-w-2xl">{card.frente}</div>
            <div className="absolute bottom-4 text-[10px] opacity-70 flex items-center gap-1.5">
              <RotateCw className="h-3 w-3" /> Toque para virar
            </div>
          </div>
          {/* Verso */}
          <div
            className="absolute inset-0 rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8 text-center bg-card border-2 border-primary/30"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold mb-3">Resposta</div>
            <div className="text-base md:text-xl font-medium leading-relaxed text-foreground max-w-2xl">{card.verso}</div>
            <div className="absolute bottom-4 text-[10px] text-muted-foreground flex items-center gap-1.5">
              <RotateCw className="h-3 w-3" /> Toque para virar
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex items-center justify-between mt-5">
        <Button variant="outline" size="sm" onClick={prev}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setFlipped((f) => !f)}>
          <RotateCw className="h-4 w-4 mr-1" /> Virar
        </Button>
        <Button size="sm" onClick={next}>
          Próximo <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default FlashcardsVisual;
