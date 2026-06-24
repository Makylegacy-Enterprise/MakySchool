from __future__ import annotations

import html
import uuid
from datetime import datetime

import asyncpg

from app.lib.receipt import format_class_name, format_ugx


class ReceiptNotFoundError(Exception):
    pass


def _escape(value: str) -> str:
    return html.escape(value, quote=True)


def _format_date(value: str | datetime) -> str:
    if isinstance(value, datetime):
        date = value
    else:
        raw = str(value)
        if "T" not in raw and len(raw) == 10:
            date = datetime.strptime(raw, "%Y-%m-%d")
        else:
            date = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    return f"{date.day} {date.strftime('%B %Y')}"


def _method_label(method: str) -> str:
    labels = {
        "bank_transfer": "Bank Transfer",
        "mobile_money": "Mobile Money",
        "cheque": "Cheque",
        "other": "Other",
    }
    return labels.get(method, "Cash")


def build_receipt_html(data: dict) -> str:
    voided_overlay = ""
    if data["voided"]:
        voided_overlay = """
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:10;">
          <div style="transform:rotate(-35deg);font-size:72px;font-weight:700;color:rgba(220,38,38,0.25);border:6px solid rgba(220,38,38,0.35);padding:12px 48px;">VOIDED</div>
        </div>
        """

    meta_parts = [
        _escape(str(v))
        for v in (data.get("school_address"), data.get("school_phone"), data.get("school_email"))
        if v
    ]
    meta = " · ".join(meta_parts)

    logo_html = ""
    if data.get("logo_url"):
        logo_html = f'<img class="logo" src="{_escape(data["logo_url"])}" alt="Logo" />'

    stamp_html = ""
    if data.get("stamp_url"):
        stamp_html = f'<img class="stamp" src="{_escape(data["stamp_url"])}" alt="Stamp" />'

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * {{ box-sizing: border-box; }}
    body {{ font-family: Arial, sans-serif; color: #111; margin: 0; padding: 20mm; position: relative; }}
    .header {{ display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }}
    .logo, .stamp {{ width: 80px; height: 80px; object-fit: contain; }}
    .school-name {{ font-size: 22px; font-weight: 700; margin: 0; }}
    .meta {{ color: #555; font-size: 12px; margin-top: 4px; }}
    .title {{ text-align: center; font-size: 18px; font-weight: 700; margin: 24px 0 8px; letter-spacing: 1px; }}
    .divider {{ border-top: 1px solid #ccc; margin: 16px 0; }}
    .row {{ display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }}
    .label {{ color: #555; }}
    .value {{ font-weight: 600; text-align: right; }}
    .signatures {{ display: flex; justify-content: space-between; margin-top: 48px; }}
    .sig-line {{ width: 42%; border-top: 1px solid #333; padding-top: 8px; font-size: 12px; text-align: center; }}
    .footer {{ margin-top: 32px; font-size: 11px; color: #666; text-align: center; }}
  </style>
</head>
<body>
  {voided_overlay}
  <div class="header">
    <div>
      {logo_html}
      <h1 class="school-name">{_escape(data["school_name"])}</h1>
      <div class="meta">{meta}</div>
    </div>
    {stamp_html}
  </div>
  <div class="title">OFFICIAL PAYMENT RECEIPT</div>
  <div class="row"><span class="label">Receipt No:</span><span class="value">{_escape(data["receipt_number"])}</span></div>
  <div class="row"><span class="label">Date:</span><span class="value">{_escape(_format_date(data["payment_date"]))}</span></div>
  <div class="divider"></div>
  <div class="row"><span class="label">Student:</span><span class="value">{_escape(data["student_name"])}</span></div>
  <div class="row"><span class="label">Learner ID:</span><span class="value">{_escape(data["learner_id"])}</span></div>
  <div class="row"><span class="label">Class:</span><span class="value">{_escape(data["class_name"])}</span></div>
  <div class="row"><span class="label">Term:</span><span class="value">{_escape(data["term_name"])}</span></div>
  <div class="divider"></div>
  <div class="row"><span class="label">Fee Item:</span><span class="value">School Fees {_escape(data["term_name"])}</span></div>
  <div class="row"><span class="label">Total Fees:</span><span class="value">{_escape(format_ugx(data["amount_owed"]))}</span></div>
  <div class="row"><span class="label">Amount Paid:</span><span class="value">{_escape(format_ugx(data["amount"]))}</span></div>
  <div class="row"><span class="label">Previous Paid:</span><span class="value">{_escape(format_ugx(data["previous_paid"]))}</span></div>
  <div class="row"><span class="label">Outstanding Bal:</span><span class="value">{_escape(format_ugx(data["balance"]))}</span></div>
  <div class="row"><span class="label">Payment Method:</span><span class="value">{_escape(_method_label(data["payment_method"]))}</span></div>
  <div class="row"><span class="label">Reference:</span><span class="value">{_escape(data.get("payment_reference") or "—")}</span></div>
  <div class="divider"></div>
  <div class="row"><span class="label">Recorded by:</span><span class="value">{_escape(data.get("recorded_by_name") or "—")}</span></div>
  <div class="signatures">
    <div class="sig-line">Bursar Signature</div>
    <div class="sig-line">School Stamp</div>
  </div>
  <div class="footer">
    This receipt is proof of payment. Keep for your records.
  </div>
</body>
</html>"""


async def fetch_receipt_data(
    conn: asyncpg.Connection, payment_id: uuid.UUID, school_id: uuid.UUID
) -> dict:
    row = await conn.fetchrow(
        """
        SELECT
          fp.receipt_number,
          fp.payment_date,
          fp.amount,
          fp.payment_method,
          fp.payment_reference,
          fp.voided,
          s.full_name AS student_name,
          s.learner_id,
          sc.level,
          sc.stream,
          fs.term_name,
          sfa.amount_owed,
          sfa.amount_paid,
          sfa.balance,
          COALESCE(recorder.name, recorder.full_name) AS recorded_by_name,
          sch.name AS school_name,
          sch.address AS school_address,
          sch.phone AS school_phone,
          sch.email AS school_email,
          sch.logo_url,
          sch.stamp_url
        FROM fee_payments fp
        JOIN students s ON s.id = fp.student_id
        JOIN student_fee_accounts sfa ON sfa.id = fp.fee_account_id
        JOIN fee_structures fs ON fs.id = sfa.fee_structure_id
        LEFT JOIN school_classes sc ON sc.id = s.current_class_id
        LEFT JOIN users recorder ON recorder.id = fp.recorded_by
        JOIN schools sch ON sch.id = fp.school_id
        WHERE fp.id = $1 AND fp.school_id = $2
        LIMIT 1
        """,
        payment_id,
        school_id,
    )
    if not row:
        raise ReceiptNotFoundError("NOT_FOUND")

    amount_paid = int(row["amount_paid"])
    amount = int(row["amount"])
    return {
        "receipt_number": row["receipt_number"],
        "payment_date": row["payment_date"],
        "amount": amount,
        "payment_method": row["payment_method"],
        "payment_reference": row["payment_reference"],
        "voided": row["voided"],
        "student_name": row["student_name"],
        "learner_id": row["learner_id"],
        "class_name": format_class_name(row["level"] or "", row["stream"]),
        "term_name": row["term_name"],
        "amount_owed": int(row["amount_owed"]),
        "amount_paid": amount_paid,
        "balance": int(row["balance"]),
        "previous_paid": amount_paid - amount,
        "recorded_by_name": row["recorded_by_name"],
        "school_name": row["school_name"],
        "school_address": row["school_address"],
        "school_phone": row["school_phone"],
        "school_email": row["school_email"],
        "logo_url": row["logo_url"],
        "stamp_url": row["stamp_url"],
    }


async def generate_fee_receipt_pdf(
    conn: asyncpg.Connection, payment_id: uuid.UUID, school_id: uuid.UUID
) -> tuple[bytes, str]:
    data = await fetch_receipt_data(conn, payment_id, school_id)
    from weasyprint import HTML

    pdf = HTML(string=build_receipt_html(data)).write_pdf()
    return pdf, data["receipt_number"]
