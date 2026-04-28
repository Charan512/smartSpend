import { useState } from "react";
import api from "../lib/api";
import { PlusCircle, Target } from "lucide-react";

export function QuickExpenseForm({ userId, onSave }) {
  const [form, setForm] = useState({ amount: "", category: "", description: "", merchant: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.amount || !form.category) {
      setError("Amount and category are required");
      return;
    }

    if (Number(form.amount) <= 0) {
      setError("Amount must be greater than 0");
      return;
    }

    setLoading(true);
    try {
      await api.post(`/expense/quick`, {
        user_id: userId,
        ...form,
        amount: parseFloat(form.amount)
      });
      setForm({ amount: "", category: "", description: "", merchant: "" });
      onSave();
    } catch (err) {
      console.error("Failed to save expense:", err);
      setError("Failed to save expense. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      <h3 className="font-bold text-blue-600 mb-4 flex items-center gap-2">
        <PlusCircle size={20} aria-label="Add expense icon" /> Quick Add Expense
      </h3>
      <form onSubmit={handleFormSubmit} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="number"
            placeholder="Amount *"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            min="0.01"
            step="0.01"
          />
          <input
            type="text"
            placeholder="Category *"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <input
          type="text"
          placeholder="Merchant (optional)"
          value={form.merchant}
          onChange={(e) => setForm({ ...form, merchant: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {loading ? "Saving..." : "Save Expense"}
        </button>
      </form>
    </div>
  );
}

export function GoalForm({ userId, onSave }) {
  const [goalForm, setGoalForm] = useState({ category: "", target_amount: "", period: "monthly" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoalSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!goalForm.category || !goalForm.target_amount) {
      setError("Category and target amount are required");
      return;
    }

    if (Number(goalForm.target_amount) <= 0) {
      setError("Target amount must be greater than 0");
      return;
    }

    setLoading(true);
    try {
      await api.post(`/goals`, {
        user_id: userId,
        ...goalForm,
        target_amount: Number(goalForm.target_amount)
      });
      setGoalForm({ category: "", target_amount: "", period: "monthly" });
      onSave();
    } catch (err) {
      console.error("Failed to save goal:", err);
      setError("Failed to save goal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      <h3 className="font-bold text-green-600 mb-4 flex items-center gap-2">
        <Target size={20} aria-label="Target icon" /> Set Budget Goal
      </h3>
      <form onSubmit={handleGoalSubmit} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Category *"
            value={goalForm.category}
            onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
          <input
            type="number"
            placeholder="Target Amount *"
            value={goalForm.target_amount}
            onChange={(e) => setGoalForm({ ...goalForm, target_amount: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            required
            min="0.01"
            step="0.01"
          />
        </div>
        <select
          value={goalForm.period}
          onChange={(e) => setGoalForm({ ...goalForm, period: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
        >
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
        </select>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-semibold disabled:bg-green-400 disabled:cursor-not-allowed"
        >
          {loading ? "Saving..." : "Save Goal"}
        </button>
      </form>
    </div>
  );
}
