import React from "react";

interface Branch {
  label: string;
  items: string[];
}

const COLORS = [
  { bg: "hsl(199 89% 48%)", soft: "hsl(199 89% 48% / 0.12)", text: "hsl(199 89% 28%)" },
  { bg: "hsl(280 70% 55%)", soft: "hsl(280 70% 55% / 0.12)", text: "hsl(280 70% 35%)" },
  { bg: "hsl(160 70% 42%)", soft: "hsl(160 70% 42% / 0.12)", text: "hsl(160 70% 25%)" },
  { bg: "hsl(25 90% 55%)", soft: "hsl(25 90% 55% / 0.12)", text: "hsl(25 90% 35%)" },
  { bg: "hsl(340 75% 55%)", soft: "hsl(340 75% 55% / 0.12)", text: "hsl(340 75% 35%)" },
  { bg: "hsl(45 90% 50%)", soft: "hsl(45 90% 50% / 0.12)", text: "hsl(45 90% 30%)" },
  { bg: "hsl(220 70% 55%)", soft: "hsl(220 70% 55% / 0.12)", text: "hsl(220 70% 35%)" },
  { bg: "hsl(10 75% 55%)", soft: "hsl(10 75% 55% / 0.12)", text: "hsl(10 75% 35%)" },
];

const ICONS = ["◆", "●", "▲", "★", "■", "✦", "◉", "✚"];

export const MapaMentalVisual: React.FC<{ central: string; branches: Branch[] }> = ({ central, branches }) => {
  const cols = branches.length <= 4 ? 2 : 3;
  return (
    <div className="bg-gradient-to-br from-background via-muted/30 to-background p-6 md:p-10 rounded-2xl">
      {/* Nó central */}
      <div className="flex justify-center mb-8">
        <div
          className="px-6 py-4 md:px-10 md:py-6 rounded-2xl shadow-2xl text-center max-w-md"
          style={{
            background: "linear-gradient(135deg, hsl(199 89% 48%), hsl(220 70% 55%))",
            color: "white",
          }}
        >
          <div className="text-[10px] uppercase tracking-widest opacity-80 mb-1">Tema Central</div>
          <div className="text-lg md:text-2xl font-bold leading-tight">{central}</div>
        </div>
      </div>

      {/* Ramos */}
      <div
        className="grid gap-4 md:gap-5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {branches.map((b, i) => {
          const c = COLORS[i % COLORS.length];
          const icon = ICONS[i % ICONS.length];
          return (
            <div
              key={i}
              className="rounded-2xl p-4 md:p-5 border shadow-sm hover:shadow-md transition-shadow"
              style={{ background: c.soft, borderColor: c.bg + "40" }}
            >
              <div className="flex items-center gap-2.5 mb-3 pb-3 border-b" style={{ borderColor: c.bg + "30" }}>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold shadow-md text-white shrink-0"
                  style={{ background: c.bg }}
                >
                  {icon}
                </div>
                <h3 className="font-bold text-sm md:text-base leading-tight" style={{ color: c.text }}>
                  {b.label}
                </h3>
              </div>
              <ul className="space-y-2">
                {b.items.map((it, j) => (
                  <li key={j} className="flex items-start gap-2 text-xs md:text-sm text-foreground/85 leading-snug">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.bg }} />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MapaMentalVisual;
