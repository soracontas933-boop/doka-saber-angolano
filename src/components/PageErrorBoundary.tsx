import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Props {
  children: ReactNode;
  pageTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// A lightweight page-level boundary that recovers to the previous page
// instead of crashing the entire app.
class PageErrorBoundaryInner extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[PageErrorBoundary] Error in "${this.props.pageTitle || "unknown page"}":`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-4">
          <div className="text-5xl mb-1">⚠️</div>
          <h2 className="text-xl font-semibold">Erro ao carregar</h2>
          <p className="text-muted-foreground max-w-sm">
            Ocorreu um erro inesperado{this.props.pageTitle ? ` em "${this.props.pageTitle}"` : ""}. Tente recarregar ou voltar à página anterior.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => window.location.reload()} variant="default">
              Recarregar
            </Button>
            <Button onClick={() => window.history.back()} variant="outline">
              Voltar
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper so we can use hooks (navigate) if needed in the future
const PageErrorBoundary = (props: Props) => {
  return <PageErrorBoundaryInner {...props} />;
};

export default PageErrorBoundary;
