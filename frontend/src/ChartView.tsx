import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

type ChartPoint = { label: string; value: number }
type ChartViewProps = { data: ChartPoint[]; type: 'bar' | 'line'; measureLabel: string }

function ChartView({ data, type, measureLabel }: ChartViewProps) {
  const axes = <><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ece9" /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#76817b', fontSize: 11 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: '#76817b', fontSize: 11 }} /><Tooltip /></>
  return <div className="chart-area"><ResponsiveContainer width="100%" height="100%">
    {type === 'bar'
      ? <BarChart data={data} margin={{ top: 10, right: 10, left: -18, bottom: 8 }}>{axes}<Bar dataKey="value" name={measureLabel} fill="#28765a" radius={[5, 5, 0, 0]} /></BarChart>
      : <LineChart data={data} margin={{ top: 10, right: 10, left: -18, bottom: 8 }}>{axes}<Line type="monotone" dataKey="value" name={measureLabel} stroke="#28765a" strokeWidth={2.5} dot={{ fill: '#28765a', r: 3 }} /></LineChart>}
  </ResponsiveContainer></div>
}

export default ChartView
