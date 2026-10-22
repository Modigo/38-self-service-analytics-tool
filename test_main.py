from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

CSV = "region,amount\nCairo,150\nCairo,50\nDelta,200\n"

def upload_sample():
    r = client.post("/upload", files={"file": ("sample.csv", CSV, "text/csv")})
    assert r.status_code == 200
    return r.json()["dataset_id"]

def test_upload_and_filter_happly_path():
    dataset_id = upload_sample()
    body = {
        "columns": ["region", "amount"],
        "filters": [
            {"column": "region", "op": "=", "value": "Cairo"},
            {"column": "amount", "op": ">", "value": 100},
        ],
    }
    r = client.post(f"/datasets/{dataset_id}/query", json=body)
    assert r.status_code == 200
    assert r.json()["total_rows"] == 1
    assert r.json()["rows"]== [["Cairo", 150]]

def test_upload_rejects_non_csv():
    r = client.post("/upload", files={"file": ("notes.txt", "hello", "text/plain")})
    assert r.status_code == 400

def test_query_unknown_column():
    dataset_id = upload_sample()
    body = {"filters": [{"column": "price", "op": ">", "value": 1}]}
    r = client.post(f"/datasets/{dataset_id}/query", json=body)
    assert r.status_code == 400