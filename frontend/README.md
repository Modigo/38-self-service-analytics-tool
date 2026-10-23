# Clearview Analytics

A browser-based self-service analytics MVP. Load a CSV, choose visible columns, filter records, make a bar or line chart, and export the matching rows. CSV contents stay in browser memory and are not sent to an application server.

## Requirements

- Node.js 20.19+ or 22.12+
- pnpm 10+

## Run locally

```sh
pnpm install
pnpm dev
```

Open the local URL printed by Vite. Create and preview a production build with:

```sh
pnpm build
pnpm preview
```

## Main user flow

1. Load a `.csv` file or click **Load sample sales data**.
2. Inspect the detected fields and preview rows.
3. Select which columns appear in the preview and export.
4. Search all fields and optionally apply one typed filter. Text fields support contains/equality; numeric fields also support greater/less than.
5. Group records by a field, choose a count or numeric measure, select sum/average, and choose a bar or line chart.
6. Export the matching rows as CSV.

The preview displays up to 100 rows; export includes every matching row. Search and the typed filter both affect the table count, chart, and export.

## Data model

A dataset is held in page memory as a file name, normalized column names, rows (`Record<string, string>`), and import warnings. CSV cell values remain text unless a numeric filter or chart aggregation needs to compare or calculate them. The full model and runtime flow are in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Validation and privacy

- Accepts `.csv` files up to 10 MB.
- Rejects empty/header-only files and malformed rows with a recovery message.
- Renames blank and duplicate column names and shows a warning.
- Infers numeric fields from non-empty values.
- Escapes formula-like exported cells to reduce spreadsheet formula injection risk.
- Has no backend, database, authentication, or persistence. Refreshing or closing the page clears the dataset. Avoid using sensitive data on shared devices.

## Test strategy

See [`docs/TEST_STRATEGY.md`](docs/TEST_STRATEGY.md) for happy-path, failure-path, and edge-case checks. Run the helper unit tests with `pnpm test`; no automated browser/UI tests are included yet.

## Demo

Follow [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) for a short sample-data walkthrough.

## Deploy to Netlify

The repository includes `netlify.toml` with the static build command and output directory. To publish:

1. Push this project to a GitHub, GitLab, or Bitbucket repository.
2. In Netlify, import that repository and select the project root (`analytics-app/` if the repository contains the parent workspace).
3. Confirm the build command is `pnpm build` and publish directory is `dist` (the configuration supplies both).
4. Deploy. No environment variables are required.

You can also deploy the `dist/` folder produced by `pnpm build` to another static host. The app has no server-side runtime requirements.

## Current boundaries and next steps

CSV only; 10 MB file limit; one typed filter at a time; text and numeric columns only; no persistence or user accounts. Before expanding, run the checks in the test strategy, then consider multiple filters, date inference, accessibility review, and larger-file performance.
