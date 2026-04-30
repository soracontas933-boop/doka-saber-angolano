import React from "react";

export interface TimelineEvent {
  data: string;
  titulo: string;
  descricao: string;
}

const COLORS = [
  "hsl(199 89% 48%)", "hsl(280 70% 55%)", "hsl(160 70% 42%)",
  "hsl(25 90% 55%)", "hsl(340 75% 55%)", "hsl(220 70% 55%)",
  "hsl(45 90% 50%)", "hsl(10 75% 55%)",
];

export const LinhaTempoVisual: React.FC<{ events: TimelineEvent[] }> = ({ events }) => {
  return (
    <div className="bg-gradient-to-b from-background to-muted/20 p-6 md:p-10 rounded-2xl">
      <div className="relative pl-8 md:pl-12">
        {/* Linha vertical */}
        <div
          className="absolute left-3 md:left-5 top-2 bottom-2 w-0.5 rounded-full"
          style={{ background: "linear-gradient(to bottom, hsl(199 89% 48%), hsl(280 70% 55%), hsl(340 75% 55%))" }}
        />
        <div className="space-y-6">
          {events.map((e, i) => {
            const c = COLORS[i % COLORS.length];
            return (
              <div key={i} className="relative">
                {/* Bolinha */}
                <div
                  className="absolute -left-[26px] md:-left-[34px] top-1 w-5 h-5 md:w-6 md:h-6 rounded-full border-4 border-background shadow-lg"
                  style={{ background: c }}
                />
                {/* Card */}
                <div className="bg-card border border-border rounded-xl p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white"
                      style={{ background: c }}
                    >
                      {e.data}
                    </span>
                  </div>
                  <h4 className="font-bold text-base md:text-lg text-foreground leading-snug mb-1">{e.titulo}</h4>
                  {e.descricao && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{e.descricao}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LinhaTempoVisual;
