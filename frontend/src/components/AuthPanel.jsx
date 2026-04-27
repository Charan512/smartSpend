import { useState } from "react";
import api from "../lib/api";

export default function AuthPanel({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let payload = { email, password };
      let url = `/${mode}`;

      if (mode === "register") {
        if (!name.trim() || !budget || Number(budget) <= 0) {
          setError("Please provide a valid name and budget");
          setLoading(false);
          return;
        }
        payload = { name: name.trim(), email, password, monthly_budget: Number(budget) };
      }

      const res = await api.post(url, payload);
      if (res.data?.user_id) {
        localStorage.setItem("userId", res.data.user_id);
        localStorage.setItem("email", res.data.email);
        if (res.data.monthly_budget !== undefined) {
          localStorage.setItem("monthly_budget", res.data.monthly_budget);
        }
        if (res.data.access_token) {
          localStorage.setItem("token", res.data.access_token);
        }
        onAuth(res.data.user_id);
      } else {
        setError("Failed to authenticate user.");
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError(err.response?.data?.detail || "Login/Register failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-white rounded-xl shadow-lg max-w-md w-full border border-gray-200">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        {mode === "login" ? "Welcome Back" : "Create Your Account"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "register" && (
          <>
            <div>
              <input
                type="text"
                placeholder="Name"
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <input
                type="number"
                placeholder="Monthly Budget (e.g., 40000)"
                min="1"
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                required
              />
            </div>
          </>
        )}
        <div>
          <input
            type="email"
            placeholder="Email"
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="Password"
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {loading ? "Processing..." : mode === "login" ? "Login" : "Register"}
        </button>
      </form>
      <p
        onClick={() => { if (!loading) setMode(mode === "login" ? "register" : "login"); }}
        className={`mt-6 text-sm text-blue-600 text-center cursor-pointer hover:underline ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {mode === "login" ? "New here? Create an account" : "Already have an account? Login"}
      </p>
    </div>
  );
}
