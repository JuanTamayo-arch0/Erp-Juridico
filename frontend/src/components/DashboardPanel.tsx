import React, { useEffect, useState, useRef } from 'react';
import client from '../services/httpClient';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function DashboardPanel() {
  const [stats, setStats] = useState<any|null>(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<any>(null);

  const hexToRgba = (hex:string, alpha:number) => {
    const h = hex.replace('#','').trim();
    const bigint = parseInt(h.length===3 ? h.split('').map(c=>c+c).join('') : h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  };

  async function load() {
    setLoading(true);
    try {
      const data = await client.get('/reports/dashboard/');
      setStats(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(()=>{ load(); }, []);

  if (!stats) return (
    <div className="p-4 card">{loading ? 'Cargando dashboard...' : 'No data'}</div>
  );

  const labels = stats.cases_last_30.map((d:any)=>d.date);
  const data = {
    labels,
    datasets: [
      {
        label: 'Casos creados',
        data: stats.cases_last_30.map((d:any)=>d.count),
        fill: true,
        backgroundColor: (context:any) => {
          const chart = context.chart;
          const style = typeof window !== 'undefined' ? getComputedStyle(document.documentElement) : null;
          const base = style?.getPropertyValue('--wm-3')?.trim() || '#3049D9';
          // fallback solid color while chartArea is not yet available during initial layout
          if (!chart || !chart.ctx || !chart.chartArea) return hexToRgba(base, 0.12);
          const top = hexToRgba(base, 0.22);
          const bottom = hexToRgba(base, 0.02);
          const ctx = chart.ctx;
          const gradient = ctx.createLinearGradient(0, chart.chartArea.top, 0, chart.chartArea.bottom);
          gradient.addColorStop(0, top);
          gradient.addColorStop(1, bottom);
          return gradient;
        },
        borderColor: (typeof window !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue('--wm-3') : '#3049D9') || '#3049D9',
        tension: 0.3,
        pointRadius: 2,
        borderWidth: 2,
        hoverRadius: 4,
      }
    ]
  };

  const style = typeof window !== 'undefined' ? getComputedStyle(document.documentElement) : null;
  const tooltipBg = style?.getPropertyValue('--card-surface')?.trim() || 'rgba(255,255,255,0.06)';
  const tooltipText = style?.getPropertyValue('--card-text-color')?.trim() || '#ffffff';
  const tooltipBorder = style?.getPropertyValue('--card-border')?.trim() || 'rgba(255,255,255,0.06)';

  const lineColor = (typeof window !== 'undefined' ? (getComputedStyle(document.documentElement).getPropertyValue('--card-text-color') || '#ffffff') : '#ffffff').trim();
  const gridColor = 'rgba(255,255,255,0.03)';

  const options:any = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: tooltipBg,
        titleColor: tooltipText,
        bodyColor: tooltipText,
        borderColor: tooltipBorder,
        borderWidth: 1,
      }
    },
    elements: {
      line: { borderColor: lineColor, borderWidth: 2, borderJoinStyle: 'round' as const },
      point: { radius: 2 }
    },
    scales: {
      x: { display: false, grid: { color: gridColor } },
      y: { display: false, grid: { color: gridColor } }
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="p-4 card-soft">
        <div className="text-sm muted-dark">Total de casos</div>
        <div className="text-2xl font-semibold">{stats.total_cases}</div>
        <div className="mt-2 text-xs muted-dark">Abiertos: {stats.open_cases} • Cerrados: {stats.closed_cases}</div>
      </div>

      <div className="p-4 card-soft">
        <div className="text-sm muted-dark">Casos (últimos 30 días)</div>
        <div className="mt-2">
          <div className="text-xl font-semibold">{stats.cases_last_30.reduce((s:number, x:any)=>s + x.count, 0)}</div>
          <div className="mt-2"><Line options={options} data={data} /></div>
        </div>
        <div className="mt-2 text-xs muted-dark">Tendencia de creación de casos</div>
      </div>

      <div className="p-4 card-soft">
        <div className="text-sm muted-dark">Carga próxima</div>
        <div className="text-2xl font-semibold">{stats.upcoming_tasks_next_7}</div>
        <div className="mt-2 text-xs muted-dark">Tareas con vencimiento en 7 días</div>
      </div>

      <div className="col-span-2 p-4 card-soft">
        <div className="text-sm muted-dark">Distribución por tipo de proceso</div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {stats.cases_by_type.map((t:any)=> (
            <div key={t.process_type} className="p-2 border rounded bg-[var(--card-surface)]/60">
              <div className="text-sm muted-dark">{t.process_type || 'Sin tipo'}</div>
              <div className="text-xl font-semibold">{t.count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 card-soft">
        <div className="text-sm muted-dark">Eventos próximos</div>
        <div className="text-2xl font-semibold">{stats.upcoming_events_next_30}</div>
        <div className="mt-2 text-xs muted-dark">Eventos en próximas 30 días</div>
      </div>
    </div>
  );
}
