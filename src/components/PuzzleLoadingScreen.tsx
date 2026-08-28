import PixelTetris from "@/components/PixelTetris";
import DelleLoader from "@/components/DelleLoader";

interface PuzzleLoadingScreenProps {
  label?: string;
}

export const PuzzleLoadingScreen = ({ label = "A preparar o teu espaço…" }: PuzzleLoadingScreenProps) => {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fffaf4] dark:bg-background"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="absolute inset-0 md:hidden" aria-hidden="true">
        <PixelTetris
          boardColor="rgba(249, 115, 22, 0.10)"
          colors={["#0B0B0B", "#F97316"]}
          movement={2}
          cellSize={22}
          gap={3}
          rounded={12}
          dropSpeed={1.35}
          className="opacity-90"
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4 px-6 text-center">
        <div className="rounded-2xl border border-orange-200/80 bg-white/80 px-5 py-3 shadow-lg shadow-orange-950/10 backdrop-blur-sm dark:border-orange-500/20 dark:bg-background/80">
          <p className="text-sm font-semibold text-[#0B0B0B] dark:text-foreground">{label}</p>
          <p className="mt-1 text-xs text-[#F97316]">A montar as peças…</p>
        </div>
        <DelleLoader className="hidden h-10 w-10 md:block" />
      </div>
    </div>
  );
};

export default PuzzleLoadingScreen;
