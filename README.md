# 🌾 Satria Data 2026 — Forecasting Harga Komoditas Pangan Indonesia

> **Analisis deret waktu dan prediksi harga komoditas pangan nasional Indonesia menggunakan SARIMA, ETS, dan Prophet (2026–2045)**

---

## 📌 Deskripsi Proyek

Proyek ini merupakan submission untuk kompetisi **Satria Data 2026**, yang berfokus pada analisis dan peramalan harga komoditas pangan di Indonesia menggunakan pendekatan *time series forecasting*. Data yang digunakan bersumber dari **World Food Programme (WFP)** yang mencakup harga pangan di berbagai wilayah Indonesia.

Tiga model utama digunakan dan dibandingkan performanya:
- **SARIMA** *(Seasonal AutoRegressive Integrated Moving Average)*
- **ETS** *(Exponential Smoothing / Error-Trend-Seasonal)*
- **Prophet** *(Facebook/Meta Prophet)*

---

## 📁 Struktur Direktori

```
Satria-Data-2026/
│
├── Code/
│   └── code.ipynb                  # Notebook utama: EDA, modeling, dan forecasting
│
├── dataset/
│   └── wfp_food_prices_idn.csv     # Dataset harga pangan Indonesia (WFP) — via Git LFS
│
└── outputs/
    ├── national_avg_clean_fixed.csv      # Data rata-rata nasional (cleaned)
    ├── national_avg_differenced.csv      # Data setelah differencing
    ├── national_avg_enriched.csv         # Data diperkaya dengan fitur tambahan
    │
    ├── figures/                    # Visualisasi hasil analisis (29 grafik)
    │   ├── 01_trend_per_komoditas.png
    │   ├── 02_seasonal_decomposition.png
    │   ├── 03_correlation_heatmap.png
    │   ├── ...
    │   └── 29_tabel_ringkasan_esai.png
    │
    └── tables/                     # Tabel hasil evaluasi & forecast (20 file CSV)
        ├── best_model_per_commodity.csv
        ├── final_forecast_2026_2030.csv
        ├── longterm_forecast_2031_2045.csv
        └── ...
```

---

## 🔬 Metodologi

### 1. Eksplorasi Data (EDA)
- Analisis tren harga per komoditas
- Dekomposisi musiman (trend, seasonal, residual)
- Pola bulanan dan laju pertumbuhan YoY
- Uji stasioneritas: **ADF Test** & **KPSS Test**
- Analisis ACF & PACF

### 2. Preprocessing
- Agregasi harga rata-rata nasional
- Penanganan missing values
- Differencing untuk mencapai stasioneritas

### 3. Modeling & Forecasting
| Model       | Deskripsi                                                   |
| ----------- | ----------------------------------------------------------- |
| **SARIMA**  | Model statistik klasik dengan komponen musiman              |
| **ETS**     | Exponential Smoothing dengan penyesuaian trend & musiman    |
| **Prophet** | Model berbasis additive dengan deteksi changepoint otomatis |

### 4. Evaluasi
- Metrik: **MAPE** *(Mean Absolute Percentage Error)*
- Perbandingan antar model per komoditas
- Pemilihan model terbaik berdasarkan performa MAPE terendah

### 5. Proyeksi Jangka Panjang
- Forecast **2026–2030** (jangka menengah)
- Forecast **2031–2045** dengan 3 skenario: *baseline*, *optimistis*, *pesimistis*
- Composite Food Price Index (CFPI)
- Milestone chart 2025–2045

---

## 📊 Visualisasi Utama

| #     | Visualisasi                                      |
| ----- | ------------------------------------------------ |
| 01    | Tren harga per komoditas                         |
| 02    | Dekomposisi musiman                              |
| 03    | Correlation heatmap                              |
| 04    | Pola bulanan (boxplot)                           |
| 05    | Laju pertumbuhan YoY                             |
| 06    | Rolling statistics                               |
| 07    | Stasioneritas: original vs differenced           |
| 10–12 | SARIMA: forecast vs actual & diagnostics         |
| 14–15 | ETS: forecast vs actual & prediksi 2026–2030     |
| 17–18 | Prophet: forecast vs actual & prediksi 2026–2030 |
| 19    | Perbandingan MAPE tiga model                     |
| 21    | Final forecast semua model                       |
| 23    | Skenario jangka panjang 2031–2045                |
| 25    | Composite Food Price Index                       |
| 26    | Dashboard historis                               |
| 27    | Milestone chart 2025–2045                        |
| 28    | Fan chart proyeksi                               |
| 29    | Tabel ringkasan                                  |

---

## 🛠️ Teknologi & Library

- **Python 3.x**
- `pandas`, `numpy` — manipulasi data
- `matplotlib`, `seaborn` — visualisasi
- `statsmodels` — SARIMA, ETS, uji stasioneritas
- `prophet` — Facebook Prophet forecasting
- `scikit-learn` — evaluasi metrik
- `jupyter notebook` — lingkungan pengembangan

---

## 🚀 Cara Menjalankan

1. **Clone repository**
   ```bash
   git clone https://github.com/Givaro-Ananta/Satria-Data-2026.git
   cd Satria-Data-2026
   ```

2. **Install Git LFS** (untuk download dataset)
   ```bash
   git lfs install
   git lfs pull
   ```

3. **Install dependencies**
   ```bash
   pip install pandas numpy matplotlib seaborn statsmodels prophet scikit-learn jupyter
   ```

4. **Jalankan notebook**
   ```bash
   jupyter notebook Code/code.ipynb
   ```

---

## 📂 Data

Dataset berasal dari **World Food Programme (WFP)**:
- **File:** `dataset/wfp_food_prices_idn.csv`
- **Ukuran:** ~47 MB
- **Cakupan:** Harga pangan di berbagai provinsi Indonesia
- **Periode:** Januari 2007 – Januari 2026 (229 bulan)
- **Sumber:** [WFP VAM Data](https://data.humdata.org/dataset/wfp-food-prices-for-indonesia)

---

## 🛒 Komoditas yang Dianalisis

Proyek ini menganalisis **11 komoditas pangan strategis** yang merepresentasikan kebutuhan pokok masyarakat Indonesia. Data diambil dari rata-rata nasional (*National Average*) WFP dan telah melalui proses rekonstruksi serta enrichment untuk menutup celah data yang hilang.

| No | Komoditas | Kategori | Satuan | Catatan |
|----|-----------|----------|--------|---------|
| 1 | **Rice** *(Beras)* | Serealia & Umbi | IDR/kg | Komoditas paling strategis, diatur harga eceran tertinggi (HET) oleh pemerintah |
| 2 | **Wheat Flour** *(Tepung Terigu)* | Serealia & Umbi | IDR/kg | Tidak ada data pasar regional — diestimasi dari tren nasional |
| 3 | **Eggs** *(Telur Ayam)* | Daging, Ikan & Telur | IDR/kg | Indikator utama inflasi pangan; harga relatif stabil dibanding protein lain |
| 4 | **Meat (beef)** *(Daging Sapi)* | Daging, Ikan & Telur | IDR/kg | Harga tertinggi di antara semua komoditas; dipengaruhi impor |
| 5 | **Meat (chicken, broiler)** *(Daging Ayam)* | Daging, Ikan & Telur | IDR/kg | Sumber protein hewani terjangkau; sangat sensitif terhadap harga pakan |
| 6 | **Milk (condensed)** *(Susu Kental Manis)* | Susu & Produk Susu | IDR/385g | Tidak ada data pasar regional — diestimasi dari tren nasional |
| 7 | **Sugar** *(Gula Pasir)* | Makanan Lainnya | IDR/kg | Disubsidi pemerintah; tren kenaikan signifikan pasca-2022 |
| 8 | **Oil (vegetable)** *(Minyak Goreng)* | Minyak & Lemak | IDR/liter | Mengalami krisis kelangkaan 2022; harga sangat volatil |
| 9 | **Chili (red)** *(Cabai Merah)* | Sayur & Buah | IDR/kg | Komoditas paling volatil; sangat dipengaruhi musim dan cuaca |
| 10 | **Chili (bird's eye)** *(Cabai Rawit)* | Sayur & Buah | IDR/kg | Volatilitas tertinggi; sering menjadi pemicu lonjakan inflasi pangan |
| 11 | **Fuel (kerosene)** *(Minyak Tanah)* | Non-Pangan | IDR/liter | Disubsidi; relevan sebagai proxy biaya energi rumah tangga |

### Catatan Preprocessing Data

- **Koreksi Anomali Jan-2020:** Tiga komoditas (Cabai Rawit, Cabai Merah, Daging Ayam) memiliki harga Januari 2020 yang ~10× lebih rendah dari bulan sekitarnya — diduga kesalahan skala pada sumber WFP. Nilai dikoreksi dengan mengalikan 10.
- **Rekonstruksi Data 2024–2026:** Data WFP untuk beberapa komoditas berakhir sebelum 2026; nilai di luar periode tersebut direkonstruksi menggunakan rata-rata tertimbang dari pasar-pasar regional yang tersedia dengan rasio kalibrasi.
- **Outlier Handling:** Deteksi menggunakan metode IQR ×5.0 (konservatif) agar spike harga yang nyata tidak dihapus sebagai outlier.
- **Missing Values:** Interpolasi linear, dilanjutkan *forward-fill* dan *backward-fill* untuk data di ujung seri.

---

## 📄 Lisensi

Proyek ini dibuat untuk keperluan kompetisi **Satria Data 2026**.
