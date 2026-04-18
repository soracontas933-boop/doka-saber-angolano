import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, FileWarning, Check, X } from "lucide-react";
import type { SectionIssue } from "@/lib/ai-validator";

interface PreCompileCheckModalProps {
  open: boolean;
  issues: SectionIssue[];
  onRegenerate: (sectionTitle: string) => void;
  onIgnore: () => void;
  onCancel: () => void;
  regenerating?: string | null;
}

const severityColors: Record<SectionIssue["severity"], string> = {
  low: "text-muted-foreground",
  medium: "text-amber-600 dark:text-amber-400",
  high: "text-destructive",
};

const severityLabels: Record<SectionIssue["severity"], string> = {
  low: "Aviso",
  medium: "Moderado",
  high: "Crítico",
};

export default function PreCompileCheckModal({
  open,
  issues,
  onRegenerate,
  onIgnore,
  onCancel,
  regenerating,
}: PreCompileCheckModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Problemas detectados antes da compilação
          </DialogTitle>
          <DialogDescription>
            Encontrámos {issues.length} {issues.length === 1 ? "problema" : "problemas"} no teu trabalho. Recomendamos corrigir antes de compilar para garantir qualidade.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-2">
          {issues.map((issue, idx) => (
            <div
              key={`${issue.sectionTitle}-${idx}`}
              className="border border-border rounded-xl p-3 space-y-2 bg-muted/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileWarning className={`h-4 w-4 ${severityColors[issue.severity]}`} />
                    <span className="font-semibold text-sm truncate">{issue.sectionTitle}</span>
                    <span className={`text-[10px] uppercase font-bold ${severityColors[issue.severity]}`}>
                      {severityLabels[issue.severity]}
                    </span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1 ml-6 list-disc">
                    {issue.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs flex-shrink-0"
                  onClick={() => onRegenerate(issue.sectionTitle)}
                  disabled={regenerating === issue.sectionTitle}
                >
                  {regenerating === issue.sectionTitle ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1" /> Re-gerar
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCancel} className="text-xs">
            <X className="h-3.5 w-3.5 mr-1" /> Cancelar
          </Button>
          <Button variant="secondary" onClick={onIgnore} className="text-xs">
            <Check className="h-3.5 w-3.5 mr-1" /> Compilar mesmo assim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
