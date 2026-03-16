import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface PlanoHorizontalData {
  nome: string;
  escola: string;
  classe: string;
  disciplina: string;
  unidade: string;
  sumario: string;
  perfilEntrada: string;
  perfilSaida: string;
  data: string;
  periodo: string;
  tempo: string;
  duracao: string;
  anoLectivo: string;
  objectivoGeral: string;
  objectivosEspecificos: string;
}

const disciplinas = [
  "Português", "Matemática", "História", "Geografia", "Biologia",
  "Física", "Química", "Inglês", "Educação Moral e Cívica",
  "Filosofia", "Sociologia", "Educação Visual", "Informática",
  "Economia", "Direito", "Contabilidade", "Gestão",
];

const classes = [...Array.from({ length: 13 }, (_, i) => `${i + 1}ª Classe`), "Ensino Superior"];

interface Props {
  data: PlanoHorizontalData;
  onChange: (data: PlanoHorizontalData) => void;
}

const PlanoHorizontalForm: React.FC<Props> = ({ data, onChange }) => {
  const update = (field: keyof PlanoHorizontalData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-5">
      <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        Dados de Identificação — Plano Horizontal (INIDE)
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Nome do Professor</Label>
          <Input placeholder="Ex: Gomes da Cunha Paulo" value={data.nome} onChange={(e) => update("nome", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Escola</Label>
          <Input placeholder="Ex: Escola nº 306 Dembo Sala Mubemba" value={data.escola} onChange={(e) => update("escola", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Classe</Label>
          <Select value={data.classe} onValueChange={(v) => update("classe", v)}>
            <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Disciplina</Label>
          <Select value={data.disciplina} onValueChange={(v) => update("disciplina", v)}>
            <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
            <SelectContent>
              {disciplinas.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Ano Lectivo</Label>
          <Input placeholder="2025-2026" value={data.anoLectivo} onChange={(e) => update("anoLectivo", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Unidade</Label>
          <Input placeholder="Ex: O Território Angolano" value={data.unidade} onChange={(e) => update("unidade", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Sumário</Label>
          <Input placeholder="Ex: Divisão político administrativa de Angola" value={data.sumario} onChange={(e) => update("sumario", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label>Data</Label>
          <Input type="date" value={data.data} onChange={(e) => update("data", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Período</Label>
          <Input placeholder="Manhã / Tarde" value={data.periodo} onChange={(e) => update("periodo", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Tempo</Label>
          <Input placeholder="45 min" value={data.tempo} onChange={(e) => update("tempo", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Duração</Label>
          <Input placeholder="45 min" value={data.duracao} onChange={(e) => update("duracao", e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Perfil de Entrada</Label>
        <Textarea placeholder="O que os alunos já sabem sobre o tema..." rows={2} value={data.perfilEntrada} onChange={(e) => update("perfilEntrada", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>Perfil de Saída</Label>
        <Textarea placeholder="O que os alunos devem ser capazes de fazer após a aula..." rows={2} value={data.perfilSaida} onChange={(e) => update("perfilSaida", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>Objectivo Geral</Label>
        <Input placeholder="Ex: Conhecer o território angolano" value={data.objectivoGeral} onChange={(e) => update("objectivoGeral", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>Objectivos Específicos</Label>
        <Textarea placeholder="Um por linha. Ex:&#10;- Definir divisão administrativa&#10;- Identificar as etapas da evolução..." rows={3} value={data.objectivosEspecificos} onChange={(e) => update("objectivosEspecificos", e.target.value)} />
      </div>
    </div>
  );
};

export default PlanoHorizontalForm;
