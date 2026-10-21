// Change this one line after the backend is deployed (it must start with https://).
const API_URL = 'http://127.0.0.1:8000';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const OPS_NUMBER = ['=', '!=', '>', '<', '>=', '<='];
const OPS_TEXT = ['=', '!=', 'contains'];
const COLORS = ['#1F6F8B', '#E0A030', '#6A8E3A', '#B3562E', '#7B5EA7', '#3E8E8E', '#A34A6B', '#6B7B8C'];

let datasetId = null;
let columns = [];   // [{ name, type }] from /upload
let chart = null;

const $ = id => document.getElementById(id);
const isNumeric = c => /int|float/.test(c.type);

function setMsg(id, text, kind) {
  const el = $(id);
  el.textContent = text || '';
  el.className = 'msg' + (kind ? ' ' + kind : '');
}

// One helper for every API call. Errors carry the backend's "detail" message.
async function api(path, options, asBlob) {
  let res;
  try {
    res = await fetch(API_URL + path, options);
  } catch (e) {
    throw new Error('Could not reach the backend. Check that it is running at ' + API_URL + '.');
  }
  if (!res.ok) {
    let data = null;
    try { data = await res.json(); } catch (e) {}
    const text = data && typeof data.detail === 'string' ? data.detail : 'Request failed (' + res.status + ').';
    const err = new Error(text);
    err.status = res.status;
    throw err;
  }
  return asBlob ? res.blob() : res.json();
}

function resetPage() {
  datasetId = null;
  columns = [];
  $('workspace').hidden = true;
  $('resultPanel').hidden = true;
  if (chart) { chart.destroy(); chart = null; }
}

function handleError(msgId, e) {
  if (e.status === 404 && datasetId) {
    resetPage();
    setMsg('uploadMsg', 'Your dataset is no longer on the server. Upload the file again.', 'error');
    return;
  }
  setMsg(msgId, e.message, 'error');
}

async function run(btn, msgId, fn) {
  btn.disabled = true;
  setMsg(msgId, 'Working...');
  try {
    await fn();
    if ($(msgId).textContent === 'Working...') setMsg(msgId, '');
  } catch (e) {
    handleError(msgId, e);
  } finally {
    btn.disabled = false;
  }
}

// textContent (never innerHTML) so file contents can't inject HTML.
function renderTable(cols, rows, tableId) {
  const t = $(tableId);
  t.innerHTML = '';
  const headRow = t.createTHead().insertRow();
  cols.forEach(c => {
    const th = document.createElement('th');
    th.textContent = c;
    headRow.appendChild(th);
  });
  const body = t.createTBody();
  rows.forEach(r => {
    const tr = body.insertRow();
    r.forEach(v => { tr.insertCell().textContent = v ?? ''; });
  });
}

function buildControls() {
  $('columnList').innerHTML = '';
  columns.forEach(c => {
    const label = document.createElement('label');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.value = c.name;
    box.checked = true;
    label.append(box, c.name);
    $('columnList').appendChild(label);
  });

  $('filters').innerHTML = '';
  addFilter();

  $('groupBy').innerHTML = '';
  $('valueCol').innerHTML = '';
  columns.forEach(c => {
    $('groupBy').add(new Option(c.name, c.name));
    if (isNumeric(c)) $('valueCol').add(new Option(c.name, c.name));
  });
  $('resultPanel').hidden = true;
  setMsg('queryMsg', '');
  setMsg('chartMsg', '');
}

function addFilter() {
  const row = document.createElement('div');
  row.className = 'filter-row';
  const col = document.createElement('select');
  col.setAttribute('aria-label', 'Filter column');
  columns.forEach(c => col.add(new Option(c.name, c.name)));
  const op = document.createElement('select');
  op.setAttribute('aria-label', 'Operator');
  const val = document.createElement('input');
  val.placeholder = 'Value';
  val.setAttribute('aria-label', 'Value');
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'secondary';
  remove.textContent = 'Remove';

  // Number columns get number operators and a number box; text columns get text operators.
  const fill = () => {
    const c = columns.find(x => x.name === col.value);
    op.innerHTML = '';
    (isNumeric(c) ? OPS_NUMBER : OPS_TEXT).forEach(o => op.add(new Option(o, o)));
    val.type = isNumeric(c) ? 'number' : 'text';
    val.step = 'any';
    val.value = '';
  };
  col.onchange = fill;
  fill();
  remove.onclick = () => row.remove();
  row.append(col, op, val, remove);
  $('filters').appendChild(row);
}

function getFilters() {
  return [...document.querySelectorAll('.filter-row')].flatMap(row => {
    const [col, op, val] = row.querySelectorAll('select, input');
    if (val.value === '') return [];
    let value = val.value;
    if (val.type === 'number') {
      value = Number(val.value);
      if (Number.isNaN(value)) throw new Error('Enter a number for ' + col.value + '.');
    }
    return [{ column: col.value, op: op.value, value: value }];
  });
}

function getPayload() {
  const cols = [...document.querySelectorAll('#columnList input:checked')].map(i => i.value);
  if (cols.length === 0) throw new Error('Select at least one column to show.');
  return { columns: cols, filters: getFilters() };
}

function drawChart(labels, values, type) {
  if (chart) chart.destroy();
  const pie = type === 'pie';
  chart = new Chart($('chart'), {
    type: type,
    data: {
      labels: labels,
      datasets: [{
        label: 'Result',
        data: values,
        backgroundColor: pie ? labels.map((_, i) => COLORS[i % COLORS.length]) : COLORS[0],
        borderColor: COLORS[0]
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

// ---- Button handlers ----

$('uploadBtn').onclick = () => {
  const file = $('fileInput').files[0];
  if (!file) { setMsg('uploadMsg', 'Choose a CSV file first.', 'error'); return; }
  run($('uploadBtn'), 'uploadMsg', async () => {
    const form = new FormData();
    form.append('file', file);   // field name must match the backend's "file" parameter
    const up = await api('/upload', { method: 'POST', body: form });
    datasetId = up.dataset_id;
    columns = up.columns;
    const pv = await api('/datasets/' + datasetId + '/preview');
    renderTable(pv.columns, pv.rows, 'previewTable');
    buildControls();
    $('workspace').hidden = false;
    setMsg('uploadMsg', 'Uploaded ' + file.name + ': ' + up.rows + ' rows, ' + columns.length + ' columns.', 'ok');
  });
};

$('addFilterBtn').onclick = addFilter;

$('applyBtn').onclick = () => run($('applyBtn'), 'queryMsg', async () => {
  const result = await api('/datasets/' + datasetId + '/query', {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(getPayload())
  });
  const total = result.total_rows ?? result.rows.length;
  $('resultPanel').hidden = false;
  if (result.rows.length === 0) {
    $('resultTable').innerHTML = '';
    $('resultInfo').textContent = 'No rows match these filters. Change or remove a filter and try again.';
    return;
  }
  $('resultInfo').textContent = 'Showing ' + result.rows.length + ' of ' + total + ' matching rows.';
  renderTable(result.columns, result.rows, 'resultTable');
});

$('exportBtn').onclick = () => run($('exportBtn'), 'exportMsg', async () => {
  const blob = await api('/datasets/' + datasetId + '/export', {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(getPayload())
  }, true);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'filtered.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  setMsg('exportMsg', 'Downloaded filtered.csv.', 'ok');
});

$('agg').onchange = () => { $('valueCol').disabled = $('agg').value === 'count'; };

$('chartBtn').onclick = () => run($('chartBtn'), 'chartMsg', async () => {
  const agg = $('agg').value;
  const body = { group_by: $('groupBy').value, agg: agg, filters: getFilters() };
  if (agg !== 'count') {
    if (!$('valueCol').value) throw new Error('This file has no number columns. Choose count instead.');
    body.value_column = $('valueCol').value;
  }
  const d = await api('/datasets/' + datasetId + '/chart-data', {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body)
  });
  drawChart(d.labels, d.values, $('chartType').value);
});