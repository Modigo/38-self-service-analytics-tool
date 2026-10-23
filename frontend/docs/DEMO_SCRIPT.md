# Demo script (about 3 minutes)

1. Open the deployed Clearview Analytics URL and point out the privacy note: this MVP parses the CSV in the browser and does not send rows to a server.
2. Choose **Load sample sales data** to avoid a file picker delay.
3. Explain the summary cards: matching rows, selected columns, and numeric fields.
4. In the field list, hide `orders`. Show that the table preview follows the chosen columns.
5. Set the row filter to `region` → `equals` → `North`. Search for `Notebook` to show that search and the typed filter combine.
6. In the chart builder, group by `month`, measure `revenue`, choose `Average`, and switch to `Line`. Explain that chart aggregation uses only the filtered records.
7. Export CSV and show that it contains the matching rows and visible columns.
8. Mention the boundaries: CSV only, 10 MB maximum, no accounts or persistence. The next improvements are automated checks, richer filters/charts, and deployment monitoring if a backend is later introduced.
