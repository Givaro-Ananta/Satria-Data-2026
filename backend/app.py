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

import numpy as np
from prophet import Prophet
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.statespace.sarimax import SARIMAX

warnings.filterwarnings("ignore")
logging.getLogger("prophet").setLevel(logging.ERROR)
logging.getLogger("cmdstanpy").setLevel(logging.ERROR)



# ---------------------------------------------------------------------------
# SETUP
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "data", "national_avg_clean_fixed.csv")
FORECAST_HORIZON_DEFAULT = 24  # bulan ke depan

app = FastAPI(title="Forecasting Harga Pangan API")

# Konfigurasi CORS agar frontend dapat mengakses API

ALLOWED_ORIGINS = [
    "https://satria-data-2026.vercel.app",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
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

BEST_MODELS = {
    "Meat (beef)": {
        "model_type": "ETS",
        "trend": "add",
        "seasonal": None,
        "damped_trend": False
    },
    "Eggs": {
        "model_type": "ETS",
        "trend": "add",
        "seasonal": "add",
        "damped_trend": False
    },
    "Meat (chicken, broiler)": {
        "model_type": "SARIMA",
        "order": (2, 1, 0),
        "seasonal_order": (0, 1, 1, 12)
    },
    "Sugar": {
        "model_type": "SARIMA",
        "order": (2, 1, 0),
        "seasonal_order": (0, 1, 1, 12)
    },
    "Chili (red)": {
        "model_type": "SARIMA",
        "order": (2, 1, 1),
        "seasonal_order": (0, 1, 1, 12)
    },
    "Chili (bird's eye)": {
        "model_type": "Prophet"
    },
    "Oil (vegetable)": {
        "model_type": "Prophet"
    },
    "Rice": {
        "model_type": "Prophet"
    }
}


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


def _run_ets(series: pd.Series, config: dict, horizon_months: int):
    # ETS Model
    model = ExponentialSmoothing(
        series,
        trend=config["trend"],
        seasonal=config["seasonal"],
        seasonal_periods=12 if config["seasonal"] else None,
        damped_trend=config["damped_trend"],
        initialization_method="estimated"
    )
    fit_res = model.fit(optimized=True, remove_bias=True)
    fc_mean = fit_res.forecast(horizon_months).clip(lower=0)

    # Simulate CI
    resid_std = np.std(fit_res.resid.dropna())
    fc_lower = []
    fc_upper = []
    for i in range(horizon_months):
        step = i + 1
        margin = 1.96 * resid_std * np.sqrt(step)
        val = float(fc_mean.iloc[i])
        fc_lower.append(max(val - margin, 0))
        fc_upper.append(val + margin)

    hist_df = pd.DataFrame({"ds": series.index, "value": series.values})
    future_dates = pd.date_range(
        start=series.index[-1] + pd.DateOffset(months=1),
        periods=horizon_months,
        freq="MS"
    )
    fc_df = pd.DataFrame({
        "ds": future_dates,
        "value": fc_mean.values,
        "yhat_lower": fc_lower,
        "yhat_upper": fc_upper
    })
    return hist_df, fc_df


def _run_sarima(series: pd.Series, config: dict, horizon_months: int):
    # SARIMA Model fitted on log-scale
    log_series = np.log(series)
    model = SARIMAX(
        log_series,
        order=config["order"],
        seasonal_order=config["seasonal_order"],
        enforce_stationarity=False,
        enforce_invertibility=False,
        trend='n'
    )
    fit_res = model.fit(disp=False, maxiter=150, method='lbfgs')

    fc_obj = fit_res.get_forecast(steps=horizon_months)
    fc_log = fc_obj.predicted_mean
    fc_ci_log = fc_obj.conf_int(alpha=0.05)

    # Back-transform to normal price scale
    fc_mean = np.exp(fc_log)
    fc_lower = np.exp(fc_ci_log.iloc[:, 0])
    fc_upper = np.exp(fc_ci_log.iloc[:, 1])

    hist_df = pd.DataFrame({"ds": series.index, "value": series.values})
    future_dates = pd.date_range(
        start=series.index[-1] + pd.DateOffset(months=1),
        periods=horizon_months,
        freq="MS"
    )
    fc_df = pd.DataFrame({
        "ds": future_dates,
        "value": fc_mean.values,
        "yhat_lower": fc_lower.values,
        "yhat_upper": fc_upper.values
    })
    return hist_df, fc_df


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
    
    config = BEST_MODELS.get(req.commodity, {"model_type": "Prophet"})
    model_type = config.get("model_type", "Prophet")

    if model_type == "ETS":
        hist, fc = _run_ets(series, config, req.horizon_months)
    elif model_type == "SARIMA":
        hist, fc = _run_sarima(series, config, req.horizon_months)
    else:
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

    config = BEST_MODELS.get(commodity, {"model_type": "Prophet"})
    model_type = config.get("model_type", "Prophet")

    if model_type == "ETS":
        hist, fc = _run_ets(series, config, horizon_months)
    elif model_type == "SARIMA":
        hist, fc = _run_sarima(series, config, horizon_months)
    else:
        hist, fc = _run_prophet(series, horizon_months)

    return _format_response(commodity, hist, fc)
