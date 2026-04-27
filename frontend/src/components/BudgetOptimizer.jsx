import { useState } from "react";
import api from "../lib/api";
import { Settings2 } from "lucide-react";

export default function BudgetOptimizer({ userId }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const runOptimizer = async () => {
    setLoading(true);
    setData(null);
    setError("");

    try {
      const res = await api.get(`/budget/optimize/${userId}`);
      setData(res.data);
    } catch (err) {
      console.error("Optimizer failed:", err);
      setError("Failed to run optimizer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      <h3 className="font-bold text-violet-700 mb-4 flex items-center gap-2">
        <Settings2 size={20} aria-label="Settings icon" /> Smart Budget Optimizer
      </h3>
      <p className="text-sm text-gray-600 mb-4">Analyze your spending and get suggestions to reallocate your budget.</p>

      <button
        onClick={runOptimizer}
        disabled={loading}
        className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-semibold transition-colors"
      >
        {loading ? "Analyzing..." : "Run Optimizer"}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {data && (
        <div className="mt-4 border-t pt-4">
          <h4 className="font-semibold text-gray-800 mb-2">Optimization Summary:</h4>
          <div className="bg-gray-20 text-green-900 p-3 rounded-lg mt-2">
            <pre className="text-sm whitespace-pre-wrap font-sans">
              {data.summary || "No suggestions available."}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
