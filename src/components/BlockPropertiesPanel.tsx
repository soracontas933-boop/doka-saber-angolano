import React, { useState } from 'react';
import { ElementBlock, ElementBlockStyle, ANIMATION_PRESETS, EASING_PRESETS, GOOGLE_FONTS } from '@/types/editor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Trash2, Type, Palette, Layout, Sparkles, Settings2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface BlockPropertiesPanelProps {
  block: ElementBlock;
  onBlockUpdate: (updates: Partial<ElementBlock>) => void;
  onBlockRemove: () => void;
  onImageUpload?: (file: File) => Promise<string>;
  uploading?: boolean;
}

const BlockPropertiesPanel: React.FC<BlockPropertiesPanelProps> = ({
  block,
  onBlockUpdate,
  onBlockRemove,
  onImageUpload,
  uploading = false,
}) => {
  const updateStyle = (updates: Partial<ElementBlockStyle>) => {
    onBlockUpdate({
      style: { ...block.style, ...updates },
    });
  };

  const updateContent = (updates: any) => {
    onBlockUpdate({
      content: { ...block.content, ...updates },
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageUpload) return;

    try {
      const url = await onImageUpload(file);
      updateContent({ url });
      toast({ title: 'Imagem carregada com sucesso' });
    } catch (error) {
      toast({
        title: 'Erro ao carregar imagem',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings2 className="h-4 w-4" /> Propriedades do Elemento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tipo de elemento */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tipo</Label>
            <div className="px-3 py-2 bg-muted rounded-md text-sm font-medium">{block.type}</div>
          </div>

          {/* Conteúdo específico por tipo */}
          {block.type === 'text' && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Texto</Label>
              <Textarea
                value={block.content.text || ''}
                onChange={(e) => updateContent({ text: e.target.value })}
                placeholder="Digite o texto aqui..."
                className="min-h-20 text-xs"
              />
            </div>
          )}

          {block.type === 'image' && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Imagem</Label>
              <Input
                type="text"
                value={block.content.url || ''}
                onChange={(e) => updateContent({ url: e.target.value })}
                placeholder="URL da imagem"
                className="text-xs"
              />
              <Button
                variant="outline"
                className="w-full text-xs"
                onClick={() => document.getElementById(`image-upload-${block.id}`)?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                Carregar Imagem
              </Button>
              <input
                id={`image-upload-${block.id}`}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Input
                type="text"
                value={block.content.alt || ''}
                onChange={(e) => updateContent({ alt: e.target.value })}
                placeholder="Texto alternativo"
                className="text-xs"
              />
            </div>
          )}

          {block.type === 'button' && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Texto do Botão</Label>
              <Input
                type="text"
                value={block.content.buttonText || ''}
                onChange={(e) => updateContent({ buttonText: e.target.value })}
                placeholder="Clique aqui"
                className="text-xs"
              />
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Link</Label>
              <Input
                type="text"
                value={block.content.buttonLink || ''}
                onChange={(e) => updateContent({ buttonLink: e.target.value })}
                placeholder="https://..."
                className="text-xs"
              />
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Abrir em</Label>
              <Select value={block.content.buttonTarget || '_self'} onValueChange={(val) => updateContent({ buttonTarget: val })}>
                <SelectTrigger size="sm" className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_self">Mesma aba</SelectItem>
                  <SelectItem value="_blank">Nova aba</SelectItem>
                  <SelectItem value="_parent">Janela pai</SelectItem>
                  <SelectItem value="_top">Topo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {block.type === 'video' && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">URL do Vídeo</Label>
              <Input
                type="text"
                value={block.content.url || ''}
                onChange={(e) => updateContent({ url: e.target.value })}
                placeholder="YouTube ou Vimeo URL"
                className="text-xs"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="position" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="position" className="text-xs">
            <Layout className="h-3 w-3 mr-1" /> Posição
          </TabsTrigger>
          <TabsTrigger value="style" className="text-xs">
            <Palette className="h-3 w-3 mr-1" /> Estilo
          </TabsTrigger>
          <TabsTrigger value="animation" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" /> Animação
          </TabsTrigger>
        </TabsList>

        {/* Aba Posição */}
        <TabsContent value="position">
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="grid gap-2">
                <div className="flex justify-between text-[10px] font-bold">
                  <span>Posição Horizontal (X): {block.style.x}%</span>
                </div>
                <Slider
                  value={[block.style.x]}
                  onValueChange={([v]) => updateStyle({ x: v })}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="grid gap-2">
                <div className="flex justify-between text-[10px] font-bold">
                  <span>Posição Vertical (Y): {block.style.y}%</span>
                </div>
                <Slider
                  value={[block.style.y]}
                  onValueChange={([v]) => updateStyle({ y: v })}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="grid gap-2">
                <div className="flex justify-between text-[10px] font-bold">
                  <span>Largura: {block.style.width}%</span>
                </div>
                <Slider
                  value={[block.style.width]}
                  onValueChange={([v]) => updateStyle({ width: v })}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              {(block.type === 'image' || block.type === 'video' || block.type === 'box') && (
                <div className="grid gap-2">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span>Altura: {block.style.height || 'auto'}%</span>
                  </div>
                  <Slider
                    value={[block.style.height || 50]}
                    onValueChange={([v]) => updateStyle({ height: v })}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label className="text-[10px] uppercase tracking-wider">Z-Index</Label>
                <Input
                  type="number"
                  value={block.style.zIndex}
                  onChange={(e) => updateStyle({ zIndex: parseInt(e.target.value) })}
                  className="h-8 text-xs"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Estilo */}
        <TabsContent value="style">
          <Card>
            <CardContent className="pt-4 space-y-4">
              {/* Tipografia */}
              {block.type === 'text' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wider">Fonte</Label>
                    <Select value={block.style.fontFamily || 'Inter'} onValueChange={(val) => updateStyle({ fontFamily: val })}>
                      <SelectTrigger size="sm" className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GOOGLE_FONTS.map((font) => (
                          <SelectItem key={font.name} value={font.family} className="text-xs">
                            {font.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span>Tamanho: {block.style.fontSize}px</span>
                    </div>
                    <Slider
                      value={[block.style.fontSize || 16]}
                      onValueChange={([v]) => updateStyle({ fontSize: v })}
                      min={8}
                      max={120}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wider">Peso da Fonte</Label>
                    <Select value={String(block.style.fontWeight || 400)} onValueChange={(val) => updateStyle({ fontWeight: parseInt(val) })}>
                      <SelectTrigger size="sm" className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="300">Leve (300)</SelectItem>
                        <SelectItem value="400">Normal (400)</SelectItem>
                        <SelectItem value="500">Médio (500)</SelectItem>
                        <SelectItem value="600">Semi-negrito (600)</SelectItem>
                        <SelectItem value="700">Negrito (700)</SelectItem>
                        <SelectItem value="800">Extra-negrito (800)</SelectItem>
                        <SelectItem value="900">Preto (900)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wider">Alinhamento</Label>
                    <div className="flex gap-1">
                      {['left', 'center', 'right'].map((align) => (
                        <Button
                          key={align}
                          variant={block.style.textAlign === align ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => updateStyle({ textAlign: align as any })}
                        >
                          {align === 'left' ? '⬅' : align === 'center' ? '⬆⬇' : '➡'}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Cores */}
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-wider">Cor do Texto</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={block.style.color || '#000000'}
                    onChange={(e) => updateStyle({ color: e.target.value })}
                    className="w-10 h-8 rounded cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={block.style.color || ''}
                    onChange={(e) => updateStyle({ color: e.target.value })}
                    placeholder="#000000"
                    className="flex-1 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-wider">Cor de Fundo</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={block.style.backgroundColor || '#ffffff'}
                    onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                    className="w-10 h-8 rounded cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={block.style.backgroundColor || ''}
                    onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                    placeholder="#ffffff"
                    className="flex-1 text-xs"
                  />
                </div>
              </div>

              {/* Borda */}
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-wider">Largura da Borda</Label>
                <Input
                  type="number"
                  value={block.style.borderWidth || 0}
                  onChange={(e) => updateStyle({ borderWidth: parseInt(e.target.value) })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-wider">Raio da Borda</Label>
                <Input
                  type="number"
                  value={block.style.borderRadius || 0}
                  onChange={(e) => updateStyle({ borderRadius: parseInt(e.target.value) })}
                  className="h-8 text-xs"
                />
              </div>

              {/* Opacidade */}
              <div className="grid gap-2">
                <div className="flex justify-between text-[10px] font-bold">
                  <span>Opacidade: {Math.round((block.style.opacity || 1) * 100)}%</span>
                </div>
                <Slider
                  value={[(block.style.opacity || 1) * 100]}
                  onValueChange={([v]) => updateStyle({ opacity: v / 100 })}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Animação */}
        <TabsContent value="animation">
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-wider">Tipo de Animação</Label>
                <Select value={block.style.animation || 'none'} onValueChange={(val) => updateStyle({ animation: val })}>
                  <SelectTrigger size="sm" className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANIMATION_PRESETS.map((anim) => (
                      <SelectItem key={anim.value} value={anim.value} className="text-xs">
                        {anim.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-wider">Easing</Label>
                <Select value={block.style.animationEasing || 'ease'} onValueChange={(val) => updateStyle({ animationEasing: val as any })}>
                  <SelectTrigger size="sm" className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EASING_PRESETS.map((ease) => (
                      <SelectItem key={ease.value} value={ease.value} className="text-xs">
                        {ease.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider">Duração (s)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={block.style.animationDuration || 0.5}
                    onChange={(e) => updateStyle({ animationDuration: parseFloat(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider">Delay (s)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={block.style.animationDelay || 0}
                    onChange={(e) => updateStyle({ animationDelay: parseFloat(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-wider">Repetições</Label>
                <Input
                  type="number"
                  value={block.style.animationRepeat || 1}
                  onChange={(e) => updateStyle({ animationRepeat: parseInt(e.target.value) })}
                  className="h-8 text-xs"
                  placeholder="-1 para infinito"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Botão remover */}
      <Button
        variant="destructive"
        className="w-full text-xs"
        onClick={onBlockRemove}
      >
        <Trash2 className="h-3 w-3 mr-2" /> Remover Elemento
      </Button>
    </div>
  );
};

export default BlockPropertiesPanel;
