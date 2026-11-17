# MULTIMOORA-web

Aplicação web que resolve problemas de decisão multicritério com o método **MULTIMOORA** (Sistema de Razões + Ponto de Referência + Forma Multiplicativa Completa, agregados pela teoria da dominância).

- **Artigo base:** Brauers, W. K. M.; Zavadskas, E. K. (2010). [Project management by MULTIMOORA as an instrument for transition economies](https://journals.vilniustech.lt/index.php/TEDE/article/view/5832). *Technological and Economic Development of Economy*, 16(1), 5–24. doi:10.3846/tede.2010.01
- **Aplicação em produção:** _(preencher com o link do deploy)_

## Stack

Frontend React + TypeScript (Vite) · Backend FastAPI (Python, NumPy).

## Como usar

1. Informe alternativas, critérios, tipo (benefício/custo) e pesos na tabela — ou clique em **Importar CSV** / **Exemplo (notebooks)**.
2. Clique em **Calcular**: aparecem o ranking final, os três rankings parciais e a matriz ponderada.
3. **Exportar CSV** ou **Exportar PDF** (diálogo de impressão do navegador → Salvar como PDF).

Formato do CSV (separador `,` ou `;`):

```
Alternativa,Preço,Desempenho,Bateria,Peso
Tipo,custo,benefício,benefício,custo
Peso,0.35,0.30,0.20,0.15
A1,4500,7800,8,1.8
A2,5200,9200,6,2.1
```

Notas: pesos são normalizados para somar 1; valores devem ser ≥ 0 (zero na forma multiplicativa vira 0,01); a dominância é calculada contando quantas alternativas cada uma domina (melhor em mais partes que a outra), e ciclos viram empate.

## Instalação (desenvolvimento)

```bash
# backend
cd backend
pip install -r requirements-dev.txt
uvicorn main:app --reload          # http://localhost:8000

# frontend (outro terminal)
cd frontend
npm install
npm run dev                        # http://localhost:5173 (proxy /api -> :8000)
```

## Testes

```bash
cd backend && python -m pytest     # reproduz o exemplo do seminário (A3 ≻ A4 ≻ A1 ≻ A2)
cd frontend && npm test            # parsing de CSV
```

## Deploy

Na Vercel: `vercel.json` define dois serviços (backend FastAPI em `/api`, frontend Vite em `/`). Alternativa com Docker: o `Dockerfile` gera o frontend e o serve pelo próprio FastAPI (uma única porta, usa `$PORT`). Em Render/Railway/Fly.io: novo serviço web a partir deste repositório, runtime Docker.
