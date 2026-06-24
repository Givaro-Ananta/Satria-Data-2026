"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingUp, BarChart2 } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [connectionStatus, setConnectionStatus] = useState({ type: "info", message: "Menghubungkan..." });

  useEffect(() => {
    let apiBaseUrl = "https://forecasting-pangan-api.onrender.com";
    if (typeof window !== "undefined" && 
       (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
      apiBaseUrl = "http://127.0.0.1:8000";
    }

    let active = true;
    async function checkConnection() {
      try {
        const res = await fetch(`${apiBaseUrl}/`);
        if (!res.ok) throw new Error();
        if (active) {
          setConnectionStatus({ type: "success", message: "Terhubung" });
        }
      } catch (err) {
        if (active) {
          setConnectionStatus({ type: "error", message: "Offline" });
        }
      }
    }

    checkConnection();
    // Check every 15 seconds
    const interval = setInterval(checkConnection, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <nav className="navbar-container">
      <div className="navbar-content">
        <div className="navbar-brand" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.1rem" }}>
          <span className="gradient-text brand-title" style={{ lineHeight: "1.1" }}>SD2026020000199</span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.15rem" }}>
            <span style={{ 
              width: "6px", 
              height: "6px", 
              borderRadius: "50%", 
              background: connectionStatus.type === "success" ? "var(--accent-success)" : 
                          connectionStatus.type === "error" ? "var(--accent-danger)" : "var(--accent-secondary)",
              boxShadow: connectionStatus.type === "success" ? "0 0 5px var(--accent-success)" : 
                         connectionStatus.type === "error" ? "0 0 5px var(--accent-danger)" : "0 0 5px var(--accent-secondary)"
            }}></span>
            <span style={{ fontWeight: 600, color: "var(--text-muted)", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              API: {connectionStatus.message}
            </span>
          </div>
        </div>
        <div className="navbar-links">
          <Link 
            href="/" 
            className={`navbar-link ${pathname === "/" ? "active" : ""}`}
          >
            <TrendingUp size={16} />
            <span>Proyeksi Forecasting</span>
          </Link>
          <Link 
            href="/historical" 
            className={`navbar-link ${pathname === "/historical" ? "active" : ""}`}
          >
            <BarChart2 size={16} />
            <span>Data Historis</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
