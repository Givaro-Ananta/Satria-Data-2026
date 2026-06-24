import "./globals.css";
import Navbar from "../components/Navbar";

export const metadata = {
  title: "Dashboard Interaktif Forecasting Harga Pangan Nasional",
  description: "Forecast dihitung ulang secara live menggunakan Prophet (backend Python Render/FastAPI).",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Navbar />
        <div style={{ flex: 1 }}>{children}</div>
      </body>
    </html>
  );
}

