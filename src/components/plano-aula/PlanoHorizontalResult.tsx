import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Copy } from "lucide-react";
import { toast } from "sonner";
import { PlanoHorizontalData } from "./PlanoHorizontalForm";

interface FaseAula {
  tempo: string;
  fase: string;
  conteudo: string;
  metodos: string;
  actividades: string;
  estrategia: string;
  meios: string;
  avaliacao: string;
  obs: string;
}

interface Props {
  dados: PlanoHorizontalData;
  fases: FaseAula[];
}

const PlanoHorizontalResult: React.FC<Props> = ({ dados, fases }) => {
  const tableRef = useRef<HTMLDivElement>(null);

  const copyToClipboard = () => {
    if (tableRef.current) {
      const range = document.createRange();
      range.selectNodeContents(tableRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.execCommand("copy");
      selection?.removeAllRanges();
      toast.success("Plano copiado!");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="outline" onClick={copyToClipboard}>
          <Copy className="h-4 w-4 mr-1" /> Copiar
        </Button>
      </div>

      <div ref={tableRef} className="bg-white text-black rounded-xl overflow-auto shadow-card border border-border">
        <div className="p-6 min-w-[900px]" style={{ fontFamily: "Times New Roman, serif", fontSize: "12px" }}>
          {/* Header */}
          <h2 className="text-center font-bold text-base mb-4 uppercase">Plano de Aula</h2>

          <div className="flex justify-between mb-2">
            <div className="space-y-1 flex-1">
              <p><strong>Nome:</strong> {dados.nome}</p>
              <p><strong>Escola:</strong> {dados.escola}</p>
              <p><strong>Classe:</strong> {dados.classe}</p>
              <p><strong>Disciplina:</strong> {dados.disciplina}</p>
              <p><strong>Unidade:</strong> {dados.unidade}</p>
              <p><strong>Sumário:</strong> {dados.sumario}</p>
            </div>
            <div className="space-y-1 flex-1 text-right">
              <p><strong>Data:</strong> {dados.data}</p>
              <p><strong>Período:</strong> {dados.periodo}</p>
              <p><strong>Tempo:</strong> {dados.tempo}</p>
              <p><strong>Duração:</strong> {dados.duracao}</p>
              <p><strong>Ano Lectivo:</strong> {dados.anoLectivo}</p>
            </div>
          </div>

          <div className="flex justify-between mb-1">
            <div className="flex-1">
              <p><strong>Perfil de entrada:</strong> {dados.perfilEntrada}</p>
              <p><strong>Perfil de saída:</strong> {dados.perfilSaida}</p>
            </div>
            <div className="flex-1 text-right">
              <p className="text-right"><strong>Objectivos:</strong></p>
              <p className="text-right">Geral: {dados.objectivoGeral}</p>
              <p className="text-right whitespace-pre-line">Específicos: {dados.objectivosEspecificos}</p>
            </div>
          </div>

          {/* Table */}
          <table className="w-full border-collapse border border-black mt-4" style={{ fontSize: "11px" }}>
            <thead>
              <tr>
                {["Tempo", "Fases didácticas", "Conteúdo", "Métodos", "Actividades", "Estratégia de Ensino", "Meios de Ensino", "Avaliação", "Obs"].map((h) => (
                  <th key={h} className="border border-black px-2 py-1.5 text-left font-bold bg-gray-100 text-[10px]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fases.map((f, i) => (
                <tr key={i} className="align-top">
                  <td className="border border-black px-2 py-1.5 whitespace-nowrap font-semibold">{f.tempo}</td>
                  <td className="border border-black px-2 py-1.5 font-semibold">{f.fase}</td>
                  <td className="border border-black px-2 py-1.5 whitespace-pre-line">{f.conteudo}</td>
                  <td className="border border-black px-2 py-1.5 whitespace-pre-line">{f.metodos}</td>
                  <td className="border border-black px-2 py-1.5 whitespace-pre-line">{f.actividades}</td>
                  <td className="border border-black px-2 py-1.5 whitespace-pre-line">{f.estrategia}</td>
                  <td className="border border-black px-2 py-1.5 whitespace-pre-line">{f.meios}</td>
                  <td className="border border-black px-2 py-1.5">{f.avaliacao}</td>
                  <td className="border border-black px-2 py-1.5">{f.obs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PlanoHorizontalResult;
