"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { Image, FileText } from "lucide-react";

export default function HistoricalChart({ data }) {
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  const handleDownloadImage = () => {
    if (!canvasRef.current) return;
    
    // Create a temporary canvas to draw a background color
    // This ensures white labels are readable when exported as a PNG
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvasRef.current.width;
    tempCanvas.height = canvasRef.current.height;
    const tempCtx = tempCanvas.getContext("2d");
    
    // Fill background color
    tempCtx.fillStyle = "#0d1527"; // Matching the dark-blue theme background
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Draw the chart on top of the solid background
    tempCtx.drawImage(canvasRef.current, 0, 0);
    
    const url = tempCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    
    const commodityName = data?.commodity ? data.commodity.replace(/\s+/g, "_").toLowerCase() : "commodity";
    link.download = `grafik_historis_${commodityName}_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadCSV = () => {
    if (!data || !data.historical) return;
    const headers = ["Tanggal", "Harga Rata-rata (Rp)"];
    const rows = data.historical.map((p) => [p.date, p.value]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => `"${val}"`).join(","))
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    const commodityName = data?.commodity ? data.commodity.replace(/\s+/g, "_").toLowerCase() : "commodity";
    link.download = `data_historis_${commodityName}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    if (!data || !data.historical || data.historical.length === 0) {
      return;
    }

    const labels = data.historical.map((p) => p.date);
    const prices = data.historical.map((p) => p.value);

    const ctx = canvasRef.current.getContext("2d");

    // Create a beautiful premium blue gradient for the area fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 450);
    gradient.addColorStop(0, "rgba(59, 130, 246, 0.25)");
    gradient.addColorStop(0.5, "rgba(59, 130, 246, 0.08)");
    gradient.addColorStop(1, "rgba(59, 130, 246, 0.0)");

    chartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Harga Rata-rata Nasional",
            data: prices,
            borderColor: "#3b82f6",
            backgroundColor: gradient,
            fill: true,
            borderWidth: 3,
            pointRadius: 1.5,
            pointHoverRadius: 6,
            tension: 0.15,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "rgba(17, 24, 39, 0.95)",
            titleColor: "#f9fafb",
            bodyColor: "#d1d5db",
            borderColor: "rgba(255, 255, 255, 0.1)",
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            titleFont: {
              family: "Inter, system-ui, sans-serif",
              weight: "bold",
            },
            bodyFont: {
              family: "Inter, system-ui, sans-serif",
            },
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || "";
                if (label) {
                  label += ": ";
                }
                if (context.parsed.y !== null) {
                  label += new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    maximumFractionDigits: 0,
                  }).format(context.parsed.y);
                }
                return label;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              color: "rgba(255, 255, 255, 0.03)",
              borderColor: "rgba(255, 255, 255, 0.08)",
            },
            ticks: {
              color: "#9ca3af",
              maxTicksLimit: 12,
              font: {
                family: "Inter, system-ui, sans-serif",
                size: 11,
              },
            },
          },
          y: {
            grid: {
              color: "rgba(255, 255, 255, 0.03)",
              borderColor: "rgba(255, 255, 255, 0.08)",
            },
            ticks: {
              color: "#9ca3af",
              font: {
                family: "Inter, system-ui, sans-serif",
                size: 11,
              },
              callback: function (value) {
                return "Rp " + value.toLocaleString("id-ID");
              },
            },
            title: {
              display: true,
              text: "Harga Rata-rata (Rupiah)",
              color: "#9ca3af",
              font: {
                family: "Inter, system-ui, sans-serif",
                size: 12,
                weight: 600,
              },
            },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [data]);

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", minHeight: "450px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginBottom: "1rem" }}>
        <button
          onClick={handleDownloadImage}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            padding: "0.4rem 0.8rem",
            fontSize: "0.8rem",
            borderRadius: "6px",
            background: "rgba(30, 41, 59, 0.6)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            transition: "var(--transition-smooth)"
          }}
          title="Unduh Grafik sebagai Gambar (PNG)"
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-primary)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
            e.currentTarget.style.background = "rgba(51, 65, 85, 0.8)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-secondary)";
            e.currentTarget.style.borderColor = "var(--glass-border)";
            e.currentTarget.style.background = "rgba(30, 41, 59, 0.6)";
          }}
        >
          <Image size={14} />
          <span>Download PNG</span>
        </button>
        <button
          onClick={handleDownloadCSV}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            padding: "0.4rem 0.8rem",
            fontSize: "0.8rem",
            borderRadius: "6px",
            background: "rgba(30, 41, 59, 0.6)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            transition: "var(--transition-smooth)"
          }}
          title="Unduh Data sebagai CSV"
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-primary)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
            e.currentTarget.style.background = "rgba(51, 65, 85, 0.8)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-secondary)";
            e.currentTarget.style.borderColor = "var(--glass-border)";
            e.currentTarget.style.background = "rgba(30, 41, 59, 0.6)";
          }}
        >
          <FileText size={14} />
          <span>Download CSV</span>
        </button>
      </div>
      <div style={{ flex: 1, position: "relative" }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
