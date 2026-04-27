import { useState, useEffect, useRef, useCallback } from "react";
import { Bot, User, Send } from "lucide-react";
import { WS_BASE } from "../lib/config";

export default function SmartChat({ userId, onNewExpense }) {
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

  // WebSocket reconnection logic
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second

  const connectWebSocket = useCallback(() => {
    if (!userId) return;

    console.log("Starting WebSocket connection...");
    const token = localStorage.getItem("token");
    const wsUrl = `${WS_BASE}/ws/chat/${userId}${token ? `?token=${token}` : ''}`;
    const socket = new WebSocket(wsUrl);
    ws.current = socket;

    socket.onopen = () => {
      setStatus("Connected");
      reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
    };

    socket.onclose = () => {
      setStatus("Disconnected");

      // Attempt to reconnect with exponential backoff
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
        setStatus(`Reconnecting in ${delay / 1000}s...`);

        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current += 1;
          console.log(`Reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
          connectWebSocket();
        }, delay);
      } else {
        setStatus("Connection failed. Please reload the page.");
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
      setStatus("Connection error");
    };

    socket.onmessage = (event) => {
      try {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          // If it's not JSON, treat as a regular message
          setMessages(prev => [...prev, { sender: 'bot', text: event.data }]);
          setLoading(false);
          return;
        }

        if (data.type === "history") {
          // data.data comes desc (newest first) — reverse to chronological, then flatten pairs
          const chronological = [...data.data].reverse();
          const historyMessages = chronological.flatMap(item => [
            { sender: 'user', text: item.message },
            { sender: 'bot', text: item.response }
          ]);
          setMessages(historyMessages);
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
        setLoading(false);
      } catch (err) {
        console.error("Failed to handle WebSocket message:", err, "Raw data:", event.data);
        setMessages(prev => [...prev, { sender: 'bot', text: "Error processing message" }]);
        setLoading(false);
      }
    };

    return socket;
  }, [userId]);

  useEffect(() => {
    const socket = connectWebSocket();

    return () => {
      // Clear reconnection timeout on cleanup
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [connectWebSocket]);

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
      // Fix: don't clear loading state arbitrarily here with setTimeout
      // it should be cleared when the websocket responds
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
          <span className={`h-2 w-2 rounded-full ${status === 'Connected' ? 'bg-green-500 animate-pulse' :
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
                  <Bot size={18} className="text-gray-600" />
                </div>
              )}
              <div className={`max-w-xs px-4 py-2 rounded-lg shadow-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}>
                {msg.text}
              </div>
              {msg.sender === 'user' && (
                <div className="bg-gray-200 p-2 rounded-full" aria-label="You">
                  <User size={18} className="text-gray-600" />
                </div>
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="flex items-start gap-3 my-4">
            <div className="bg-gray-200 p-2 rounded-full">
              <Bot size={18} className="text-gray-600" />
            </div>
            <div className="bg-gray-100 text-gray-800 rounded-lg rounded-bl-none px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
