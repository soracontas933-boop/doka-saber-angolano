import { useState } from "react";
import {
  ChevronUp, ChevronDown, Copy, Trash2, Plus, Sparkles, Loader2,
  X, GripVertical, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, arrayMove,
  useSortable, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Deck, Slide, SlideKind } from "@/types/presentation";
import { LAYOUT_VARIANTS } from "@/lib/presentation/narrative";
import { regenerateSingleSlide, type DensityLevel } from "@/lib/presentation/ai-deck";

const ALL_KINDS: SlideKind[] = [
  "hero", "agenda", "context", "insight", "stats", "bento", "split",
  "timeline", "process", "comparison", "quote", "gallery", "dashboard",
  "case-study", "summary", "conclusion", "references", "closing", "cta",
];

// ─── Item arrastável da lista de miniaturas ─────────────────────
function SortableSlideItem({
  slide, index, current, onClick,
}: {
  slide: Slide; index: number; current: number; onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: slide.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : "auto",
  };
  const active = index === current;
  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`text-xs px-2 py-1.5 rounded-md flex items-center gap-2 cursor-pointer ${
        active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="touch-none cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100"
        aria-label="Arrastar slide"
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <span className="opacity-60 w-5">{index + 1}.</span>
      <span className="truncate flex-1">{slide.title || "—"}</span>
      <span className="text-[9px] uppercase opacity-50">{slide.kind}</span>
    </div>
  );
}

interface Props {
  deck: Deck;
  current: number;
  onChange: (i: number) => void;
  onUpdate: (slides: Slide[]) => void;
  topic: string;
  cardsOutline: string;
  density: DensityLevel;
  language: "pt-AO" | "pt-BR";
  onClose?: () => void;
}

export function SlideEditor({
  deck, current, onChange, onUpdate, topic, cardsOutline, density, language, onClose,
}: Props) {
  const slide = deck.slides[current];
  const [regenHint, setRegenHint] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = deck.slides.findIndex(s => s.id === active.id);
    const newIndex = deck.slides.findIndex(s => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(deck.slides, oldIndex, newIndex);
    onUpdate(next);
    // mantém o mesmo slide seleccionado (segue-o para a nova posição)
    const currentId = slide?.id;
    const followed = next.findIndex(s => s.id === currentId);
    if (followed >= 0) onChange(followed);
  };

  if (!slide) return null;

  const update = (patch: Partial<Slide>) => {
    const next = deck.slides.map((s, i) => (i === current ? { ...s, ...patch } : s));
    onUpdate(next);
  };

  const move = (dir: -1 | 1) => {
    const j = current + dir;
    if (j < 0 || j >= deck.slides.length) return;
    const next = [...deck.slides];
    [next[current], next[j]] = [next[j], next[current]];
    onUpdate(next);
    onChange(j);
  };

  const duplicate = () => {
    const copy: Slide = { ...slide, id: `slide-${Date.now()}` };
    const next = [...deck.slides];
    next.splice(current + 1, 0, copy);
    onUpdate(next);
    onChange(current + 1);
    toast.success("Slide duplicado.");
  };

  const remove = () => {
    if (deck.slides.length <= 1) return toast.error("Tens de ter pelo menos 1 slide.");
    const next = deck.slides.filter((_, i) => i !== current);
    onUpdate(next);
    onChange(Math.max(0, current - 1));
  };

  const addAfter = () => {
    const blank: Slide = {
      id: `slide-${Date.now()}`,
      section: slide.section,
      kind: "split",
      layoutVariant: "split-50",
      title: "Novo slide",
      richBody: "",
      body: [],
      blocks: [],
    };
    const next = [...deck.slides];
    next.splice(current + 1, 0, blank);
    onUpdate(next);
    onChange(current + 1);
  };

  const changeKind = (kind: SlideKind) => {
    const variants = LAYOUT_VARIANTS[kind] || ["default"];
    update({ kind, layoutVariant: variants[0] });
  };

  const updateBullet = (i: number, v: string) => {
    const body = [...(slide.body || [])];
    body[i] = v;
    update({ body });
  };

  const addBullet = () => update({ body: [...(slide.body || []), ""] });
  const removeBullet = (i: number) => update({ body: (slide.body || []).filter((_, k) => k !== i) });

  const updateBlock = (i: number, patch: Partial<NonNullable<Slide["blocks"]>[number]>) => {
    const blocks = [...(slide.blocks || [])];
    blocks[i] = { ...blocks[i], ...patch };
    update({ blocks });
  };
  const addBlock = () => update({
    blocks: [...(slide.blocks || []), { type: "card", label: "", description: "" }],
  });
  const removeBlock = (i: number) => update({ blocks: (slide.blocks || []).filter((_, k) => k !== i) });

  const regen = async () => {
    setRegenerating(true);
    try {
      const fresh = await regenerateSingleSlide({
        topic, cardsOutline, kind: slide.kind, currentTitle: slide.title,
        language, density, hint: regenHint.trim() || undefined,
      });
      update({
        title: fresh.title || slide.title,
        subtitle: fresh.subtitle,
        richBody: fresh.richBody,
        body: fresh.body || [],
        blocks: fresh.blocks || [],
        pill: fresh.pill,
        footnote: fresh.footnote,
        imagePrompt: fresh.imagePrompt,
      });
      setRegenHint("");
      toast.success("Slide regenerado.");
    } catch (e) {
      console.error(e);
      toast.error("Erro a regenerar.");
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <aside className="w-full md:w-[380px] shrink-0 border-l bg-card flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 border-b p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold">
          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-xs">
            {current + 1}/{deck.slides.length}
          </span>
          Editor de slide
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        )}
      </div>

      {/* Slide list (drag-and-drop) */}
      <div className="shrink-0 border-b p-2 max-h-40 overflow-y-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={deck.slides.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {deck.slides.map((s, i) => (
                <SortableSlideItem
                  key={s.id}
                  slide={s}
                  index={i}
                  current={current}
                  onClick={() => onChange(i)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Toolbar */}
      <div className="shrink-0 border-b p-2 flex flex-wrap gap-1">
        <Button variant="ghost" size="sm" onClick={() => move(-1)} disabled={current === 0}>
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => move(1)} disabled={current === deck.slides.length - 1}>
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={duplicate}><Copy className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={addAfter}><Plus className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={remove} className="text-destructive ml-auto">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Layout */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Tipo</Label>
            <select
              value={slide.kind}
              onChange={(e) => changeKind(e.target.value as SlideKind)}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            >
              {ALL_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Variante</Label>
            <select
              value={slide.layoutVariant}
              onChange={(e) => update({ layoutVariant: e.target.value })}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            >
              {(LAYOUT_VARIANTS[slide.kind] || [slide.layoutVariant]).map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Pill / Title / Subtitle */}
        <div>
          <Label className="text-xs">Pill (badge superior)</Label>
          <Input value={slide.pill || ""} onChange={(e) => update({ pill: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Título</Label>
          <Textarea
            value={slide.title}
            onChange={(e) => update({ title: e.target.value })}
            rows={2}
            className="mt-1 font-bold"
          />
        </div>
        <div>
          <Label className="text-xs">Subtítulo</Label>
          <Input value={slide.subtitle || ""} onChange={(e) => update({ subtitle: e.target.value })} className="mt-1" />
        </div>

        {/* RichBody */}
        <div>
          <Label className="text-xs">Parágrafo principal (use **negrito**)</Label>
          <Textarea
            value={slide.richBody || ""}
            onChange={(e) => update({ richBody: e.target.value })}
            rows={5}
            className="mt-1"
            placeholder="Parágrafo de 40-90 palavras…"
          />
        </div>

        {/* Bullets */}
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Bullets</Label>
            <Button variant="ghost" size="sm" onClick={addBullet}><Plus className="h-3 w-3" /></Button>
          </div>
          <div className="space-y-1 mt-1">
            {(slide.body || []).map((b, i) => (
              <div key={i} className="flex gap-1">
                <Input value={b} onChange={(e) => updateBullet(i, e.target.value)} className="text-sm" />
                <Button variant="ghost" size="icon" onClick={() => removeBullet(i)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Blocks */}
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Cards / Stats / Etapas</Label>
            <Button variant="ghost" size="sm" onClick={addBlock}><Plus className="h-3 w-3" /></Button>
          </div>
          <div className="space-y-2 mt-1">
            {(slide.blocks || []).map((b, i) => (
              <div key={i} className="rounded-lg border p-2 space-y-1 bg-muted/30">
                <div className="flex items-center gap-1">
                  <Input
                    placeholder="Label / título"
                    value={b.label || ""}
                    onChange={(e) => updateBlock(i, { label: e.target.value })}
                    className="text-xs h-8"
                  />
                  <Input
                    placeholder="Valor (stats)"
                    value={b.value || ""}
                    onChange={(e) => updateBlock(i, { value: e.target.value })}
                    className="text-xs h-8 w-20"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeBlock(i)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <Textarea
                  placeholder="Descrição"
                  value={b.description || ""}
                  onChange={(e) => updateBlock(i, { description: e.target.value })}
                  rows={2}
                  className="text-xs"
                />
                <Input
                  placeholder="Ícone (emoji)"
                  value={b.icon || ""}
                  onChange={(e) => updateBlock(i, { icon: e.target.value })}
                  className="text-xs h-8 w-20"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footnote */}
        <div>
          <Label className="text-xs">Footnote</Label>
          <Input value={slide.footnote || ""} onChange={(e) => update({ footnote: e.target.value })} className="mt-1" />
        </div>
      </div>

      {/* Regenerate footer */}
      <div className="shrink-0 border-t p-3 space-y-2 bg-muted/30">
        <Label className="text-xs flex items-center gap-1">
          <Wand2 className="h-3 w-3" /> Regenerar este slide com IA
        </Label>
        <Textarea
          value={regenHint}
          onChange={(e) => setRegenHint(e.target.value)}
          placeholder="Instrução opcional (ex: 'mais focado em estatísticas')"
          rows={2}
          className="text-xs"
        />
        <Button onClick={regen} disabled={regenerating} className="w-full" size="sm">
          {regenerating
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A regenerar…</>
            : <><Sparkles className="h-4 w-4 mr-2" />Regenerar slide</>}
        </Button>
      </div>
    </aside>
  );
}
