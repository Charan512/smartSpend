import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import { History, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

const CATEGORY_COLORS = {
  Food: "bg-orange-100 text-orange-700",
  Transport: "bg-blue-100 text-blue-700",
  Shopping: "bg-purple-100 text-purple-700",
  Bills: "bg-red-100 text-red-700",
  Entertainment: "bg-pink-100 text-pink-700",
  Other: "bg-gray-100 text-gray-700",
};

export default function ExpenseHistory({ userId }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 10;

  const fetchExpenses = useCallback(async (pageNum = 1) => {
    if (!userId) return;
    try {
      setLoading(true);
      setError("");
      // Backend returns all; we paginate client-side
      const res = await api.get(`/expenses/${userId}`);
      const all = res.data || [];
      // Sort by date descending (most recent first)
      const sorted = [...all].sort((a, b) => new Date(b.date) - new Date(a.date));
      setTotalPages(Math.max(1, Math.ceil(sorted.length / PAGE_SIZE)));
      const start = (pageNum - 1) * PAGE_SIZE;
      setExpenses(sorted.slice(start, start + PAGE_SIZE));
    } catch (e) {
      console.error("Failed to fetch expenses:", e);
      setError("Could not load expense history.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchExpenses(page);
  }, [fetchExpenses, page]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-blue-700 flex items-center gap-2">
          <History size={20} aria-label="History icon" /> Expense History
        </h3>
        <button
          onClick={() => fetchExpenses(page)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {loading && (
        <p className="text-sm text-gray-500 animate-pulse">Loading expenses...</p>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {!loading && !error && expenses.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-6">
          No expenses yet. Add one using the Quick Add form or chat!
        </p>
      )}

      {!loading && expenses.length > 0 && (
        <>
          <div className="space-y-2">
            {expenses.map((exp) => (
              <div key={exp.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.Other}`}>
                    {exp.category}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-800 truncate max-w-[180px]">
                      {exp.description || exp.merchant || "—"}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(exp.date)}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-red-600">₹{exp.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={() => { const p = Math.max(page - 1, 1); setPage(p); fetchExpenses(p); }}
              disabled={page === 1}
              className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
            <button
              onClick={() => { const p = Math.min(page + 1, totalPages); setPage(p); fetchExpenses(p); }}
              disabled={page === totalPages}
              className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
