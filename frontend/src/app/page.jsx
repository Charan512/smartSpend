"use client";

import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import AuthPanel from "../components/AuthPanel";
import { SummaryCards } from "../components/DashboardCards";
import { SpendingByCategory, ExpenseForecast } from "../components/Charts";
import { QuickExpenseForm, GoalForm } from "../components/Forms";
import ImportCSV from "../components/ImportCSV";
import ReceiptUploader from "../components/ReceiptUploader";
import SmartChat from "../components/SmartChat";
import BudgetOptimizer from "../components/BudgetOptimizer";
import GoalsPanel from "../components/GoalsPanel";
import ExpenseHistory from "../components/ExpenseHistory";
import { LogOut, RefreshCw } from "lucide-react";

export default function App() {
  const [userId, setUserId] = useState(null);
  const [email, setEmail] = useState("");
  const [summary, setSummary] = useState({});
  const [forecast, setForecast] = useState({ history: [], forecast: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load summary + forecast in parallel
  const loadDashboard = useCallback(async (uid) => {
    try {
      setLoading(true);
      setError("");
      const [summaryRes, forecastRes] = await Promise.all([
        api.get(`/monthly_summary/${uid}`),
        api.get(`/forecast_expenses/${uid}`)
      ]);
      setSummary(summaryRes.data);
      setForecast(forecastRes.data);
    } catch (e) {
      console.error("Failed to fetch dashboard data:", e);
      setError("Failed to load dashboard. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize from local storage
  useEffect(() => {
    const storedId = localStorage.getItem("userId");
    const storedEmail = localStorage.getItem("email");
    if (storedId) {
      setUserId(storedId);
      setEmail(storedEmail || "");
      loadDashboard(storedId);
    } else {
      setLoading(false);
    }
  }, [loadDashboard]);

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("email");
    localStorage.removeItem("monthly_budget");
    localStorage.removeItem("token");
    setUserId(null);
    setEmail("");
    setSummary({});
    setForecast({ history: [], forecast: [] });
  };

  const handleDataUpdate = () => {
    if (userId) {
      loadDashboard(userId);
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <AuthPanel onAuth={(id) => {
          setUserId(id);
          setEmail(localStorage.getItem("email") || "");
          loadDashboard(id);
        }} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl font-semibold text-gray-600 animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-12">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b px-8 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-lg">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
            Smart Spend
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-sm text-gray-600">
            Logged in as <span className="font-semibold">{email}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-600 hover:text-red-800 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-red-50"
            aria-label="Logout"
          >
            <LogOut size={18} /> <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 space-y-8 mt-4">
        {/* Error Banner */}
        {error && (
          <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
            <span className="text-sm font-medium">{error}</span>
            <button
              onClick={handleDataUpdate}
              className="flex items-center gap-1 text-sm font-semibold text-red-700 hover:text-red-900 transition-colors"
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {/* Top Summary Cards */}
        <SummaryCards summary={summary} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Forms & Uploader */}
          <div className="space-y-8">
            <QuickExpenseForm userId={userId} onSave={handleDataUpdate} />
            <ReceiptUploader userId={userId} onUploadSuccess={handleDataUpdate} />
            <GoalForm userId={userId} onSave={handleDataUpdate} />
            <ImportCSV userId={userId} onImport={handleDataUpdate} />
          </div>

          {/* Middle Column: Charts & Analysis */}
          <div className="space-y-8 lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <SpendingByCategory data={summary.categories} userId={userId} />
              <ExpenseForecast data={forecast} />
            </div>

            <GoalsPanel userId={userId} summary={summary} />
            <ExpenseHistory userId={userId} />
            
            <BudgetOptimizer userId={userId} />

            {/* Smart Chat Section */}
            <div className="h-[500px]">
              <SmartChat userId={userId} onNewExpense={handleDataUpdate} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
