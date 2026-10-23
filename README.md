# Self-Service Analytics Tool

A CSV analytics MVP with a React/TypeScript frontend and an optional FastAPI API. The deployed frontend currently performs CSV parsing, filtering, charting, and export entirely in the browser; it does not call the API. This keeps uploads on the user's device and lets the frontend deploy as a static site.

## Repository layout

- `frontend/` — active React + TypeScript + Vite application.
- `frontend/docs/` — architecture, manual QA strategy, and demo script.
- `backend/` — optional FastAPI upload/query/chart/export API.
- `legacy-frontend/` — original vanilla JavaScript interface, retained for reference.
- `requirements.txt` — Python dependencies for the API and its tests.
- `netlify.toml` — Netlify build settings for the frontend package.

## Run the frontend locally

Requirements: Node.js 20.19+ or 22.12+, and pnpm 11. From the `frontend/` folder:

```sh
pnpm install
pnpm dev
```

Vite prints a local URL. The app includes sample sales data to walk through column selection, searching, typed filtering, bar/line charts, sum/average calculations, and CSV export.

## Frontend checks

From `frontend/`:

```sh
pnpm test
pnpm lint
pnpm build
```

The tests cover header normalization, numeric field inference, text and numeric filters, grouping/averages with blanks, and formula-safe export values.

## Optional API

The existing FastAPI service provides upload, preview, query, chart-data, and CSV export endpoints. The active React frontend does not currently call these endpoints. To run the API locally from the repository root:

```sh
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

Run the API tests from the repository root with `python -m pytest backend/test_main.py`. The API writes uploaded files to local disk and currently has no retention cleanup or authentication. Do not expose it publicly until storage, access control, and cleanup policies are decided. No API environment variables are required for local development.

## Deploy the frontend to Netlify

The repository is configured for Git-based Netlify deployment. Import this repository in Netlify and select the branch you want to deploy. `netlify.toml` sets the frontend base directory, installs dependencies, runs the frontend tests and production build, and publishes only `frontend/dist/`. No backend or environment variables are needed for this static deployment.

On future pushes to the production branch, Netlify will run the configured checks/build and publish the new frontend. The `backend/` and `legacy-frontend/` folders are outside the publish directory and are not included in the site deployment.

## Data handling note

The active frontend processes CSV contents in browser memory. Refreshing or closing the page clears the dataset. It accepts CSV files up to 10 MB and escapes formula-like values during export.

The repository currently contains tracked CSVs under `backend/uploads/`. They are outside Netlify's publish directory but are still visible in GitHub history. Confirm they are intended public demo data; removing them from a later commit would not erase earlier Git history.
