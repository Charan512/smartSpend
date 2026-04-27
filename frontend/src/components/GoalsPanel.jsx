import { useState, useEffect } from "react";
import api from "../lib/api";
import { Target, RefreshCw } from "lucide-react";

export default function GoalsPanel({ userId, summary }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchGoals = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError("");
      const res = await api.get(`/goals/${userId}`);
      setGoals(res.data);
    } catch (e) {
      console.error("Failed to fetch goals:", e);
      setError("Failed to load goals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const getSpentForCategory = (category) => {
    return summary?.categories?.[category] ?? 0;
  };

  const getProgress = (spent, target) => {
    if (!target || target === 0) return 0;
    return Math.min((spent / target) * 100, 100);
  };

  const getBarColor = (progress) => {
    if (progress >= 100) return "bg-red-500";
    if (progress >= 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-green-700 flex items-center gap-2">
          <Target size={20} aria-label="Goals icon" /> Budget Goals Progress
        </h3>
        <button
          onClick={fetchGoals}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Refresh goals"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {loading && (
        <p className="text-sm text-gray-500 animate-pulse">Loading goals...</p>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {!loading && !error && goals.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          No goals set yet. Use the form above to create a budget goal.
        </p>
      )}

      {!loading && goals.length > 0 && (
        <div className="space-y-4">
          {goals.map((goal) => {
            const spent = getSpentForCategory(goal.category);
            const progress = getProgress(spent, goal.target_amount);
            const remaining = Math.max(goal.target_amount - spent, 0);
            const over = Math.max(spent - goal.target_amount, 0);

            return (
              <div key={goal.id} className="space-y-1">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-gray-700 capitalize">{goal.category}</span>
                  <span className="text-gray-500 text-xs">{goal.period}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>₹{spent.toFixed(2)} spent</span>
                  <span>Target: ₹{goal.target_amount.toFixed(2)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getBarColor(progress)}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs">
                  {over > 0 ? (
                    <span className="text-red-500 font-medium">🚨 ₹{over.toFixed(2)} over budget</span>
                  ) : (
                    <span className="text-green-600">₹{remaining.toFixed(2)} remaining</span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
