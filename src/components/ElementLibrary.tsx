import React, { useState } from 'react';
import { ELEMENT_LIBRARY, ElementBlockType } from '@/types/editor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface ElementLibraryProps {
  onAddElement: (type: ElementBlockType, icon?: string) => void;
}

const ElementLibrary: React.FC<ElementLibraryProps> = ({ onAddElement }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['icons', 'shapes', 'dividers', 'boxes'];

  const filteredElements = ELEMENT_LIBRARY.filter((el) =>
    el.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const elementsByCategory = categories.reduce(
    (acc, cat) => {
      acc[cat] = filteredElements.filter((el) => el.category === cat);
      return acc;
    },
    {} as Record<string, typeof ELEMENT_LIBRARY>
  );

  const renderIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (!IconComponent) return <div className="w-6 h-6 bg-muted rounded" />;
    return <IconComponent className="w-6 h-6" />;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Plus className="h-4 w-4" /> Biblioteca de Elementos
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col">
        <div className="mb-4 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Pesquisar elementos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 text-xs pl-7"
          />
        </div>

        <Tabs defaultValue="icons" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mb-2">
            <TabsTrigger value="icons" className="text-xs">
              Ícones
            </TabsTrigger>
            <TabsTrigger value="shapes" className="text-xs">
              Formas
            </TabsTrigger>
            <TabsTrigger value="dividers" className="text-xs">
              Divisores
            </TabsTrigger>
            <TabsTrigger value="boxes" className="text-xs">
              Caixas
            </TabsTrigger>
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category} value={category} className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-3 gap-2">
                {/* Botão para adicionar elemento de texto */}
                {category === 'icons' && (
                  <Button
                    variant="outline"
                    className="h-16 flex flex-col items-center justify-center text-xs"
                    onClick={() => onAddElement('text')}
                  >
                    <span className="text-lg mb-1">T</span>
                    <span className="text-[10px]">Texto</span>
                  </Button>
                )}

                {/* Botão para adicionar imagem */}
                {category === 'icons' && (
                  <Button
                    variant="outline"
                    className="h-16 flex flex-col items-center justify-center text-xs"
                    onClick={() => onAddElement('image')}
                  >
                    <span className="text-lg mb-1">🖼️</span>
                    <span className="text-[10px]">Imagem</span>
                  </Button>
                )}

                {/* Botão para adicionar vídeo */}
                {category === 'icons' && (
                  <Button
                    variant="outline"
                    className="h-16 flex flex-col items-center justify-center text-xs"
                    onClick={() => onAddElement('video')}
                  >
                    <span className="text-lg mb-1">▶️</span>
                    <span className="text-[10px]">Vídeo</span>
                  </Button>
                )}

                {/* Botão para adicionar botão */}
                {category === 'icons' && (
                  <Button
                    variant="outline"
                    className="h-16 flex flex-col items-center justify-center text-xs"
                    onClick={() => onAddElement('button')}
                  >
                    <span className="text-lg mb-1">🔘</span>
                    <span className="text-[10px]">Botão</span>
                  </Button>
                )}

                {/* Elementos da biblioteca */}
                {elementsByCategory[category]?.map((element) => (
                  <Button
                    key={element.id}
                    variant="outline"
                    className="h-16 flex flex-col items-center justify-center text-xs hover:bg-primary/10"
                    onClick={() => onAddElement(element.type as ElementBlockType, element.name)}
                  >
                    {element.type === 'icon' && renderIcon(element.name)}
                    {element.type === 'shape' && <span className="text-lg mb-1">⬜</span>}
                    {element.type === 'divider' && <span className="text-lg mb-1">─</span>}
                    {element.type === 'box' && <span className="text-lg mb-1">📦</span>}
                    <span className="text-[10px] text-center line-clamp-2">{element.name}</span>
                  </Button>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Mensagem quando nenhum elemento é encontrado */}
        {filteredElements.length === 0 && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <p className="text-xs">Nenhum elemento encontrado</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ElementLibrary;
