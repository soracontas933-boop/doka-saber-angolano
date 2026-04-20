import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ElementBlock, LandingSection } from '@/types/editor';
import { Button } from '@/components/ui/button';
import { Trash2, Copy, Move } from 'lucide-react';
import './EditorCanvas.css';

interface EditorCanvasProps {
  section: LandingSection;
  selectedBlockId: string | null;
  onBlockSelect: (blockId: string) => void;
  onBlockUpdate: (blockId: string, updates: Partial<ElementBlock>) => void;
  onBlockRemove: (blockId: string) => void;
  isPreviewMode: boolean;
}

const EditorCanvas: React.FC<EditorCanvasProps> = ({
  section,
  selectedBlockId,
  onBlockSelect,
  onBlockUpdate,
  onBlockRemove,
  isPreviewMode,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizingBlockId, setResizingBlockId] = useState<string | null>(null);

  const style = section.conteudo.style || {};
  const bgClass =
    style.bg === 'card'
      ? 'bg-card'
      : style.bg === 'primary'
        ? 'bg-primary/5'
        : style.bg === 'muted'
          ? 'bg-muted/30'
          : style.bg === 'black'
            ? 'bg-black'
            : 'bg-background';

  const handleMouseDown = (e: React.MouseEvent, blockId: string) => {
    if (isPreviewMode) return;
    e.preventDefault();
    onBlockSelect(blockId);
    setDraggingBlockId(blockId);

    const block = section.conteudo.blocks.find(b => b.id === blockId);
    if (!block || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasRect = canvas.getBoundingClientRect();
    const blockX = (block.style.x / 100) * canvasRect.width;
    const blockY = (block.style.y / 100) * canvasRect.height;

    setDragOffset({
      x: e.clientX - canvasRect.left - blockX,
      y: e.clientY - canvasRect.top - blockY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingBlockId || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasRect = canvas.getBoundingClientRect();

    const newX = ((e.clientX - canvasRect.left - dragOffset.x) / canvasRect.width) * 100;
    const newY = ((e.clientY - canvasRect.top - dragOffset.y) / canvasRect.height) * 100;

    onBlockUpdate(draggingBlockId, {
      style: {
        ...section.conteudo.blocks.find(b => b.id === draggingBlockId)?.style,
        x: Math.max(0, Math.min(100, newX)),
        y: Math.max(0, Math.min(100, newY)),
      },
    });
  };

  const handleMouseUp = () => {
    setDraggingBlockId(null);
  };

  const renderBlockContent = (block: ElementBlock) => {
    const blockStyle: React.CSSProperties = {
      fontFamily: block.style.fontFamily || 'inherit',
      fontSize: `${block.style.fontSize || 16}px`,
      fontWeight: block.style.fontWeight || 400,
      fontStyle: block.style.fontStyle || 'normal',
      color: block.style.color || 'inherit',
      backgroundColor: block.style.backgroundColor || 'transparent',
      padding: `${block.style.padding || 0}px`,
      borderRadius: `${block.style.borderRadius || 0}px`,
      border:
        block.style.borderWidth && block.style.borderColor
          ? `${block.style.borderWidth}px ${block.style.borderStyle || 'solid'} ${block.style.borderColor}`
          : 'none',
      boxShadow: block.style.boxShadow || 'none',
      opacity: block.style.opacity || 1,
      textAlign: block.style.textAlign || 'left',
      letterSpacing: `${block.style.letterSpacing || 0}px`,
      lineHeight: block.style.lineHeight || 1.5,
      textDecoration: block.style.textDecoration || 'none',
      textTransform: block.style.textTransform || 'none',
      cursor: block.style.cursor || 'default',
    };

    switch (block.type) {
      case 'text':
        return (
          <div style={blockStyle} className="whitespace-pre-wrap break-words">
            {block.content.text || 'Texto'}
          </div>
        );

      case 'image':
        return (
          <img
            src={block.content.url || '/placeholder.svg'}
            alt={block.content.alt || 'Imagem'}
            style={{
              ...blockStyle,
              width: '100%',
              height: '100%',
              objectFit: block.style.objectFit || 'cover',
            }}
            className="rounded-lg"
          />
        );

      case 'video':
        return (
          <div
            style={{
              ...blockStyle,
              width: '100%',
              height: '100%',
              backgroundColor: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            className="rounded-lg overflow-hidden"
          >
            <iframe
              src={
                block.content.url?.includes('youtube.com')
                  ? block.content.url.replace('watch?v=', 'embed/')
                  : block.content.url || ''
              }
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );

      case 'button':
        return (
          <Button
            style={{
              backgroundColor: block.style.backgroundColor,
              color: block.style.color,
              fontSize: `${block.style.fontSize || 14}px`,
            }}
            className="rounded-full"
          >
            {block.content.buttonText || 'Botão'}
          </Button>
        );

      case 'box':
        return (
          <div
            style={{
              ...blockStyle,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="text-muted-foreground text-sm">Caixa</span>
          </div>
        );

      default:
        return <div style={blockStyle}>{block.content.text || 'Elemento'}</div>;
    }
  };

  return (
    <div
      ref={canvasRef}
      className={`relative w-full ${bgClass} border-2 border-dashed border-primary/20 rounded-lg overflow-hidden`}
      style={{
        minHeight: style.height || '500px',
        backgroundImage: style.backgroundImage ? `url(${style.backgroundImage})` : undefined,
        backgroundSize: style.backgroundSize || 'cover',
        backgroundPosition: style.backgroundPosition || 'center',
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Overlay */}
      {style.overlay && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: style.overlayColor || 'rgba(0, 0, 0, 0.5)',
            opacity: style.overlay,
          }}
        />
      )}

      {/* Blocos de elementos */}
      <div className="relative w-full h-full">
        <AnimatePresence>
          {section.conteudo.blocks.map((block) => (
            <motion.div
              key={block.id}
              className={`absolute group ${
                selectedBlockId === block.id && !isPreviewMode ? 'ring-2 ring-primary' : ''
              } rounded-lg transition-all`}
              style={{
                left: `${block.style.x}%`,
                top: `${block.style.y}%`,
                width: `${block.style.width}%`,
                height: block.style.height ? `${block.style.height}%` : 'auto',
                zIndex: block.style.zIndex || 1,
                cursor: isPreviewMode ? 'default' : 'move',
              }}
              onMouseDown={(e) => handleMouseDown(e, block.id)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              {renderBlockContent(block)}

              {/* Controles de edição */}
              {selectedBlockId === block.id && !isPreviewMode && (
                <div className="absolute -top-10 left-0 flex gap-1 bg-primary/90 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-white hover:bg-white/20"
                    onClick={() => onBlockRemove(block.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-white hover:bg-white/20"
                    onClick={() => {
                      const newBlock = { ...block, id: Math.random().toString(36).slice(2, 11) };
                      onBlockUpdate(block.id, newBlock);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Move className="h-3 w-3 text-white self-center" />
                </div>
              )}

              {/* Resize handle */}
              {selectedBlockId === block.id && !isPreviewMode && (
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 bg-primary rounded-tl-lg cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setResizingBlockId(block.id);
                  }}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Mensagem de canvas vazio */}
      {section.conteudo.blocks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <p className="text-sm">Nenhum elemento nesta seção. Adicione elementos usando o painel à esquerda.</p>
        </div>
      )}
    </div>
  );
};

export default EditorCanvas;
