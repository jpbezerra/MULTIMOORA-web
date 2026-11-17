from pathlib import Path
from typing import Literal

import numpy as np
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, model_validator

app = FastAPI(title="MULTIMOORA")


class Problem(BaseModel):
    alternatives: list[str]
    criteria: list[str]
    types: list[Literal["benefit", "cost"]]
    weights: list[float]
    matrix: list[list[float]]  # alternatives x criteria

    @model_validator(mode="after")
    def check(self):
        m, n = len(self.alternatives), len(self.criteria)
        if m < 2 or n < 1:
            raise ValueError("Precisa de pelo menos 2 alternativas e 1 critério.")
        if len(self.types) != n or len(self.weights) != n:
            raise ValueError("Tipos e pesos devem ter um valor por critério.")
        if len(self.matrix) != m or any(len(r) != n for r in self.matrix):
            raise ValueError("A matriz deve ser alternativas x critérios.")
        if any(w < 0 for w in self.weights) or sum(self.weights) <= 0:
            raise ValueError("Pesos devem ser >= 0 e somar mais que 0.")
        if any(not np.isfinite(v) or v < 0 for r in self.matrix for v in r):
            raise ValueError("Valores devem ser números >= 0.")  # forma multiplicativa
        return self


def rank(v, higher_better):
    """Posição 1..m; empates compartilham a posição."""
    v = np.round(v, 10)
    return [int(1 + ((v > x) if higher_better else (v < x)).sum()) for x in v]


def solve(p: Problem):
    X, w = np.array(p.matrix, float), np.array(p.weights, float)
    w = w / w.sum()
    sign = np.array([1 if t == "benefit" else -1 for t in p.types])
    d = np.sqrt((X**2).sum(0))
    N = X / np.where(d == 0, 1, d)  # normalização vetorial
    V = N * w
    y = (V * sign).sum(1)  # 1. Sistema de Razões
    r = np.where(sign == 1, V.max(0), V.min(0))
    z = np.abs(r - V).max(1)  # 2. Ponto de Referência (Tchebycheff)
    u = np.exp((np.log(np.where(X == 0, 0.01, X)) * w * sign).sum(1))  # 3. Forma Multiplicativa
    R = np.array([rank(y, True), rank(z, False), rank(u, True)]).T
    # Dominância geral: i domina j se é melhor em mais partes do que pior.
    # ponytail: contagem de dominados (estilo Copeland); ciclos viram empate de posição.
    # Dominância absoluta (1-1-1) é caso particular.
    m = len(X)
    score = [sum((R[i] < R[j]).sum() > (R[i] > R[j]).sum() for j in range(m)) for i in range(m)]
    final = rank(np.array(score, float), True)
    return {
        "normalized": N.tolist(), "weighted": V.tolist(), "reference": r.tolist(),
        "y": y.tolist(), "z": z.tolist(), "u": u.tolist(),
        "ranks": R.tolist(), "score": [int(s) for s in score], "final": final,
    }


@app.post("/api/solve")
def api_solve(p: Problem):
    return solve(p)


dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if dist.exists():
    app.mount("/", StaticFiles(directory=dist, html=True))
