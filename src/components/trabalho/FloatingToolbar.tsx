import React, { useEffect, useState, useCallback } from "react";
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Undo, Redo } from "lucide-react";

interface FloatingToolbarProps {
  containerRef: React.RefObject<HTMLElement>;
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ containerRef }) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      setVisible(false);
      return;
    }

    // Check if selection is within our container
    const container = containerRef.current;
    if (!container) return;
    const anchorNode = selection.anchorNode;
    if (!anchorNode || !container.contains(anchorNode)) {
      setVisible(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0) {
      setVisible(false);
      return;
    }

    setPosition({
      top: rect.top + window.scrollY - 52,
      left: rect.left + window.scrollX + rect.width / 2,
    });
    setVisible(true);
  }, [containerRef]);

  useEffect(() => {
    document.addEventListener("selectionchange", updatePosition);
    return () => document.removeEventListener("selectionchange", updatePosition);
  }, [updatePosition]);

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    // Keep focus on the editable area
    containerRef.current?.focus();
  };

  const formatBlock = (tag: string) => {
    document.execCommand("formatBlock", false, tag);
  };

  if (!visible) return null;

  const buttons = [
    { icon: Bold, action: () => exec("bold"), title: "Negrito" },
    { icon: Italic, action: () => exec("italic"), title: "Itálico" },
    { icon: Heading2, action: () => formatBlock("h2"), title: "Título" },
    { icon: Heading3, action: () => formatBlock("h3"), title: "Subtítulo" },
    { icon: List, action: () => exec("insertUnorderedList"), title: "Lista" },
    { icon: ListOrdered, action: () => exec("insertOrderedList"), title: "Lista numerada" },
    { icon: Undo, action: () => exec("undo"), title: "Desfazer" },
    { icon: Redo, action: () => exec("redo"), title: "Refazer" },
  ];

  return (
    <div
      className="floating-toolbar"
      style={{
        position: "absolute",
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: "translateX(-50%)",
        zIndex: 9999,
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing selection
    >
      {buttons.map(({ icon: Icon, action, title }, i) => (
        <button
          key={i}
          type="button"
          className="floating-toolbar-btn"
          onClick={action}
          title={title}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
};

export default FloatingToolbar;
