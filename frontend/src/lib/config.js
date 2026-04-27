// API and WebSocket base URLs are loaded from environment variables.
// These should be set in .env.local for local development.
export const API_BASE = process.env.NEXT_PUBLIC_API_URL;
export const WS_BASE = process.env.NEXT_PUBLIC_WS_URL;

if (!API_BASE || !WS_BASE) {
  console.warn(
    "Missing NEXT_PUBLIC_API_URL or NEXT_PUBLIC_WS_URL environment variables. " +
    "Please ensure your .env.local file is configured."
  );
}
