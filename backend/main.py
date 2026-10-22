import os
import uuid

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from typing import Any, Optional

from pydantic import BaseModel
from backend.filters import apply_filters

from fastapi.responses import Response

app = FastAPI()

UPLOAD_DIR = "uploads"
MAX_SIZE = 5 * 1024 * 1024
os.makedirs(UPLOAD_DIR, exist_ok=True)

def dataset_path(dataset_id):
    if not dataset_id.isalnum():
        raise HTTPException(400, "Invaild dataset ID")
    path = os.path.join(UPLOAD_DIR, f"{dataset_id}.csv")
    if not os.path.exists(path):
        raise HTTPException(404, "Dataset not found")
    return path

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "only .csv files are allowed")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(400, "File is empty")
    if len(content) > MAX_SIZE:
        raise HTTPException(400, "File is too large (max 5 MB)")

    dataset_id = uuid.uuid4().hex
    path = os.path.join(UPLOAD_DIR, f"{dataset_id}.csv")
    with open(path, "wb") as f:
        f.write(content)

    try:
        df = pd.read_csv(path)
    except Exception:
        os.remove(path)
        raise HTTPException(400, "Could not read this file as a CSV")
    
    return {
        "dataset_id": dataset_id,
        "rows": len(df),
        "columns": [{"name": c, "type": str(t)} for c, t in df.dtypes.items()],
    }

@app.get("/datasets/{dataset_id}/preview")
def preview(dataset_id: str):
    df = pd.read_csv(dataset_path(dataset_id))
    return {
        "columns": list(df.columns),
        "rows": df.head(20).fillna("").values.tolist(),
    }

class FilterRule(BaseModel):
    column:str
    op:str
    value: Any

class QueryRequest(BaseModel):
    columns: Optional[list[str]]= None
    filters: list[FilterRule] = []

@app.post("/datasets/{dataset_id}/query")
def query(dataset_id: str, body: QueryRequest):
    df = pd.read_csv(dataset_path(dataset_id))
    rules = [r.model_dump() for r in body.filters]

    try:
        result = apply_filters(df, body.columns, rules)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except TypeError:
        raise HTTPException(400, "Connot compare this column with that value")

    return {
        "columns": list(result.columns),
        "total_rows": len(result),
        "rows": result.head(100).fillna("").values.tolist(),
    }

class ChartRequest(BaseModel):
    group_by: str
    agg: str = "count"
    value_column: Optional[str] = None
    filters: list[FilterRule] = []

@app.post("/datasets/{dataset_id}/chart-data")
def chart_data(dataset_id: str, body: ChartRequest):
    df = pd.read_csv(dataset_path(dataset_id))
    rules = [r.model_dump() for r in body.filters]

    try:
        df = apply_filters(df, None, rules)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except TypeError:
        raise HTTPException(400, "Connot compare this column with that value")

    if body.group_by not in df.columns:
        raise HTTPException(400, f"Column '{body.group_by}' does not exist")
    if body.agg not in ["count", "sum", "mean", "min", "max"]:
        raise HTTPException(400, f"Aggregation '{body.agg}' is not allowed")

    if body.agg == "count":
        grouped = df.groupby(body.group_by).size()
    else:
        col = body.value_column
        if not col or col not in df.columns:
            raise HTTPException(400, "value_column is missing or does not exist")
        if not pd.api.types.is_numeric_dtype(df[col]):
            raise HTTPException(400, f"Column '{col}'is not numeric")
        grouped = df.groupby(body.group_by)[col].agg(body.agg)

    grouped = grouped.round(2)
    return {
        "labels": [str(x) for x in grouped.index],
        "values": grouped.tolist(),
    }

@app.post("/datasets/{dataset_id}/export")
def export(dataset_id: str, body: QueryRequest):
    df = pd.read_csv(dataset_path(dataset_id))
    rules = [r.model_dump() for r in body.filters]

    try:
        result = apply_filters(df, body.columns, rules)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except TypeError:
        raise HTTPException(400, "Cannot compare this column with that value")

    return Response(
        content=result.to_csv(index=False),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="export.csv'},
    )