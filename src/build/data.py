"""Synthetic data for the demo. Fixed seed so every build is identical.

Nothing here comes from the real client: names, suppliers, VAT numbers
and amounts are all invented.
"""
import csv
import random
from datetime import date, timedelta
from pathlib import Path

random.seed(2026)

START, END = date(2026, 7, 1), date(2026, 9, 30)
MONTHS = [(2026, 7, "يوليو 2026"), (2026, 8, "أغسطس 2026"), (2026, 9, "سبتمبر 2026")]
DAY_NAMES = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"]

EMPLOYEES = [  # name, base salary, transport allowance
    ("أحمد", 3000, 300), ("خالد", 2800, 300), ("يوسف", 2800, 300),
    ("سامي", 2500, 250), ("فارس", 2500, 250), ("ماجد", 2200, 200),
]
EXPENSE_TYPES = ["سلفة", "مستلزمات", "مواصلات", "ضيافة"]
CHANNELS = ["الشبكة", "الكاش", "الأونلاين", "تابي", "تمارا"]

# code, account, category, nature, statement
ACCOUNTS = [
    (4100, "مبيعات الخدمات", "الإيرادات", "إيراد", "قائمة الدخل"),
    (5100, "الرواتب والبدلات", "مصاريف الموظفين", "مصروف", "قائمة الدخل"),
    (5110, "العمولات والحوافز", "مصاريف الموظفين", "مصروف", "قائمة الدخل"),
    (5120, "تكاليف الموظفين (تأشيرات وتأمين)", "مصاريف الموظفين", "مصروف", "قائمة الدخل"),
    (5200, "الإيجار", "مصاريف الفرع", "مصروف", "قائمة الدخل"),
    (5210, "الكهرباء والمياه", "مصاريف الفرع", "مصروف", "قائمة الدخل"),
    (5220, "المستلزمات والأدوات", "مصاريف التشغيل", "مصروف", "قائمة الدخل"),
    (5230, "الصيانة والإصلاحات", "مصاريف الفرع", "مصروف", "قائمة الدخل"),
    (5300, "التسويق", "مصاريف التشغيل", "مصروف", "قائمة الدخل"),
    (5400, "رسوم بوابات الدفع", "مصاريف التشغيل", "مصروف", "قائمة الدخل"),
    (5900, "مصروفات نثرية من الدرج", "مصاريف التشغيل", "مصروف", "قائمة الدخل"),
    (2300, "ضريبة القيمة المضافة المسددة", "الالتزامات", "تسوية", "المركز المالي"),
]


def daily_rows():
    rows, d = [], START
    while d <= END:
        weekend = d.weekday() in (3, 4)  # Thu / Fri busier
        k = 1.35 if weekend else 1.0
        sales = {
            "الشبكة": round(random.uniform(1800, 3400) * k, 0),
            "الكاش": round(random.uniform(450, 1300) * k, 0),
            "الأونلاين": round(random.choice([0, 0, random.uniform(80, 420)]), 0),
            "تابي": round(random.choice([0, 0, 0, random.uniform(120, 380)]), 0),
            "تمارا": round(random.choice([0, 0, 0, random.uniform(100, 300)]), 0),
        }
        exps = []
        for _ in range(random.randint(1, 3)):
            t = random.choices(EXPENSE_TYPES, weights=[2, 3, 2, 1])[0]
            emp = random.choice(EMPLOYEES)[0] if t == "سلفة" else ""
            amt = {"سلفة": random.choice([100, 150, 200, 300]),
                   "مستلزمات": random.randint(30, 160),
                   "مواصلات": random.randint(15, 60),
                   "ضيافة": random.randint(20, 80)}[t]
            exps.append((t, emp, amt))
        while len(exps) > 1 and sum(e[2] for e in exps) > sales["الكاش"] * 0.6:
            exps.pop()  # the drawer can only pay out what it holds
        total_exp = sum(e[2] for e in exps)
        expected_cash = sales["الكاش"] - total_exp
        # most days reconcile; some show a small surplus or shortage
        cash_diff = random.choice([0] * 8 + [random.randint(-40, -5), random.randint(5, 30)])
        net_diff = random.choice([0] * 14 + [random.randint(-30, 30)])
        rows.append({
            "date": d, "day": DAY_NAMES[d.weekday()], "month": MONTHS[d.month - 7][2],
            "exps": exps, "sales": sales,
            "actual_network": sales["الشبكة"] + net_diff,
            "actual_cash": expected_cash + cash_diff,
        })
        d += timedelta(days=1)
    return rows


def payroll_inputs():
    """Per employee per month: attributed sales, OT hours, absence days."""
    out = []
    for y, m, label in MONTHS:
        for name, base, trn in EMPLOYEES:
            out.append({
                "year": y, "month": label, "name": name,
                "sales": random.randint(8500, 17500),
                "ot_hours": random.choice([0, 0, 4, 6, 8, 10]),
                "absence": random.choice([0, 0, 0, 1, 2]),
                "manual": random.choice([0, 0, 0, 150, -100]),
            })
    return out


def manual_ledger():
    """Invoices and bills entered by hand (amounts VAT-inclusive where taxable)."""
    L = []
    def add(d, desc, acc, party, vat_no, out, cash, vatable, ret_q="", note=""):
        L.append((d, desc, acc, party, vat_no, out, cash, vatable, ret_q, note))
    suppliers = [("مؤسسة النخبة للمستلزمات", "300998877600003"),
                 ("شركة الإمداد التجارية", "300554433200003")]
    for y, m, _ in MONTHS:
        add(date(y, m, 1), "إيجار الشهر — قسط من الدفعة النصف سنوية", "الإيجار",
            "شركة الأفق العقارية", "300112233400003", 11500, "البنك", 1, note="استحقاق شهري")
        add(date(y, m, 5), "فاتورة كهرباء ومياه", "الكهرباء والمياه", "شركة الكهرباء",
            "300000000100003", random.randint(1400, 2100), "البنك", 1)
        for s, vn in suppliers:
            add(date(y, m, random.randint(8, 20)), "شراء مستلزمات ومنتجات", "المستلزمات والأدوات",
                s, vn, random.randint(3500, 6500), "البنك", 1)
        add(date(y, m, 25), "حملة إعلانية على السوشيال", "التسويق", "وكالة ومضة",
            "300776655400003", random.randint(1200, 2500), "البنك", 1)
        add(date(y, m, 28), "عمولة بوابات الدفع", "رسوم بوابات الدفع", "بنك محلي", "",
            random.randint(700, 1100), "البنك", 1)
    add(date(2026, 8, 12), "صيانة مكيفات", "الصيانة والإصلاحات", "ورشة التبريد", "",
        950, "الكاش", 0)
    add(date(2026, 8, 18), "تجديد تأمين طبي — موظفين", "تكاليف الموظفين (تأشيرات وتأمين)",
        "شركة التأمين", "", 2880, "البنك", 0)
    add(date(2026, 9, 10), "رسوم تأشيرة موظف جديد", "تكاليف الموظفين (تأشيرات وتأمين)",
        "منصة حكومية", "", 2000, "البنك", 0)
    add(date(2026, 9, 30), "دفعة أولى من ضريبة الربع الثالث", "ضريبة القيمة المضافة المسددة",
        "هيئة الزكاة والضريبة", "", 6000, "البنك", 0, "2026-Q3", "سداد على دفعات")
    L.sort(key=lambda r: r[0])
    return L


def export_csv(folder: Path, daily, pay, ledger):
    folder.mkdir(parents=True, exist_ok=True)
    with open(folder / "daily_sales.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["date", *CHANNELS, "expenses_total", "actual_network", "actual_cash"])
        for r in daily:
            w.writerow([r["date"], *[r["sales"][c] for c in CHANNELS],
                        sum(e[2] for e in r["exps"]), r["actual_network"], r["actual_cash"]])
    with open(folder / "payroll_inputs.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(pay[0].keys()))
        w.writeheader(); w.writerows(pay)
    with open(folder / "manual_ledger.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["date", "description", "account", "party", "vat_no", "amount_out",
                    "cash_account", "vatable", "return_quarter", "note"])
        w.writerows(ledger)
