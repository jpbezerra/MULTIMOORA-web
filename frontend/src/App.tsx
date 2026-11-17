import { useState } from "react";
import { num, parseCsv, csvCell, type Problem } from "./csv.ts";

type Result = {
  weighted: number[][]; reference: number[];
  y: number[]; z: number[]; u: number[];
  ranks: number[][]; score: number[]; final: number[];
};

const EXAMPLE: Problem = {
  alts: ["A1", "A2", "A3", "A4"],
  crit: [
    { name: "Preço (R$)", type: "cost", w: 0.35 },
    { name: "Desempenho (pts)", type: "benefit", w: 0.3 },
    { name: "Bateria (h)", type: "benefit", w: 0.2 },
    { name: "Peso (kg)", type: "cost", w: 0.15 },
  ],
  X: [["4500", "7800", "8", "1.8"], ["5200", "9200", "6", "2.1"], ["3900", "6500", "10", "1.6"], ["6100", "9800", "9", "1.4"]],
};
const f = (v: number, d = 4) => v.toFixed(d);

const download = (name: string, text: string) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
  a.download = name;
  a.click();
};

export default function App() {
  const [p, setP] = useState<Problem>(EXAMPLE);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState("");

  const set = (patch: Partial<Problem>) => { setP({ ...p, ...patch }); setRes(null); };
  const setCrit = (j: number, patch: Partial<Problem["crit"][number]>) => set({ crit: p.crit.map((c, k) => (k === j ? { ...c, ...patch } : c)) });
  const setCell = (i: number, j: number, v: string) => set({ X: p.X.map((r, a) => (a === i ? r.map((c, b) => (b === j ? v : c)) : r)) });
  const addAlt = () => set({ alts: [...p.alts, `A${p.alts.length + 1}`], X: [...p.X, p.crit.map(() => "")] });
  const addCrit = () => set({ crit: [...p.crit, { name: `C${p.crit.length + 1}`, type: "benefit", w: 0 }], X: p.X.map((r) => [...r, ""]) });
  const delAlt = (i: number) => set({ alts: p.alts.filter((_, k) => k !== i), X: p.X.filter((_, k) => k !== i) });
  const delCrit = (j: number) => set({ crit: p.crit.filter((_, k) => k !== j), X: p.X.map((r) => r.filter((_, k) => k !== j)) });

  const importCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try { set(parseCsv(await e.target.files![0].text())); setErr(""); } catch (x) { setErr((x as Error).message); }
    e.target.value = "";
  };

  const solve = async () => {
    setErr("");
    const matrix = p.X.map((r) => r.map(num));
    if (matrix.some((r) => r.some((v) => Number.isNaN(v))) || p.crit.some((c) => Number.isNaN(num(c.w))))
      return setErr("Preencha todos os valores e pesos com números.");
    const r = await fetch("/api/solve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alternatives: p.alts, criteria: p.crit.map((c) => c.name), types: p.crit.map((c) => c.type), weights: p.crit.map((c) => num(c.w)), matrix }),
    });
    if (!r.ok) {
      const d = (await r.json()).detail;
      return setErr(Array.isArray(d) ? d.map((x: { msg: string }) => x.msg).join("; ") : String(d));
    }
    setRes(await r.json());
  };

  const order: number[] = res ? p.alts.map((_, i) => i).sort((a, b) => res.final[a] - res.final[b]) : [];

  const exportCsv = () => {
    if (!res) return;
    const head = ["Posição", "Alternativa", "Razões (y)", "Pos. Razões", "Ref. (z)", "Pos. Ref.", "Mult. (U)", "Pos. Mult.", "Dominadas"];
    const rows = order.map((i) => [res.final[i], p.alts[i], res.y[i], res.ranks[i][0], res.z[i], res.ranks[i][1], res.u[i], res.ranks[i][2], res.score[i]]);
    download("multimoora-resultado.csv", [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\n"));
  };

  const wsum = p.crit.reduce((s, c) => s + (num(c.w) || 0), 0);

  return (
    <main>
      <h1>MULTIMOORA</h1>
      <p className="sub noprint">
        Ordene alternativas por vários critérios combinando Sistema de Razões, Ponto de Referência e Forma Multiplicativa Completa (
        <a href="https://journals.vilniustech.lt/index.php/TEDE/article/view/5832">Brauers e Zavadskas, 2010</a>).
      </p>

      <section className="noprint">
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Alternativa</th>
                {p.crit.map((c, j) => (
                  <th key={j}>
                    <input value={c.name} onChange={(e) => setCrit(j, { name: e.target.value })} />
                    <button className="x" title="Remover critério" disabled={p.crit.length < 2} onClick={() => delCrit(j)}>×</button>
                  </th>
                ))}
                <th />
              </tr>
              <tr>
                <th>Tipo</th>
                {p.crit.map((c, j) => (
                  <th key={j}>
                    <select value={c.type} onChange={(e) => setCrit(j, { type: e.target.value as "benefit" | "cost" })}>
                      <option value="benefit">Benefício (maior é melhor)</option>
                      <option value="cost">Custo (menor é melhor)</option>
                    </select>
                  </th>
                ))}
                <th />
              </tr>
              <tr>
                <th>Peso</th>
                {p.crit.map((c, j) => (
                  <th key={j}><input inputMode="decimal" value={c.w} onChange={(e) => setCrit(j, { w: e.target.value })} /></th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {p.alts.map((a, i) => (
                <tr key={i}>
                  <td><input value={a} onChange={(e) => set({ alts: p.alts.map((x, k) => (k === i ? e.target.value : x)) })} /></td>
                  {p.X[i].map((v, j) => (
                    <td key={j}><input inputMode="decimal" value={v} onChange={(e) => setCell(i, j, e.target.value)} /></td>
                  ))}
                  <td><button className="x" title="Remover alternativa" disabled={p.alts.length < 3} onClick={() => delAlt(i)}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">Soma dos pesos: {wsum.toFixed(2)} (normalizados para somar 1). Valores devem ser ≥ 0; zero na forma multiplicativa vira 0,01.</p>
        <div className="bar">
          <button onClick={addAlt}>+ Alternativa</button>
          <button onClick={addCrit}>+ Critério</button>
          <label className="btn">Importar CSV<input type="file" accept=".csv,text/csv" hidden onChange={importCsv} /></label>
          <button onClick={() => { set(EXAMPLE); setErr(""); }}>Exemplo (notebooks)</button>
          <button className="primary" onClick={solve}>Calcular</button>
        </div>
        {err && <div className="err">{err}</div>}
        <p className="hint">Formato do CSV: linha 1 <code>Alternativa,Preço,...</code>; linha 2 <code>Tipo,custo,benefício,...</code>; linha 3 <code>Peso,0.35,...</code>; depois uma linha por alternativa.</p>
      </section>

      {res && (
        <>
          <h2>Ranking final (teoria da dominância)</h2>
          <section>
            <table>
              <thead>
                <tr><th>Pos.</th><th>Alternativa</th><th>Razões</th><th>Ref.</th><th>Mult.</th><th>Dominadas</th></tr>
              </thead>
              <tbody>
                {order.map((i) => (
                  <tr key={i} className={res.final[i] === 1 ? "first" : ""}>
                    <td>{res.final[i]}º</td><td>{p.alts[i]}</td>
                    <td>{res.ranks[i][0]}º</td><td>{res.ranks[i][1]}º</td><td>{res.ranks[i][2]}º</td><td>{res.score[i]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {order.map((i) => (
              <div className="chart" key={i}>
                <span className="l">{p.alts[i]}</span>
                <div style={{ width: `${(100 * res.score[i]) / (p.alts.length - 1)}%` }} title={`${res.score[i]} alternativas dominadas`} />
              </div>
            ))}
            <p className="hint">Barra = quantas alternativas esta domina (melhor em mais partes que a outra).</p>
          </section>

          <h2>As três partes</h2>
          <section className="scroll">
            <table>
              <thead>
                <tr><th>Alternativa</th><th>Razões yᵢ (maior)</th><th>Ponto de Ref. zᵢ (menor)</th><th>Multiplicativa Uᵢ (maior)</th></tr>
              </thead>
              <tbody>
                {p.alts.map((a, i) => (
                  <tr key={i}>
                    <td>{a}</td>
                    <td className="num">{f(res.y[i])} ({res.ranks[i][0]}º)</td>
                    <td className="num">{f(res.z[i])} ({res.ranks[i][1]}º)</td>
                    <td className="num">{f(res.u[i])} ({res.ranks[i][2]}º)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <h2>Matriz normalizada ponderada</h2>
          <section className="scroll">
            <table>
              <thead><tr><th />{p.crit.map((c, j) => <th key={j}>{c.name}</th>)}</tr></thead>
              <tbody>
                {p.alts.map((a, i) => <tr key={i}><td>{a}</td>{res.weighted[i].map((v, j) => <td className="num" key={j}>{f(v)}</td>)}</tr>)}
                <tr><td><b>Ref. rⱼ</b></td>{res.reference.map((v, j) => <td className="num" key={j}>{f(v)}</td>)}</tr>
              </tbody>
            </table>
          </section>

          <div className="bar noprint">
            <button onClick={exportCsv}>Exportar CSV</button>
            <button onClick={() => window.print()}>Exportar PDF</button>
          </div>
        </>
      )}
    </main>
  );
}
