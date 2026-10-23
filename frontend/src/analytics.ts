export type DataRow = Record<string, string>
export type FilterOperator = 'contains' | 'equals' | 'greater' | 'less'
export type Aggregation = 'sum' | 'average'
export type ChartPoint = { label: string; value: number }

export function createHeaderTransformer() {
  const usedHeaders = new Set<string>()
  const warnings: string[] = []

  function transform(header: string, index: number) {
    const original = header.trim() || `Column ${index + 1}`
    let normalized = original
    let suffix = 2
    while (usedHeaders.has(normalized)) normalized = `${original} (${suffix++})`
    usedHeaders.add(normalized)
    if (normalized !== header) warnings.push(`Column ${index + 1} was renamed to “${normalized}”.`)
    return normalized
  }

  return { transform, warnings }
}

export function inferNumericColumns(columns: string[], rows: DataRow[]) {
  return columns.filter((column) => {
    const values = rows.map((row) => row[column]).filter((value) => value?.trim() !== '')
    return values.length > 0 && values.every((value) => Number.isFinite(Number(value)))
  })
}

export function filterRows(
  rows: DataRow[],
  search: string,
  filterColumn: string,
  filterOperator: FilterOperator,
  filterValue: string,
  numericColumns: string[],
) {
  const query = search.trim().toLowerCase()
  return rows.filter((row) => {
    const matchesSearch = !query || Object.values(row).some((value) => value?.toLowerCase().includes(query))
    if (!matchesSearch || !filterColumn || !filterValue.trim()) return matchesSearch
    const cell = row[filterColumn] ?? ''
    const value = filterValue.trim()
    if (numericColumns.includes(filterColumn)) {
      if (cell.trim() === '') return false
      const number = Number(cell)
      const target = Number(value)
      if (!Number.isFinite(number) || !Number.isFinite(target)) return false
      if (filterOperator === 'greater') return number > target
      if (filterOperator === 'less') return number < target
      return number === target
    }
    if (filterOperator === 'equals') return cell.toLowerCase() === value.toLowerCase()
    return cell.toLowerCase().includes(value.toLowerCase())
  })
}

export function groupRows(rows: DataRow[], groupColumn: string, valueColumn: string, aggregation: Aggregation): ChartPoint[] {
  const groups = new Map<string, { label: string; total: number; count: number; numericCount: number }>()
  rows.forEach((row) => {
    const label = row[groupColumn] || '(blank)'
    const group = groups.get(label) ?? { label, total: 0, count: 0, numericCount: 0 }
    group.count += 1
    const numericValue = Number(row[valueColumn])
    if (valueColumn && row[valueColumn]?.trim() !== '' && Number.isFinite(numericValue)) {
      group.total += numericValue
      group.numericCount += 1
    }
    groups.set(label, group)
  })
  return Array.from(groups.values()).map((group) => ({
    label: group.label,
    value: valueColumn
      ? (aggregation === 'average' ? (group.numericCount ? group.total / group.numericCount : 0) : group.total)
      : group.count,
  }))
}

export function escapeFormulaValue(value: string) {
  const formulaPrefix = /^[\t\r\n ]*[=+@]/.test(value)
    || (/^[\t\r\n ]*-/.test(value) && !Number.isFinite(Number(value)))
  return formulaPrefix ? `'${value}` : value
}
