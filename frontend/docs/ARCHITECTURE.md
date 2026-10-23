# Architecture and data model

## Runtime flow

```text
CSV file selected in browser
        ↓
Papa Parse validates and maps rows
        ↓
React holds the dataset in page memory
        ├── search + typed filter → matching rows
        ├── visible field selection → preview/export columns
        └── group + measure → chart data → lazily loaded Recharts view
```

The dataset is never sent to an application API. This app has no server, account system, database, or saved sessions. Refreshing the page clears the imported data.

## Data model

The data model is deliberately small and in-memory:

- `DataRow`: a mapping from column name to cell text (`Record<string, string>`).
- `Dataset`: the original file name, normalized column names, rows, and any header warnings.
- UI state: selected preview/export columns, one filter column/rule/value, global search text, group column, chart type, and numeric measure/aggregation.

CSV values stay as strings after parsing. Numeric columns are inferred by checking that every non-empty cell is a finite number. Values are converted to numbers only for comparisons and chart aggregation. This avoids changing the original text used in the preview and export.

## Trust boundaries and safeguards

- File type is restricted to `.csv` and file size to 10 MB.
- Empty files, header-only files, malformed rows, blank headers, and duplicate headers receive validation or a clear warning.
- CSV cell contents render as React text, not HTML.
- Export prefixes formula-like text with an apostrophe so spreadsheet applications are less likely to execute it as a formula. Valid negative numeric values remain numeric.
- Uploaded data exists only in browser memory. This is not a substitute for device security: do not use sensitive data on a shared or compromised device.

## Main code areas

- `src/App.tsx`: import flow, dataset/filter state, aggregation, preview, and export.
- `src/ChartView.tsx`: chart rendering; dynamically imported after a chart is requested to keep the initial page bundle smaller.
- `src/App.css` and `src/index.css`: component and global styling.
- `../../netlify.toml`: root-level static hosting build configuration. Netlify publishes only `frontend/dist/`.
