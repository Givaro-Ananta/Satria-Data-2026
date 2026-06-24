"""
Backend API - Dashboard Interaktif Forecasting Harga Pangan Nasional
======================================================================
Menerima data tambahan dari user (input manual / upload CSV), menggabungkan
dengan data historis (national_avg_clean_fixed.csv hasil Phase 0-1 notebook),
lalu menjalankan ulang forecasting dengan Prophet (model yang sama dengan
06_prophet_model.py di notebook).

Jalankan lokal:
    pip install -r requirements.txt
    uvicorn app:app --reload --port 8000

Deploy: lihat DEPLOY_INTERACTIVE.md (Render, via web dashboard)
"""

import os
import io
import logging
import warnings
from typing import List

import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

warnings.filterwarnings("ignore")
logging.getLogger("prophet").setLevel(logging.ERROR)
logging.getLogger("cmdstanpy").setLevel(logging.ERROR)

from prophet import Prophet

# ---------------------------------------------------------------------------
# SETUP
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "data", "national_avg_clean_fixed.csv")
FORECAST_HORIZON_DEFAULT = 24  # bulan ke depan

app = FastAPI(title="Forecasting Harga Pangan API")

# Konfigurasi CORS agar frontend dapat mengakses API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_base_df() -> pd.DataFrame:
    if not os.path.exists(DATA_FILE):
        raise FileNotFoundError(
            f"File data historis tidak ditemukan: {DATA_FILE}. "
            "Copy outputs/national_avg_clean_fixed.csv dari hasil notebook ke backend/data/."
        )
    df = pd.read_csv(DATA_FILE, parse_dates=["date"], index_col="date")
    df.index = pd.to_datetime(df.index).to_period("M").to_timestamp()
    df = df.sort_index()
    full_idx = pd.date_range(df.index[0], df.index[-1], freq="MS")
    return df.reindex(full_idx).ffill()


BASE_DF = load_base_df()
COMMODITIES = list(BASE_DF.columns)


class PricePoint(BaseModel):
    date: str  # "YYYY-MM" atau "YYYY-MM-DD"
    price: float


class ForecastRequest(BaseModel):
    commodity: str
    points: List[PricePoint] = []
    horizon_months: int = FORECAST_HORIZON_DEFAULT


@app.get("/")
def root():
    return {"status": "ok", "message": "Forecasting Harga Pangan API"}


@app.get("/commodities")
def get_commodities():
    return {
        "commodities": COMMODITIES,
        "date_range": {
            "start": BASE_DF.index[0].strftime("%Y-%m"),
            "end": BASE_DF.index[-1].strftime("%Y-%m"),
        },
    }


@app.get("/historical/{commodity}")
def get_historical(commodity: str):
    if commodity not in COMMODITIES:
        raise HTTPException(400, f"Komoditas tidak dikenal. Pilihan: {COMMODITIES}")
    
    series = BASE_DF[commodity].dropna()
    return {
        "commodity": commodity,
        "historical": [
            {"date": d.strftime("%Y-%m"), "value": round(float(v), 2)}
            for d, v in zip(series.index, series.values)
        ]
    }


def _merge_points(series: pd.Series, points: List[PricePoint]) -> pd.Series:
    series = series.copy()
    for p in points:
        ts = pd.to_datetime(p.date).to_period("M").to_timestamp()
        series.loc[ts] = p.price
    return series.sort_index()


def _run_prophet(series: pd.Series, horizon_months: int):
    df_p = pd.DataFrame({"ds": series.index, "y": series.values})

    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=False,
        daily_seasonality=False,
        changepoint_prior_scale=0.05,
    )
    model.fit(df_p)

    future = model.make_future_dataframe(periods=horizon_months, freq="MS")
    forecast = model.predict(future)

    hist = df_p.rename(columns={"y": "value"})
    fc = forecast[forecast["ds"] > df_p["ds"].max()][["ds", "yhat", "yhat_lower", "yhat_upper"]]
    fc = fc.rename(columns={"yhat": "value"})

    return hist, fc


def _format_response(commodity: str, hist: pd.DataFrame, fc: pd.DataFrame):
    return {
        "commodity": commodity,
        "historical": [
            {"date": d.strftime("%Y-%m"), "value": round(float(v), 2)}
            for d, v in zip(hist["ds"], hist["value"])
        ],
        "forecast": [
            {
                "date": d.strftime("%Y-%m"),
                "value": round(float(v), 2),
                "lower": round(float(lo), 2),
                "upper": round(float(hi), 2),
            }
            for d, v, lo, hi in zip(fc["ds"], fc["value"], fc["yhat_lower"], fc["yhat_upper"])
        ],
    }


@app.post("/forecast")
def forecast(req: ForecastRequest):
    if req.commodity not in COMMODITIES:
        raise HTTPException(400, f"Komoditas tidak dikenal. Pilihan: {COMMODITIES}")

    series = _merge_points(BASE_DF[req.commodity], req.points)
    hist, fc = _run_prophet(series, req.horizon_months)
    return _format_response(req.commodity, hist, fc)


@app.post("/forecast/upload-csv")
async def forecast_from_csv(
    commodity: str = Form(...),
    horizon_months: int = Form(FORECAST_HORIZON_DEFAULT),
    file: UploadFile = File(...),
):
    """
    Dokumen yang diupload (CSV/Excel) harus punya 2 kolom: 'date' (YYYY-MM atau YYYY-MM-DD) dan 'price'.
    """
    if commodity not in COMMODITIES:
        raise HTTPException(400, f"Komoditas tidak dikenal. Pilihan: {COMMODITIES}")

    content = await file.read()
    filename_lower = file.filename.lower()
    
    try:
        if filename_lower.endswith(('.xlsx', '.xls')):
            df_upload = pd.read_excel(io.BytesIO(content))
        else:
            df_upload = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Gagal membaca file: format file tidak valid atau rusak. Detail: {str(e)}")

    cols = {c.lower().strip(): c for c in df_upload.columns}
    if "date" not in cols or "price" not in cols:
        raise HTTPException(400, "Dokumen harus memiliki kolom 'date' dan 'price'")

    points = [
        PricePoint(date=str(row[cols["date"]]), price=float(row[cols["price"]]))
        for _, row in df_upload.iterrows()
    ]

    series = _merge_points(BASE_DF[commodity], points)
    hist, fc = _run_prophet(series, horizon_months)
    return _format_response(commodity, hist, fc)
