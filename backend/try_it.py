import pandas as pd
from filters import apply_filters

df = pd.read_csv("dataset.csv")

print(df.columns)
print(df.shape)

result = apply_filters(
    df,
    columns=["region", "website_visits", "customer_rating"],
    filters=[{"column": "region", "op": "=", "value": "Cairo"},
             {"column": "website_visits", "op": ">", "value": 50000},],
)

print(result)