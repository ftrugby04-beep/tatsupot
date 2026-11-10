/**
 * EC月次レポート自動作成（Googleスプレッドシート＋GAS）
 *
 * 使い方
 * 1. スプレッドシートに「売上データ」シートを作り、楽天RMS/Amazon等のCSVを貼り付け
 *    （1行目は見出し：日付, モール, 商品名, 売上, 注文数, 広告費）
 * 2. メニュー「EC自動化」→「月次レポート作成」
 * 3. 「月次レポート」シートに 月別推移・前月比・前年比・商品ランキング・グラフ が自動で作られます
 *
 * 追加機能：「メルマガチェック」シートのA列に配信文、B列に正しい価格表を書くと
 * 価格の不一致・リンク切れ候補・ポイント倍率の表記ゆれを自動でチェックします。
 */

const SRC_SHEET = '売上データ';
const OUT_SHEET = '月次レポート';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('EC自動化')
    .addItem('月次レポート作成', 'buildMonthlyReport')
    .addItem('メルマガチェック', 'checkNewsletter')
    .addToUi();
}

function buildMonthlyReport() {
  const ss = SpreadsheetApp.getActive();
  const src = ss.getSheetByName(SRC_SHEET);
  if (!src) throw new Error(`「${SRC_SHEET}」シートがありません`);

  const [header, ...rows] = src.getDataRange().getValues();
  const col = (name) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`見出し「${name}」が見つかりません`);
    return i;
  };
  const cDate = col('日付'), cMall = col('モール'), cItem = col('商品名'),
        cSales = col('売上'), cQty = col('注文数'), cAd = col('広告費');

  const monthly = {};   // 'yyyy-MM' -> {sales, qty, ad, byMall:{}}
  const items = {};     // 最新月の商品別売上
  const months = new Set();

  rows.forEach((r) => {
    if (!r[cDate]) return;
    const d = new Date(r[cDate]);
    const key = Utilities.formatDate(d, 'Asia/Tokyo', 'yyyy-MM');
    months.add(key);
    const m = (monthly[key] = monthly[key] || { sales: 0, qty: 0, ad: 0, byMall: {} });
    const sales = Number(r[cSales]) || 0;
    m.sales += sales;
    m.qty += Number(r[cQty]) || 0;
    m.ad += Number(r[cAd]) || 0;
    m.byMall[r[cMall]] = (m.byMall[r[cMall]] || 0) + sales;
  });

  const sorted = [...months].sort();
  const latest = sorted[sorted.length - 1];
  rows.forEach((r) => {
    if (!r[cDate]) return;
    const key = Utilities.formatDate(new Date(r[cDate]), 'Asia/Tokyo', 'yyyy-MM');
    if (key === latest) items[r[cItem]] = (items[r[cItem]] || 0) + (Number(r[cSales]) || 0);
  });

  const prevKey = (key, n) => {
    const [y, m] = key.split('-').map(Number);
    const d = new Date(y, m - 1 - n, 1);
    return Utilities.formatDate(d, 'Asia/Tokyo', 'yyyy-MM');
  };
  const ratio = (a, b) => (b ? a / b : '');

  const out = ss.getSheetByName(OUT_SHEET) || ss.insertSheet(OUT_SHEET);
  out.clear();
  out.getCharts().forEach((c) => out.removeChart(c));

  // 1. 月別推移
  const table = [['月', '売上', '注文数', '広告費', 'ROAS', '前月比', '前年比']];
  sorted.forEach((k) => {
    const m = monthly[k];
    const pm = monthly[prevKey(k, 1)];
    const py = monthly[prevKey(k, 12)];
    table.push([k, m.sales, m.qty, m.ad, ratio(m.sales, m.ad),
      pm ? ratio(m.sales, pm.sales) : '', py ? ratio(m.sales, py.sales) : '']);
  });
  out.getRange(1, 1).setValue(`■ 月別推移（作成日：${Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd')}）`).setFontWeight('bold');
  const tRange = out.getRange(2, 1, table.length, table[0].length);
  tRange.setValues(table);
  out.getRange(2, 1, 1, table[0].length).setBackground('#1f3864').setFontColor('#fff').setFontWeight('bold');
  out.getRange(3, 2, table.length - 1, 3).setNumberFormat('#,##0');
  out.getRange(3, 5, table.length - 1, 1).setNumberFormat('0.00');
  out.getRange(3, 6, table.length - 1, 2).setNumberFormat('0.0%');

  // 前月比が90%未満なら赤、110%以上なら緑
  const rules = [
    SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0.9).setBackground('#f8d7da')
      .setRanges([out.getRange(3, 6, table.length - 1, 2)]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThanOrEqualTo(1.1).setBackground('#d4edda')
      .setRanges([out.getRange(3, 6, table.length - 1, 2)]).build(),
  ];
  out.setConditionalFormatRules(rules);

  // 2. 最新月の商品ランキング TOP10
  const startRow = table.length + 4;
  out.getRange(startRow - 1, 1).setValue(`■ ${latest} 商品別売上ランキング TOP10`).setFontWeight('bold');
  const rank = Object.entries(items).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([name, v], i) => [i + 1, name, v]);
  out.getRange(startRow, 1, 1, 3).setValues([['順位', '商品名', '売上']])
    .setBackground('#1f3864').setFontColor('#fff').setFontWeight('bold');
  if (rank.length) {
    out.getRange(startRow + 1, 1, rank.length, 3).setValues(rank);
    out.getRange(startRow + 1, 3, rank.length, 1).setNumberFormat('#,##0');
  }

  // 3. 売上推移グラフ
  const chart = out.newChart().setChartType(Charts.ChartType.COMBO)
    .addRange(out.getRange(2, 1, table.length, 2))
    .addRange(out.getRange(2, 4, table.length, 1))
    .setPosition(2, 9, 0, 0)
    .setOption('title', '売上・広告費の推移')
    .setOption('seriesType', 'bars')
    .setOption('series', { 1: { type: 'line' } })
    .build();
  out.insertChart(chart);
  out.autoResizeColumns(1, 7);
  SpreadsheetApp.getActive().toast('月次レポートを作成しました', 'EC自動化', 5);
}

/**
 * メルマガチェック
 * 「メルマガチェック」シート：A1 に配信本文、D列以降に 商品名 | 正しい価格 | ポイント倍率 の表（D1は見出し）
 * 結果は B1 以降に出力されます。
 */
function checkNewsletter() {
  const sh = SpreadsheetApp.getActive().getSheetByName('メルマガチェック');
  if (!sh) throw new Error('「メルマガチェック」シートがありません');
  const body = String(sh.getRange('A1').getValue());
  const master = sh.getRange('D2:F').getValues().filter((r) => r[0]);
  const issues = [];

  master.forEach(([name, price, point]) => {
    const idx = body.indexOf(name);
    if (idx < 0) return;
    const near = body.slice(idx, idx + 120);
    const m = near.match(/([0-9,]+)\s*円/);
    if (m && Number(m[1].replace(/,/g, '')) !== Number(price)) {
      issues.push(['価格不一致', name, `本文:${m[1]}円 / 正:${price}円`]);
    }
    const p = near.match(/ポイント\s*([0-9]+)\s*倍/);
    if (point && p && Number(p[1]) !== Number(point)) {
      issues.push(['ポイント倍率不一致', name, `本文:${p[1]}倍 / 正:${point}倍`]);
    }
  });

  (body.match(/https?:\/\/[^\s"'<>]+/g) || []).forEach((url) => {
    try {
      const code = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true }).getResponseCode();
      if (code >= 400) issues.push(['リンク切れ', url, `HTTP ${code}`]);
    } catch (e) {
      issues.push(['リンク確認エラー', url, String(e)]);
    }
  });

  if (/[０-９]/.test(body)) issues.push(['表記ゆれ', '全角数字', '全角数字が含まれています']);

  sh.getRange('B1:B').clearContent();
  const out = [['チェック結果：' + (issues.length ? `${issues.length}件の確認事項` : '問題なし')]]
    .concat(issues.map((i) => [i.join('｜')]));
  sh.getRange(1, 2, out.length, 1).setValues(out);
}
