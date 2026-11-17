export const num = (s: unknown) => Number(String(s).trim().replace(",", "."));

// CSV: linha 1 "Alternativa,<critérios>", linha 2 "Tipo,custo|benefício,...", linha 3 "Peso,...",
// depois uma linha por alternativa. Separador "," ou ";" (com ";" a vírgula é decimal).
export type Crit = { name: string; type: "benefit" | "cost"; w: number | string };
export type Problem = { alts: string[]; crit: Crit[]; X: string[][] };

export function parseCsv(text: string): Problem {
  const rows = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => l.split(l.includes(";") ? ";" : ",").map((c) => c.trim()));
  if (rows.length < 5) throw new Error("CSV precisa de cabeçalho, tipo, peso e ao menos 2 alternativas.");
  const crit = rows[0].slice(1).map((name, j) => ({
    name,
    type: /^(c|cost)/i.test(rows[1][j + 1]) ? ("cost" as const) : ("benefit" as const),
    w: num(rows[2][j + 1]),
  }));
  return { crit, alts: rows.slice(3).map((r) => r[0]), X: rows.slice(3).map((r) => r.slice(1, crit.length + 1)) };
}

export const csvCell = (c: unknown) => (/[",;\n]/.test(String(c)) ? `"${String(c).replaceAll('"', '""')}"` : String(c));
