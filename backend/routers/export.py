"""
PDF export — /api/export/pdf/{symbol}

Generates a PDF analysis report using reportlab + matplotlib.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import akshare as ak
import io
import json
import os
import logging
import numpy as np
from datetime import datetime, timedelta

router = APIRouter()
logger = logging.getLogger("export")


def _get_name(code: str) -> str:
    try:
        path = os.path.join(os.path.dirname(__file__), "../data/stock_names.json")
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f).get(code, code)
    except Exception:
        return code


def _fetch_history(symbol: str):
    end = datetime.now()
    start = end - timedelta(days=365)
    for adj in ("qfq", ""):
        try:
            df = ak.stock_zh_a_hist(
                symbol=symbol, period="daily",
                start_date=start.strftime("%Y-%m-%d"),
                end_date=end.strftime("%Y-%m-%d"),
                adjust=adj,
            )
            if df is not None and not df.empty:
                return df
        except Exception as e:
            logger.debug("hist fetch %s adj=%s: %s", symbol, adj, e)
    return None


def _make_chart_png(df) -> bytes:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    df2 = df.copy()
    df2.columns = [str(c).lower() for c in df2.columns]
    close_col = next((c for c in ("收盘", "close", "收盘价") if c in df2.columns), None)
    if close_col is None:
        return b""

    closes = df2[close_col].astype(float).values
    x = range(len(closes))

    fig, ax = plt.subplots(figsize=(10, 3.5), facecolor="#0d1117")
    ax.set_facecolor("#0d1117")
    ax.plot(x, closes, color="#8ab4f8", linewidth=1.5)
    ax.fill_between(x, closes, closes.min() * 0.995, alpha=0.18, color="#8ab4f8")
    ax.tick_params(colors="#9aa0a6", labelsize=8)
    for spine in ax.spines.values():
        spine.set_edgecolor("#2d3748")
    ax.grid(True, alpha=0.12, color="#4a5568")
    ax.set_xlabel("交易日", color="#9aa0a6", fontsize=9)
    ax.set_ylabel("价格 (元)", color="#9aa0a6", fontsize=9)

    buf = io.BytesIO()
    plt.tight_layout()
    plt.savefig(buf, format="png", dpi=120, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def _build_pdf(symbol: str, name: str, df) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
                                    Table, TableStyle, Image as RLImage,
                                    HRFlowable)
    from reportlab.lib.styles import ParagraphStyle

    BLUE   = colors.HexColor("#8ab4f8")
    PURPLE = colors.HexColor("#c084fc")
    TEXT   = colors.HexColor("#e8eaed")
    DIM    = colors.HexColor("#9aa0a6")
    ROW1   = colors.HexColor("#0d1117")
    ROW2   = colors.HexColor("#111827")
    GRID   = colors.HexColor("#2d3748")

    title_s   = ParagraphStyle("t",  fontName="Helvetica-Bold",   fontSize=22, textColor=BLUE,   spaceAfter=4,  leading=28)
    sub_s     = ParagraphStyle("s",  fontName="Helvetica",        fontSize=12, textColor=DIM,    spaceAfter=2)
    section_s = ParagraphStyle("h",  fontName="Helvetica-Bold",   fontSize=13, textColor=BLUE,   spaceBefore=10, spaceAfter=6)
    body_s    = ParagraphStyle("b",  fontName="Helvetica",        fontSize=10, textColor=TEXT,   leading=14)
    disc_s    = ParagraphStyle("d",  fontName="Helvetica-Oblique",fontSize=8,  textColor=DIM,    leading=11)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            topMargin=1.5*cm, bottomMargin=1.5*cm,
                            leftMargin=2*cm, rightMargin=2*cm)
    els = []

    # Cover
    els += [
        Spacer(1, 1*cm),
        Paragraph(f"{name}  ({symbol})", title_s),
        Paragraph("A 股量化分析报告", sub_s),
        Paragraph(f"生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M')}", sub_s),
        HRFlowable(width="100%", thickness=1, color=BLUE, spaceAfter=14),
    ]

    # Price metrics
    if df is not None and not df.empty:
        df2 = df.copy()
        df2.columns = [str(c).lower() for c in df2.columns]
        cc = next((c for c in ("收盘", "close", "收盘价") if c in df2.columns), None)
        if cc:
            closes = df2[cc].astype(float)
            curr = closes.iloc[-1]
            hi   = closes.max()
            lo   = closes.min()
            ret  = (curr / closes.iloc[0] - 1) * 100
            vol  = closes.pct_change().std() * np.sqrt(252) * 100
            roll_max = closes.expanding().max()
            max_dd   = ((closes - roll_max) / roll_max).min() * 100

            els.append(Paragraph("价格摘要", section_s))
            tbl = Table(
                [["指标", "数值"],
                 ["当前价格", f"¥{curr:.2f}"],
                 ["52周最高", f"¥{hi:.2f}"],
                 ["52周最低", f"¥{lo:.2f}"],
                 ["近一年收益", f"{ret:+.2f}%"],
                 ["年化波动率", f"{vol:.2f}%"],
                 ["最大回撤",   f"{max_dd:.2f}%"]],
                colWidths=[8*cm, 8*cm],
            )
            tbl.setStyle(TableStyle([
                ("BACKGROUND",   (0,0), (-1,0), BLUE),
                ("TEXTCOLOR",    (0,0), (-1,0), colors.white),
                ("TEXTCOLOR",    (0,1), (-1,-1), TEXT),
                ("FONTNAME",     (0,0), (-1,0), "Helvetica-Bold"),
                ("FONTSIZE",     (0,0), (-1,-1), 10),
                ("ROWBACKGROUNDS",(0,1),(-1,-1), [ROW1, ROW2]),
                ("GRID",         (0,0), (-1,-1), 0.5, GRID),
                ("ALIGN",        (1,0), (1,-1), "RIGHT"),
                ("TOPPADDING",   (0,0), (-1,-1), 5),
                ("BOTTOMPADDING",(0,0), (-1,-1), 5),
            ]))
            els += [tbl, Spacer(1, 0.6*cm)]

        # Chart
        chart_png = _make_chart_png(df)
        if chart_png:
            els.append(Paragraph("近一年价格走势", section_s))
            img = RLImage(io.BytesIO(chart_png), width=16*cm, height=5.5*cm)
            els += [img, Spacer(1, 0.6*cm)]

    # Disclaimer
    els += [
        HRFlowable(width="100%", thickness=0.5, color=DIM, spaceAfter=8),
        Paragraph(
            "⚠ 免责声明：本报告由 Best Friend Stock 系统自动生成，仅供学习与参考，"
            "不构成任何投资建议。股市有风险，投资需谨慎。",
            disc_s,
        ),
    ]

    doc.build(els)
    buf.seek(0)
    return buf.read()


@router.get("/pdf/{symbol}")
def export_pdf(symbol: str):
    name = _get_name(symbol)
    df   = _fetch_history(symbol)
    try:
        pdf_bytes = _build_pdf(symbol, name, df)
    except Exception as e:
        logger.exception("PDF build failed for %s", symbol)
        raise HTTPException(status_code=500, detail=f"PDF生成失败: {e}")

    filename = f"{symbol}_{name}_report.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
