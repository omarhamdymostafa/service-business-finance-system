/* Demo-only stand-in for google.script.run.
   Returns synthetic data shaped exactly like the Apps Script functions in
   src/apps-script/Code.gs, so the real Index.html runs in any browser.
   Nothing here comes from the client. */
(function () {
  var seed = 2026;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function ri(a, b) { return Math.round(a + rnd() * (b - a)); }
  var MN = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  var YEAR = 2026, ACTIVE = 9; // Jan..Sep have data

  var EMP = [
    ['أحمد','حلاق أول',3000,300],['خالد','حلاق',2800,300],['يوسف','حلاق',2800,300],
    ['سامي','حلاق',2500,250],['فارس','حلاق',2500,250],['ماجد','حلاق',2200,200],
    ['عمر','كاشير',2600,250],['هاني','عامل نظافة',1600,150]];

  /* ---------------- payroll ---------------- */
  var PAY = {};
  for (var m = 0; m < ACTIVE; m++) {
    PAY[MN[m]] = EMP.map(function (e) {
      var barber = e[1].indexOf('حلاق') === 0;
      var sales = barber ? ri(8500, 17500) * (1 + m * 0.012) : 0;
      var comm = Math.max(0, sales - 4000) * 0.2, bonus = sales >= 10000 ? 300 : 0;
      var otH = [0, 0, 4, 6, 8][ri(0, 4)], otPay = otH * 20;
      var absD = [0, 0, 0, 1, 2][ri(0, 4)], dAbs = absD * e[2] / 30;
      var dLate = [0, 0, 0, 25, 50][ri(0, 4)], dAdv = [0, 0, 150, 300, 500][ri(0, 4)];
      var dues = e[2] + e[3] + comm + bonus + otPay, ded = dAbs + dLate + dAdv;
      return { name: e[0], key: e[0], basic: e[2], transport: e[3], h12: 0, sales: Math.round(sales),
        bonus: bonus, comm: comm, otHours: otH, otPay: otPay, extraDays: 0, extraPay: 0,
        dues: dues, dAbsence: dAbs, dLate: dLate, dAdvance: dAdv, dCash: 0, deductions: ded,
        net: dues - ded, tips: barber ? ri(150, 600) : 0, advReceived: dAdv, manual: 0,
        allow: e[3] + comm + bonus + otPay };
    });
  }
  function totals(rows) {
    var t = { dues: 0, ded: 0, net: 0, sales: 0, tips: 0, adv: 0 };
    rows.forEach(function (r) { t.dues += r.dues; t.ded += r.deductions; t.net += r.net;
      t.sales += r.sales; t.tips += r.tips; t.adv += r.dAdvance; });
    return t;
  }

  /* ---------------- finance ---------------- */
  var REV = [], SUP = [], RENT = [], UTL = [], MKT = [], MNT = [], GW = [], SAL = [], COM = [], EC = [];
  for (var k = 0; k < 12; k++) {
    if (k >= ACTIVE) { [REV, SUP, RENT, UTL, MKT, MNT, GW, SAL, COM, EC].forEach(function (a) { a.push(null); }); continue; }
    var p = PAY[MN[k]], sales = 0, sal = 0, com = 0;
    p.forEach(function (r) { sales += r.sales; sal += r.basic + r.transport - r.dAbsence; com += r.comm + r.bonus + r.otPay; });
    var rev = sales * 1.3 / 1.15 + ri(4000, 8000);
    REV.push(rev); SUP.push(ri(7000, 10500)); RENT.push(10000); UTL.push(ri(1150, 1800));
    MKT.push(ri(1100, 2300)); MNT.push(k % 3 === 1 ? ri(600, 1400) : 0); GW.push(ri(650, 950));
    SAL.push(sal); COM.push(com); EC.push(k === 2 || k === 7 ? 2880 : (k === 8 ? 2000 : 0));
  }
  function sum(a) { return a.reduce(function (x, y) { return x + (y || 0); }, 0); }
  function add() { var arrs = arguments; return MN.map(function (_, i) { var s = null;
    for (var j = 0; j < arrs.length; j++) if (arrs[j][i] != null) s = (s || 0) + arrs[j][i]; return s; }); }
  function sub(a, b) { return a.map(function (v, i) { return v == null ? null : v - (b[i] || 0); }); }
  var COS = SUP, GP = sub(REV, COS), EMPX = add(SAL, COM, EC), BRX = add(RENT, UTL, MNT),
      OPX = add(EMPX, BRX, MKT, GW), NP = sub(GP, OPX);
  var totRev = sum(REV);
  function row(label, arr, code, pct) {
    var c = arr ? arr.slice() : new Array(12).fill(null);
    var tot = arr ? sum(arr) : null;
    c.push(pct ? (totRev ? sum(NP) / totRev : 0) : tot);
    c.push(arr && !pct && totRev ? tot / totRev : null);
    return { label: label, code: code || null, c: c };
  }
  var PL = [
    row('الإيرادات'), row('مبيعات الخدمات', REV, '4100'), row('صافي الإيرادات', REV),
    row('تكلفة الخدمة'), row('المستلزمات والمنتجات', SUP, '5220'), row('إجمالي تكلفة الخدمة', COS),
    row('مجمل الربح', GP),
    row('مصاريف الموظفين'), row('الرواتب والأجور', SAL, '5100'), row('العمولات والحوافز', COM, '5110'),
    row('تكاليف الموظفين', EC, '5120'),
    row('مصاريف الفرع'), row('الإيجار', RENT, '5200'), row('الكهرباء والمياه', UTL, '5210'),
    row('الصيانة والإصلاحات', MNT, '5230'),
    row('مصاريف التسويق'), row('التسويق والإعلان', MKT, '5300'), row('رسوم بوابات الدفع', GW, '5400'),
    row('إجمالي مصروفات التشغيل', OPX), row('صافي الربح', NP),
    row('هامش صافي الربح', NP.map(function (v, i) { return v == null ? null : v / REV[i]; }), null, true)
  ];
  var cash = [], bal = 48000, flows = [];
  for (var i = 0; i < 12; i++) {
    if (i >= ACTIVE) { cash.push(null); flows.push(null); continue; }
    var f = NP[i] * 1.05 - (i === 6 ? 60000 : 0); flows.push(f); bal += f; cash.push(bal);
  }
  var CF = [row('المقبوضات من العملاء', REV.map(function (v) { return v == null ? null : v * 1.15; })),
    row('المدفوعات للموردين والمصروفات', OPX.map(function (v, i) { return v == null ? null : -(v + COS[i]); })),
    row('صافي التدفق النقدي للشهر', flows), row('رصيد النقدية آخر الشهر', cash)];
  CF[3].c[12] = bal;
  var vatDue = 26587;
  var BS = { asOf: '2026-09-30', prev: '2026-08-31', rows: [
    { label: 'الأصول المتداولة', c: [null, null] }, { label: 'النقدية في البنك', c: [bal * 0.92, (bal - flows[8]) * 0.92] },
    { label: 'النقدية في الخزينة', c: [bal * 0.08, (bal - flows[8]) * 0.08] },
    { label: 'إيجار مدفوع مقدماً', c: [30000, 40000] },
    { label: 'إجمالي الأصول', c: [bal + 30000, bal - flows[8] + 40000] },
    { label: 'الالتزامات', c: [null, null] }, { label: 'ضريبة القيمة المضافة المستحقة', c: [vatDue, 19200] },
    { label: 'رواتب مستحقة', c: [SAL[8] + COM[8], SAL[7] + COM[7]] },
    { label: 'حقوق الملكية', c: [null, null] },
    { label: 'رأس المال وجاري الشريك', c: [60000, 60000] },
    { label: 'الأرباح المحتجزة', c: [bal + 30000 - vatDue - SAL[8] - COM[8] - 60000, bal - flows[8] + 40000 - 19200 - SAL[7] - COM[7] - 60000] },
    { label: 'إجمالي الالتزامات وحقوق الملكية', c: [bal + 30000, bal - flows[8] + 40000] }] };
  var TAX = [1, 2, 3].map(function (q) {
    var s = 0, pu = 0; for (var i = (q - 1) * 3; i < q * 3; i++) { s += REV[i] * 1.15; pu += (SUP[i] + RENT[i] + UTL[i] + MKT[i]) * 1.15; }
    var out = s * 0.15 / 1.15, inp = pu * 0.15 / 1.15, due = out - inp;
    var paid = q === 3 ? 6000 : (q === 2 ? due * 0.5 : due);
    return { year: YEAR, q: q, key: YEAR + '-Q' + q, sales: s, out: out, purch: pu, inp: inp, due: due, paid: paid,
      payDate: '', state: paid >= due ? 'مسدد' : 'سداد جزئي' };
  });
  var YR = { years: ['2024', '2025', '2026'], rows: [
    { label: 'صافي الإيرادات', c: [880000, 1010000, totRev] },
    { label: 'إجمالي مصروفات التشغيل', c: [612000, 688000, sum(OPX) + sum(COS)] },
    { label: 'صافي الربح', c: [268000, 322000, sum(NP)] },
    { label: 'هامش صافي الربح', c: [268000 / 880000, 322000 / 1010000, sum(NP) / totRev] }] };

  /* ---------------- ledger & breakdowns ---------------- */
  var CATS = { 'المستلزمات والمنتجات': [SUP, 'تكلفة الخدمة', ['مؤسسة النخبة للمستلزمات', 'شركة الإمداد التجارية']],
    'الرواتب والأجور': [SAL, 'مصاريف الموظفين', ['رواتب الموظفين']], 'العمولات والحوافز': [COM, 'مصاريف الموظفين', ['عمولات الموظفين']],
    'الإيجار': [RENT, 'مصاريف الفرع', ['شركة الأفق العقارية']], 'الكهرباء والمياه': [UTL, 'مصاريف الفرع', ['شركة الكهرباء']],
    'التسويق والإعلان': [MKT, 'مصاريف التسويق', ['وكالة ومضة']], 'رسوم بوابات الدفع': [GW, 'مصاريف التسويق', ['بنك محلي']],
    'تكاليف الموظفين': [EC, 'مصاريف الموظفين', ['شركة التأمين']], 'الصيانة والإصلاحات': [MNT, 'مصاريف الفرع', ['ورشة التبريد']] };
  function ledger(year, mNo) {
    var out = [], i = mNo - 1, d = function (day) { return YEAR + '-' + ('0' + mNo).slice(-2) + '-' + ('0' + day).slice(-2); };
    if (i >= ACTIVE) return out;
    out.push({ date: d(28), desc: 'إيرادات الشهر — من اليومية', acc: 'مبيعات الخدمات', party: '', inAmt: REV[i] * 1.15, outAmt: 0, cat: 'الإيرادات' });
    Object.keys(CATS).forEach(function (acc, j) {
      var v = CATS[acc][0][i]; if (!v) return;
      var parties = CATS[acc][2];
      parties.forEach(function (pt, n) {
        out.push({ date: d(3 + j * 2 + n), desc: acc, acc: acc, party: pt, inAmt: 0, outAmt: v / parties.length, cat: CATS[acc][1] });
      });
    });
    return out.sort(function (a, b) { return b.date.localeCompare(a.date); });
  }
  function breakdown(year, mNo) {
    var i = mNo - 1, mc = {}, yc = {}, mp = {}, yp = {}, mt = 0, yt = 0, n = 0;
    Object.keys(CATS).forEach(function (acc) {
      var cat = CATS[acc][1], arr = CATS[acc][0], parties = CATS[acc][2];
      for (var k = 0; k < ACTIVE; k++) { var v = arr[k] || 0; yc[cat] = (yc[cat] || 0) + v; yt += v;
        parties.forEach(function (p) { yp[p] = (yp[p] || 0) + v / parties.length; }); }
      var v2 = arr[i] || 0; if (!v2) return;
      mc[cat] = (mc[cat] || 0) + v2; mt += v2; n++;
      parties.forEach(function (p) { mp[p] = (mp[p] || 0) + v2 / parties.length; });
    });
    function top(o, k) { var a = Object.keys(o).map(function (x) { return { name: x, value: o[x] }; });
      a.sort(function (x, y) { return y.value - x.value; }); return k ? a.slice(0, k) : a; }
    return { month: { cats: top(mc), parties: top(mp, 10), total: mt, count: n },
      year: { cats: top(yc), parties: top(yp, 10), total: yt } };
  }
  function analytics() {
    var cm = {}, partyTot = {}, partyM = {};
    Object.keys(CATS).forEach(function (acc) {
      var cat = CATS[acc][1]; if (!cm[cat]) cm[cat] = new Array(12).fill(0);
      CATS[acc][0].forEach(function (v, k) { cm[cat][k] += v || 0;
        if (v) CATS[acc][2].forEach(function (p) { partyTot[p] = (partyTot[p] || 0) + v; (partyM[p] = partyM[p] || {})[k] = 1; }); });
    });
    var cats = Object.keys(cm).map(function (k) { return { name: k, m: cm[k] }; });
    var parties = Object.keys(partyTot).map(function (p) { return { name: p, months: Object.keys(partyM[p]).length, total: partyTot[p] }; });
    return { cats: cats, parties: parties, rev: REV.map(function (v) { return (v || 0) * 1.15; }),
      exp: OPX.map(function (v, i) { return (v || 0) + (COS[i] || 0); }) };
  }

  /* ---------------- team ---------------- */
  function dPlus(days) { var t = new Date(); t.setDate(t.getDate() + days); return t.toISOString().slice(0, 10); }
  var TEAM = EMP.map(function (e, i) {
    var iq = [210, 18, 140, -6, 300, 95, 60, 25][i], ct = [400, 260, 35, 180, 500, 120, 330, 90][i];
    var near = Math.min(iq, ct), alert = near <= 30 ? '⚠ مستند ينتهي قريباً' : '✓ سليم';
    return { no: i + 1, name: e[0], branch: i < 5 ? 'الفرع الرئيسي' : 'فرع الشمال', iqamaNo: '2' + (400000000 + i * 1371),
      nat: ['مصري', 'سوري', 'باكستاني', 'مصري', 'يمني', 'سوداني', 'مصري', 'بنغلاديشي'][i], passport: 'A' + (1000000 + i * 77),
      passIssue: '2022-03-01', passExp: dPlus(900 + i * 40), visa: 'عمل', job: e[1], phone: '05XXXXXXXX',
      birth: (1988 + i) + '-05-1' + i, hire: (2021 + (i % 4)) + '-0' + (1 + i) + '-01', contractEnd: dPlus(ct),
      iqamaIssue: '2025-01-01', iqamaExp: dPlus(iq), permitExp: dPlus(iq), medExp: dPlus(iq + 30), healthExp: dPlus(ct - 10),
      basic: e[2], transport: e[3], hours: 10, notice: 30, status: 'على رأس العمل',
      iqamaDays: iq, iqamaState: iq < 0 ? '⚠ منتهية' : '✓', contractDays: ct, contractState: '✓',
      nearestDays: near, docAlert: alert, advOpening: 0, advInstal: 0, lastMonth: '' };
  });
  TEAM.push({ no: 9, name: 'رامي', branch: 'فرع الشمال', nat: 'مصري', job: 'حلاق', basic: 2400, transport: 250,
    status: 'انتهت الخدمة', hire: '2022-02-01', contractEnd: '2026-03-31', iqamaExp: '2026-04-30', iqamaDays: -180, contractDays: -200, docAlert: '' });

  var API = {
    api_bootstrap: function () {
      var periods = []; for (var m = 0; m < ACTIVE; m++) periods.push({ year: YEAR, month: MN[m], label: MN[m] + ' ' + YEAR });
      return { months: MN, employees: EMP.map(function (e) { return e[0]; }), periods: periods };
    },
    api_payroll: function (y, m) { var rows = (PAY[m] || []).slice().sort(function (a, b) { return b.net - a.net; });
      return { rows: rows, totals: totals(rows), year: y, month: m, otRate: 20 }; },
    api_payrollSeries: function () {
      return MN.slice(0, ACTIVE).map(function (m) { var r = PAY[m], t = totals(r), o = { month: m, count: r.length,
        basic: 0, allow: 0, comm: 0, ot: 0, dues: t.dues, ded: t.ded, net: t.net, sales: t.sales, tips: t.tips, adv: t.adv,
        absence: 0, late: 0, cash: 0, manual: 0 };
        r.forEach(function (x) { o.basic += x.basic; o.allow += x.allow; o.comm += x.comm; o.ot += x.otPay; o.absence += x.dAbsence; o.late += x.dLate; });
        return o; });
    },
    api_balances: function () { return [['أحمد', 1200, 800], ['يوسف', 900, 300], ['فارس', 600, 450], ['عمر', 500, 100]]
      .map(function (b) { return { name: b[0], opening: 0, received: b[1], deducted: b[2], balance: b[1] - b[2] }; }); },
    api_alerts: function () { return TEAM.filter(function (e) { return e.docAlert && e.docAlert.indexOf('⚠') === 0; })
      .map(function (e) { return { name: e.name, state: e.docAlert, days: e.nearestDays }; }); },
    api_employees: function () { return TEAM; },
    api_finance: function () { return { year: YEAR, months: MN, pl: PL, cf: CF, bs: BS, tax: TAX, yr: YR }; },
    api_ledger: ledger, api_finBreakdown: breakdown, api_finAnalytics: analytics,
    api_lists: function () { return { employees: EMP.map(function (e) { return e[0]; }), jobs: ['حلاق', 'كاشير'], nats: [], branches: ['الفرع الرئيسي', 'فرع الشمال'],
      accounts: [], cash: ['البنك', 'الكاش'], parties: [], costItems: ['تأمين طبي', 'تأشيرة'], empAccounts: ['تكاليف الموظفين'] }; },
    api_empCosts: function () { return { items: ['تأمين طبي', 'تأشيرة', 'تذكرة سفر'], rows: [
      { name: 'أحمد', item: 'تأمين طبي', amount: 480, date: '2026-03-12', note: '', src: 'الموارد البشرية' },
      { name: 'خالد', item: 'تأمين طبي', amount: 480, date: '2026-03-12', note: '', src: 'الموارد البشرية' },
      { name: 'يوسف', item: 'تأشيرة', amount: 2000, date: '2026-09-10', note: '', src: 'المالية' },
      { name: 'سامي', item: 'تذكرة سفر', amount: 1350, date: '2026-08-02', note: '', src: 'المالية' },
      { name: 'فارس', item: 'تأمين طبي', amount: 480, date: '2026-08-18', note: '', src: 'المالية' }] }; },
    api_empMonthly: function () { var out = []; Object.keys(PAY).forEach(function (m) { PAY[m].forEach(function (r) {
      out.push({ year: YEAR, month: m, name: r.name, dues: r.dues, fines: r.dAbsence + r.dLate, net: r.net, sales: r.sales,
        tips: r.tips, comm: r.comm, basic: r.basic, ot: r.otPay }); }); }); return out; },
    api_employee: function () { return { info: null, history: [] }; },
    api_hrLink: function () { return '#'; }, api_finLink: function () { return '#'; },
    api_archiveMonths: function () { return []; }
  };
  ['api_saveAttendance', 'api_saveSalaryChange', 'api_saveAdvance', 'api_addEmployee', 'api_updateEmployee',
   'api_addLedger', 'api_addEmpCost', 'api_addAdvance'].forEach(function (n) {
    API[n] = function () { throw new Error('النسخة التجريبية للعرض فقط — الحفظ متوقف'); }; });

  function Runner(ok, fail) { this._ok = ok; this._fail = fail; }
  Runner.prototype.withSuccessHandler = function (f) { return new Runner(f, this._fail); };
  Runner.prototype.withFailureHandler = function (f) { return new Runner(this._ok, f); };
  Runner.prototype.withUserObject = function () { return this; };
  Object.keys(API).forEach(function (name) {
    Runner.prototype[name] = function () {
      var args = arguments, ok = this._ok, fail = this._fail;
      setTimeout(function () {
        try { var r = API[name].apply(null, args); if (ok) ok(r); }
        catch (e) { if (fail) fail(e); else console.error(e); }
      }, 40);
    };
  });
  window.google = { script: { run: new Runner(null, null) } };
})();
