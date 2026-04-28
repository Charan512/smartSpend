import { ArrowUpRight } from "lucide-react";

export function SummaryCards({ summary }) {
  const budget = summary.monthly_budget ?? 0;
  const spent = summary.total ?? 0;
  const remaining = budget - spent;
  const usagePercent = budget > 0 ? (spent / budget) * 100 : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card title="Total Spent (This Month)" value={`₹${spent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} icon={<ArrowUpRight className="text-red-500" aria-label="Spent icon" />} />
      <Card title="Monthly Budget" value={`₹${budget.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} />
      <Card
        title="Remaining"
        value={`₹${remaining.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
        color={remaining < 0 ? 'text-red-500' : 'text-green-600'}
      />
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-500 mb-2">Budget Usage</h4>
        <div className="text-2xl sm:text-3xl font-bold text-gray-900 truncate" title={`${usagePercent.toFixed(1)}%`}>
          {usagePercent.toFixed(1)}%
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${usagePercent > 90 ? 'bg-red-500' :
              usagePercent > 75 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

export function Card({ title, value, icon = null, color = 'text-gray-900' }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 min-w-0">
      <h4 className="text-sm font-medium text-gray-500 mb-2 truncate" title={title}>{title}</h4>
      <div className={`text-2xl sm:text-3xl font-bold ${color} flex items-center gap-2 overflow-hidden`}>
        <span className="truncate" title={value}>{value}</span> {icon}
      </div>
    </div>
  );
}
