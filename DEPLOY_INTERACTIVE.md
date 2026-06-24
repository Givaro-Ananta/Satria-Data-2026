# Panduan Deploy Dashboard Interaktif Forecasting Harga Pangan

Dashboard ini memungkinkan user **input harga komoditas bulan tertentu** (manual atau upload CSV), lalu **forecast dihitung ulang secara live** menggunakan Prophet — model yang sama dengan `06_prophet_model.py` di `code.ipynb`.

Karena Vercel tidak cocok untuk menjalankan model Python berat (lihat batasan di panduan deploy statis sebelumnya), arsitekturnya dipecah jadi dua:

```
┌──────────────────────┐      HTTPS / fetch       ┌───────────────────────┐
│   FRONTEND (Vercel)   │ ───────────────────────▶ │   BACKEND (Render)    │
│   dashboard/          │ ◀─────────────────────── │   backend/            │
│   HTML + JS + Chart.js│        JSON response      │   FastAPI + Prophet   │
└──────────────────────┘                            └───────────────────────┘
```

- **Frontend** → static, ringan, di-deploy ke **Vercel** via web dashboard (sama seperti sebelumnya).
- **Backend** → Python + Prophet (butuh resource lebih besar & waktu komputasi lebih lama dari limit Vercel), di-deploy ke **Render** via web dashboard.

---

## Struktur Proyek

```
project-root/
├── Code/
│   └── code.ipynb
├── outputs/
│   └── national_avg_clean_fixed.csv     # hasil Phase 0-1
├── backend/                               # <- deploy ke Render
│   ├── app.py
│   ├── requirements.txt
│   └── data/
│       └── national_avg_clean_fixed.csv  # copy dari outputs/
└── dashboard/                              # <- deploy ke Vercel
    ├── index.html
    ├── app.js
    └── config.js
```

File `app.py`, `requirements.txt`, `index.html`, `app.js`, dan `config.js` sudah dibuatkan — letakkan sesuai struktur di atas.

---

## Langkah 1 — Siapkan Data untuk Backend

Copy hasil Phase 0–1 pipeline ke folder backend:

```bash
cp outputs/national_avg_clean_fixed.csv backend/data/
```

Backend akan memuat file ini sebagai data historis dasar, lalu menggabungkannya dengan titik data yang diinput user sebelum menjalankan Prophet ulang.

---

## Langkah 2 — Tes Backend Secara Lokal (opsional tapi disarankan)

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

Buka `http://localhost:8000/commodities` di browser — harus muncul daftar 8 komoditas. Jika error "File data historis tidak ditemukan", pastikan Langkah 1 sudah dilakukan.

> **Catatan instalasi Prophet:** Prophet butuh `cmdstanpy`/compiler C++, instalasi pertama kali bisa makan waktu beberapa menit. Ini normal.

---

## Langkah 3 — Push ke GitHub

```bash
git init
git add .
git commit -m "Dashboard interaktif forecasting harga pangan"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

---

## Langkah 4 — Deploy Backend ke Render (via Web Dashboard)

1. Buka **https://dashboard.render.com**, login/daftar pakai GitHub.
2. Klik **New +** → **Web Service**.
3. Pilih repo GitHub kamu, klik **Connect**.
4. Isi konfigurasi:
   - **Name**: misal `forecasting-pangan-api`
   - **Root Directory**: `backend`
   - **Runtime**: **Python 3**
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free (cukup untuk testing; kalau lambat/timeout naikkan ke paid tier karena Prophet cukup berat)
5. Klik **Create Web Service**.
6. Tunggu build selesai (instalasi Prophet bisa 3–5 menit). Setelah sukses, catat URL backend, contoh:
   `https://forecasting-pangan-api.onrender.com`
7. Tes di browser: buka `https://forecasting-pangan-api.onrender.com/commodities` → harus muncul JSON daftar komoditas.

> Free tier Render akan **sleep** kalau tidak ada traffic, jadi request pertama setelah idle agak lambat (cold start ~30-50 detik). Ini normal untuk free tier.

---

## Langkah 5 — Hubungkan Frontend ke Backend

1. Edit `dashboard/config.js`, ganti dengan URL Render dari Langkah 4:

```js
const API_BASE_URL = "https://forecasting-pangan-api.onrender.com";
```

2. Edit `backend/app.py`, di bagian `ALLOWED_ORIGINS` tambahkan domain Vercel yang **akan** kamu pakai (tebak dulu nama project-nya, atau update lagi setelah Langkah 6):

```python
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://nama-project-kamu.vercel.app",
]
```

3. Commit & push perubahan ini — Render akan otomatis redeploy backend.

```bash
git add .
git commit -m "Hubungkan frontend ke backend"
git push
```

---

## Langkah 6 — Deploy Frontend ke Vercel (via Web Dashboard)

1. Buka **https://vercel.com/dashboard**, login pakai GitHub.
2. Klik **Add New...** → **Project**.
3. Pilih **Import Git Repository** → pilih repo yang sama → **Import**.
4. Di **Configure Project**:
   - **Framework Preset**: **Other**
   - **Root Directory**: klik **Edit** → pilih `dashboard`
   - **Build Command**: kosongkan / **None**
   - **Output Directory**: default (`.`)
5. Klik **Deploy**.
6. Setelah selesai, Vercel memberi URL seperti `https://nama-project-kamu.vercel.app`.

**Jika nama domain Vercel berbeda dari yang kamu tebak di Langkah 5**, update `ALLOWED_ORIGINS` di `backend/app.py` dengan domain yang benar, lalu push lagi supaya Render redeploy.

---

## Langkah 7 — Tes End-to-End

1. Buka URL Vercel kamu.
2. Pilih komoditas, misal **Rice**.
3. Tambah titik data manual (misal bulan `2026-05`, harga `15500`), atau upload CSV dengan kolom `date,price`.
4. Klik **Hitung Ulang Forecast**.
5. Chart harus muncul: garis historis (termasuk titik baru dari user) + garis forecast Prophet + area confidence interval.

Kalau muncul error CORS di console browser → cek lagi `ALLOWED_ORIGINS` di `backend/app.py` sudah memuat domain Vercel yang benar, lalu redeploy backend.

---

## Update di Kemudian Hari

- **Update data dasar / model**: edit `backend/app.py` atau ganti `backend/data/national_avg_clean_fixed.csv` → push → Render auto-redeploy.
- **Update tampilan**: edit file di `dashboard/` → push → Vercel auto-redeploy.

---

## Catatan & Batasan

- Backend menjalankan **Prophet** secara on-demand setiap kali user klik "Hitung Ulang Forecast" — untuk komoditas dengan ~18 tahun data bulanan, biasanya selesai dalam beberapa detik, tapi tetap lebih lambat dari endpoint biasa karena fitting model.
- Free tier Render bisa sleep saat idle → request pertama lambat. Untuk demo penting (presentasi lomba), buka dashboard beberapa menit sebelumnya supaya backend sudah "bangun".
- Endpoint saat ini hanya menjalankan **Prophet** (bukan full Phase 0–9 dengan perbandingan SARIMA/ETS/Prophet seperti notebook asli). Kalau ingin replikasi penuh logika pemilihan "best model" per komoditas dari `07_model_comparison.py`, itu bisa ditambahkan ke `backend/app.py` — tapi akan menambah waktu komputasi per request.
- Data yang diinput user **tidak disimpan permanen** di backend (hanya dipakai sekali untuk hitung ulang forecast di request itu). Kalau butuh histori input user tersimpan, perlu tambahan database (misal Postgres di Render) — beri tahu saya kalau ini dibutuhkan.
