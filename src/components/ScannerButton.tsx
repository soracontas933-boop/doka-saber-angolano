import { useState, useRef } from "react";
import { ScanFace, Loader2, BookOpen, HelpCircle, ClipboardList, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const ScannerButton = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapturedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setShowOptions(true);
    }
    // Reset input to allow selecting same file again
    e.target.value = "";
  };

  const handleOptionSelect = (target: "resumo" | "questionario" | "plano-aula") => {
    if (!capturedFile) return;

    // We'll pass the file via session storage to the target page
    // Since we can't easily pass File objects in navigation state, 
    // we convert to base64 or just use a flag to tell the page to "expect" a file
    // However, the simplest way is to store the file in a global state or 
    // just navigate and let the user know we're ready.
    
    // For this implementation, we'll use a trick: 
    // Store the file in a way the target page can pick it up.
    // Since we can't easily put File in localStorage, we'll use a custom event or a temporary window object
    (window as any)._pendingScannerFile = capturedFile;
    
    navigate(`/${target}`);
    setShowOptions(false);
    setCapturedFile(null);
    setPreviewUrl(null);
  };

  const closeDialog = () => {
    setShowOptions(false);
    setCapturedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  return (
    <>
      <button
        onClick={handleCameraClick}
        className="p-2 rounded-full hover:bg-muted/50 transition-colors"
        title="Escanear conteúdo"
      >
        <ScanFace className="lucide lucide-camera h-5 w-5 bg-secondary text-secondary-foreground" />
      </button>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
      />

      <Dialog open={showOptions} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conteúdo Capturado</DialogTitle>
            <DialogDescription>
              O que desejas criar com esta imagem?
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            {previewUrl && (
              <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border bg-muted">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
              </div>
            )}

            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                className="justify-start gap-3 h-12"
                onClick={() => handleOptionSelect("resumo")}
              >
                <BookOpen className="h-5 w-5 text-primary" />
                Criar Resumo
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-3 h-12"
                onClick={() => handleOptionSelect("questionario")}
              >
                <HelpCircle className="h-5 w-5 text-primary" />
                Criar Questionário
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-3 h-12"
                onClick={() => handleOptionSelect("plano-aula")}
              >
                <ClipboardList className="h-5 w-5 text-primary" />
                Criar Plano de Aula
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ScannerButton;
