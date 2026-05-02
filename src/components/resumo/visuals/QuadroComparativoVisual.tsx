import React from "react";

export interface Comparativo {
  headers: string[]; // [criterio, item1, item2, ...]
  rows: string[][];
}

const COL_COLORS = [
  "hsl(199 89% 48%)", "hsl(280 70% 55%)", "hsl(160 70% 42%)", "hsl(25 90% 55%)",
];

export const QuadroComparativoVisual: React.FC<{ data: Comparativo, fontScale?: number }> = ({ data, fontScale = 1 }) => {
  const { headers, rows } = data;
  return (
    <div className="bg-gradient-to-br from-background to-muted/20 p-4 md:p-8 rounded-2xl">
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm" style={{ fontSize: `${14 * fontScale}px` }}>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-left font-bold text-white text-xs md:text-sm"
                  style={{
                    background: i === 0 ? "hsl(var(--foreground))" : COL_COLORS[(i - 1) % COL_COLORS.length],
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`px-4 py-3 align-top text-xs md:text-sm leading-relaxed ${
                      ci === 0 ? "font-semibold text-foreground border-r border-border" : "text-foreground/85"
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuadroComparativoVisual;
