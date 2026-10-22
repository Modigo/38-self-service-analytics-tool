const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const uploadMsg = document.getElementById("uploadMsg");
const workspace = document.getElementById("workspace");

let headers = [];
let originalRows = [];
let filteredRows = [];
let chartInstance = null;

// Display a message to the user.
function showMessage(element, message, type = "") {
  element.textContent = message;
  element.className = `msg ${type}`;
}

// Parse CSV rows, including quoted values and commas inside quotes.
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  text = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;

      row.push(cell);

      if (row.some(value => value.trim() !== "")) {
        rows.push(row);
      }

      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (inQuotes) {
    throw new Error("The CSV contains an unclosed quotation mark.");
  }

  row.push(cell);

  if (row.some(value => value.trim() !== "")) {
    rows.push(row);
  }

  if (rows.length < 2) {
    throw new Error("The CSV needs a header and at least one data row.");
  }

  const columnNames = rows[0].map(value => value.trim());

  if (columnNames.some(name => !name)) {
    throw new Error("Every column must have a name.");
  }

  if (new Set(columnNames).size !== columnNames.length) {
    throw new Error("Column names must be unique.");
  }

  const data = rows.slice(1);

  if (data.some(values => values.length !== columnNames.length)) {
    throw new Error("Some rows have a different number of columns.");
  }

  return {
    headers: columnNames,
    rows: data.map(values =>
      Object.fromEntries(
        columnNames.map((name, index) => [name, values[index]])
      )
    )
  };
}

// Render a table safely using textContent.
function renderTable(table, columns, rows) {
  table.replaceChildren();

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  columns.forEach(column => {
    const th = document.createElement("th");
    th.textContent = column;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  rows.forEach(record => {
    const tr = document.createElement("tr");

    columns.forEach(column => {
      const td = document.createElement("td");
      td.textContent = record[column] ?? "";
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
}

// Build column selection controls.
function renderColumnOptions() {
  const columnList = document.getElementById("columnList");
  columnList.replaceChildren();

  headers.forEach(column => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.value = column;
    checkbox.checked = true;

    checkbox.addEventListener("change", renderPreview);

    label.append(checkbox, document.createTextNode(column));
    columnList.appendChild(label);
  });
}

// Return the selected columns.
function getSelectedColumns() {
  return [...document.querySelectorAll("#columnList input:checked")]
    .map(input => input.value);
}

// Update the preview table.
function renderPreview() {
  const columns = getSelectedColumns();

  renderTable(
    document.getElementById("previewTable"),
    columns,
    originalRows.slice(0, 20)
  );
}

// Populate chart selectors.
function populateChartOptions() {
  const groupBy = document.getElementById("groupBy");
  const valueCol = document.getElementById("valueCol");

  groupBy.replaceChildren();
  valueCol.replaceChildren();

  headers.forEach(column => {
    groupBy.add(new Option(column, column));
    valueCol.add(new Option(column, column));
  });
}

// Create one filter row.
function addFilter() {
  const container = document.getElementById("filters");
  const row = document.createElement("div");

  row.className = "filter-row";

  const columnSelect = document.createElement("select");
  const operatorSelect = document.createElement("select");
  const valueInput = document.createElement("input");
  const removeButton = document.createElement("button");

  headers.forEach(column => {
    columnSelect.add(new Option(column, column));
  });

  [
    ["equals", "equals"],
    ["contains", "contains"],
    ["greater", ">"],
    ["less", "<"]
  ].forEach(([value, label]) => {
    operatorSelect.add(new Option(label, value));
  });

  valueInput.type = "text";
  valueInput.placeholder = "Filter value";
  valueInput.setAttribute("aria-label", "Filter value");

  removeButton.type = "button";
  removeButton.textContent = "Remove";
  removeButton.className = "secondary";

  removeButton.addEventListener("click", () => row.remove());

  row.append(
    columnSelect,
    operatorSelect,
    valueInput,
    removeButton
  );

  container.appendChild(row);
}

// Upload and parse the selected CSV.
uploadBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];

  if (!file) {
    showMessage(uploadMsg, "Please select a CSV file.", "error");
    return;
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    showMessage(uploadMsg, "Please select a CSV file.", "error");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showMessage(uploadMsg, "Maximum file size is 5 MB.", "error");
    return;
  }

  uploadBtn.disabled = true;

  try {
    const text = await file.text();
    const result = parseCSV(text);

    headers = result.headers;
    originalRows = result.rows;
    filteredRows = [...originalRows];

    renderColumnOptions();
    renderPreview();
    populateChartOptions();

    document.getElementById("filters").replaceChildren();
    document.getElementById("resultPanel").hidden = true;

    workspace.hidden = false;

    showMessage(
      uploadMsg,
      `Loaded ${originalRows.length} rows and ${headers.length} columns.`,
      "ok"
    );
  } catch (error) {
    showMessage(uploadMsg, error.message, "error");
  } finally {
    uploadBtn.disabled = false;
  }
});

// Add filters.
document.getElementById("addFilterBtn")
  .addEventListener("click", addFilter);

// Apply filters to the dataset.
document.getElementById("applyBtn").addEventListener("click", () => {
  try {
    const filters = [...document.querySelectorAll(".filter-row")];

    const activeFilters = filters
      .map(row => ({
        column: row.querySelector("select:nth-of-type(1)").value,
        operator: row.querySelector("select:nth-of-type(2)").value,
        value: row.querySelector("input").value.trim()
      }))
      .filter(filter => filter.value !== "");

    filteredRows = originalRows.filter(record =>
      activeFilters.every(filter => {
        const actual = record[filter.column];
        const expected = filter.value;

        if (filter.operator === "equals") {
          return actual.toLowerCase() === expected.toLowerCase();
        }

        if (filter.operator === "contains") {
          return actual.toLowerCase().includes(expected.toLowerCase());
        }

        const actualNumber = Number(actual);
        const expectedNumber = Number(expected);

        if (
          actual.trim() === "" ||
          expected === "" ||
          !Number.isFinite(actualNumber) ||
          !Number.isFinite(expectedNumber)
        ) {
          return false;
        }

        if (filter.operator === "greater") {
          return actualNumber > expectedNumber;
        }

        if (filter.operator === "less") {
          return actualNumber < expectedNumber;
        }

        return false;
      })
    );

    const selectedColumns = getSelectedColumns();

    renderTable(
      document.getElementById("resultTable"),
      selectedColumns,
      filteredRows
    );

    document.getElementById("resultInfo").textContent =
      `${filteredRows.length} of ${originalRows.length} rows match your filters.`;

    document.getElementById("resultPanel").hidden = false;

    showMessage(
      document.getElementById("queryMsg"),
      "Filters applied successfully.",
      "ok"
    );
  } catch (error) {
    showMessage(
      document.getElementById("queryMsg"),
      error.message,
      "error"
    );
  }
});

// Export filtered results to CSV.
document.getElementById("exportBtn").addEventListener("click", () => {
  const columns = getSelectedColumns();

  if (columns.length === 0) {
    showMessage(
      document.getElementById("exportMsg"),
      "Select at least one column before exporting.",
      "error"
    );
    return;
  }

  function escapeCSV(value) {
    let text = String(value ?? "");

    // Reduce the risk of spreadsheet formula injection.
    if (/^[\s\u0000-\u001F]*[=+\-@]/.test(text)) {
      text = "'" + text;
    }

    return `"${text.replace(/"/g, '""')}"`;
  }

  const lines = [
    columns.map(escapeCSV).join(","),
    ...filteredRows.map(row =>
      columns.map(column => escapeCSV(row[column])).join(",")
    )
  ];

  const blob = new Blob(
    ["\uFEFF" + lines.join("\r\n")],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "analytics-results.csv";
  link.click();

  URL.revokeObjectURL(url);

  showMessage(
    document.getElementById("exportMsg"),
    "Your CSV export has started.",
    "ok"
  );
});

// Draw a chart from the filtered dataset.
document.getElementById("chartBtn").addEventListener("click", () => {
  const groupColumn = document.getElementById("groupBy").value;
  const valueColumn = document.getElementById("valueCol").value;
  const aggregation = document.getElementById("agg").value;
  const chartType = document.getElementById("chartType").value;

  if (!filteredRows.length) {
    showMessage(
      document.getElementById("chartMsg"),
      "There are no rows to chart.",
      "error"
    );
    return;
  }

  const groups = new Map();

  filteredRows.forEach(row => {
    const key = row[groupColumn] || "(blank)";

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(row[valueColumn]);
  });

  const labels = [...groups.keys()];
  const values = labels.map(label => {
    const items = groups.get(label);

    if (aggregation === "count") {
      return items.length;
    }

    const numbers = items
      .filter(value => value.trim() !== "")
      .map(Number)
      .filter(Number.isFinite);

    if (!numbers.length) return 0;

    if (aggregation === "sum") {
      return numbers.reduce((total, number) => total + number, 0);
    }

    return numbers.reduce((total, number) => total + number, 0)
      / numbers.length;
  });

  if (aggregation !== "count" && !values.some(Number.isFinite)) {
    showMessage(
      document.getElementById("chartMsg"),
      "The selected column has no usable numbers.",
      "error"
    );
    return;
  }

  const canvas = document.getElementById("chart");

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(canvas, {
    type: chartType,
    data: {
      labels,
      datasets: [{
        label: `${aggregation} of ${valueColumn}`,
        data: values,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: chartType === "pie" }
      }
    }
  });

  showMessage(
    document.getElementById("chartMsg"),
    "Chart created successfully.",
    "ok"
  );
});