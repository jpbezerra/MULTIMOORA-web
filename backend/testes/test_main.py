from fastapi.testclient import TestClient
from main import app

EXAMPLE = {
    "alternatives": ["A1", "A2", "A3", "A4"],
    "criteria": ["Preço", "Desempenho", "Bateria", "Peso"],
    "types": ["cost", "benefit", "benefit", "cost"],
    "weights": [0.35, 0.30, 0.20, 0.15],
    "matrix": [[4500, 7800, 8, 1.8], [5200, 9200, 6, 2.1], [3900, 6500, 10, 1.6], [6100, 9800, 9, 1.4]],
}


def test_example_from_seminar():
    c = TestClient(app)
    r = c.post("/api/solve", json=EXAMPLE).json()
    assert [round(v, 4) for v in r["y"]] == [-0.0008, -0.0371, 0.0296, 0.0079]
    assert [round(v, 4) for v in r["z"]] == [0.0356, 0.0477, 0.0588, 0.0771]
    assert [round(v, 4) for v in r["u"]] == [1.0748, 0.9904, 1.1386, 1.1001]
    assert r["ranks"] == [[3, 1, 3], [4, 2, 4], [1, 3, 1], [2, 4, 2]]
    assert r["final"] == [3, 4, 1, 2]  # A3 > A4 > A1 > A2


def test_invalid():
    assert TestClient(app).post("/api/solve", json={**EXAMPLE, "weights": [1]}).status_code == 422
