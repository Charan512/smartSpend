import { useState } from "react";
import api from "../lib/api";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, CartesianGrid, XAxis, YAxis, Legend, Line } from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff4d4d'];

export function SpendingByCategory({ data, userId }) {
  const [showAllMonths, setShowAllMonths] = useState(false);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const chartData = Object.entries(data || {}).map(([name, value]) => ({
    name,
    value: parseFloat(value)
  }));

  const fetchMonthlyData = async () => {
    setLoading(true);
    setError("");
    try {
      if (userId) {
        const response = await api.get(`/monthly_history/${userId}`);
        setMonthlyData(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch monthly data:", error);
      setError("Failed to load monthly data");
      setMonthlyData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = async () => {
    await fetchMonthlyData();
    setShowAllMonths(true);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 h-80">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-red-600">Spending by Category</h3>
        <button
          onClick={handleOpenModal}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          View All Months →
        </button>
      </div>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height="90%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `₹${value?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}`} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <p>No expenses recorded this month.</p>
          <p className="text-sm mt-1">Add expenses to see your spending breakdown</p>
        </div>
      )}

      {showAllMonths && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAllMonths(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold text-gray-800">Monthly Spending Overview</h3>
              <button
                onClick={() => setShowAllMonths(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold transition-colors"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {loading ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">Loading monthly data...</div>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <div className="text-red-500">{error}</div>
                </div>
              ) : monthlyData.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {monthlyData.map((month) => {
                    const monthChartData = Object.entries(month.categories || {}).map(([name, value]) => ({
                      name,
                      value: parseFloat(value)
                    }));

                    return (
                      <div key={`${month.year}-${month.month}`} className="text-center border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-semibold text-gray-700 mb-2">
                          {month.month_name} {month.year}
                        </h4>
                        <div className="h-40">
                          {monthChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={monthChartData}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={50}
                                  labelLine={false}
                                >
                                  {monthChartData.map((entry, idx) => (
                                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value) => `₹${value?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}`} />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                              No Expenses
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-2 truncate" title={month.total_spent?.toLocaleString() || '0.00'}>
                          Total: ₹{month.total_spent?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500">No monthly data available</div>
                  <p className="text-sm text-gray-400 mt-2">
                    Your monthly summaries will appear here as you add expenses
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 text-center">
              <p className="text-sm text-gray-600">
                {monthlyData.length} month{monthlyData.length !== 1 ? 's' : ''} with data • Click outside to close
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ExpenseForecast({ data }) {
  const chartData = [...(data.history || []), ...(data.forecast || [])];

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 h-80">
      <h3 className="font-bold text-yellow-600 mb-4">Expense Forecast</h3>
      {chartData.length > 1 ? (
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => `₹${value?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}`} />
            <Legend />
            <Line type="monotone" dataKey="amount" name="History" stroke="#8884d8" strokeWidth={2} />
            <Line type="monotone" dataKey="predicted" name="Forecast" stroke="#82ca9d" strokeWidth={2} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <p>Not enough data to forecast.</p>
          <p className="text-sm mt-1">Add more expenses to see predictions</p>
        </div>
      )}
    </div>
  );
}
