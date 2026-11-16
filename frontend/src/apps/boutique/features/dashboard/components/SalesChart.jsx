import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const numberFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2,
});

function SalesTooltip({ active, payload, label, formatCurrency }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white shadow-lg">
      <p className="mb-1 font-semibold capitalize">{label}</p>
      <p>Ventes : {formatCurrency(payload[0]?.value)}</p>
      <p>Bénéfice : {formatCurrency(payload[1]?.value)}</p>
    </div>
  );
}

export default function SalesChart({ data, formatCurrency }) {
  return (
    <div
      aria-label="Graphique des ventes et bénéfices des sept derniers jours"
      className="h-64 w-full"
      role="img"
    >
      <ResponsiveContainer height="100%" minWidth={0} width="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="salesGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.16} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="profitGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity={0.14} />
              <stop offset="95%" stopColor="#059669" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e8edf4" strokeDasharray="3 3" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="label"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tickFormatter={(value) => `${numberFormat.format(value / 1000)}k`}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickLine={false}
            width={42}
          />
          <Tooltip content={<SalesTooltip formatCurrency={formatCurrency} />} />
          <Area
            activeDot={{ r: 4, strokeWidth: 0 }}
            dataKey="ventes"
            fill="url(#salesGradient)"
            name="Ventes"
            stroke="#2563eb"
            strokeWidth={2}
            type="monotone"
          />
          <Area
            activeDot={{ r: 4, strokeWidth: 0 }}
            dataKey="benefice"
            fill="url(#profitGradient)"
            name="Bénéfice"
            stroke="#059669"
            strokeWidth={2}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
