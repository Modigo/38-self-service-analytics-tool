# Test strategy

The frontend has unit tests for core data helpers, and the existing backend has API tests. Use the manual checks below before a demo because the unit tests do not exercise the full browser interface.

## Automated checks

- Frontend: `cd frontend && pnpm test` (8 tests for normalization, numeric inference, filters, grouping/average, and formula-safe export values).
- Backend: `python -m pytest backend/test_main.py` (3 API tests for upload/query happy path, non-CSV rejection, and unknown-column rejection).
- Release checks: `cd frontend && pnpm lint && pnpm build`.

## Happy path

1. Open the app and choose **Load sample sales data**.
2. Confirm the preview shows 12 rows and the fields `month`, `region`, `product`, `revenue`, and `orders`.
3. Hide `orders` in the field list. Confirm it disappears from the preview and from the exported file.
4. Filter `region` to `North`, then search for `Notebook`. Confirm the row count, preview, and chart all reflect both conditions.
5. Group by `month`, measure `revenue`, select Average and Line. Confirm the chart responds to each choice.
6. Export CSV. Confirm every matching row is present, and only selected fields are included.

## Major failure paths

- Upload a `.txt` file: the app should ask for a CSV.
- Upload a zero-byte CSV: the app should explain that the file is empty.
- Upload a CSV whose rows have inconsistent field counts: the app should identify the row to fix.
- Upload a header-only CSV: the app should explain that it has no data rows.
- Upload a CSV larger than 10 MB: the app should explain the limit.

## Additional edge cases

- Duplicate or blank header names should be renamed and surfaced as a warning.
- Blank numeric cells should not match numeric comparisons and should not lower an average.
- Search and typed filter should combine; clearing the typed filter should preserve search.
- A formula-like cell such as `=1+1` should be exported with a leading apostrophe.
- A dataset with no numeric columns should still support record counts and text grouping.
- A dataset with no matching records should show the empty-results message and export an empty result safely.

## Next automation steps

1. Unit tests for header normalization, numeric-field inference, filter operators, aggregation, and CSV formula escaping.
2. Component tests for validation feedback, visible-column selection, and state reset on a new dataset.
3. One browser-level end-to-end test for the happy path and one for malformed CSV feedback.

The manual browser checks above are still needed because these unit/API tests do not drive the full rendered interface.
