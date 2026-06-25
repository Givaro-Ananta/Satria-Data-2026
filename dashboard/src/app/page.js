/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  Plus,
  Trash2,
  Upload,
  X,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  HelpCircle,
  Calendar,
  DollarSign
} from "lucide-react";
import ForecastChart from "../components/ForecastChart";
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

export default function Home() {
  // Configuration State
  const [apiBaseUrl, setApiBaseUrl] = useState(process.env.NEXT_PUBLIC_API_BASE_URL || "https://forecasting-pangan-api.onrender.com");
  const [connectionStatus, setConnectionStatus] = useState({ type: "info", message: "Menghubungkan..." });

  // Automatically switch to local backend if running on localhost
  useEffect(() => {
    if (typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
      const localUrl = "http://127.0.0.1:8000";
      setApiBaseUrl(localUrl);
    }
  }, []);

  // Core Data States
  const [commodities, setCommodities] = useState([]);
  const [selectedCommodity, setSelectedCommodity] = useState("");
  const [dateRangeInfo, setDateRangeInfo] = useState("");
  const [horizon, setHorizon] = useState(24);

  // User input states
  const [manualPoints, setManualPoints] = useState([]);
  const [inputYear, setInputYear] = useState("2026");
  const [inputMonthDropdown, setInputMonthDropdown] = useState("02");
  const [inputPrice, setInputPrice] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);

  // Result & UI Feedback States
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [initLoading, setInitLoading] = useState(true);



  // Helper for generating forecast interpretation
  const getInterpretation = (data) => {
    if (!data || !data.forecast || data.forecast.length === 0) return null;

    const forecast = data.forecast;
    const historical = data.historical;

    const startPrice = historical.length > 0 ? historical[historical.length - 1].value : forecast[0].value;
    const startMonth = historical.length > 0 ? historical[historical.length - 1].date : forecast[0].date;

    const endPrice = forecast[forecast.length - 1].value;
    const endMonth = forecast[forecast.length - 1].date;

    const totalDiff = endPrice - startPrice;
    const percentChange = ((totalDiff / startPrice) * 100).toFixed(1);

    let trendText = "cenderung stabil";
    if (parseFloat(percentChange) > 1.0) {
      trendText = "mengalami tren kenaikan";
    } else if (parseFloat(percentChange) < -1.0) {
      trendText = "mengalami tren penurunan";
    }

    const increases = [];
    let prevPrice = startPrice;
    let prevMonth = startMonth;

    for (let i = 0; i < forecast.length; i++) {
      const current = forecast[i];
      const diff = current.value - prevPrice;
      if (diff > 0) {
        const pct = ((diff / prevPrice) * 100).toFixed(1);
        increases.push({
          date: current.date,
          prevMonth: prevMonth,
          increaseVal: diff,
          increasePct: pct,
          price: current.value
        });
      }
      prevPrice = current.value;
      prevMonth = current.date;
    }

    let maxIncrease = null;
    if (increases.length > 0) {
      maxIncrease = increases.reduce((max, current) => current.increaseVal > max.increaseVal ? current : max, increases[0]);
    }

    return {
      trendText,
      startPrice,
      endPrice,
      percentChange,
      increases,
      maxIncrease,
      startMonth,
      endMonth
    };
  };

  // Fetch commodities list from backend
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
        setDateRangeInfo(`Data historis: ${data.date_range.start} s/d ${data.date_range.end}`);
        setConnectionStatus({ type: "success", message: "Terhubung" });
      } catch (err) {
        if (!active) return;
        console.error(err);
        setConnectionStatus({
          type: "error",
          message: "Offline"
        });
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



  // Add a manual point
  const handleAddPoint = () => {
    if (!inputPrice || isNaN(parseFloat(inputPrice))) {
      alert("Masukkan harga dengan benar.");
      return;
    }

    const dateStr = `${inputYear}-${inputMonthDropdown}`;

    // Prevent adding points for January 2026 or earlier (since data goes up to 2026-01)
    if (dateStr <= "2026-01") {
      alert("Anda hanya dapat menginput data tambahan mulai dari Februari 2026 (2026-02) ke depan.");
      return;
    }

    // Check if date already exists
    if (manualPoints.some((p) => p.date === dateStr)) {
      alert("Titik data untuk bulan ini sudah ditambahkan.");
      return;
    }

    const newPoint = {
      date: dateStr,
      price: parseFloat(inputPrice),
    };

    setManualPoints([...manualPoints, newPoint].sort((a, b) => a.date.localeCompare(b.date)));
    setInputPrice("");
  };

  // Remove a manual point
  const handleRemovePoint = (index) => {
    setManualPoints(manualPoints.filter((_, idx) => idx !== index));
  };

  // Handle CSV file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
      // Clear manual points to avoid confusion
      setManualPoints([]);
    }
  };

  // Clear uploaded file
  const handleClearFile = () => {
    setUploadedFile(null);
  };

  // Trigger Forecasting calculation
  const handleRunForecast = async () => {
    if (!selectedCommodity) {
      setStatus({ type: "error", message: "Pilih komoditas terlebih dahulu." });
      return;
    }

    setLoading(true);
    setStatus({ type: "info", message: "Menghitung ulang proyeksi forecasting..." });

    try {
      let res;
      if (uploadedFile) {
        // Upload CSV flow
        const formData = new FormData();
        formData.append("commodity", selectedCommodity);
        formData.append("horizon_months", horizon);
        formData.append("file", uploadedFile);

        res = await fetch(`${apiBaseUrl}/forecast/upload-csv`, {
          method: "POST",
          body: formData,
        });
      } else {
        // JSON Payload flow
        res = await fetch(`${apiBaseUrl}/forecast`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            commodity: selectedCommodity,
            points: manualPoints,
            horizon_months: parseInt(horizon, 10),
          }),
        });
      }

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.detail || `HTTP Error ${res.status}`);
      }

      const result = await res.json();
      setForecastData(result);
      setStatus({
        type: "success",
        message: `Proyeksi harga komoditas "${COMMODITY_MAP[result.commodity] || result.commodity}" berhasil dihitung ulang!`
      });
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: `Gagal menghitung forecast: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar Controls */}
      <aside className="sidebar-panel">
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1.5rem", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.75rem" }}>
          Parameter Model
        </h2>

        <div className="form-group">
          <label htmlFor="commodity">Komoditas Pangan</label>
          <select
            id="commodity"
            className="form-control"
            value={selectedCommodity}
            onChange={(e) => {
              setSelectedCommodity(e.target.value);
              setForecastData(null); // Clear previous results
            }}
            disabled={initLoading || commodities.length === 0}
          >
            {commodities.map((item) => (
              <option key={item} value={item}>{COMMODITY_MAP[item] || item}</option>
            ))}
          </select>
          {dateRangeInfo && (
            <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
              {dateRangeInfo}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="horizon">Horizon Forecast ({horizon} Bulan)</label>
          <input
            id="horizon"
            type="range"
            className="form-control"
            min="1"
            max="60"
            value={horizon}
            onChange={(e) => setHorizon(e.target.value)}
            style={{ padding: "0.4rem 0", background: "transparent" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            <span>1 Bulan</span>
            <span>60 Bulan</span>
          </div>
        </div>

        <div className="divider">Input Data Tambahan</div>

        {/* Tab Selection Info */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
            Opsi A: Input Titik Data Manual
          </h3>

          <div className="manual-inputs-grid">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: "0.75rem" }}>Tahun</label>
              <select
                className="form-control"
                value={inputYear}
                onChange={(e) => {
                  const yr = e.target.value;
                  setInputYear(yr);
                  if (yr === "2026" && inputMonthDropdown === "01") {
                    setInputMonthDropdown("02");
                  }
                }}
                disabled={!!uploadedFile}
              >
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
                <option value="2029">2029</option>
                <option value="2030">2030</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: "0.75rem" }}>Bulan</label>
              <select
                className="form-control"
                value={inputMonthDropdown}
                onChange={(e) => setInputMonthDropdown(e.target.value)}
                disabled={!!uploadedFile}
              >
                <option value="01" disabled={inputYear === "2026"}>Januari</option>
                <option value="02">Februari</option>
                <option value="03">Maret</option>
                <option value="04">April</option>
                <option value="05">Mei</option>
                <option value="06">Juni</option>
                <option value="07">Juli</option>
                <option value="08">Agustus</option>
                <option value="09">September</option>
                <option value="10">Oktober</option>
                <option value="11">November</option>
                <option value="12">Desember</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: "0.75rem" }}>Harga (Rp)</label>
              <input
                type="number"
                className="form-control"
                placeholder="e.g. 15400"
                value={inputPrice}
                onChange={(e) => setInputPrice(e.target.value)}
                disabled={!!uploadedFile}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddPoint}
            className="btn btn-secondary"
            style={{ marginTop: "0.5rem", padding: "0.5rem 1rem", fontSize: "0.85rem" }}
            disabled={!!uploadedFile}
          >
            <Plus size={14} />
            Tambah Titik
          </button>

          {manualPoints.length > 0 && (
            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Bulan</th>
                    <th>Harga</th>
                    <th style={{ width: "40px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {manualPoints.map((p, idx) => (
                    <tr key={p.date}>
                      <td>{p.date}</td>
                      <td>Rp {p.price.toLocaleString("id-ID")}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleRemovePoint(idx)}
                          className="btn-danger"
                          title="Hapus"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="divider">ATAU</div>

        {/* Opsi B: CSV / Excel Upload */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
            Opsi B: Unggah Dokumen CSV / Excel
          </h3>

          {!uploadedFile ? (
            <>
              <div className="file-upload-container">
                <Upload className="file-upload-icon" size={24} />
                <div className="file-upload-text">
                  <strong>Klik untuk mengunggah</strong> atau seret file CSV / Excel
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    Harus memiliki kolom: <code>date</code> & <code>price</code>
                  </div>
                </div>
                <input
                  type="file"
                  className="file-upload-input"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  disabled={manualPoints.length > 0}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "-0.75rem", marginBottom: "1.5rem" }}>
                <a
                  href="/template_forecast.csv"
                  download
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--accent-primary)",
                    textDecoration: "none",
                    padding: "0.25rem 0.5rem",
                    background: "rgba(59, 130, 246, 0.08)",
                    border: "1px solid rgba(59, 130, 246, 0.15)",
                    borderRadius: "5px",
                    cursor: "pointer"
                  }}
                >
                  Template CSV
                </a>
                <a
                  href="/template_forecast.xlsx"
                  download
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--accent-secondary)",
                    textDecoration: "none",
                    padding: "0.25rem 0.5rem",
                    background: "rgba(245, 158, 11, 0.08)",
                    border: "1px solid rgba(245, 158, 11, 0.15)",
                    borderRadius: "5px",
                    cursor: "pointer"
                  }}
                >
                  Template Excel
                </a>
              </div>
            </>
          ) : (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(59, 130, 246, 0.1)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              padding: "0.75rem 1rem",
              borderRadius: "10px",
              marginBottom: "1.5rem"
            }}>
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: "0.5rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "600" }}>{uploadedFile.name}</span>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  {(uploadedFile.size / 1024).toFixed(1)} KB
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearFile}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

          <button
            type="button"
            onClick={handleRunForecast}
            className="btn btn-primary"
            disabled={loading || initLoading}
            style={{ marginTop: "1.5rem" }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ borderWidth: "1.5px", width: "16px", height: "16px" }}></div>
                Menghitung...
              </>
            ) : "Hitung Prediksi"}
          </button>
        </aside>

        {/* Main Content Area */ }
  <main className="main-content">
    {/* Header section */}
    <header className="header-section" style={{ textAlign: "left", marginBottom: "2rem" }}>
      <h1 className="gradient-text main-title">
        Forecasting Harga Pangan Nasional
      </h1>
      <p className="subtitle">
        Aplikasi Interaktif Prediksi Harga Komoditas Berbasis Machine Learning
      </p>
    </header>

    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Status Message Panel */}
      {status.message && (
        <div className={`status-msg ${status.type}`}>
          {status.type === "error" && <AlertCircle size={18} style={{ flexShrink: 0 }} />}
          {status.type === "success" && <CheckCircle2 size={18} style={{ flexShrink: 0 }} />}
          {status.type === "info" && <div className="spinner" style={{ flexShrink: 0, borderWidth: "1.5px" }}></div>}
          <span>{status.message}</span>
        </div>
      )}

      {/* Main Forecast Chart Card */}
      <div className="glass-card" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <BarChart3 size={20} style={{ color: "var(--accent-primary)" }} />
          Visualisasi Prediksi Deret Waktu (Time Series)
        </h2>

        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {forecastData ? (
            <div style={{ width: "100%", flex: 1 }}>
              <ForecastChart data={forecastData} />
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--text-muted)" }}>
              <BarChart3 size={48} style={{ margin: "0 auto 1rem auto", opacity: 0.3 }} />
              <p style={{ fontSize: "1rem", fontWeight: "600" }}>Belum Ada Data Forecast yang Dihasilkan</p>
              <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                Silakan atur parameter di panel kiri dan klik tombol <strong>Hitung Prediksi</strong>.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Card Interpretasi Hasil Forecast */}
      {forecastData && (() => {
        const analysis = getInterpretation(forecastData);
        if (!analysis) return null;
        return (
          <div className="glass-card" style={{ padding: "1.75rem" }}>
            <h3 style={{ fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <TrendingUp size={20} style={{ color: "var(--accent-secondary)" }} />
              Interpretasi Hasil & Penjelasan Tren Harga
            </h3>

            {/* Ringkasan Tren Utama */}
            <p style={{ fontSize: "0.95rem", color: "var(--text-primary)", lineHeight: "1.6", marginBottom: "1.5rem" }}>
              Berdasarkan proyeksi model, harga komoditas <strong>{COMMODITY_MAP[forecastData.commodity] || forecastData.commodity}</strong> diperkirakan <strong>{analysis.trendText}</strong> sebesar <strong>{Math.abs(analysis.percentChange)}%</strong> dalam <strong>{horizon} bulan</strong> ke depan.
              Harga diproyeksikan berubah dari <strong>Rp {analysis.startPrice.toLocaleString("id-ID")}</strong> (pada {analysis.startMonth}) menjadi <strong>Rp {analysis.endPrice.toLocaleString("id-ID")}</strong> (pada {analysis.endMonth}).
              {analysis.maxIncrease && (
                <span> Kenaikan bulanan tertinggi diprediksi terjadi pada bulan <strong>{analysis.maxIncrease.date}</strong> dengan lonjakan sebesar <strong>+Rp {analysis.maxIncrease.increaseVal.toLocaleString("id-ID")}</strong> ({analysis.maxIncrease.increasePct}%).</span>
              )}
            </p>

            {/* Detail Kenaikan Harga Per Bulan */}
            <h4 style={{ fontSize: "0.95rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Informasi Kenaikan Harga Bulanan
            </h4>

            {analysis.increases.length > 0 ? (
              <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid var(--glass-border)", borderRadius: "10px", background: "rgba(15, 23, 42, 0.4)", padding: "1rem" }}>
                <ul style={{ listStyleType: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {analysis.increases.map((item, idx) => (
                    <li key={idx} className="trend-list-item">
                      <div>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.date}</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                          (dibandingkan {item.prevMonth})
                        </span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ color: "var(--accent-secondary)", fontWeight: 600, marginRight: "1rem" }}>
                          +Rp {item.increaseVal.toLocaleString("id-ID")} (+{item.increasePct}%)
                        </span>
                        <span style={{ color: "var(--text-secondary)", fontFamily: "monospace" }}>
                          Rp {item.price.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p style={{ fontSize: "0.85rem", color: "var(--accent-success)" }}>
                Tidak ada prediksi kenaikan harga pangan pada komoditas ini selama horizon proyeksi. Harga cenderung stabil atau menurun.
              </p>
            )}
          </div>
        );
      })()}

      {/* Info Card */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <h3 style={{ fontSize: "1rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <HelpCircle size={16} style={{ color: "var(--accent-secondary)" }} />
          Bagaimana ini bekerja?
        </h3>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>
          Aplikasi ini memuat data historis harga pangan nasional. Ketika Anda menambahkan data baru secara manual atau mengunggah CSV, data tersebut akan digabungkan dengan dataset historis di backend Python. Model <strong>machine learning</strong> akan dilatih ulang secara instan menggunakan data yang diperbarui tersebut untuk menghasilkan ramalan (forecast) harga pangan hingga {horizon} bulan ke depan lengkap dengan batas interval kepercayaan.
        </p>
      </div>
      </div>
  </main>
    </div>
  );
}
