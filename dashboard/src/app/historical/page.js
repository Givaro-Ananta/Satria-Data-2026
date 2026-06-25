"use client";

import { useState, useEffect } from "react";
import {
  BarChart2,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Filter
} from "lucide-react";
import HistoricalChart from "../../components/HistoricalChart";

const COMMODITY_MAP = {
  "Rice": "Beras",
  "Wheat Flour": "Tepung Terigu",
  "Eggs": "Telur Ayam",
  "Meat (beef)": "Daging Sapi",
  "Meat (chicken, broiler)": "Daging Ayam Broiler",
  "Milk (condensed)": "Susu Kental Manis",
  "Sugar": "Gula Pasir",
  "Oil (vegetable)": "Minyak Goreng",
  "Chili (red)": "Cabai Merah",
  "Chili (bird's eye)": "Cabai Rawit",
  "Fuel (kerosene)": "Minyak Tanah"
};

export default function HistoricalPage() {
  const [apiBaseUrl, setApiBaseUrl] = useState(process.env.NEXT_PUBLIC_API_BASE_URL || "https://forecasting-pangan-api.onrender.com");
  const [commodities, setCommodities] = useState([]);
  const [selectedCommodity, setSelectedCommodity] = useState("");
  const [historicalData, setHistoricalData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [connectionStatus, setConnectionStatus] = useState({ type: "info", message: "Menghubungkan..." });

  // Table filter states
  const [filterMode, setFilterMode] = useState("single"); // "single" | "range"
  const [selectedYear, setSelectedYear] = useState("all");
  const [tempStartYear, setTempStartYear] = useState("2007");
  const [tempEndYear, setTempEndYear] = useState("2026");
  const [appliedStartYear, setAppliedStartYear] = useState("2007");
  const [appliedEndYear, setAppliedEndYear] = useState("2026");

  // Sync year range defaults with historical data
  useEffect(() => {
    if (historicalData && historicalData.historical && historicalData.historical.length > 0) {
      const years = historicalData.historical.map(p => p.date.substring(0, 4));
      const minYr = years[0];
      const maxYr = years[years.length - 1];
      setTempStartYear(minYr);
      setTempEndYear(maxYr);
      setAppliedStartYear(minYr);
      setAppliedEndYear(maxYr);
      setSelectedYear("all");
    }
  }, [historicalData]);

  const handleTempStartYearChange = (val) => {
    setTempStartYear(val);
    if (tempEndYear < val) {
      setTempEndYear(val);
    }
  };

  const handleApplyRangeFilter = () => {
    setAppliedStartYear(tempStartYear);
    setAppliedEndYear(tempEndYear);
  };

  // Automatically switch to local backend if running on localhost
  useEffect(() => {
    if (typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
      const localUrl = "http://127.0.0.1:8000";
      setApiBaseUrl(localUrl);
    }
  }, []);

  // Fetch commodities list
  useEffect(() => {
    let active = true;
    async function loadCommodities() {
      setInitLoading(true);
      setConnectionStatus({ type: "info", message: "Menghubungkan..." });
      try {
        const res = await fetch(`${apiBaseUrl}/commodities`);
        if (!res.ok) throw new Error("Gagal mengambil daftar komoditas");
        const data = await res.json();

        if (!active) return;
        setCommodities(data.commodities);
        if (data.commodities.length > 0) {
          setSelectedCommodity(data.commodities[0]);
        }
        setConnectionStatus({ type: "success", message: "Terhubung" });
      } catch (err) {
        if (!active) return;
        console.error(err);
        setConnectionStatus({ type: "error", message: "Offline" });
      } finally {
        if (active) {
          setInitLoading(false);
        }
      }
    }
    loadCommodities();
    return () => {
      active = false;
    };
  }, [apiBaseUrl]);

  // Fetch historical data when selected commodity changes
  useEffect(() => {
    if (!selectedCommodity) return;

    let active = true;
    async function loadHistorical() {
      setLoading(true);
      setErrorMsg("");
      try {
        const res = await fetch(`${apiBaseUrl}/historical/${selectedCommodity}`);
        if (!res.ok) throw new Error("Gagal mengambil data historis");
        const data = await res.json();

        if (!active) return;
        setHistoricalData(data);
      } catch (err) {
        if (!active) return;
        console.error(err);
        setErrorMsg(`Gagal memuat data historis komoditas: ${err.message}`);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadHistorical();
    return () => {
      active = false;
    };
  }, [selectedCommodity, apiBaseUrl]);

  // Calculate statistics
  const getStats = () => {
    if (!historicalData || !historicalData.historical || historicalData.historical.length === 0) {
      return { min: null, max: null, avg: 0, growth: 0 };
    }

    let points = historicalData.historical;
    if (filterMode === "single") {
      if (selectedYear !== "all") {
        points = points.filter(p => p.date.substring(0, 4) === selectedYear);
      }
    } else {
      points = points.filter(p => {
        const yr = p.date.substring(0, 4);
        return yr >= appliedStartYear && yr <= appliedEndYear;
      });
    }

    if (points.length === 0) {
      return { min: null, max: null, avg: 0, growth: 0 };
    }
    const values = points.map(p => p.value);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;

    // Find min and max with their corresponding months
    let minPoint = points[0];
    let maxPoint = points[0];

    for (let i = 1; i < points.length; i++) {
      if (points[i].value < minPoint.value) minPoint = points[i];
      if (points[i].value > maxPoint.value) maxPoint = points[i];
    }

    // Growth percentage between first and last recorded price in this range
    const firstVal = points[0].value;
    const lastVal = points[points.length - 1].value;
    const growth = ((lastVal - firstVal) / firstVal) * 100;

    return {
      min: minPoint,
      max: maxPoint,
      avg: avg,
      growth: growth
    };
  };

  const stats = getStats();

  // Extract available years for dropdown filtering
  const getYears = () => {
    if (!historicalData || !historicalData.historical) return [];
    const yearsSet = new Set(historicalData.historical.map(p => p.date.substring(0, 4)));
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a)); // Descending order
  };

  const availableYears = getYears();

  // Filter historical data for chart display based on selected filters
  const getFilteredChartData = () => {
    if (!historicalData) return null;

    let filteredPoints = historicalData.historical;
    if (filterMode === "single") {
      if (selectedYear !== "all") {
        filteredPoints = filteredPoints.filter(p => p.date.substring(0, 4) === selectedYear);
      }
    } else {
      filteredPoints = filteredPoints.filter(p => {
        const yr = p.date.substring(0, 4);
        return yr >= appliedStartYear && yr <= appliedEndYear;
      });
    }

    return {
      ...historicalData,
      historical: filteredPoints
    };
  };

  // Filter historical data for table display based on selected filters
  const getFilteredTableData = () => {
    if (!historicalData || !historicalData.historical) return [];

    let filteredPoints = historicalData.historical;
    if (filterMode === "single") {
      if (selectedYear !== "all") {
        filteredPoints = filteredPoints.filter(p => p.date.substring(0, 4) === selectedYear);
      }
    } else {
      filteredPoints = filteredPoints.filter(p => {
        const yr = p.date.substring(0, 4);
        return yr >= appliedStartYear && yr <= appliedEndYear;
      });
    }

    return [...filteredPoints].reverse(); // Newest first
  };

  const filteredTableData = getFilteredTableData();

  return (
    <div className="dashboard-layout">
      {/* Sidebar Controls */}
      <aside className="sidebar-panel">
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1.5rem", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.75rem" }}>
            Pilih Komoditas
          </h2>

          <div className="form-group">
            <label htmlFor="commodity-select">Nama Komoditas</label>
            <select
              id="commodity-select"
              className="form-control"
              value={selectedCommodity}
              onChange={(e) => {
                setSelectedCommodity(e.target.value);
              }}
              disabled={initLoading || commodities.length === 0}
            >
              {commodities.map((item) => (
                <option key={item} value={item}>{COMMODITY_MAP[item] || item}</option>
              ))}
            </select>
          </div>

          <div className="divider">Penyaringan Data</div>

          {/* Mode Selector */}
          <div className="form-group">
            <label style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Mode Filter</label>
            <div style={{ display: "flex", gap: "0.5rem", background: "rgba(15, 23, 42, 0.4)", padding: "0.25rem", borderRadius: "10px", border: "1px solid var(--glass-border)" }}>
              <button
                type="button"
                className="btn"
                style={{
                  flex: 1,
                  padding: "0.4rem",
                  fontSize: "0.8rem",
                  borderRadius: "8px",
                  background: filterMode === "single" ? "var(--accent-primary)" : "transparent",
                  color: "#ffffff",
                  boxShadow: filterMode === "single" ? "0 2px 8px rgba(59, 130, 246, 0.4)" : "none",
                  border: "none",
                  cursor: "pointer"
                }}
                onClick={() => setFilterMode("single")}
              >
                Tahun Tunggal
              </button>
              <button
                type="button"
                className="btn"
                style={{
                  flex: 1,
                  padding: "0.4rem",
                  fontSize: "0.8rem",
                  borderRadius: "8px",
                  background: filterMode === "range" ? "var(--accent-primary)" : "transparent",
                  color: "#ffffff",
                  boxShadow: filterMode === "range" ? "0 2px 8px rgba(59, 130, 246, 0.4)" : "none",
                  border: "none",
                  cursor: "pointer"
                }}
                onClick={() => setFilterMode("range")}
              >
                Rentang Tahun
              </button>
            </div>
          </div>

          {filterMode === "single" ? (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="year-select" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <Filter size={12} />
                Filter Tahun
              </label>
              <select
                id="year-select"
                className="form-control"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                disabled={!historicalData}
              >
                <option value="all">Semua Tahun</option>
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="year-filter-grid">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="start-year-select" style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem" }}>
                    Tahun Mulai
                  </label>
                  <select
                    id="start-year-select"
                    className="form-control"
                    value={tempStartYear}
                    onChange={(e) => handleTempStartYearChange(e.target.value)}
                    disabled={!historicalData}
                    style={{ fontSize: "0.85rem", padding: "0.6rem 0.8rem" }}
                  >
                    {/* List in ascending order for range start select */}
                    {availableYears.slice().reverse().map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="end-year-select" style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem" }}>
                    Tahun Selesai
                  </label>
                  <select
                    id="end-year-select"
                    className="form-control"
                    value={tempEndYear}
                    onChange={(e) => setTempEndYear(e.target.value)}
                    disabled={!historicalData}
                    style={{ fontSize: "0.85rem", padding: "0.6rem 0.8rem" }}
                  >
                    {/* List in ascending order for range end select */}
                    {availableYears.slice().reverse().map(yr => (
                      <option key={yr} value={yr} disabled={yr < tempStartYear}>{yr}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleApplyRangeFilter}
                disabled={!historicalData}
                style={{ padding: "0.6rem 1rem", fontSize: "0.85rem", marginTop: "0.25rem" }}
              >
                Generate Grafik
              </button>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="main-content">
          {/* Header section */}
          <header className="header-section" style={{ textAlign: "left", marginBottom: "2rem" }}>
            <h1 className="gradient-text main-title">
              Analisis Tren Data Historis Pangan
            </h1>
            <p className="subtitle">
              Eksplorasi Fluktuasi Harga Komoditas Berdasarkan Data World Food Programme (WFP)
            </p>
          </header>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Error Alert */}
          {errorMsg && (
            <div className="status-msg error">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Statistics summary cards grid */}
          {historicalData && !errorMsg && (
            <div className="stats-cards-grid">
              {/* Rata-rata */}
              <div className="glass-card stats-mini-card">
                <div className="stats-mini-header">
                  <span className="stats-mini-title">Harga Rata-rata</span>
                  <span className="stats-mini-icon text-blue" style={{ fontWeight: "800", fontSize: "1rem" }}>Rp</span>
                </div>
                <div className="stats-mini-value">
                  Rp {Math.round(stats.avg).toLocaleString("id-ID")}
                </div>
                <div className="stats-mini-desc">
                  {filterMode === "single" ? (
                    selectedYear === "all" ? "Rata-rata dari seluruh titik data" : `Rata-rata sepanjang tahun ${selectedYear}`
                  ) : (
                    appliedStartYear === appliedEndYear ? `Rata-rata sepanjang tahun ${appliedStartYear}` : `Rata-rata periode ${appliedStartYear} - ${appliedEndYear}`
                  )}
                </div>
              </div>

              {/* Harga Tertinggi */}
              <div className="glass-card stats-mini-card">
                <div className="stats-mini-header">
                  <span className="stats-mini-title">Harga Tertinggi</span>
                  <TrendingUp size={18} className="stats-mini-icon text-amber" />
                </div>
                <div className="stats-mini-value">
                  Rp {stats.max ? stats.max.value.toLocaleString("id-ID") : "-"}
                </div>
                <div className="stats-mini-desc">
                  Tercatat pada {stats.max ? stats.max.date : "-"}
                </div>
              </div>

              {/* Harga Terendah */}
              <div className="glass-card stats-mini-card">
                <div className="stats-mini-header">
                  <span className="stats-mini-title">Harga Terendah</span>
                  <TrendingDown size={18} className="stats-mini-icon text-emerald" />
                </div>
                <div className="stats-mini-value">
                  Rp {stats.min ? stats.min.value.toLocaleString("id-ID") : "-"}
                </div>
                <div className="stats-mini-desc">
                  Tercatat pada {stats.min ? stats.min.date : "-"}
                </div>
              </div>

              {/* Total Kenaikan */}
              <div className="glass-card stats-mini-card">
                <div className="stats-mini-header">
                  <span className="stats-mini-title">Total Perubahan</span>
                  {stats.growth >= 0 ? (
                    <TrendingUp size={18} className="stats-mini-icon text-emerald" />
                  ) : (
                    <TrendingDown size={18} className="stats-mini-icon text-rose" />
                  )}
                </div>
                <div className="stats-mini-value" style={{ color: stats.growth >= 0 ? "var(--accent-success)" : "var(--accent-danger)" }}>
                  {stats.growth >= 0 ? "+" : ""}{stats.growth.toFixed(1)}%
                </div>
                <div className="stats-mini-desc">
                  {filterMode === "single" ? (
                    selectedYear === "all" ? "Sejak data awal s/d Mei 2025" : `Selama tahun ${selectedYear}`
                  ) : (
                    appliedStartYear === appliedEndYear ? `Selama tahun ${appliedStartYear}` : `Periode tahun ${appliedStartYear} s/d ${appliedEndYear}`
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Main Historical Chart Card */}
          <div className="glass-card" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <BarChart2 size={20} style={{ color: "var(--accent-primary)" }} />
              Grafik Tren Fluktuasi Harga
            </h2>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "450px" }}>
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "450px", color: "var(--text-muted)", gap: "1rem" }}>
                  <div className="spinner" style={{ width: "40px", height: "40px", borderWidth: "3px" }}></div>
                  <p>Memuat visualisasi data historis...</p>
                </div>
              ) : historicalData ? (
                <div style={{ width: "100%", flex: 1 }}>
                  <HistoricalChart data={getFilteredChartData()} />
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--text-muted)" }}>
                  <BarChart2 size={48} style={{ margin: "0 auto 1rem auto", opacity: 0.3 }} />
                  <p style={{ fontSize: "1rem", fontWeight: "600" }}>Pilih komoditas untuk memulai analisis data historis.</p>
                </div>
              )}
            </div>
          </div>

          {/* Table Card */}
          {historicalData && !loading && (
            <div className="glass-card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "1.1rem" }}>Tabel Catatan Harga Bulanan</h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Menampilkan {filteredTableData.length} records
                </span>
              </div>

              {filteredTableData.length > 0 ? (
                <div className="table-wrapper" style={{ maxHeight: "350px" }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Bulan</th>
                        <th>Harga Rata-rata Nasional</th>
                        <th>Perubahan vs Tahun Lalu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTableData.map((row, idx) => {
                        // Find previous index to show price difference if available (it is reversed, so row is at index idx, and previous chronological is row below it idx + 1)
                        const currentVal = row.value;
                        let diffPctText = "-";
                        let diffColor = "var(--text-muted)";

                        // Compare with point 12 months ago for YoY
                        const origIdx = historicalData.historical.findIndex(p => p.date === row.date);
                        if (origIdx >= 12) {
                          const prevYoYVal = historicalData.historical[origIdx - 12].value;
                          const diffYoY = ((currentVal - prevYoYVal) / prevYoYVal) * 100;
                          diffPctText = `${diffYoY >= 0 ? "+" : ""}${diffYoY.toFixed(1)}% vs tahun lalu`;
                          diffColor = diffYoY >= 0 ? "var(--accent-danger)" : "var(--accent-success)";
                        }

                        return (
                          <tr key={row.date}>
                            <td style={{ fontWeight: 600 }}>{row.date}</td>
                            <td>Rp {row.value.toLocaleString("id-ID")}</td>
                            <td style={{ color: diffColor, fontSize: "0.85rem", fontWeight: "600" }}>
                              {diffPctText}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  Tidak ada data yang cocok dengan kriteria pencarian atau filter Anda.
                </div>
              )}
            </div>
          )}
          </div>
        </main>
    </div>
  );
}
