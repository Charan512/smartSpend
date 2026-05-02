"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  MessageSquare, 
  Camera, 
  Target, 
  TrendingUp, 
  FileUp, 
  Zap, 
  Wallet,
  ArrowRight,
  PieChart,
  Coins,
  CreditCard,
  Banknote,
  PiggyBank,
  Landmark,
  ShieldCheck,
  CheckCircle2,
  Clock
} from "lucide-react";

const FEATURES = [
  {
    icon: <MessageSquare size={26} strokeWidth={2.5} color="#3B82F6" />,
    color: "blue",
    title: "Smart Chat",
    desc: "Type expenses naturally — 'spent ₹320 on lunch' — and AI logs it instantly.",
    border: "#3B82F6",
    bg: "#EFF6FF",
    tag: "#3B82F6",
  },
  {
    icon: <Camera size={26} strokeWidth={2.5} color="#22C55E" />,
    color: "green",
    title: "Receipt OCR",
    desc: "Snap a receipt photo and watch AI extract every detail automatically.",
    border: "#22C55E",
    bg: "#F0FDF4",
    tag: "#22C55E",
  },
  {
    icon: <Target size={26} strokeWidth={2.5} color="#EAB308" />,
    color: "yellow",
    title: "Budget Goals",
    desc: "Set category spending limits and get real-time progress tracking.",
    border: "#EAB308",
    bg: "#FEFCE8",
    tag: "#EAB308",
  },
  {
    icon: <TrendingUp size={26} strokeWidth={2.5} color="#EF4444" />,
    color: "red",
    title: "Spend Forecasts",
    desc: "AI predicts next month's expenses so you can plan smarter.",
    border: "#EF4444",
    bg: "#FEF2F2",
    tag: "#EF4444",
  },
  {
    icon: <FileUp size={26} strokeWidth={2.5} color="#3B82F6" />,
    color: "blue",
    title: "CSV Import",
    desc: "Bulk-import bank statements and historical expenses in seconds.",
    border: "#3B82F6",
    bg: "#EFF6FF",
    tag: "#3B82F6",
  },
  {
    icon: <Zap size={26} strokeWidth={2.5} color="#22C55E" />,
    color: "green",
    title: "Real-time Updates",
    desc: "WebSocket-powered live dashboard — every change reflects instantly.",
    border: "#22C55E",
    bg: "#F0FDF4",
    tag: "#22C55E",
  },
];

const STEPS = [
  { num: "01", color: "#3B82F6", title: "Create Your Account", desc: "Sign up in under 30 seconds. Set your monthly budget and you're ready." },
  { num: "02", color: "#22C55E", title: "Log Your Expenses", desc: "Chat naturally, scan receipts, or fill a quick form — whatever fits your style." },
  { num: "03", color: "#EAB308", title: "Track & Analyze", desc: "Watch your spending patterns emerge across beautiful charts and summaries." },
  { num: "04", color: "#EF4444", title: "Save More Money", desc: "Follow AI budget suggestions and hit your savings goals every month." },
];

const STATS = [
  { value: "₹2.4L+", label: "Tracked Monthly", color: "#3B82F6" },
  { value: "98%", label: "OCR Accuracy", color: "#22C55E" },
  { value: "6", label: "Smart Categories", color: "#EAB308" },
  { value: "3mo", label: "Expense Forecast", color: "#EF4444" },
];

function FloatingIcon({ style, IconComponent, color }) {
  return (
    <div
      className="absolute select-none pointer-events-none text-gray-200"
      style={{
        animation: "floatUp 6s ease-in-out infinite",
        ...style,
      }}
    >
      <IconComponent size={42} strokeWidth={1.5} color={color || "#CBD5E1"} />
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef(null);

  useEffect(() => {
    // If already logged in, go to dashboard
    if (localStorage.getItem("userId")) {
      router.replace("/dashboard");
      return;
    }
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [router]);

  const goToDashboard = () => router.push("/dashboard");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body { font-family: 'Inter', sans-serif; background: #fff; color: #111; overflow-x: hidden; }

        @keyframes floatUp {
          0%   { transform: translateY(0px) rotate(0deg); opacity: 0.18; }
          50%  { transform: translateY(-28px) rotate(8deg); opacity: 0.28; }
          100% { transform: translateY(0px) rotate(0deg); opacity: 0.18; }
        }

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        @keyframes bounce-x {
          0%,100% { transform: translateX(0); }
          50%      { transform: translateX(5px); }
        }

        .fade-up { animation: fadeSlideUp 0.7s ease both; }
        .fade-up-d1 { animation-delay: 0.1s; }
        .fade-up-d2 { animation-delay: 0.22s; }
        .fade-up-d3 { animation-delay: 0.35s; }
        .fade-up-d4 { animation-delay: 0.48s; }

        .cta-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 32px; border-radius: 50px; font-weight: 700;
          font-size: 1rem; cursor: pointer; border: none;
          transition: transform 0.18s, box-shadow 0.18s;
          text-decoration: none;
        }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.18); }
        .cta-btn:active { transform: translateY(0); }

        .cta-primary { background: #3B82F6; color: #fff; }
        .cta-outline { background: #fff; color: #111; border: 2px solid #e5e7eb; }
        .cta-outline:hover { border-color: #3B82F6; color: #3B82F6; }

        .arrow-anim { display: inline-block; animation: bounce-x 1.2s ease-in-out infinite; }

        .feature-card {
          background: #fff; border-radius: 20px; padding: 28px 24px;
          border: 2px solid transparent;
          transition: transform 0.22s, box-shadow 0.22s, border-color 0.22s;
          cursor: default;
        }
        .feature-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.10);
        }

        .step-circle {
          width: 56px; height: 56px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 900; font-size: 1rem; color: #fff;
          position: relative; flex-shrink: 0;
        }
        .step-circle::after {
          content: ''; position: absolute; inset: -4px;
          border-radius: 50%; border: 2px dashed currentColor;
          animation: spin-slow 8s linear infinite; opacity: 0.4;
        }

        .stat-card {
          background: #fff; border-radius: 20px; padding: 28px 20px;
          text-align: center; border: 2px solid #f3f4f6;
          transition: transform 0.22s, box-shadow 0.22s;
        }
        .stat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.08); }

        .nav-link {
          color: #555; font-weight: 500; font-size: 0.9rem;
          text-decoration: none; transition: color 0.15s;
        }
        .nav-link:hover { color: #3B82F6; }

        .badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: #EFF6FF; color: #3B82F6; border: 1px solid #BFDBFE;
          border-radius: 50px; padding: 6px 16px; font-size: 0.8rem; font-weight: 600;
        }

        .dot-pulse {
          width: 8px; height: 8px; border-radius: 50%; background: #22C55E;
          position: relative;
        }
        .dot-pulse::after {
          content: ''; position: absolute; inset: 0; border-radius: 50%;
          background: #22C55E; animation: pulse-ring 1.4s ease-out infinite;
        }

        section { scroll-margin-top: 72px; }

        .section-label {
          display: inline-block; font-size: 0.78rem; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          margin-bottom: 12px;
        }

        .gradient-text {
          background: linear-gradient(135deg, #3B82F6 0%, #22C55E 50%, #EAB308 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .trust-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .hero-title { font-size: 2.4rem !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: scrollY > 20 ? "rgba(255,255,255,0.95)" : "#fff",
        backdropFilter: "blur(12px)",
        borderBottom: scrollY > 20 ? "1px solid #f3f4f6" : "1px solid transparent",
        transition: "all 0.3s",
        padding: "0 clamp(16px,5vw,64px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: "68px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "#3B82F6", borderRadius: 10, padding: "6px 8px", color: "#fff", lineHeight: 1 }}>
            <Wallet size={20} strokeWidth={2.5} />
          </div>
          <span style={{ fontWeight: 800, fontSize: "1.15rem", color: "#111", letterSpacing: "-0.02em" }}>Smart Spend</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <a href="#features" className="nav-link">Features</a>
          <a href="#how-it-works" className="nav-link">How It Works</a>
          <button className="cta-btn cta-primary" style={{ padding: "10px 24px", fontSize: "0.875rem" }} onClick={goToDashboard}>
            Get Started <ArrowRight className="arrow-anim" size={16} />
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section ref={heroRef} style={{
        minHeight: "92vh", display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
        background: "linear-gradient(160deg, #fff 0%, #EFF6FF 40%, #F0FDF4 100%)",
        padding: "80px clamp(16px,5vw,64px) 60px",
        textAlign: "center",
      }}>
        {/* Floating Icons */}
        <FloatingIcon style={{ top: "12%", left: "8%", animationDelay: "0s" }} IconComponent={Coins} color="#3B82F6" />
        <FloatingIcon style={{ top: "20%", right: "10%", animationDelay: "1.2s" }} IconComponent={CreditCard} color="#22C55E" />
        <FloatingIcon style={{ top: "60%", left: "5%", animationDelay: "2.4s" }} IconComponent={Banknote} color="#EAB308" />
        <FloatingIcon style={{ top: "70%", right: "7%", animationDelay: "0.8s" }} IconComponent={PieChart} color="#EF4444" />
        <FloatingIcon style={{ top: "40%", right: "3%", animationDelay: "3s" }} IconComponent={Target} color="#3B82F6" />
        <FloatingIcon style={{ top: "30%", left: "3%", animationDelay: "1.8s" }} IconComponent={PiggyBank} color="#22C55E" />

        {/* Decorative blobs */}
        <div style={{
          position: "absolute", top: "-80px", right: "-120px",
          width: 480, height: 480, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "-60px", left: "-80px",
          width: 360, height: 360, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 780 }}>
          <div className="fade-up" style={{ marginBottom: 20 }}>
            <span className="badge">
              <span className="dot-pulse" />
              AI-Powered Finance Tracker
            </span>
          </div>

          <h1 className="hero-title fade-up fade-up-d1" style={{
            fontSize: "clamp(2.4rem, 6vw, 4.2rem)",
            fontWeight: 900, lineHeight: 1.1,
            letterSpacing: "-0.04em", color: "#0f172a",
            marginBottom: 24,
          }}>
            Spend Less.{" "}
            <span className="gradient-text">Save More.</span>
            <br />Live Better.
          </h1>

          <p className="fade-up fade-up-d2" style={{
            fontSize: "clamp(1rem, 2.2vw, 1.2rem)", color: "#475569",
            lineHeight: 1.7, maxWidth: 560, margin: "0 auto 40px",
          }}>
            Smart Spend tracks every rupee with AI — natural language logging, receipt scanning, forecasts, and budget goals in one clean dashboard.
          </p>

          <div className="fade-up fade-up-d3" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="cta-btn cta-primary" onClick={goToDashboard} style={{ fontSize: "1.05rem", padding: "15px 36px" }}>
              Start Saving Free <ArrowRight className="arrow-anim" size={18} />
            </button>
            <button className="cta-btn cta-outline" onClick={() => document.getElementById("features").scrollIntoView({ behavior: "smooth" })}>
              See How It Works
            </button>
          </div>

          {/* mini trust bar */}
          <div className="fade-up fade-up-d4" style={{
            marginTop: 48, display: "flex", gap: 24, justifyContent: "center",
            flexWrap: "wrap", fontSize: "0.82rem", color: "#64748b", fontWeight: 500,
          }}>
            <span className="trust-item"><CheckCircle2 size={16} color="#22C55E" /> No credit card needed</span>
            <span className="trust-item"><Clock size={16} color="#3B82F6" /> Setup in 30 seconds</span>
            <span className="trust-item"><ShieldCheck size={16} color="#EAB308" /> 100% private & secure</span>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{
        background: "#0f172a", padding: "64px clamp(16px,5vw,64px)",
      }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24 }}>
            {STATS.map(({ value, label, color }) => (
              <div key={label} className="stat-card" style={{ background: "#1e293b", borderColor: "#334155" }}>
                <div style={{ fontSize: "2.2rem", fontWeight: 900, color, marginBottom: 6 }}>{value}</div>
                <div style={{ color: "#94a3b8", fontSize: "0.875rem", fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: "96px clamp(16px,5vw,64px)", background: "#f8fafc" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span className="section-label" style={{ color: "#3B82F6" }}>Features</span>
            <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "#0f172a", lineHeight: 1.2 }}>
              Everything you need to <span className="gradient-text">master your money</span>
            </h2>
          </div>

          <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
            {FEATURES.map(({ icon, title, desc, border, bg }) => (
              <div key={title} className="feature-card" style={{ borderColor: border, background: bg }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: "#fff", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: "1.6rem",
                  boxShadow: `0 4px 16px ${border}33`,
                  marginBottom: 18,
                }}>
                  {icon}
                </div>
                <h3 style={{ fontWeight: 700, fontSize: "1.05rem", color: "#0f172a", marginBottom: 8 }}>{title}</h3>
                <p style={{ color: "#475569", fontSize: "0.9rem", lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ padding: "96px clamp(16px,5vw,64px)", background: "#fff" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span className="section-label" style={{ color: "#22C55E" }}>How It Works</span>
            <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "#0f172a", lineHeight: 1.2 }}>
              Up and running in <span style={{ color: "#22C55E" }}>4 simple steps</span>
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            {STEPS.map(({ num, color, title, desc }, i) => (
              <div key={num} style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
                <div className="step-circle" style={{ background: color, color }}>
                  <span style={{ color: "#fff", zIndex: 1 }}>{num}</span>
                </div>
                <div style={{ paddingTop: 8 }}>
                  <h3 style={{ fontWeight: 700, fontSize: "1.1rem", color: "#0f172a", marginBottom: 6 }}>{title}</h3>
                  <p style={{ color: "#64748b", fontSize: "0.95rem", lineHeight: 1.65 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{
        padding: "96px clamp(16px,5vw,64px)",
        background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
        position: "relative", overflow: "hidden", textAlign: "center",
      }}>
        {/* decorative accent bars */}
        {[
          { color: "#3B82F6", top: 0, left: "20%", width: 3, height: "100%" },
          { color: "#22C55E", top: 0, left: "40%", width: 2, height: "100%" },
          { color: "#EAB308", top: 0, left: "60%", width: 3, height: "100%" },
          { color: "#EF4444", top: 0, left: "80%", width: 2, height: "100%" },
        ].map(({ color, ...s }) => (
          <div key={color} style={{ position: "absolute", background: color, opacity: 0.08, ...s, pointerEvents: "none" }} />
        ))}

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
            <Landmark size={48} color="#EAB308" />
          </div>
          <h2 style={{
            fontSize: "clamp(1.8rem,4vw,3rem)", fontWeight: 900,
            color: "#fff", letterSpacing: "-0.03em", marginBottom: 16, lineHeight: 1.15,
          }}>
            Your wallet called.<br />
            <span style={{ color: "#EAB308" }}>It wants a smarter you.</span>
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "1.05rem", maxWidth: 500, margin: "0 auto 40px", lineHeight: 1.7 }}>
            Join thousands taking control of their finances. Free, simple, and powered by AI.
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              className="cta-btn"
              style={{ background: "#EAB308", color: "#111", fontSize: "1.05rem", padding: "15px 36px" }}
              onClick={goToDashboard}
            >
              Open My Dashboard <ArrowRight className="arrow-anim" size={18} />
            </button>
          </div>

          {/* color bar */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 56 }}>
            {["#3B82F6", "#22C55E", "#EAB308", "#EF4444"].map(c => (
              <div key={c} style={{ width: 32, height: 4, borderRadius: 99, background: c }} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        background: "#0f172a", padding: "32px clamp(16px,5vw,64px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "#3B82F6", borderRadius: 8, padding: "5px 7px", color: "#fff", lineHeight: 1 }}>
             <Wallet size={16} strokeWidth={2.5} />
          </div>
          <span style={{ fontWeight: 700, color: "#e2e8f0", fontSize: "0.95rem" }}>Smart Spend</span>
        </div>

        <div style={{ display: "flex", gap: 20 }}>
          {["#3B82F6", "#22C55E", "#EAB308", "#EF4444"].map(c => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.6 }} />
          ))}
        </div>

        <span style={{ color: "#475569", fontSize: "0.82rem" }}>
          Built with care using FastAPI & Next.js
        </span>
      </footer>
    </>
  );
}
