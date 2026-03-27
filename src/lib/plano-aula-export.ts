/**
 * Export Plano de Aula (Horizontal) to PDF and Word.
 */
import { exportHtmlToPdf, escapeHtml } from "@/lib/pdf-export-helper";
import { showExportOverlay, hideExportOverlay } from "@/components/ExportOverlay";

interface PlanoHorizontalData {
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

function buildPlanoHtml(dados: PlanoHorizontalData, fases: FaseAula[]): string {
  const e = escapeHtml;
  const objEsp = dados.objectivosEspecificos
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .map((l) => `<li>${e(l)}</li>`)
    .join("");

  const rows = fases
    .map(
      (f) => `
    <tr style="vertical-align:top;">
      <td style="border:1px solid #000;padding:4px 6px;white-space:nowrap;font-weight:600;">${e(f.tempo)}</td>
      <td style="border:1px solid #000;padding:4px 6px;font-weight:600;">${e(f.fase)}</td>
      <td style="border:1px solid #000;padding:4px 6px;white-space:pre-line;">${e(f.conteudo)}</td>
      <td style="border:1px solid #000;padding:4px 6px;white-space:pre-line;">${e(f.metodos)}</td>
      <td style="border:1px solid #000;padding:4px 6px;white-space:pre-line;">${e(f.actividades)}</td>
      <td style="border:1px solid #000;padding:4px 6px;white-space:pre-line;">${e(f.estrategia)}</td>
      <td style="border:1px solid #000;padding:4px 6px;white-space:pre-line;">${e(f.meios)}</td>
      <td style="border:1px solid #000;padding:4px 6px;">${e(f.avaliacao)}</td>
      <td style="border:1px solid #000;padding:4px 6px;">${e(f.obs)}</td>
    </tr>`
    )
    .join("");

  return `
<div style="font-family:'Times New Roman',serif;font-size:12px;color:#000;">
  <h2 style="text-align:center;font-size:14px;font-weight:bold;text-transform:uppercase;margin-bottom:16px;">Plano de Aula</h2>

  <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
    <div style="flex:1;">
      <p><strong>Nome:</strong> ${e(dados.nome)}</p>
      <p><strong>Escola:</strong> ${e(dados.escola)}</p>
      <p><strong>Classe:</strong> ${e(dados.classe)}</p>
      <p><strong>Disciplina:</strong> ${e(dados.disciplina)}</p>
      <p><strong>Unidade:</strong> ${e(dados.unidade)}</p>
      <p><strong>Sumário:</strong> ${e(dados.sumario)}</p>
    </div>
    <div style="flex:1;text-align:right;">
      <p><strong>Data:</strong> ${e(dados.data)}</p>
      <p><strong>Período:</strong> ${e(dados.periodo)}</p>
      <p><strong>Tempo:</strong> ${e(dados.tempo)}</p>
      <p><strong>Duração:</strong> ${e(dados.duracao)}</p>
      <p><strong>Ano Lectivo:</strong> ${e(dados.anoLectivo)}</p>
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
    <div style="flex:1;">
      <p><strong>Perfil de entrada:</strong> ${e(dados.perfilEntrada)}</p>
      <p><strong>Perfil de saída:</strong> ${e(dados.perfilSaida)}</p>
    </div>
    <div style="flex:1;text-align:right;">
      <p><strong>Objectivo Geral:</strong> ${e(dados.objectivoGeral)}</p>
      <p><strong>Objectivos Específicos:</strong></p>
      <ul style="list-style:disc;padding-left:18px;text-align:left;display:inline-block;">${objEsp}</ul>
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:11px;">
    <thead>
      <tr>
        ${["Tempo", "Fases didácticas", "Conteúdo", "Métodos", "Actividades", "Estratégia de Ensino", "Meios de Ensino", "Avaliação", "Obs"]
          .map((h) => `<th style="border:1px solid #000;padding:4px 6px;text-align:left;font-weight:bold;background:#f3f3f3;font-size:10px;">${h}</th>`)
          .join("")}
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
}

export async function exportPlanoAulaPdf(dados: PlanoHorizontalData, fases: FaseAula[]) {
  const html = buildPlanoHtml(dados, fases);
  await exportHtmlToPdf({
    html,
    filename: `Plano_Aula_${dados.disciplina || "Geral"}.pdf`,
    overlayMessage: "A gerar plano de aula em PDF...",
    containerWidth: 1120,
    padding: "24px 20px",
    orientation: "landscape",
  });
}

export async function exportPlanoAulaWord(dados: PlanoHorizontalData, fases: FaseAula[]) {
  showExportOverlay("A gerar plano de aula em Word...");
  try {
    const {
      Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
      WidthType, AlignmentType, BorderStyle, HeadingLevel,
    } = await import("docx");

    const border = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
    const cellBorders = { top: border, bottom: border, left: border, right: border };

    const headerParagraphs = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: "PLANO DE AULA", bold: true, size: 28, font: "Times New Roman" })],
      }),
      ...([
        [`Nome: ${dados.nome}`, `Data: ${dados.data}`],
        [`Escola: ${dados.escola}`, `Período: ${dados.periodo}`],
        [`Classe: ${dados.classe}`, `Tempo: ${dados.tempo}`],
        [`Disciplina: ${dados.disciplina}`, `Duração: ${dados.duracao}`],
        [`Unidade: ${dados.unidade}`, `Ano Lectivo: ${dados.anoLectivo}`],
        [`Sumário: ${dados.sumario}`, ""],
      ].map(
        ([left, right]) =>
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: left, size: 22, font: "Times New Roman" }),
              ...(right ? [new TextRun({ text: `\t\t${right}`, size: 22, font: "Times New Roman" })] : []),
            ],
          })
      )),
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: `Perfil de entrada: ${dados.perfilEntrada}`, size: 22, font: "Times New Roman" })] }),
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: `Perfil de saída: ${dados.perfilSaida}`, size: 22, font: "Times New Roman" })] }),
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: `Objectivo Geral: ${dados.objectivoGeral}`, size: 22, font: "Times New Roman" })] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: `Objectivos Específicos: ${dados.objectivosEspecificos}`, size: 22, font: "Times New Roman" })] }),
    ];

    const headers = ["Tempo", "Fases didácticas", "Conteúdo", "Métodos", "Actividades", "Estratégia", "Meios", "Avaliação", "Obs"];
    const headerRow = new TableRow({
      children: headers.map(
        (h) =>
          new TableCell({
            borders: cellBorders,
            shading: { fill: "E8E8E8" },
            width: { size: 100 / headers.length, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, font: "Times New Roman" })] })],
          })
      ),
    });

    const dataRows = fases.map(
      (f) =>
        new TableRow({
          children: [f.tempo, f.fase, f.conteudo, f.metodos, f.actividades, f.estrategia, f.meios, f.avaliacao, f.obs].map(
            (val) =>
              new TableCell({
                borders: cellBorders,
                width: { size: 100 / headers.length, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ children: [new TextRun({ text: val || "", size: 18, font: "Times New Roman" })] })],
              })
          ),
        })
    );

    const table = new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    const doc = new Document({
      sections: [{
        properties: { page: { size: { orientation: "landscape" as any } } },
        children: [...headerParagraphs, table],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const { default: FileSaver } = await import("file-saver");
    FileSaver.saveAs(blob, `Plano_Aula_${dados.disciplina || "Geral"}.docx`);

    const { toast } = await import("sonner");
    toast.success("Plano exportado em Word!");
  } catch (err) {
    console.error("Word export error:", err);
    const { toast } = await import("sonner");
    toast.error("Erro ao exportar Word");
  } finally {
    hideExportOverlay();
  }
}
