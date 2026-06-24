"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export default function ForecastChart({ 
  data, 
  showUpper = true, 
  showLower = true, 
  showForecast = true, 
  showHistorical = true 
}) {
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

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
      color: "rgba(255, 255, 255, 0.05)",
      borderColor: "rgba(255, 255, 255, 0.1)",
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
        borderColor: "#3b82f6",
        backgroundColor: "#3b82f6",
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
            backgroundColor: "rgba(17, 24, 39, 0.9)",
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
              color: "#9ca3af",
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
              text: "Harga (Rupiah)",
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
  }, [data, showUpper, showLower, showForecast, showHistorical]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "400px" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
