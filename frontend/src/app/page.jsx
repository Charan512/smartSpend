"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpRight, Bot, FileUp, LogOut, Send, User, UploadCloud, Target, PlusCircle, Settings2 } from 'lucide-react';
export const dynamic = 'force-dynamic';
const API_BASE = "http://localhost:8000";
const WS_BASE = "ws://localhost:8000";

export default function DashboardPage() {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      setUserId(storedUserId);
    }
    setLoading(false);
  }, []);

  const handleAuth = (id) => {
    setUserId(id);
  };

  const handleLogout = useCallback(() => {
    localStorage.clear();
    setUserId(null);
    window.location.reload();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <AuthPanel onAuth={handleAuth} />
      </div>
    );
  }

  return <DashboardLayout userId={userId} onLogout={handleLogout} />;
}

function AuthPanel({ onAuth }) {
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
      let url = `${API_BASE}/${mode}`;

      if (mode === "register") {
        if (!name.trim() || !budget || Number(budget) <= 0) {
          setError("Please provide a valid name and budget");
          setLoading(false);
          return;
        }
        payload = { name: name.trim(), email, password, monthly_budget: Number(budget) };
      }

      const res = await axios.post(url, payload);
      if (res.data?.user_id) {
        localStorage.setItem("userId", res.data.user_id);
        localStorage.setItem("email", res.data.email);
        if (res.data.monthly_budget !== undefined) {
          localStorage.setItem("monthly_budget", res.data.monthly_budget);
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
      <style>{` input { caret-color: #3b82f6; color: black; } `}</style>
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

function DashboardLayout({ userId, onLogout }) {
  const [summary, setSummary] = useState({ total: 0, categories: {} });
  const [forecast, setForecast] = useState({ history: [], forecast: [] });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const [summaryRes, forecastRes] = await Promise.all([
        axios.get(`${API_BASE}/monthly_summary/${userId}`),
        axios.get(`${API_BASE}/forecast_expenses/${userId}?months=3`),
      ]);
      setSummary(summaryRes.data);
      setForecast(forecastRes.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        input, textarea { 
          caret-color: #3b82f6; 
          color: black;
        }
      `}</style>
      <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Expense Dashboard</h1>
            <p className="text-gray-600">Your financial overview for the month.</p>
          </div>
          <button 
            onClick={onLogout} 
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-red-600 bg-white px-4 py-2 rounded-lg border shadow-sm transition-colors"
          >
            <LogOut size={16} /> Logout
          </button>
        </header>
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex flex-col gap-6">
            <SmartChat userId={userId} onNewExpense={fetchData} />
            <ReceiptUploader userId={userId} onUploadSuccess={fetchData} />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <SummaryCards summary={summary} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SpendingByCategory data={summary.categories} />
              <ExpenseForecast data={forecast} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <QuickExpenseForm userId={userId} onSave={fetchData} />
              <GoalForm userId={userId} onSave={fetchData} />
            </div>
            <BudgetOptimizer userId={userId} />
            <ImportCSV userId={userId} onImport={fetchData} />
          </div>
        </main>
      </div>
    </>
  );
}

function SmartChat({ userId, onNewExpense }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Connecting...");
  const [loading, setLoading] = useState(false);
  const ws = useRef(null);
  const messagesEndRef = useRef(null);

  const onNewExpenseRef = useRef(onNewExpense);
  useEffect(() => {
    onNewExpenseRef.current = onNewExpense;
  }, [onNewExpense]);

  useEffect(() => {
    if (!userId) return;

    console.log("Starting WebSocket connection...");
    ws.current = new WebSocket(`${WS_BASE}/ws/chat/${userId}`);
    const socket = ws.current;
    
    socket.onopen = () => setStatus("Connected");
    socket.onclose = () => setStatus("Disconnected");
    socket.onerror = (err) => {
        console.error("WebSocket error:", err);
        setStatus("Connection failed - will retry");
      };

    socket.onmessage = (event) => {
      try {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          // If it's not JSON, treat as a regular message
          setMessages(prev => [...prev, { sender: 'bot', text: event.data }]);
          return;
        }
        
        if (data.type === "history") {
          const historyMessages = data.data.map(item => [
            { sender: 'user', text: item.message },
            { sender: 'bot', text: item.response }
          ]).flat();
          setMessages(historyMessages.reverse());
        } 
        else if (data.type === "update") {
          setMessages(prev => [...prev, { sender: 'bot', text: data.data }]);
          if (data.is_expense) {
            onNewExpenseRef.current();
          }
        } 
        else if (data.type === "error") {
          setMessages(prev => [...prev, { sender: 'bot', text: `Error: ${data.data}` }]);
        }
      } catch (err) {
        console.error("Failed to handle WebSocket message:", err, "Raw data:", event.data);
        setMessages(prev => [...prev, { sender: 'bot', text: "Error processing message" }]);
      }
    };

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [userId]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    const messageToSend = input.trim();
    if (messageToSend && ws.current?.readyState === WebSocket.OPEN) {
      setLoading(true);
      ws.current.send(messageToSend);
      setMessages(prev => [...prev, { sender: 'user', text: messageToSend }]);
      setInput("");
      setTimeout(() => setLoading(false), 1000);
    } else {
      console.error("Cannot send message, WebSocket is not open.");
      setStatus("Disconnected. Please reload.");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-full flex flex-col min-h-[500px]">
      <div className="p-4 border-b">
        <h3 className="font-bold text-lg text-gray-900">Smart Expense Chat</h3>
        <div className="mt-1 text-xs font-medium flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${
            status === 'Connected' ? 'bg-green-500 animate-pulse' : 
            status === 'Connecting...' ? 'bg-yellow-500' : 'bg-red-500'
          }`}></span>
          {status}
        </div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            Start a conversation about your expenses...
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 my-4 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
              {msg.sender === 'bot' && (
                <div className="bg-gray-200 p-2 rounded-full" aria-label="AI Assistant">
                  <Bot size={18} className="text-gray-600"/>
                </div>
              )}
              <div className={`max-w-xs px-4 py-2 rounded-lg shadow-sm ${
                msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'
              }`}>
                {msg.text}
              </div>
              {msg.sender === 'user' && (
                <div className="bg-gray-200 p-2 rounded-full" aria-label="You">
                  <User size={18} className="text-gray-600"/>
                </div>
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="flex items-start gap-3 my-4">
            <div className="bg-gray-200 p-2 rounded-full">
              <Bot size={18} className="text-gray-600"/>
            </div>
            <div className="bg-gray-100 text-gray-800 rounded-lg rounded-bl-none px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="p-4 border-t flex items-center gap-2">
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g., spent 500 on groceries" 
          className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1" 
          disabled={loading}
        />
        <button 
          type="submit" 
          disabled={!input.trim() || loading}
          className="bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}

function ReceiptUploader({ userId, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("Awaiting receipt...");
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type.startsWith('image/')) {
        setFile(selectedFile);
        setStatus(`Ready to upload: ${selectedFile.name}`);
      } else {
        setStatus("❌ Please select an image file");
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !userId) {
      setStatus("❌ Missing file or user not logged in");
      return;
    }

    setStatus("⏳ Uploading & processing...");
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(`${API_BASE}/upload/receipt?user_id=${userId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setStatus(`✅ Success! Parsed ₹${res.data.amount?.toFixed(2)} for ${res.data.category}`);
      onUploadSuccess();
      setFile(null);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } catch (e) {
      console.error("Upload failed:", e);
      setStatus(`❌ Upload failed: ${e.response?.data?.detail || e.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      <h3 className="font-bold text-violet-600 mb-4 flex items-center gap-2">
        <UploadCloud size={20} aria-label="Upload icon"/> Receipt Uploader
      </h3>
      <div 
        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-gray-50 transition-colors"
        onClick={() => !isUploading && inputRef.current?.click()}
      >
        <input 
          ref={inputRef} 
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleFileChange}
          disabled={isUploading}
        />
        {file ? (
          <p className="text-sm font-medium text-blue-600">{file.name}</p>
        ) : (
          <p className="text-sm text-gray-500">
            {isUploading ? "Processing..." : "Click to select or drag & drop receipt"}
          </p>
        )}
      </div>
      <button 
        onClick={handleUpload} 
        disabled={!file || isUploading}
        className="w-full mt-4 bg-violet-600 text-white py-2.5 rounded-lg hover:bg-violet-700 transition-colors font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {isUploading ? "Processing..." : "Upload & Parse"}
      </button>
      <p className="text-xs text-center mt-2 text-gray-500 min-h-[16px]">{status}</p>
    </div>
  );
}

function SummaryCards({ summary }) {
  const budget = summary.monthly_budget || parseFloat(localStorage.getItem("monthly_budget")) || 0;
  const spent = summary.total || 0;
  const remaining = budget - spent;
  const usagePercent = budget > 0 ? (spent / budget) * 100 : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
      <Card title="Total Spent (This Month)" value={`₹${spent.toFixed(2)}`} icon={<ArrowUpRight className="text-red-500" aria-label="Spent icon"/>} />
      <Card title="Monthly Budget" value={`₹${budget.toFixed(2)}`} />
      <Card 
        title="Remaining" 
        value={`₹${remaining.toFixed(2)}`} 
        color={remaining < 0 ? 'text-red-500' : 'text-green-600'} 
      />
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-500 mb-2">Budget Usage</h4>
        <div className="text-3xl font-bold text-gray-900">{usagePercent.toFixed(1)}%</div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              usagePercent > 90 ? 'bg-red-500' : 
              usagePercent > 75 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, icon = null, color = 'text-gray-900' }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      <h4 className="text-sm font-medium text-gray-500 mb-2">{title}</h4>
      <div className={`text-3xl font-bold ${color} flex items-center gap-2`}>
        {value} {icon}
      </div>
    </div>
  );
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff4d4d'];

function ExpenseForecast({ data }) {
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
            <Tooltip formatter={(value) => `₹${value?.toFixed(2) || '0.00'}`}/>
            <Legend />
            <Line type="monotone" dataKey="amount" name="History" stroke="#8884d8" strokeWidth={2} />
            <Line type="monotone" dataKey="predicted" name="Forecast" stroke="#82ca9d" strokeWidth={2} strokeDasharray="5 5"/>
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

function ImportCSV({ userId, onImport }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      await axios.post(`${API_BASE}/upload/csv?user_id=${userId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      alert("CSV imported successfully!"); 
      onImport();
      setFile(null);
    } catch (error) {
      console.error("CSV import failed:", error); 
      alert("CSV import failed. Please check the file format.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      <h3 className="font-bold text-orange-600 mb-4 flex items-center gap-2">
        <FileUp size={20} aria-label="File upload icon"/> Import from CSV
      </h3>
      <div className="flex items-center gap-4">
        <input 
          type="file" 
          accept=".csv,.txt" 
          onChange={(e) => setFile(e.target.files[0])} 
          className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
          disabled={loading}
        />
        <button 
          onClick={handleUpload} 
          disabled={!file || loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Uploading..." : "Upload"}
        </button>
      </div>
      {file && (
        <p className="text-sm text-gray-600 mt-2">Selected: {file.name}</p>
      )}
    </div>
  );
}

function QuickExpenseForm({ userId, onSave }) {
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
      await axios.post(`${API_BASE}/expense/quick`, { 
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
        <PlusCircle size={20} aria-label="Add expense icon"/> Quick Add Expense
      </h3>
      <form onSubmit={handleFormSubmit} className="space-y-3">
        <div className="flex gap-3">
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

function GoalForm({ userId, onSave }) {
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
      await axios.post(`${API_BASE}/goals`, { 
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
        <Target size={20} aria-label="Target icon"/> Set Budget Goal
      </h3>
      <form onSubmit={handleGoalSubmit} className="space-y-3">
        <div className="flex gap-3">
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

function BudgetOptimizer({ userId }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const runOptimizer = async () => {
    setLoading(true); 
    setData(null);
    setError("");
    
    try {
      const res = await axios.get(`${API_BASE}/budget/optimize/${userId}`);
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
        <Settings2 size={20} aria-label="Settings icon"/> Smart Budget Optimizer
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

function SpendingByCategory({ data }) {
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
      const userId = localStorage.getItem("userId");
      if (userId) {
        const response = await axios.get(`${API_BASE}/monthly_history/${userId}`);
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
            <Tooltip formatter={(value) => `₹${value?.toFixed(2) || '0.00'}`} />
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
                                <Tooltip formatter={(value) => `₹${value?.toFixed(2) || '0.00'}`} />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                              No Expenses
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          Total: ₹{month.total_spent?.toLocaleString() || '0.00'}
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
}// Force dynamic deployment
