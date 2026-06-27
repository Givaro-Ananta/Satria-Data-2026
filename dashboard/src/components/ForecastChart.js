"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { Image as ImageIcon, FileText } from "lucide-react";

export default function ForecastChart({
  data,
  showUpper = true,
  showLower = true,
  showForecast = true,
  showHistorical = true
}) {
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
    link.download = `grafik_forecast_${commodityName}_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadCSV = () => {
    if (!data) return;
    const headers = ["Tanggal", "Tipe Data", "Harga (Rp)", "Batas Bawah (Rp)", "Batas Atas (Rp)"];
    const rows = [];

    if (data.historical) {
      data.historical.forEach((p) => {
        rows.push([p.date, "Historis", p.value, "", ""]);
      });
    }

    if (data.forecast) {
      data.forecast.forEach((p) => {
        rows.push([p.date, "Proyeksi", p.value, p.lower || "", p.upper || ""]);
      });
    }

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => `"${val}"`).join(","))
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    const commodityName = data?.commodity ? data.commodity.replace(/\s+/g, "_").toLowerCase() : "commodity";
    link.download = `data_forecast_${commodityName}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    // Destroy existing chart if it exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    if (!data || !data.historical || !data.forecast) {
      return;
    }

    const labels = [
      ...data.historical.map((p) => p.date),
      ...data.forecast.map((p) => p.date),
    ];

    const histData = [
      ...data.historical.map((p) => p.value),
      ...data.forecast.map(() => null),
    ];

    const forecastData = [
      ...data.historical.map(() => null),
      ...data.forecast.map((p) => p.value),
    ];

    const upperData = [
      ...data.historical.map(() => null),
      ...data.forecast.map((p) => p.upper),
    ];

    const lowerData = [
      ...data.historical.map(() => null),
      ...data.forecast.map((p) => p.lower),
    ];

    const ctx = canvasRef.current.getContext("2d");

    // Grid configuration for modern premium look
    const gridConfig = {
      color: "rgba(0, 0, 0, 0.04)",
      borderColor: "rgba(0, 0, 0, 0.08)",
    };

    // Dynamically build datasets list based on toggles
    const datasets = [];

    if (showUpper) {
      datasets.push({
        label: "Batas Atas (Maksimal)",
        data: upperData,
        borderWidth: 0,
        pointRadius: 0,
        backgroundColor: "rgba(245, 158, 11, 0.08)",
        fill: showLower ? "+1" : false,
        tension: 0.2,
      });
    }

    if (showLower) {
      datasets.push({
        label: "Batas Bawah (Minimal)",
        data: lowerData,
        borderWidth: 0,
        pointRadius: 0,
        backgroundColor: "rgba(245, 158, 11, 0.08)",
        fill: false,
        tension: 0.2,
      });
    }

    if (showHistorical) {
      datasets.push({
        label: "Harga Historis (+ Data Baru)",
        data: histData,
        borderColor: "#0d9488",
        backgroundColor: "#0d9488",
        pointRadius: 2,
        pointHoverRadius: 5,
        borderWidth: 3,
        tension: 0.1,
      });
    }

    if (showForecast) {
      datasets.push({
        label: "Proyeksi Rata-rata",
        data: forecastData,
        borderColor: "#f59e0b",
        backgroundColor: "#f59e0b",
        borderDash: [6, 4],
        pointRadius: 2,
        pointHoverRadius: 5,
        borderWidth: 3,
        tension: 0.1,
      });
    }

    chartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets,
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
            position: "top",
            onClick: function (e, legendItem, legend) {
              const index = legendItem.datasetIndex;
              const ci = legend.chart;

              if (ci.isDatasetVisible(index)) {
                ci.hide(index);
                legendItem.hidden = true;
              } else {
                ci.show(index);
                legendItem.hidden = false;
              }

              // Find indices of relevant datasets
              const histDatasetIndex = ci.data.datasets.findIndex(
                d => d.label === "Harga Historis (+ Data Baru)"
              );
              const forecastDatasetIndex = ci.data.datasets.findIndex(
                d => d.label === "Proyeksi Rata-rata"
              );
              const upperDatasetIndex = ci.data.datasets.findIndex(
                d => d.label === "Batas Atas (Maksimal)"
              );
              const lowerDatasetIndex = ci.data.datasets.findIndex(
                d => d.label === "Batas Bawah (Minimal)"
              );

              // Sync bounds visibility if "Proyeksi Rata-rata" is toggled
              if (forecastDatasetIndex !== -1 && index === forecastDatasetIndex) {
                const isForecastVisible = ci.isDatasetVisible(forecastDatasetIndex);
                if (!isForecastVisible) {
                  if (upperDatasetIndex !== -1) ci.hide(upperDatasetIndex);
                  if (lowerDatasetIndex !== -1) ci.hide(lowerDatasetIndex);
                } else {
                  if (upperDatasetIndex !== -1) ci.show(upperDatasetIndex);
                  if (lowerDatasetIndex !== -1) ci.show(lowerDatasetIndex);
                }
              }

              // Auto-zoom logic based on "Harga Historis (+ Data Baru)" visibility
              if (histDatasetIndex !== -1) {
                const isHistVisible = ci.isDatasetVisible(histDatasetIndex);
                if (!isHistVisible) {
                  // Zoom into the forecast range using the exact label string
                  const targetLabel = labels[data.historical.length];
                  ci.options.scales.x.min = targetLabel !== undefined ? targetLabel : data.historical.length;
                } else {
                  // Reset zoom
                  ci.options.scales.x.min = undefined;
                }
              }

              ci.update();
            },
            labels: {
              color: "#e5e7eb",
              font: {
                family: "Inter, system-ui, sans-serif",
                size: 12,
              },
              usePointStyle: true,
              pointStyle: "circle",
            },
          },
          tooltip: {
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            titleColor: "#0f172a",
            bodyColor: "#475569",
            borderColor: "rgba(13, 148, 136, 0.15)",
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
                if (label.includes("Batas")) {
                  // Format bound values nicely but keep them in tooltip
                  label += ": ";
                } else if (label) {
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
            min: undefined,
            grid: gridConfig,
            ticks: {
              color: "#475569",
              maxTicksLimit: 12,
              font: {
                family: "Inter, system-ui, sans-serif",
                size: 11,
              },
            },
          },
          y: {
            grid: gridConfig,
            ticks: {
              color: "#475569",
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
              text: "Harga (Rupiah)",
              color: "#475569",
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
  }, [data, showUpper, showLower, showForecast, showHistorical]);

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
            background: "#f1f5f9",
            border: "1px solid var(--glass-border)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            transition: "var(--transition-smooth)"
          }}
          title="Unduh Grafik sebagai Gambar (PNG)"
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-primary)";
            e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.25)";
            e.currentTarget.style.background = "#e2e8f0";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-secondary)";
            e.currentTarget.style.borderColor = "var(--glass-border)";
            e.currentTarget.style.background = "#f1f5f9";
          }}
        >
          <ImageIcon size={14} />
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
            background: "#f1f5f9",
            border: "1px solid var(--glass-border)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            transition: "var(--transition-smooth)"
          }}
          title="Unduh Data sebagai CSV"
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-primary)";
            e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.25)";
            e.currentTarget.style.background = "#e2e8f0";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-secondary)";
            e.currentTarget.style.borderColor = "var(--glass-border)";
            e.currentTarget.style.background = "#f1f5f9";
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
