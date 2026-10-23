import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import Papa from 'papaparse'
import './App.css'
import {
  createHeaderTransformer, escapeFormulaValue, filterRows, groupRows, inferNumericColumns,
  type Aggregation, type DataRow, type FilterOperator,
} from './analytics'

const ChartView = lazy(() => import('./ChartView'))

type Dataset = { name: string; columns: string[]; rows: DataRow[]; warnings: string[] }
type ChartType = 'bar' | 'line'

const sampleCsv = `month,region,product,revenue,orders
January,North,Notebook,1250,42
January,South,Pen,890,65
February,North,Pen,1140,58
February,South,Notebook,1520,49
March,North,Notebook,1780,61
March,South,Pen,1320,72
April,North,Pen,1460,68
April,South,Notebook,1940,57
May,North,Notebook,2130,74
May,South,Pen,1680,81
June,North,Pen,1890,79
June,South,Notebook,2310,70`

function parseCsv(file: File): Promise<Dataset> {
  return new Promise((resolve, reject) => {
    const headerTransformer = createHeaderTransformer()
    Papa.parse<DataRow>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: headerTransformer.transform,
      complete: (result) => {
        const columns = result.meta.fields ?? []
        if (result.errors.length > 0) {
          const issue = result.errors[0]
          const rowNumber = issue.row === undefined ? 'an unknown row' : `row ${issue.row + 1}`
          const message = issue.code === 'TooFewFields' || issue.code === 'TooManyFields'
            ? `${rowNumber} has a different number of values than the header. Check this row and try again.`
            : issue.message
          return reject(new Error(message))
        }
        if (columns.length === 0) return reject(new Error('This file needs a header row with column names.'))
        if (result.data.length === 0) return reject(new Error('This CSV has headers but no data rows.'))
        resolve({ name: file.name, columns, rows: result.data, warnings: headerTransformer.warnings })
      },
      error: (error) => reject(error),
    })
  })
}

function parseSample(): Dataset {
  const result = Papa.parse<DataRow>(sampleCsv, { header: true, skipEmptyLines: true })
  return { name: 'sample-sales.csv', columns: result.meta.fields ?? [], rows: result.data, warnings: [] }
}

function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [filterColumn, setFilterColumn] = useState('')
  const [filterOperator, setFilterOperator] = useState<FilterOperator>('contains')
  const [filterValue, setFilterValue] = useState('')
  const [groupColumn, setGroupColumn] = useState('')
  const [valueColumn, setValueColumn] = useState('')
  const [aggregation, setAggregation] = useState<Aggregation>('sum')
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const numericColumns = useMemo(() => {
    if (!dataset) return []
    return inferNumericColumns(dataset.columns, dataset.rows)
  }, [dataset])

  const filteredRows = useMemo(() => {
    if (!dataset) return []
    return filterRows(dataset.rows, search, filterColumn, filterOperator, filterValue, numericColumns)
  }, [dataset, filterColumn, filterOperator, filterValue, numericColumns, search])

  const chartData = useMemo(() => {
    if (!dataset || !groupColumn) return []
    return groupRows(filteredRows, groupColumn, valueColumn, aggregation)
  }, [aggregation, dataset, filteredRows, groupColumn, valueColumn])

  function loadFile(file?: File) {
    if (!file) return
    setError('')
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Choose a .csv file. Other file types are not supported yet.')
      return
    }
    if (file.size === 0) {
      setError('This file is empty. Choose a CSV that contains a header row and data.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('This file is larger than 10 MB. Try a smaller CSV for this demo.')
      return
    }
    parseCsv(file).then((loaded) => {
      setDataset(loaded)
      setVisibleColumns(loaded.columns)
      setSearch('')
      setFilterColumn('')
      setFilterOperator('contains')
      setFilterValue('')
      setGroupColumn('')
      setValueColumn('')
      setAggregation('sum')
      setChartType('bar')
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'The file could not be read.')
    })
  }

  function loadSample() {
    const sample = parseSample()
    setDataset(sample)
    setVisibleColumns(sample.columns)
    setSearch('')
    setFilterColumn('')
    setFilterOperator('contains')
    setFilterValue('')
    setGroupColumn('')
    setValueColumn('')
    setAggregation('sum')
    setChartType('bar')
    setError('')
  }

  function exportCsv() {
    if (!dataset) return
    const exportRows = filteredRows.map((row) => Object.fromEntries(visibleColumns.map((column) => {
      return [column, escapeFormulaValue(row[column] ?? '')]
    })))
    const csv = Papa.unparse(exportRows, { columns: visibleColumns })
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `filtered-${dataset.name}`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Clearview home"><span className="brand-mark">C</span> clearview</a>
        <span className="local-badge"><i /> Private by design</span>
      </header>

      <section className="intro" id="top">
        <p className="eyebrow">SELF-SERVICE ANALYTICS</p>
        <h1>Your data, in a<br /><span>clearer view.</span></h1>
        <p className="intro-copy">Bring a CSV. Find the story inside it. No SQL, no setup, no data leaving your browser.</p>
      </section>

      {!dataset ? (
        <section className={`upload-card ${dragging ? 'is-dragging' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); loadFile(event.dataTransfer.files[0]) }}>
          <div className="upload-icon">↑</div>
          <h2>Start with a dataset</h2>
          <p>Drop a CSV file here, or browse from your computer.</p>
          <button className="primary-button" onClick={() => fileInput.current?.click()}>Choose a CSV file <span>↗</span></button>
          <input ref={fileInput} type="file" accept=".csv,text/csv" hidden onChange={(event) => { loadFile(event.target.files?.[0]); event.target.value = '' }} />
          <div className="upload-foot"><span>CSV format</span><span>Up to 10 MB</span><span>Processed locally</span></div>
          <div className="sample-prompt">Just exploring? <button onClick={loadSample}>Load sample sales data</button></div>
          {error && <p className="error-message" role="alert">{error}</p>}
        </section>
      ) : (
        <section className="workspace">
          <div className="dataset-heading">
            <div><p className="eyebrow">YOUR WORKSPACE</p><h2>{dataset.name}</h2></div>
            <button className="text-button" onClick={() => { setDataset(null); setError(''); setSearch(''); setFilterColumn(''); setFilterValue('') }}>＋ New dataset</button>
          </div>
          {dataset.warnings.length > 0 && <div className="dataset-warning" role="status">{dataset.warnings.join(' ')}</div>}
          <div className="stats-row">
            <article className="stat-card"><span>ROWS</span><strong>{filteredRows.length.toLocaleString()}</strong><small>of {dataset.rows.length.toLocaleString()} records</small></article>
            <article className="stat-card"><span>SELECTED COLUMNS</span><strong>{visibleColumns.length}</strong><small>of {dataset.columns.length} fields</small></article>
            <article className="stat-card"><span>NUMERIC FIELDS</span><strong>{numericColumns.length}</strong><small>ready to chart</small></article>
          </div>
          <div className="content-grid">
            <section className="panel chart-panel">
              <div className="panel-heading"><div><p className="eyebrow">VISUALIZE</p><h3>Build a quick chart</h3></div><span className="chart-symbol">▥</span></div>
              <div className="chart-controls">
                <label>Group by<select value={groupColumn} onChange={(event) => setGroupColumn(event.target.value)}><option value="">Choose a column</option>{dataset.columns.map((column) => <option key={column} value={column}>{column}</option>)}</select></label>
                <label>Measure<select value={valueColumn} onChange={(event) => setValueColumn(event.target.value)}><option value="">Count of rows</option>{numericColumns.map((column) => <option key={column} value={column}>{column}</option>)}</select></label>
                <label>Chart<select value={chartType} onChange={(event) => setChartType(event.target.value as ChartType)}><option value="bar">Bar</option><option value="line">Line</option></select></label>
                {valueColumn && <label>Calculation<select value={aggregation} onChange={(event) => setAggregation(event.target.value as Aggregation)}><option value="sum">Sum</option><option value="average">Average</option></select></label>}
              </div>
              {chartData.length ? <Suspense fallback={<div className="chart-empty">Loading chart…</div>}><ChartView data={chartData} type={chartType} measureLabel={valueColumn ? `${aggregation === 'average' ? 'Average' : 'Sum'} of ${valueColumn}` : 'Rows'} /></Suspense> : <div className="chart-empty">Choose a column to group your data and see a chart.</div>}
            </section>
            <section className="panel fields-panel">
              <div className="panel-heading"><div><p className="eyebrow">DATA FIELDS</p><h3>What’s in your file</h3></div></div>
              <div className="field-list">{dataset.columns.map((column) => <label className="field-item" key={column}><input type="checkbox" checked={visibleColumns.includes(column)} disabled={visibleColumns.length === 1 && visibleColumns.includes(column)} onChange={(event) => setVisibleColumns((current) => event.target.checked ? [...current, column] : current.filter((field) => field !== column))} aria-label={`Include ${column} in preview and export`} /><span className="field-type">{numericColumns.includes(column) ? '123' : 'Aa'}</span><span>{column}</span><small>{numericColumns.includes(column) ? 'Number' : 'Text'}</small></label>)}</div>
            </section>
          </div>
          <section className="panel table-panel">
            <div className="table-heading"><div><p className="eyebrow">EXPLORE RECORDS</p><h3>Data preview <span>{filteredRows.length.toLocaleString()} rows</span></h3></div><div className="table-actions"><label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search all fields" /></label><button className="export-button" onClick={exportCsv}>↓ Export CSV</button></div></div>
            <div className="filter-row">
              <span className="filter-title">Filter rows</span>
              <label>Column<select value={filterColumn} onChange={(event) => { setFilterColumn(event.target.value); setFilterOperator(numericColumns.includes(event.target.value) ? 'equals' : 'contains') }}><option value="">Choose a column</option>{dataset.columns.map((column) => <option key={column} value={column}>{column}</option>)}</select></label>
              <label>Rule<select value={filterOperator} onChange={(event) => setFilterOperator(event.target.value as FilterOperator)} disabled={!filterColumn}>{numericColumns.includes(filterColumn) ? <><option value="equals">equals</option><option value="greater">greater than</option><option value="less">less than</option></> : <><option value="contains">contains</option><option value="equals">equals</option></>}</select></label>
              <label>Value<input value={filterValue} onChange={(event) => setFilterValue(event.target.value)} placeholder={filterColumn ? 'Enter a value' : 'Select a column first'} disabled={!filterColumn} onKeyDown={(event) => { if (event.key === 'Escape') setFilterValue('') }} /></label>
              {(filterColumn || filterValue) && <button className="clear-filter" onClick={() => { setFilterColumn(''); setFilterOperator('contains'); setFilterValue('') }}>Clear</button>}
            </div>
            <div className="table-scroll"><table><thead><tr>{visibleColumns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{filteredRows.slice(0, 100).map((row, index) => <tr key={index}>{visibleColumns.map((column) => <td key={column}>{row[column] || <span className="empty-value">—</span>}</td>)}</tr>)}</tbody></table>{filteredRows.length === 0 && <div className="no-results">No rows match that search. Try a different word.</div>}</div>
            {filteredRows.length > 100 && <p className="table-note">Showing the first 100 of {filteredRows.length.toLocaleString()} matching rows. Export includes all matching rows.</p>}
          </section>
        </section>
      )}
      <footer className="page-footer"><span>Clearview Analytics</span><span>Your files stay on your device</span></footer>
    </main>
  )
}

export default App
