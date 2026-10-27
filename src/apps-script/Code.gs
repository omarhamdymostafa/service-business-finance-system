/*************************************************************
 *  لوحة المالك
 *  Web App فوق شيت الموارد البشرية والرواتب
 *  نشر: Deploy > New deployment > Web app > Execute as: Me
 *************************************************************/

var HR_ID  = 'YOUR_HR_SPREADSHEET_ID';
var FIN_ID = 'YOUR_FINANCE_SPREADSHEET_ID';

var S_PAY='الرواتب الشهرية', S_EMP='بيانات الموظفين', S_SET='الإعدادات',
    S_ATT='الحضور والغياب', S_ADJ='تعديلات السلف', S_SCH='تعديلات الرواتب',
    S_ADV='سلف الموظفين', S_SAL='مبيعات الموظفين';

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('لوحة المالك')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function hr_(){ return SpreadsheetApp.openById(HR_ID); }
function otRate_(){
  var v = num_(hr_().getSheetByName(S_SET).getRange('U11').getValue());
  return v>0 ? v : 20;
}
function num_(v){ var n = parseFloat(v); return isNaN(n) ? 0 : n; }

/* ---------- قراءة ---------- */

function api_bootstrap(){
  var ss = hr_();
  var set = ss.getSheetByName(S_SET);
  var months = set.getRange('K4:K15').getValues().map(function(r){return r[0];}).filter(String);
  var emp = ss.getSheetByName(S_EMP).getRange('B3:B62').getValues()
             .map(function(r){return r[0];}).filter(String);
  var pay = ss.getSheetByName(S_PAY).getRange('A3:C800').getValues();
  var seen = {}, periods = [];
  for (var i=0;i<pay.length;i++){
    var y = pay[i][0], m = pay[i][1];
    if (!y || !m || m==='—') continue;
    var k = y+'|'+m;
    if (!seen[k]){ seen[k]=1; periods.push({year:y, month:m, label:m+' '+y}); }
  }
  var arc = api_archive();
  for (var a=0;a<arc.length;a++){
    var k2 = arc[a].year+'|'+arc[a].month;
    if (!seen[k2]){ seen[k2]=1;
      periods.push({year:arc[a].year, month:arc[a].month, label:arc[a].month+' '+arc[a].year, archive:true}); }
  }
  var ORD=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  periods.sort(function(x,y2){
    if (String(x.year)!==String(y2.year)) return Number(x.year)-Number(y2.year);
    return ORD.indexOf(x.month)-ORD.indexOf(y2.month);
  });
  return { months: months, employees: emp, periods: periods };
}

function api_payroll(year, month){
  var ss = hr_();
  var v = ss.getSheetByName(S_PAY).getRange('A3:AF800').getValues();
  var rows = [], t = {dues:0, ded:0, net:0, sales:0, tips:0, adv:0};
  for (var i=0;i<v.length;i++){
    var r = v[i];
    if (String(r[0])!==String(year) || r[1]!==month || !r[2]) continue;
    var o = {
      name:r[2], key:r[3],
      basic:num_(r[5]), transport:num_(r[6]), h12:num_(r[7]),
      sales:num_(r[8]) || empSales_(r[0],r[1],r[2]), bonus:num_(r[9]), comm:num_(r[10]),
      otHours:num_(r[11]), otPay:num_(r[12]),
      extraDays:num_(r[17]), extraPay:num_(r[18]),
      dues:num_(r[19]),
      dAbsence:num_(r[21]), dLate:num_(r[23]), dAdvance:num_(r[24]), dCash:num_(r[25]),
      deductions:num_(r[26]), net:num_(r[27]), tips:num_(r[28]),
      advReceived:num_(r[29]), manual:num_(r[31])
    };
    o.allow = o.transport + o.h12 + o.bonus + o.comm + o.otPay + o.extraPay + o.manual;
    rows.push(o);
    t.dues+=o.dues; t.ded+=o.deductions; t.net+=o.net; t.sales+=o.sales;
    t.tips+=o.tips; t.adv+=o.dAdvance;
  }
  if (!rows.length){
    var arc = api_archive();
    for (var a=0;a<arc.length;a++){
      var x=arc[a];
      if (String(x.year)!==String(year) || x.month!==month) continue;
      x.allow = x.allow;
      rows.push(x);
      t.dues+=x.dues; t.ded+=x.deductions; t.net+=x.net;
      t.sales+=x.sales; t.tips+=x.tips; t.adv+=x.dAdvance;
    }
    if (rows.length){
      rows.sort(function(a,b){ return b.net - a.net; });
      return { rows: rows, totals: t, year: year, month: month, otRate: otRate_(), archive:true };
    }
  }
  rows.sort(function(a,b){ return b.net - a.net; });
  return { rows: rows, totals: t, year: year, month: month, otRate: otRate_() };
}

function api_balances(){
  var ss = hr_();
  var v = ss.getSheetByName(S_ADV).getRange('P4:U53').getValues();
  var out = [];
  for (var i=0;i<v.length;i++){
    if (!v[i][0]) continue;
    var bal = num_(v[i][5]);
    if (bal>0) out.push({name:v[i][0], opening:num_(v[i][1]), received:num_(v[i][2]),
                         deducted:num_(v[i][3]), balance:bal});
  }
  out.sort(function(a,b){return b.balance-a.balance;});
  return out;
}

function api_alerts(){
  var ss = hr_();
  var v = ss.getSheetByName(S_EMP).getRange('B3:AD62').getValues();
  var out = [];
  for (var i=0;i<v.length;i++){
    var n=v[i][0]; if(!n) continue;
    if (v[i][22]!=='على رأس العمل') continue;
    var st = v[i][28];
    if (st && String(st).indexOf('⚠')===0) out.push({name:n, state:st, days:num_(v[i][27])});
  }
  out.sort(function(a,b){return a.days-b.days;});
  return out;
}

function api_employee(name, year, month){
  var ss = hr_();
  var v = ss.getSheetByName(S_PAY).getRange('A3:AF800').getValues();
  var hist = [];
  for (var i=0;i<v.length;i++){
    if (v[i][2]!==name || !v[i][19]) continue;
    hist.push({year:v[i][0], month:v[i][1], dues:num_(v[i][19]),
               ded:num_(v[i][26]), net:num_(v[i][27]), sales:num_(v[i][8])});
  }
  var e = ss.getSheetByName(S_EMP).getRange('B3:AG62').getValues(), info=null;
  for (var j=0;j<e.length;j++){
    if (e[j][0]===name){
      info = { name:name, branch:e[j][1], job:e[j][8], nat:e[j][3], phone:e[j][9],
               basic:num_(e[j][18]), transport:num_(e[j][19]), hours:e[j][20],
               status:e[j][22], iqama:e[j][24], iqamaState:e[j][24] };
      break;
    }
  }
  return { info: info, history: hist };
}

/* ---------- كتابة ---------- */

function firstRow_(sh, col, start, end){
  var v = sh.getRange(start, col, end-start+1, 1).getValues();
  for (var i=0;i<v.length;i++) if (!v[i][0]) return start+i;
  return -1;
}
function findRow_(sh, start, end, year, month, name){
  var v = sh.getRange(start, 1, end-start+1, 3).getValues();
  for (var i=0;i<v.length;i++)
    if (String(v[i][0])===String(year) && v[i][1]===month && v[i][2]===name) return start+i;
  return -1;
}

/** خصم غياب / خصم تأخير / ساعات أوفر تايم / أيام إضافية */
function api_saveAttendance(p){
  var sh = hr_().getSheetByName(S_ATT);
  var r = findRow_(sh,3,800,p.year,p.month,p.name);
  if (r<0){
    r = firstRow_(sh,3,3,800);
    if (r<0) throw new Error('مفيش صفوف فاضية في الحضور والغياب');
    sh.getRange(r,1,1,3).setValues([[p.year,p.month,p.name]]);
  }
  if (p.absence!=null) sh.getRange(r,5).setValue(p.absence===''?null:num_(p.absence));
  if (p.extraDays!=null) sh.getRange(r,6).setValue(p.extraDays===''?null:num_(p.extraDays));
  if (p.otPay!=null){
    var rt = otRate_();
    sh.getRange(r,7).setValue(p.otPay===''?null:Math.round((num_(p.otPay)/rt)*10000)/10000);
  } else if (p.otHours!=null) {
    sh.getRange(r,7).setValue(p.otHours===''?null:num_(p.otHours));
  }
  if (p.late!=null) sh.getRange(r,8).setValue(p.late===''?null:num_(p.late));
  SpreadsheetApp.flush();
  return api_payroll(p.year,p.month);
}

/** مكافأة أو خصم إضافي (تسوية يدوية) + تعديل الراتب الأساسي */
function api_saveSalaryChange(p){
  var sh = hr_().getSheetByName(S_SCH);
  var v = sh.getRange(3,2,100,3).getValues(), r=-1;
  for (var i=0;i<v.length;i++)
    if (v[i][0]===p.name && String(v[i][1])===String(p.year) && v[i][2]===p.month){ r=3+i; break; }
  if (r<0){
    r = firstRow_(sh,2,3,102);
    if (r<0) throw new Error('مفيش صفوف فاضية في تعديلات الرواتب');
    sh.getRange(r,2,1,3).setValues([[p.name,p.year,p.month]]);
  }
  if (p.basic!=null)     sh.getRange(r,6).setValue(p.basic===''?null:num_(p.basic));
  if (p.transport!=null) sh.getRange(r,7).setValue(p.transport===''?null:num_(p.transport));
  if (p.note!=null)      sh.getRange(r,9).setValue(p.note);
  if (p.manual!=null)    sh.getRange(r,10).setValue(p.manual===''?null:num_(p.manual));
  SpreadsheetApp.flush();
  return api_payroll(p.year,p.month);
}

/** سلفة يدوية أو تحديد مبلغ الخصم */
function api_saveAdvance(p){
  var sh = hr_().getSheetByName(S_ADJ);
  var r = findRow_(sh,3,202,p.year,p.month,p.name);
  if (r<0){
    r = firstRow_(sh,3,3,202);
    if (r<0) throw new Error('مفيش صفوف فاضية في تعديلات السلف');
    sh.getRange(r,1,1,3).setValues([[p.year,p.month,p.name]]);
  }
  if (p.manual!=null)  sh.getRange(r,5).setValue(p.manual===''?null:num_(p.manual));
  if (p.deduct!=null)  sh.getRange(r,6).setValue(p.deduct===''?null:num_(p.deduct));
  if (p.note!=null)    sh.getRange(r,7).setValue(p.note);
  SpreadsheetApp.flush();
  return api_payroll(p.year,p.month);
}

function api_hrLink(){ return 'https://docs.google.com/spreadsheets/d/'+HR_ID+'/edit'; }

/* ================= المالية ================= */

var F_PL='قائمة الدخل', F_BS='المركز المالي', F_CF='التدفقات والأرصدة',
    F_TAX='الضريبة', F_YR='ملخص سنوي', F_LED='الدفتر';

function fin_(){ return SpreadsheetApp.openById(FIN_ID); }
function d_(v){
  if (v===null || v==='') return '';
  if (Object.prototype.toString.call(v)==='[object Date]')
    return Utilities.formatDate(v,'Asia/Riyadh','yyyy-MM-dd');
  return String(v);
}
function grid_(sh, a1, fromRow){
  var v = sh.getRange(a1).getValues(), out=[];
  for (var i=0;i<v.length;i++){
    var lab = v[i][0];
    if (lab===''||lab===null) continue;
    out.push({ label:String(lab), code:(v[i][1]===''?null:String(v[i][1])),
               c:v[i].slice(2).map(function(x){ return (x===''||x===null)?null:x; }),
               row:fromRow+i });
  }
  return out;
}

function api_finance(){
  var ss = fin_();
  var plS = ss.getSheetByName(F_PL);
  var year = plS.getRange('B3').getValue();
  var months = plS.getRange('C4:N4').getValues()[0];
  var pl = grid_(plS,'A5:P55',5);

  var cfS = ss.getSheetByName(F_CF);
  var cf = grid_(cfS,'A5:P29',5);

  var bsS = ss.getSheetByName(F_BS);
  var bsAsOf = d_(bsS.getRange('C3').getValue());
  var bsPrev = d_(bsS.getRange('D3').getValue());
  var bs = grid_(bsS,'A5:F32',5);

  var txv = ss.getSheetByName(F_TAX).getRange('A1:N40').getValues(), tax=[];
  for (var i=0;i<txv.length;i++){
    if (!/^\d{4}$/.test(String(txv[i][0]).trim())) continue;
    if (!/^\d{4}-Q[1-4]$/.test(String(txv[i][2]).trim())) continue;
    tax.push({ year:txv[i][0], q:txv[i][1], key:txv[i][2],
               sales:num_(txv[i][5]), out:num_(txv[i][6]),
               purch:num_(txv[i][7]), inp:num_(txv[i][8]),
               due:num_(txv[i][9]), paid:num_(txv[i][10]),
               payDate:d_(txv[i][11]), state:txv[i][12] });
  }

  var yrS = ss.getSheetByName(F_YR);
  var yr = null;
  if (yrS){
    var yv = yrS.getRange('A1:J60').getValues(), hRow=-1;
    for (var k=0;k<yv.length;k++){ if (String(yv[k][0]).trim()==='البند'){ hRow=k; break; } }
    if (hRow<0) hRow=2;
    var yrs=[], yhead=yv[hRow];
    for (var c=2;c<yhead.length;c++) if (yhead[c]!=='' && yhead[c]!==null) yrs.push(yhead[c]);
    var yrows=[];
    for (var k=hRow+1;k<yv.length;k++){
      var lab=yv[k][0];
      if (lab===''||lab===null) continue;
      yrows.push({ label:String(lab), code:(yv[k][1]===''?null:String(yv[k][1])),
                   c:yv[k].slice(2).map(function(x){ return (x===''||x===null)?null:x; }), row:k+1 });
    }
    yr = { years: yrs, rows: yrows };
  }

  return { year:year, months:months, pl:pl, cf:cf,
           bs:{ asOf:bsAsOf, prev:bsPrev, rows:bs },
           tax:tax, yr:yr };
}

function api_ledger(year, monthNo, limit){
  var v = fin_().getSheetByName(F_LED).getRange('A2:T3000').getValues();
  var out=[];
  for (var i=v.length-1;i>=0;i--){
    var r=v[i]; if(!r[0]) continue;
    var dt=r[0];
    if (Object.prototype.toString.call(dt)!=='[object Date]') continue;
    if (year && dt.getFullYear()!=year) continue;
    if (monthNo && (dt.getMonth()+1)!=monthNo) continue;
    out.push({ date:d_(dt), desc:r[1], acc:r[2], party:r[3],
               inAmt:num_(r[5]), outAmt:num_(r[6]), cash:r[7],
               cat:r[14], nature:r[15], list:r[16] });
    if (out.length >= (limit||200)) break;
  }
  return out;
}

function api_employees(){
  var v = hr_().getSheetByName(S_EMP).getRange('A3:AG62').getValues(), out=[];
  for (var i=0;i<v.length;i++){
    var r=v[i]; if(!r[1]) continue;
    out.push({ no:r[0], name:r[1], branch:r[2], iqamaNo:d_(r[3]), nat:r[4],
      passport:d_(r[5]), passIssue:d_(r[6]), passExp:d_(r[7]), visa:r[8],
      job:r[9], phone:d_(r[10]), birth:d_(r[11]), hire:d_(r[12]),
      contractEnd:d_(r[13]), iqamaIssue:d_(r[14]), iqamaExp:d_(r[15]),
      permitExp:d_(r[16]), medExp:d_(r[17]), healthExp:d_(r[18]),
      basic:num_(r[19]), transport:num_(r[20]), hours:r[21], notice:r[22],
      status:r[23], iqamaDays:num_(r[24]), iqamaState:r[25],
      contractDays:num_(r[26]), contractState:r[27],
      nearestDays:num_(r[28]), docAlert:r[29],
      advOpening:num_(r[30]), advInstal:num_(r[31]), lastMonth:d_(r[32]) });
  }
  return out;
}

function api_finLink(){ return 'https://docs.google.com/spreadsheets/d/'+FIN_ID+'/edit'; }

/* ================= تحليلات ================= */

/** إجماليات الرواتب لكل شهر في السنة */
function api_payrollSeries(year){
  var v = hr_().getSheetByName(S_PAY).getRange('A3:AF800').getValues();
  var M = {};
  for (var i=0;i<v.length;i++){
    var r=v[i];
    if (String(r[0])!==String(year) || !r[1] || !r[2]) continue;
    var m=r[1];
    if(!M[m]) M[m]={month:m,count:0,basic:0,allow:0,comm:0,ot:0,dues:0,ded:0,net:0,
                    sales:0,tips:0,adv:0,absence:0,late:0,cash:0,manual:0};
    var o=M[m];
    if(num_(r[19])>0) o.count++;
    o.basic+=num_(r[5]); o.comm+=num_(r[10]); o.ot+=num_(r[12]);
    o.allow+=num_(r[6])+num_(r[7])+num_(r[9])+num_(r[18]);
    o.dues+=num_(r[19]); o.ded+=num_(r[26]); o.net+=num_(r[27]);
    o.sales+=(num_(r[8]) || empSales_(r[0],r[1],r[2])); o.tips+=num_(r[28]); o.adv+=num_(r[24]);
    o.absence+=num_(r[21]); o.late+=num_(r[23]); o.cash+=num_(r[25]);
    o.manual+=num_(r[31]);
  }
  var arc = api_archive();
  for (var a=0;a<arc.length;a++){
    var x=arc[a];
    if (String(x.year)!==String(year)) continue;
    if (M[x.month]) continue;
    if (!M['__'+x.month]) M['__'+x.month]={month:x.month,count:0,basic:0,allow:0,comm:0,ot:0,
      dues:0,ded:0,net:0,sales:0,tips:0,adv:0,absence:0,late:0,cash:0,manual:0,archive:true};
    var o=M['__'+x.month];
    if(x.dues>0) o.count++;
    o.basic+=x.basic; o.comm+=x.comm; o.ot+=x.otPay; o.allow+=x.allow;
    o.dues+=x.dues; o.ded+=x.deductions; o.net+=x.net;
    o.sales+=x.sales; o.tips+=x.tips; o.adv+=x.dAdvance;
    o.absence+=x.dAbsence; o.late+=x.dLate; o.cash+=x.dCash;
  }
  var out=[]; for (var k in M) out.push(M[k]);
  return out;
}

/** تحليل المصروفات من الدفتر — بالفئة وبالجهة */
function api_finAnalytics(year){
  var v = fin_().getSheetByName(F_LED).getRange('A2:T3000').getValues();
  var catM={}, partyM={}, partyTot={}, revM=new Array(12).fill(0), expM=new Array(12).fill(0);
  for (var i=0;i<v.length;i++){
    var r=v[i], d=r[0];
    if (Object.prototype.toString.call(d)!=='[object Date]') continue;
    if (d.getFullYear()!=year) continue;
    if (r[16]!=='قائمة الدخل') continue;
    var mi=d.getMonth(), out=num_(r[6]), inn=num_(r[5]);
    if (inn) revM[mi]+=inn;
    if (!out) continue;
    expM[mi]+=out;
    var cat=r[14]||'غير مصنف', party=r[3]||r[2]||'غير محدد';
    if(!catM[cat]) catM[cat]=new Array(12).fill(0);
    catM[cat][mi]+=out;
    if(!partyM[party]) partyM[party]={};
    partyM[party][mi]=1;
    partyTot[party]=(partyTot[party]||0)+out;
  }
  var cats=[]; for (var k in catM) cats.push({name:k, m:catM[k]});
  cats.sort(function(a,b){ return b.m.reduce(function(x,y){return x+y;},0)-a.m.reduce(function(x,y){return x+y;},0); });
  var parties=[]; 
  for (var k2 in partyM){ var c=0; for (var mm in partyM[k2]) c++; 
    parties.push({name:k2, months:c, total:partyTot[k2]}); }
  parties.sort(function(a,b){ return (b.months-a.months) || (b.total-a.total); });
  return { cats:cats, parties:parties.slice(0,15), rev:revM, exp:expM };
}

function api_finBreakdown(year, monthNo){
  var v = fin_().getSheetByName(F_LED).getRange('A2:T3000').getValues();
  var mCat={}, yCat={}, mParty={}, yParty={}, mTot=0, yTot=0, mCnt=0;
  for (var i=0;i<v.length;i++){
    var r=v[i], d=r[0];
    if (Object.prototype.toString.call(d)!=='[object Date]') continue;
    if (d.getFullYear()!=year) continue;
    if (r[16]!=='قائمة الدخل') continue;
    var out = num_(r[6]);
    if (!out) continue;
    var cat = r[14] || 'غير مصنف', party = r[3] || r[2] || 'غير محدد';
    yCat[cat]=(yCat[cat]||0)+out; yParty[party]=(yParty[party]||0)+out; yTot+=out;
    if ((d.getMonth()+1)==monthNo){
      mCat[cat]=(mCat[cat]||0)+out; mParty[party]=(mParty[party]||0)+out; mTot+=out; mCnt++;
    }
  }
  function top(o,n){
    var a=[]; for(var k in o) a.push({name:k,value:o[k]});
    a.sort(function(x,y){return y.value-x.value;});
    return n?a.slice(0,n):a;
  }
  return { month:{cats:top(mCat), parties:top(mParty,10), total:mTot, count:mCnt},
           year:{cats:top(yCat), parties:top(yParty,10), total:yTot} };
}

/* ================= أرشيف الرواتب السابقة ================= */
/* الصفحة موجودة في الملف — الكود بيقرا منها بس ومش بيكتب فيها
   الأعمدة: A سنة · B شهر · C اسم · D مفتاح · E أساسي · F بدل ساعات · G مكافأة مبيعات
   H بدل مواصلات · I مكافآت أخرى · J تيب · K إجمالي المستحقات · L غرامات/مكيف
   M خصم تأخير · N خصم غياب · O السلفة · P صافي الراتب · Q دقائق تأخير · R أيام غياب */

var S_ARC='أرشيف الرواتب السابقة';
var SALES_CACHE=null;
/** مبيعات كل موظف شهريًا من صفحة «مبيعات الموظفين» — متاحة من يناير 2024 */
function salesMap_(){
  if (SALES_CACHE) return SALES_CACHE;
  var m={}, sh=hr_().getSheetByName(S_SAL);
  if (sh && sh.getLastRow()>2){
    var v = sh.getRange(3,1,sh.getLastRow()-2,8).getValues();
    for (var i=0;i<v.length;i++){
      var r=v[i]; if(!r[0]||!r[1]||!r[2]) continue;
      var tot = num_(r[7]) || (num_(r[4])+num_(r[5])+num_(r[6]));
      if(!tot) continue;
      m[r[0]+'|'+r[1]+'|'+String(r[2]).trim()] = tot;
    }
  }
  SALES_CACHE=m; return m;
}
function empSales_(y,mo,name){
  var m=salesMap_(); return m[y+'|'+mo+'|'+String(name).trim()] || 0;
}
var ARC_CACHE=null;

function api_archive(){
  if (ARC_CACHE) return ARC_CACHE;
  var sh = hr_().getSheetByName(S_ARC);
  if(!sh){ ARC_CACHE=[]; return ARC_CACHE; }
  var last = sh.getLastRow();
  if (last < 3){ ARC_CACHE=[]; return ARC_CACHE; }
  var v = sh.getRange(3,1,last-2,18).getValues(), out=[];
  for (var i=0;i<v.length;i++){
    var r=v[i];
    if(!r[0] || !r[1] || !r[2]) continue;
    var basic=num_(r[4]), hrs=num_(r[5]), comm=num_(r[6]), trn=num_(r[7]),
        other=num_(r[8]), tips=num_(r[9]);
    var allow = hrs+comm+trn+other;
    var dues = num_(r[10]) || (basic+allow+tips);
    var fine=num_(r[11]), late=num_(r[12]), abs=num_(r[13]), adv=num_(r[14]);
    var ded = fine+late+abs+adv;
    var net = num_(r[15]);
    if (!dues && !net) continue;
    out.push({ year:r[0], month:r[1], name:r[2],
      basic:basic, allow:allow, comm:comm, otPay:0, otHours:0,
      transport:trn, h12:hrs, bonus:other,
      dues:dues, dAbsence:abs, dLate:late, dAdvance:adv, dCash:fine,
      deductions:ded, net:net, sales:empSales_(r[0],r[1],r[2]), tips:tips, manual:0,
      lateMin:num_(r[16]), absDays:num_(r[17]), archive:true });
  }
  ARC_CACHE=out; return out;
}

function api_archiveMonths(){
  var a=api_archive(), seen={}, out=[];
  for (var i=0;i<a.length;i++){
    var k=a[i].year+'|'+a[i].month;
    if(!seen[k]){ seen[k]=1; out.push({year:a[i].year, month:a[i].month}); }
  }
  return out;
}

/* ================= إدخالات من الموقع ================= */

function firstEmptyRow_(sh, col, start){
  var last = sh.getLastRow();
  var end = Math.max(last+1, start);
  var v = sh.getRange(start, col, Math.max(1,end-start+1), 1).getValues();
  for (var i=0;i<v.length;i++) if (v[i][0]==='' || v[i][0]===null) return start+i;
  return end+1;
}
/** ينسخ المعادلات من الصف اللي فوق للصف الجديد */
function carryFormulas_(sh, row, cols){
  if (row<=1) return;
  var f = sh.getRange(row-1, 1, 1, cols).getFormulas()[0];
  for (var c=0;c<cols;c++){
    if (f[c]) sh.getRange(row-1, c+1).copyTo(sh.getRange(row, c+1));
  }
}
function colList_(sh, a1){
  var v = sh.getRange(a1).getValues(), out=[];
  for (var i=0;i<v.length;i++) if (v[i][0]!=='' && v[i][0]!==null) out.push(v[i][0]);
  return out;
}

function api_lists(){
  var hs = hr_().getSheetByName(S_SET);
  var fs = fin_().getSheetByName('الإعدادات');
  var branches={}, bv = hr_().getSheetByName(S_EMP).getRange('C3:C62').getValues();
  for (var i=0;i<bv.length;i++) if (bv[i][0]) branches[bv[i][0]]=1;
  var acc=[], av = fs.getRange('F4:H70').getValues();
  for (var j=0;j<av.length;j++) if (av[j][1]) acc.push({code:av[j][0], name:av[j][1], cat:av[j][2]});
  var parties={}, pv = fin_().getSheetByName(F_LED).getRange('D2:D3000').getValues();
  for (var k=0;k<pv.length;k++) if (pv[k][0]) parties[pv[k][0]]=1;
  var pl=[]; for (var p in parties) pl.push(p); pl.sort();
  return {
    employees: colList_(hs,'A4:A90'),
    jobs:      colList_(hs,'C4:C40'),
    nats:      colList_(hs,'E4:E40'),
    branches:  Object.keys(branches),
    accounts:  acc,
    cash:      colList_(fs,'A13:A20'),
    parties:   pl.slice(0,400),
    costItems: costItems_(),
    empAccounts: empCostAccounts_()
  };
}

/** إضافة موظف جديد */
function api_addEmployee(p){
  var ss=hr_(), sh=ss.getSheetByName(S_EMP);
  var names = sh.getRange('B3:B200').getValues();
  for (var i=0;i<names.length;i++)
    if (String(names[i][0]).trim()===String(p.name).trim())
      throw new Error('الاسم «'+p.name+'» موجود بالفعل في بيانات الموظفين');
  var r = firstEmptyRow_(sh, 2, 3);
  carryFormulas_(sh, r, 33);
  sh.getRange(r,1).setValue(r-2);
  var map = {2:p.name,3:p.branch,4:p.iqamaNo,5:p.nat,6:p.passport,7:p.passIssue,8:p.passExp,
             9:p.visa,10:p.job,11:p.phone,12:p.birth,13:p.hire,14:p.contractEnd,
             15:p.iqamaIssue,16:p.iqamaExp,17:p.permitExp,18:p.medExp,19:p.healthExp,
             20:p.basic,21:p.transport,22:p.hours,23:p.notice,24:p.status||'على رأس العمل',
             31:p.advOpening,32:p.advInstal,33:p.lastMonth};
  for (var c in map){
    var val=map[c];
    if (val===undefined || val===null || val==='') continue;
    sh.getRange(r, Number(c)).setValue(val);
  }
  var hs=ss.getSheetByName(S_SET);
  var list=hs.getRange('A4:A200').getValues(), found=false, empty=-1;
  for (var k=0;k<list.length;k++){
    if (String(list[k][0]).trim()===String(p.name).trim()){ found=true; break; }
    if ((list[k][0]===''||list[k][0]===null) && empty<0) empty=4+k;
  }
  if (!found && empty>0) hs.getRange(empty,1).setValue(p.name);
  SpreadsheetApp.flush();
  return 'اتضاف «'+p.name+'» في صف '+r+' وفي قائمة الأسماء';
}

/** تعديل بيانات موظف موجود */
function api_updateEmployee(p){
  var sh=hr_().getSheetByName(S_EMP);
  var v=sh.getRange('B3:B200').getValues(), r=-1;
  for (var i=0;i<v.length;i++) if (String(v[i][0]).trim()===String(p.name).trim()){ r=3+i; break; }
  if (r<0) throw new Error('الموظف مش موجود');
  var map = {3:p.branch,5:p.nat,10:p.job,11:p.phone,13:p.hire,14:p.contractEnd,
             16:p.iqamaExp,17:p.permitExp,18:p.medExp,19:p.healthExp,
             20:p.basic,21:p.transport,22:p.hours,23:p.notice,24:p.status,
             31:p.advOpening,32:p.advInstal,33:p.lastMonth};
  var n=0;
  for (var c in map){
    var val=map[c];
    if (val===undefined || val===null) continue;
    sh.getRange(r, Number(c)).setValue(val===''?null:val);
    n++;
  }
  SpreadsheetApp.flush();
  return 'اتحدّثت بيانات «'+p.name+'» ('+n+' خانة)';
}

/** إضافة حركة في دفتر المالية */
function api_addLedger(p){
  var sh = fin_().getSheetByName(F_LED);
  var r = firstEmptyRow_(sh, 1, 2);
  carryFormulas_(sh, r, 20);
  var amt = num_(p.amount);
  if (!amt) throw new Error('اكتب المبلغ');
  if (!p.date) throw new Error('اكتب التاريخ');
  if (!p.account) throw new Error('اختار الحساب');
  var d = new Date(p.date);
  sh.getRange(r,1).setValue(d);
  sh.getRange(r,2).setValue(p.desc||'');
  sh.getRange(r,3).setValue(p.account);
  if (p.party) sh.getRange(r,4).setValue(p.party);
  if (p.vatNo) sh.getRange(r,5).setValue(p.vatNo);
  if (p.kind==='in') sh.getRange(r,6).setValue(amt);
  else sh.getRange(r,7).setValue(amt);
  if (p.cash) sh.getRange(r,8).setValue(p.cash);
  if (p.vatable) sh.getRange(r,9).setValue(p.vatable);
  if (p.dueMonth) sh.getRange(r,10).setValue(p.dueMonth);
  if (p.employee) sh.getRange(r,11).setValue(p.employee);
  if (p.invoice) sh.getRange(r,12).setValue(p.invoice);
  sh.getRange(r,13).setValue(p.note || 'إدخال من لوحة المالك');
  SpreadsheetApp.flush();
  if (!p.skipCost && p.employee && p.kind!=='in'){
    var accs = empCostAccounts_(), hit=false;
    for (var a=0;a<accs.length;a++) if (accs[a]===p.account) hit=true;
    if (hit) addCostRow_({employee:p.employee, item:p.account, amount:amt, date:p.date},
                         'من الدفتر — صف '+r);
  }
  return 'اتسجلت الحركة في صف '+r+' من الدفتر';
}

/* ================= تكاليف الموظفين والسلف ================= */

var S_COST='تكاليف الموظفين';
var EMP_CAT='مصاريف الموظفين';

function empCostAccounts_(){
  var v = fin_().getSheetByName('الإعدادات').getRange('F4:H70').getValues(), out=[];
  for (var i=0;i<v.length;i++) if (v[i][1] && v[i][2]===EMP_CAT) out.push(v[i][1]);
  return out;
}

/** كل تكاليف الموظفين: من شيت الموارد البشرية + من دفتر المالية */
function api_empCosts(){
  var out=[], items={};
  var sh = hr_().getSheetByName(S_COST);
  if (sh && sh.getLastRow()>2){
    var v = sh.getRange(3,1,sh.getLastRow()-2,6).getValues();
    for (var i=0;i<v.length;i++){
      var r=v[i];
      /* لازم اسم موظف وبند — ده بيستبعد صف الإجمالي وأي صف ناقص */
      if (!r[1] || !r[2]) continue;
      if (String(r[1]).trim()==='اسم الموظف') continue;
      if (String(r[1]).indexOf('الإجمالي')>=0 || String(r[2]).indexOf('الإجمالي')>=0) continue;
      if (!num_(r[3])) continue;
      out.push({ name:r[1], item:r[2], amount:num_(r[3]), date:d_(r[4]),
                 note:r[5], src:'الموارد البشرية', row:i+3 });
      if (r[2]) items[r[2]]=1;
    }
  }
  var accs = empCostAccounts_(), isAcc={};
  for (var a=0;a<accs.length;a++) isAcc[accs[a]]=1;
  var lv = fin_().getSheetByName(F_LED).getRange('A2:T3000').getValues();
  for (var j=0;j<lv.length;j++){
    var r2=lv[j], dt=r2[0];
    if (Object.prototype.toString.call(dt)!=='[object Date]') continue;
    var amt=num_(r2[6]); if(!amt) continue;
    var empName = r2[10];
    if (!empName && !isAcc[r2[2]]) continue;
    if (String(r2[12]||'').indexOf('من تكاليف الموظفين')===0) continue;
    out.push({ name: empName || '— غير محدد', item: r2[2], amount: amt, date: d_(dt),
               note: r2[1], src:'المالية', party:r2[3] });
  }
  out.sort(function(x,y){ return (y.date||'').localeCompare(x.date||''); });
  var il=[]; for (var k in items) il.push(k);
  return { rows: out, items: il.sort() };
}

function costItems_(){
  var sh = hr_().getSheetByName(S_COST), m={};
  if (sh && sh.getLastRow()>2){
    var v = sh.getRange(3,3,sh.getLastRow()-2,1).getValues();
    for (var i=0;i<v.length;i++) if (v[i][0] && String(v[i][0]).trim()!=='بند التكلفة') m[v[i][0]]=1;
  }
  var out=[]; for (var k in m) out.push(k); return out.sort();
}

/** يكتب صف في شيت تكاليف الموظفين */
/** أول صف متاح في شيت التكاليف — بيتجنب صف الإجمالي في الآخر */
function costAppendRow_(sh){
  var last = Math.max(3, sh.getLastRow());
  var v = sh.getRange(3,2,last-2,3).getValues();
  var lastData = 2;
  for (var i=0;i<v.length;i++) if (v[i][0] && v[i][1]) lastData = 3+i;
  var next = lastData+1;
  var nb = sh.getRange(next,2,1,3).getValues()[0];
  if ((!nb[0] || !nb[1]) && num_(nb[2])) sh.insertRowBefore(next);
  return next;
}
function addCostRow_(p, note){
  var sh = hr_().getSheetByName(S_COST);
  if (!sh) return 0;
  var r = costAppendRow_(sh);
  carryFormulas_(sh, r, 6);
  sh.getRange(r,1).setValue(r-2);
  sh.getRange(r,2).setValue(p.employee||p.name||'');
  sh.getRange(r,3).setValue(p.item||p.account||'');
  sh.getRange(r,4).setValue(num_(p.amount));
  if (p.date) sh.getRange(r,5).setValue(new Date(p.date));
  sh.getRange(r,6).setValue(note||'إدخال من لوحة المالك');
  return r;
}

/** تكلفة موظف: تتسجل في الدفتر وفي شيت تكاليف الموظفين مرة واحدة */
function api_addEmpCost(p){
  if(!p.employee) throw new Error('اختار الموظف');
  if(!num_(p.amount)) throw new Error('اكتب المبلغ');
  if(!p.account) throw new Error('اختار الحساب في المالية');
  var msg = api_addLedger({ kind:'out', date:p.date, desc:p.desc || ((p.item||'')+' — '+p.employee),
    account:p.account, party:p.party, amount:p.amount, cash:p.cash, invoice:p.invoice,
    vatable:p.vatable, employee:p.employee,
    note:'من تكاليف الموظفين — '+(p.item||''), skipCost:true });
  var ledRow = String(msg).replace(/\D+/g,'');
  var r = addCostRow_({employee:p.employee, item:p.item||p.account, amount:p.amount, date:p.date},
                      'من الدفتر — صف '+ledRow);
  SpreadsheetApp.flush();
  return 'اتسجلت في الدفتر (صف '+ledRow+') وفي تكاليف الموظفين (صف '+r+')';
}

/** سلفة يدوية لموظف */
function api_addAdvance(p){
  if(!p.name) throw new Error('اختار الموظف');
  if(!num_(p.amount)) throw new Error('اكتب المبلغ');
  var sh = hr_().getSheetByName(S_ADJ);
  var r = findRow_(sh,3,202,p.year,p.month,p.name);
  if (r<0){
    r = firstRow_(sh,3,3,202);
    if (r<0) throw new Error('مفيش صفوف فاضية في تعديلات السلف');
    sh.getRange(r,1,1,3).setValues([[p.year,p.month,p.name]]);
  }
  var cur = num_(sh.getRange(r,5).getValue());
  sh.getRange(r,5).setValue(cur + num_(p.amount));
  if (p.note) sh.getRange(r,7).setValue(p.note);
  SpreadsheetApp.flush();
  return 'اتسجلت سلفة '+F0_(p.amount)+' ريال لـ'+p.name+' في '+p.month+' '+p.year;
}
function F0_(n){ return Math.round(num_(n)).toString(); }

/** صفوف شهرية لكل موظف من جدول الرواتب + الأرشيف */
function api_empMonthly(){
  var out=[];
  var v = hr_().getSheetByName(S_PAY).getRange('A3:AF800').getValues();
  for (var i=0;i<v.length;i++){
    var r=v[i];
    if(!r[0] || !r[1] || !r[2]) continue;
    var dues=num_(r[19]);
    if(!dues) continue;
    out.push({ year:r[0], month:r[1], name:r[2], dues:dues,
      fines:num_(r[21])+num_(r[23]), net:num_(r[27]),
      sales:num_(r[8]) || empSales_(r[0],r[1],r[2]), tips:num_(r[28]), comm:num_(r[10]),
      basic:num_(r[5]), ot:num_(r[12]) });
  }
  var arc = api_archive();
  for (var a=0;a<arc.length;a++){
    var x=arc[a];
    out.push({ year:x.year, month:x.month, name:x.name, dues:x.dues,
      fines:x.dAbsence+x.dLate, net:x.net, sales:x.sales, tips:x.tips,
      comm:x.comm, basic:x.basic, ot:x.otPay, archive:true });
  }
  return out;
}
