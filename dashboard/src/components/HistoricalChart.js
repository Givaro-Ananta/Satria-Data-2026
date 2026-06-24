"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export default function HistoricalChart({ data }) {
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

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
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "450px" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
