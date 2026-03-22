import React, { useRef } from "react";
import { Plus, Trash2, Upload, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { CVData, Experiencia, Formacao, Idioma, Certificacao, Projeto } from "@/types/cv";

interface CVFormProps {
  data: CVData;
  onChange: (data: CVData) => void;
}

const uid = () => crypto.randomUUID();

const CVForm: React.FC<CVFormProps> = ({ data, onChange }) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof CVData>(key: K, value: CVData[K]) =>
    onChange({ ...data, [key]: value });

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("foto", reader.result as string);
    reader.readAsDataURL(file);
  };

  const addExp = () =>
    set("experiencias", [
      ...data.experiencias,
      { id: uid(), cargo: "", empresa: "", local: "", dataInicio: "", dataFim: "", descricao: "" },
    ]);

  const updateExp = (id: string, patch: Partial<Experiencia>) =>
    set("experiencias", data.experiencias.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const removeExp = (id: string) =>
    set("experiencias", data.experiencias.filter((e) => e.id !== id));

  const addForm = () =>
    set("formacoes", [
      ...data.formacoes,
      { id: uid(), curso: "", instituicao: "", local: "", dataInicio: "", dataFim: "", descricao: "" },
    ]);

  const updateForm = (id: string, patch: Partial<Formacao>) =>
    set("formacoes", data.formacoes.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const removeForm = (id: string) =>
    set("formacoes", data.formacoes.filter((f) => f.id !== id));

  const addIdioma = () =>
    set("idiomas", [...data.idiomas, { id: uid(), idioma: "", nivel: "Básico" }]);

  const updateIdioma = (id: string, patch: Partial<Idioma>) =>
    set("idiomas", data.idiomas.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const removeIdioma = (id: string) =>
    set("idiomas", data.idiomas.filter((i) => i.id !== id));

  const addCert = () =>
    set("certificacoes", [...data.certificacoes, { id: uid(), nome: "", instituicao: "", ano: "" }]);

  const updateCert = (id: string, patch: Partial<Certificacao>) =>
    set("certificacoes", data.certificacoes.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const removeCert = (id: string) =>
    set("certificacoes", data.certificacoes.filter((c) => c.id !== id));

  const addProjeto = () =>
    set("projetos", [...data.projetos, { id: uid(), nome: "", descricao: "", link: "" }]);

  const updateProjeto = (id: string, patch: Partial<Projeto>) =>
    set("projetos", data.projetos.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const removeProjeto = (id: string) =>
    set("projetos", data.projetos.filter((p) => p.id !== id));

  const handleAddHabilidade = () => set("habilidades", [...data.habilidades, ""]);

  const updateHabilidade = (idx: number, val: string) => {
    const h = [...data.habilidades];
    h[idx] = val;
    set("habilidades", h);
  };

  const removeHabilidade = (idx: number) =>
    set("habilidades", data.habilidades.filter((_, i) => i !== idx));

  return (
    <div className="space-y-4 pb-32">
      <Accordion type="multiple" defaultValue={["pessoal", "resumo"]} className="space-y-3">
        {/* ── Dados Pessoais ── */}
        <AccordionItem value="pessoal" className="border rounded-xl bg-card">
          <AccordionTrigger className="px-4 py-3 hover:no-underline text-base font-semibold">
            <span className="flex items-center gap-2"><User className="h-4 w-4" /> Dados Pessoais</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            <div className="flex items-center gap-4">
              <div
                onClick={() => fileRef.current?.click()}
                className="w-20 h-20 rounded-full bg-muted flex items-center justify-center cursor-pointer overflow-hidden border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors"
              >
                {data.foto ? (
                  <img src={data.foto} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              <div className="flex-1 space-y-2">
                <Input placeholder="Nome completo" value={data.nomeCompleto} onChange={(e) => set("nomeCompleto", e.target.value)} />
                <Input placeholder="Título profissional (ex: Engenheiro Civil)" value={data.titulo} onChange={(e) => set("titulo", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input placeholder="Email" type="email" value={data.email} onChange={(e) => set("email", e.target.value)} />
              <Input placeholder="Telefone" value={data.telefone} onChange={(e) => set("telefone", e.target.value)} />
              <Input placeholder="Endereço" value={data.endereco} onChange={(e) => set("endereco", e.target.value)} />
              <Input placeholder="Data de nascimento" value={data.dataNascimento} onChange={(e) => set("dataNascimento", e.target.value)} />
              <Input placeholder="LinkedIn (opcional)" value={data.linkedin} onChange={(e) => set("linkedin", e.target.value)} />
              <Input placeholder="Website (opcional)" value={data.website} onChange={(e) => set("website", e.target.value)} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Resumo ── */}
        <AccordionItem value="resumo" className="border rounded-xl bg-card">
          <AccordionTrigger className="px-4 py-3 hover:no-underline text-base font-semibold">
            Resumo Profissional
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <Textarea
              placeholder="Descreva brevemente o seu perfil profissional..."
              rows={4}
              value={data.resumoProfissional}
              onChange={(e) => set("resumoProfissional", e.target.value)}
            />
          </AccordionContent>
        </AccordionItem>

        {/* ── Experiência ── */}
        <AccordionItem value="experiencia" className="border rounded-xl bg-card">
          <AccordionTrigger className="px-4 py-3 hover:no-underline text-base font-semibold">
            Experiência Profissional
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            {data.experiencias.map((exp) => (
              <Card key={exp.id} className="relative">
                <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => removeExp(exp.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <CardContent className="pt-4 space-y-2">
                  <Input placeholder="Cargo" value={exp.cargo} onChange={(e) => updateExp(exp.id, { cargo: e.target.value })} />
                  <Input placeholder="Empresa" value={exp.empresa} onChange={(e) => updateExp(exp.id, { empresa: e.target.value })} />
                  <Input placeholder="Local" value={exp.local} onChange={(e) => updateExp(exp.id, { local: e.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Data início" value={exp.dataInicio} onChange={(e) => updateExp(exp.id, { dataInicio: e.target.value })} />
                    <Input placeholder="Data fim" value={exp.dataFim} onChange={(e) => updateExp(exp.id, { dataFim: e.target.value })} />
                  </div>
                  <Textarea placeholder="Descrição das actividades..." rows={3} value={exp.descricao} onChange={(e) => updateExp(exp.id, { descricao: e.target.value })} />
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" size="sm" onClick={addExp} className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Adicionar Experiência
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* ── Formação ── */}
        <AccordionItem value="formacao" className="border rounded-xl bg-card">
          <AccordionTrigger className="px-4 py-3 hover:no-underline text-base font-semibold">
            Formação Académica
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            {data.formacoes.map((f) => (
              <Card key={f.id} className="relative">
                <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => removeForm(f.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <CardContent className="pt-4 space-y-2">
                  <Input placeholder="Curso" value={f.curso} onChange={(e) => updateForm(f.id, { curso: e.target.value })} />
                  <Input placeholder="Instituição" value={f.instituicao} onChange={(e) => updateForm(f.id, { instituicao: e.target.value })} />
                  <Input placeholder="Local" value={f.local} onChange={(e) => updateForm(f.id, { local: e.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Data início" value={f.dataInicio} onChange={(e) => updateForm(f.id, { dataInicio: e.target.value })} />
                    <Input placeholder="Data fim" value={f.dataFim} onChange={(e) => updateForm(f.id, { dataFim: e.target.value })} />
                  </div>
                  <Textarea placeholder="Descrição..." rows={2} value={f.descricao} onChange={(e) => updateForm(f.id, { descricao: e.target.value })} />
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" size="sm" onClick={addForm} className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Adicionar Formação
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* ── Habilidades ── */}
        <AccordionItem value="habilidades" className="border rounded-xl bg-card">
          <AccordionTrigger className="px-4 py-3 hover:no-underline text-base font-semibold">
            Habilidades
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-2">
            {data.habilidades.map((h, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Ex: Gestão de equipe" value={h} onChange={(e) => updateHabilidade(i, e.target.value)} />
                <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive" onClick={() => removeHabilidade(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={handleAddHabilidade} className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Adicionar Habilidade
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* ── Idiomas ── */}
        <AccordionItem value="idiomas" className="border rounded-xl bg-card">
          <AccordionTrigger className="px-4 py-3 hover:no-underline text-base font-semibold">
            Idiomas
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-2">
            {data.idiomas.map((i) => (
              <div key={i.id} className="flex gap-2 items-center">
                <Input placeholder="Idioma" value={i.idioma} onChange={(e) => updateIdioma(i.id, { idioma: e.target.value })} className="flex-1" />
                <Select value={i.nivel} onValueChange={(v) => updateIdioma(i.id, { nivel: v })}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nativo">Nativo</SelectItem>
                    <SelectItem value="Fluente">Fluente</SelectItem>
                    <SelectItem value="Avançado">Avançado</SelectItem>
                    <SelectItem value="Intermédio">Intermédio</SelectItem>
                    <SelectItem value="Básico">Básico</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive" onClick={() => removeIdioma(i.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addIdioma} className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Adicionar Idioma
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* ── Certificações ── */}
        <AccordionItem value="certificacoes" className="border rounded-xl bg-card">
          <AccordionTrigger className="px-4 py-3 hover:no-underline text-base font-semibold">
            Certificações (opcional)
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-2">
            {data.certificacoes.map((c) => (
              <div key={c.id} className="flex gap-2">
                <Input placeholder="Certificação" value={c.nome} onChange={(e) => updateCert(c.id, { nome: e.target.value })} className="flex-1" />
                <Input placeholder="Instituição" value={c.instituicao} onChange={(e) => updateCert(c.id, { instituicao: e.target.value })} className="flex-1" />
                <Input placeholder="Ano" value={c.ano} onChange={(e) => updateCert(c.id, { ano: e.target.value })} className="w-20" />
                <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive" onClick={() => removeCert(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addCert} className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Adicionar Certificação
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* ── Projetos ── */}
        <AccordionItem value="projetos" className="border rounded-xl bg-card">
          <AccordionTrigger className="px-4 py-3 hover:no-underline text-base font-semibold">
            Projetos (opcional)
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            {data.projetos.map((p) => (
              <Card key={p.id} className="relative">
                <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => removeProjeto(p.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <CardContent className="pt-4 space-y-2">
                  <Input placeholder="Nome do projecto" value={p.nome} onChange={(e) => updateProjeto(p.id, { nome: e.target.value })} />
                  <Textarea placeholder="Descrição..." rows={2} value={p.descricao} onChange={(e) => updateProjeto(p.id, { descricao: e.target.value })} />
                  <Input placeholder="Link (opcional)" value={p.link} onChange={(e) => updateProjeto(p.id, { link: e.target.value })} />
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" size="sm" onClick={addProjeto} className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Adicionar Projecto
            </Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default CVForm;
