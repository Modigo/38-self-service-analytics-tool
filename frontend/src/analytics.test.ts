import { describe, expect, it } from 'vitest'
import {
  createHeaderTransformer, escapeFormulaValue, filterRows, groupRows, inferNumericColumns,
  type DataRow,
} from './analytics'

const rows: DataRow[] = [
  { region: 'North', product: 'Notebook', revenue: '100', orders: '2' },
  { region: 'North', product: 'Pen', revenue: '', orders: '3' },
  { region: 'South', product: 'Notebook', revenue: '300', orders: '4' },
]

describe('CSV analytics helpers', () => {
  it('normalizes blank and duplicate headers without collisions', () => {
    const { transform, warnings } = createHeaderTransformer()
    const headers = ['region', 'region', '', 'region (2)'].map(transform)
    expect(headers).toEqual(['region', 'region (2)', 'Column 3', 'region (2) (2)'])
    expect(warnings).toHaveLength(3)
  })

  it('infers only columns whose non-empty values are numeric', () => {
    expect(inferNumericColumns(['region', 'revenue', 'orders'], rows)).toEqual(['revenue', 'orders'])
  })

  it('combines global search with a case-insensitive text contains filter', () => {
    const result = filterRows(rows, 'north', 'product', 'contains', 'NOTE', ['revenue', 'orders'])
    expect(result).toEqual([rows[0]])
  })

  it('compares numeric filters and excludes blank numeric cells', () => {
    const result = filterRows(rows, '', 'revenue', 'greater', '150', ['revenue', 'orders'])
    expect(result).toEqual([rows[2]])
  })

  it('compares text equality without case sensitivity', () => {
    const result = filterRows(rows, '', 'region', 'equals', 'south', ['revenue', 'orders'])
    expect(result).toEqual([rows[2]])
  })

  it('counts rows grouped by category', () => {
    expect(groupRows(rows, 'region', '', 'sum')).toEqual([
      { label: 'North', value: 2 },
      { label: 'South', value: 1 },
    ])
  })

  it('averages only non-empty numeric cells', () => {
    expect(groupRows(rows, 'region', 'revenue', 'average')).toEqual([
      { label: 'North', value: 100 },
      { label: 'South', value: 300 },
    ])
  })

  it('escapes formula-like text but preserves negative numeric values', () => {
    expect(escapeFormulaValue('=1+1')).toBe("'=1+1")
    expect(escapeFormulaValue('  +cmd')).toBe("'  +cmd")
    expect(escapeFormulaValue('-1.25')).toBe('-1.25')
    expect(escapeFormulaValue('-cmd')).toBe("'-cmd")
  })
})
