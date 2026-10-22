import pandas as pd

ALLOWED_OPS = ["=", "!=", ">", "<", ">=", "<=", "contains"]

def apply_filters(df, columns, filters):
    result = df

    for f in filters:
        col = f["column"]
        op = f["op"]
        value = f["value"]

        if col not in result.columns:
            raise ValueError(f"Column '{col}' does not exist")
        if op not in ALLOWED_OPS:
            raise ValueError(f"Operator '{op}' is not allowed")

        if op == "=":
            result = result[result[col] == value]
        elif op == "!=":
            result = result[result[col] != value]
        elif op == ">":
            result = result[result[col] > value]
        elif op == "<":
            result = result[result[col] < value]
        elif op == ">=":
            result = result[result[col] >= value]
        elif op == "<=":
            result = result[result[col] <= value]
        elif op == "contains":
            result = result[result[col].astype(str).str.contains(str(value), case=False)]

    if columns:
        for c in columns:
            if c not in result.columns:
                raise ValueError(f"column '{c}' does not exit")
        result = result[columns]
    return result
