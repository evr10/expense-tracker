import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  TrendingUp, Download, Upload, 
  Trash2, AlertCircle, Calendar, Info, LayoutDashboard, ListFilter,
  ArrowRight
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import Papa from 'papaparse';

// --- TYPES & CONSTANTS ---
interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  account: string;
}

const CATEGORIES = [
  'Groceries', 'Rent', 'Utilities', 'Transportation', 'Entertainment',
  'Healthcare', 'Shopping', 'Dining', 'Travel', 'Subscriptions',
  'Income', 'Transfer', 'Other'
];

const YEAR_COLORS: Record<number, string> = {
  2025: '#6366f1', 2024: '#f43f5e', 2023: '#10b981', 
  2022: '#f59e0b', 2021: '#8b5cf6', 2020: '#06b6d4'
};
const DEFAULT_YEAR_COLOR = '#94a3b8';

// --- UTILITIES ---
const getDayOfYear = (date: Date): number => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const getMonthName = (monthIndex: number): string => 
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthIndex];

const getBoxPlotData = (data: number[]) => {
  if (data.length === 0) return { min: 0, q1: 0, median: 0, q3: 0, max: 0 };
  const sorted = [...data].sort((a, b) => a - b);
  return {
    min: sorted[0],
    q1: sorted[Math.floor(sorted.length / 4)],
    median: sorted[Math.floor(sorted.length / 2)],
    q3: sorted[Math.floor((sorted.length * 3) / 4)],
    max: sorted[sorted.length - 1]
  };
};

// --- CHART COMPONENTS ---

const SeasonalityChart = ({ expenses, years }: { expenses: Expense[], years: number[] }) => {
  const data = useMemo(() => Array.from({ length: 12 }, (_, m) => {
    const entry: any = { month: getMonthName(m) };
    years.forEach(y => {
      const total = expenses
        .filter(e => { 
          const d = new Date(e.date); 
          return d.getFullYear() === y && d.getMonth() === m; 
        })
        .reduce((sum, e) => sum + e.amount, 0);
      entry[y] = parseFloat(total.toFixed(2));
    });
    return entry;
  }), [expenses, years]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={v => `$${v}`} />
        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: 20, fontSize: 10, fontWeight: 900 }} />
        {years.map(y => <Line key={y} type="monotone" dataKey={y} stroke={YEAR_COLORS[y] || DEFAULT_YEAR_COLOR} strokeWidth={3} dot={{ r: 3, strokeWidth: 2, fill: 'white' }} />)}
      </LineChart>
    </ResponsiveContainer>
  );
};

const PaceOfSpendingChart = ({ expenses, years }: { expenses: Expense[], years: number[] }) => {
  const data = useMemo(() => {
    const yearCumulative: Record<number, number[]> = {};
    years.forEach(y => {
      const arr = new Array(367).fill(0);
      expenses.filter(e => new Date(e.date).getFullYear() === y).forEach(e => { 
        const day = getDayOfYear(new Date(e.date));
        if (day >= 0 && day <= 366) arr[day] += e.amount; 
      });
      let curr = 0;
      for (let i = 0; i <= 366; i++) { curr += arr[i]; arr[i] = curr; }
      yearCumulative[y] = arr;
    });
    return Array.from({ length: 74 }, (_, i) => {
      const d = i * 5;
      const entry: any = { day: d };
      years.forEach(y => { entry[y] = parseFloat(yearCumulative[y][d]?.toFixed(0) || '0'); });
      return entry;
    });
  }, [expenses, years]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
        <Tooltip labelFormatter={v => `Day ${v}`} />
        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: 20, fontSize: 10, fontWeight: 900 }} />
        {years.map(y => <Line key={y} type="monotone" dataKey={y} stroke={YEAR_COLORS[y] || DEFAULT_YEAR_COLOR} strokeWidth={3} dot={false} />)}
      </LineChart>
    </ResponsiveContainer>
  );
};

const CategoryComparisonChart = ({ expenses, years }: { expenses: Expense[], years: number[] }) => {
  const data = useMemo(() => {
    const currentYear = years[0];
    return CATEGORIES.map(cat => {
      const entry: any = { category: cat };
      years.forEach(y => { 
        entry[y] = parseFloat(expenses.filter(e => e.category === cat && new Date(e.date).getFullYear() === y).reduce((s, e) => s + e.amount, 0).toFixed(2)); 
      });
      return entry;
    }).filter(d => years.some(y => d[y] > 0)).sort((a, b) => (b[currentYear] || 0) - (a[currentYear] || 0));
  }, [expenses, years]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" barGap={4}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
        <YAxis dataKey="category" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#475569' }} width={100} />
        <Tooltip cursor={{ fill: '#f8fafc' }} />
        <Legend verticalAlign="top" align="right" iconType="square" wrapperStyle={{ paddingBottom: 20, fontSize: 10, fontWeight: 900 }} />
        {years.map(y => <Bar key={y} dataKey={y} fill={YEAR_COLORS[y] || DEFAULT_YEAR_COLOR} radius={[0, 4, 4, 0]} barSize={12} />)}
      </BarChart>
    </ResponsiveContainer>
  );
};

const HeatmapTable = ({ expenses, years }: { expenses: Expense[], years: number[] }) => {
  const months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const { gridData, maxVal } = useMemo(() => {
    const data: Record<number, Record<number, number>> = {};
    let globalMax = 0;
    years.forEach(y => {
      data[y] = {};
      months.forEach(m => {
        const t = expenses.filter(e => { const d = new Date(e.date); return d.getFullYear() === y && d.getMonth() === m; }).reduce((s, e) => s + e.amount, 0);
        data[y][m] = t; if (t > globalMax) globalMax = t;
      });
    });
    return { gridData: data, maxVal: globalMax };
  }, [expenses, years]);

  const getColor = (v: number) => {
    if (v === 0) return 'bg-slate-50 text-slate-300';
    const ratio = maxVal > 0 ? v / maxVal : 0;
    if (ratio < 0.2) return 'bg-emerald-50 text-emerald-700';
    if (ratio < 0.4) return 'bg-amber-100 text-amber-800';
    if (ratio < 0.7) return 'bg-orange-300 text-orange-900';
    return 'bg-red-500 text-white';
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <table className="w-full border-collapse">
        <thead className="bg-slate-50">
          <tr>
            <th className="p-3 text-[10px] font-black text-slate-400 border-b border-r border-slate-100 uppercase sticky left-0 bg-slate-50 z-20">Year</th>
            {months.map(m => <th key={m} className="p-3 text-[10px] font-black text-slate-400 border-b border-slate-100 uppercase">{getMonthName(m)}</th>)}
          </tr>
        </thead>
        <tbody>
          {years.map(y => (
            <tr key={y}>
              <td className="p-3 text-xs font-black text-slate-600 border-b border-r border-slate-100 text-center sticky left-0 bg-white z-10">{y}</td>
              {months.map(m => (
                <td key={m} className={`p-3 border-b border-slate-100 text-center text-[10px] font-black heatmap-cell ${getColor(gridData[y][m])}`}>
                  {gridData[y][m] > 0 ? `$${(gridData[y][m]/1000).toFixed(1)}k` : '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TransactionBoxPlot = ({ expenses, years }: { expenses: Expense[], years: number[] }) => {
  const data = useMemo(() => years.map(y => ({ 
    year: y, 
    ...getBoxPlotData(expenses.filter(e => new Date(e.date).getFullYear() === y).map(e => e.amount)) 
  })), [expenses, years]);
  
  const max = Math.max(...data.map(d => d.max), 1);
  const getY = (v: number) => 100 - (v / max) * 100;

  return (
    <div className="h-full flex flex-col pt-8">
      <div className="flex-1 relative border-l border-slate-100 ml-10 mr-4">
        <div className="absolute inset-0 flex justify-around items-end pb-8">
          {data.map(d => (
            <div key={d.year} className="flex flex-col items-center flex-1 h-full relative group">
              <div className="absolute left-1/2 -translate-x-1/2 w-0.5 bg-slate-200" style={{ top: `${getY(d.max)}%`, bottom: `${100 - getY(d.min)}%` }} />
              <div className="absolute left-1/4 right-1/4 rounded shadow-sm opacity-90 transition-all" style={{ top: `${getY(d.q3)}%`, bottom: `${100 - getY(d.q1)}%`, backgroundColor: YEAR_COLORS[d.year] || DEFAULT_YEAR_COLOR }} />
              <div className="absolute left-1/4 right-1/4 h-1 bg-white opacity-60" style={{ top: `${getY(d.median)}%` }} />
              <div className="absolute -bottom-6 text-[10px] font-black text-slate-500">{d.year}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="text-[9px] font-black text-slate-300 uppercase text-center mt-8 tracking-widest">Transaction Distribution</div>
    </div>
  );
};

// --- MAIN APP ---
const App: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tab, setTab] = useState<'dash' | 'list'>('dash');
  const [importing, setImporting] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('yoy_finance_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setExpenses(parsed);
      } catch (e) { console.error("Persistence Load Error", e); }
    }
  }, []);

  useEffect(() => { localStorage.setItem('yoy_finance_v2', JSON.stringify(expenses)); }, [expenses]);

  const years = useMemo(() => Array.from(new Set(expenses.map(e => new Date(e.date).getFullYear()))).sort((a, b) => b - a), [expenses]);

  const handleCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    Papa.parse(file, { header: true, skipEmptyLines: true, complete: res => setImporting(res) });
    e.target.value = '';
  };

  const finishImport = (mapping: any) => {
    const newEx = importing.data.map((row: any, i: number) => {
      const rawAmt = String(row[mapping.amount] || '0').replace(/[^\d.-]/g, '');
      return {
        id: `txn-${Date.now()}-${i}`,
        date: row[mapping.date] || new Date().toISOString().split('T')[0],
        description: row[mapping.description] || 'No Desc',
        amount: Math.abs(parseFloat(rawAmt)) || 0,
        category: row[mapping.category] || 'Other',
        account: 'Imported'
      };
    }).filter((e: Expense) => e.amount > 0);
    setExpenses(p => [...p, ...newEx]);
    setImporting(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg"><TrendingUp size={20} /></div>
          <h1 className="font-black text-slate-800 tracking-tight text-lg">YoY<span className="text-indigo-600">Finance</span></h1>
        </div>
        <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-black rounded-xl cursor-pointer hover:bg-indigo-700 shadow-md">
          <Upload size={14} /> IMPORT CSV <input type="file" className="hidden" accept=".csv" onChange={handleCsv} />
        </label>
      </nav>

      <div className="bg-white border-b border-slate-200 flex px-8 gap-8">
        <button onClick={() => setTab('dash')} className={`h-12 text-xs font-black border-b-2 flex items-center gap-2 ${tab === 'dash' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}>
          <LayoutDashboard size={14} /> DASHBOARD
        </button>
        <button onClick={() => setTab('list')} className={`h-12 text-xs font-black border-b-2 flex items-center gap-2 ${tab === 'list' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}>
          <ListFilter size={14} /> DATA LIST
        </button>
      </div>

      <main className="flex-1 p-6 max-w-[1600px] mx-auto w-full">
        {expenses.length === 0 ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-slate-300">
            <Info size={40} className="mb-4" />
            <p className="font-black text-slate-500">No data found. Please import a CSV statement.</p>
          </div>
        ) : tab === 'dash' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm h-[400px]">
                <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2"><Calendar size={14} className="text-indigo-500" /> Seasonality Comparison</h3>
                <SeasonalityChart expenses={expenses} years={years} />
              </div>
              <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm h-[400px]">
                <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2"><TrendingUp size={14} className="text-rose-500" /> Pace of Spending</h3>
                <PaceOfSpendingChart expenses={expenses} years={years} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm min-h-[500px]">
              <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2"><ArrowRight size={14} className="text-emerald-500" /> Inflation vs. Habit Check</h3>
              <CategoryComparisonChart expenses={expenses} years={years} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2"><LayoutDashboard size={14} className="text-amber-500" /> At-A-Glance Intensity</h3>
                <HeatmapTable expenses={expenses} years={years} />
              </div>
              <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm h-[400px]">
                <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2"><AlertCircle size={14} className="text-violet-500" /> Transaction Shift</h3>
                <TransactionBoxPlot expenses={expenses} years={years} />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{expenses.length} Records</span>
              <button onClick={() => confirm("Purge data?") && setExpenses([])} className="text-[10px] font-black text-red-500 px-3 py-1 bg-red-50 rounded-lg">PURGE</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest">
                  <tr><th className="p-4">Date</th><th className="p-4">Merchant</th><th className="p-4">Category</th><th className="p-4 text-right">Amount</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.slice(0, 1000).map(e => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-400">{e.date}</td>
                      <td className="p-4 font-black text-slate-700">{e.description}</td>
                      <td className="p-4"><span className="px-2 py-0.5 bg-slate-100 rounded-full text-[10px] font-black">{e.category}</span></td>
                      <td className="p-4 text-right font-black text-slate-900">${e.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {importing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative bg-white p-8 rounded-[40px] w-full max-w-lg shadow-2xl border border-slate-100">
            <h2 className="text-xl font-black text-slate-800 mb-6">Column Mapping</h2>
            <div className="space-y-4">
              {['date', 'amount', 'description', 'category'].map(field => (
                <div key={field} className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 px-1">{field}</label>
                  <select id={`map-${field}`} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                    defaultValue={importing.meta.fields.find((f: string) => f.toLowerCase().includes(field)) || importing.meta.fields[0]}>
                    {importing.meta.fields.map((f: string) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="mt-8 flex gap-4">
              <button onClick={() => setImporting(null)} className="flex-1 py-4 font-black text-slate-400 hover:bg-slate-50 rounded-2xl">Cancel</button>
              <button onClick={() => finishImport({
                date: (document.getElementById('map-date') as any).value,
                amount: (document.getElementById('map-amount') as any).value,
                description: (document.getElementById('map-description') as any).value,
                category: (document.getElementById('map-category') as any).value,
              })} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">Import</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);