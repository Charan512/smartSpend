// API and WebSocket base URLs are loaded from environment variables.
// These should be set in .env.local for local development.
let ws_url = process.env.NEXT_PUBLIC_WS_URL;

// Safety check: Upgrade ws:// to wss:// if we are in production
if (ws_url && typeof window !== 'undefined' && window.location.protocol === 'https:' && ws_url.startsWith('ws://')) {
  ws_url = ws_url.replace('ws://', 'wss://');
}

export const API_BASE = process.env.NEXT_PUBLIC_API_URL;
export const WS_BASE = ws_url;

if (!API_BASE || !WS_BASE) {
  console.warn(
    "Missing NEXT_PUBLIC_API_URL or NEXT_PUBLIC_WS_URL environment variables."
  );
}
