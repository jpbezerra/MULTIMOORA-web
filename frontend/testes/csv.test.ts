import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, csvCell } from "../src/csv.ts";

test("parseCsv lê tipos, pesos e alternativas", () => {
  const r = parseCsv("Alternativa,Preço,Bateria\nTipo,custo,benefício\nPeso,0.6,0.4\nA1,100,8\nA2,200,6\n");
  assert.deepEqual(r.crit, [
    { name: "Preço", type: "cost", w: 0.6 },
    { name: "Bateria", type: "benefit", w: 0.4 },
  ]);
  assert.deepEqual(r.alts, ["A1", "A2"]);
  assert.deepEqual(r.X, [["100", "8"], ["200", "6"]]);
});

test("parseCsv aceita ; com vírgula decimal", () => {
  const r = parseCsv("Alt;P\nTipo;custo\nPeso;1,0\nA;1,5\nB;2,5");
  assert.equal(r.crit[0].w, 1);
});

test("parseCsv rejeita arquivo curto", () => {
  assert.throws(() => parseCsv("a,b\nc,d"));
});

test("csvCell escapa", () => assert.equal(csvCell('a,"b"'), '"a,""b"""'));
