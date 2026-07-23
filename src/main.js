import * as echarts from 'echarts';
import './style.css';

const money = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 });
const percent = value => `${(value * 100).toFixed(1)}%`;
const sum = (rows, key) => rows.reduce((total, row) => total + (row[key] || 0), 0);
const byMonth = (rows, month) => rows.filter(row => row.date.startsWith(month));

const data = await fetch('/data/dashboard.json').then(response => response.json());
const asOf = new Date(`${data.meta.asOf}T00:00:00`);
const monthKey = data.meta.asOf.slice(0, 7);
const monthRows = byMonth(data.daily, monthKey);
const previousMonthDate = new Date(asOf.getFullYear(), asOf.getMonth() - 1, 1);
const previousMonthKey = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;
const sameDay = asOf.getDate();
const previousRows = byMonth(data.daily, previousMonthKey).filter(row => Number(row.date.slice(8, 10)) <= sameDay);
const lastSeven = data.daily.filter(row => {
  const date = new Date(`${row.date}T00:00:00`);
  return date <= asOf && date >= new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate() - 6);
});
const yesterdayKey = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate() - 1).toISOString().slice(0, 10);
const yesterday = data.daily.find(row => row.date === yesterdayKey) || {};
const target = data.targets[monthKey] || { shelf: 0, tiktok: 0 };
const totalTarget = target.shelf + target.tiktok;
const elapsedRatio = sameDay / new Date(asOf.getFullYear(), asOf.getMonth() + 1, 0).getDate();
const elapsedTarget = totalTarget * elapsedRatio;
const currentTotal = sum(monthRows, 'total');
const previousTotal = sum(previousRows, 'total');
const mom = previousTotal ? currentTotal / previousTotal - 1 : null;
const subsidyTotal = sum(monthRows, 'subsidy');
const shelfTotal = sum(monthRows, 'shelf');
const tiktokTotal = sum(monthRows, 'tiktok');
const targetProgress = totalTarget ? currentTotal / totalTarget : 0;
const timeProgress = elapsedRatio;

document.querySelector('#app').innerHTML = `
  <header class="topbar">
    <div>
      <div class="eyebrow">OMNICHANNEL COMMERCE</div>
      <h1>新加坡全渠道经营看板</h1>
      <p>Glad2Glow · 数据更新至 ${data.meta.asOf} · 统一人民币口径</p>
    </div>
    <div class="filters">
      <button>新加坡 <span>⌄</span></button>
      <button>Glad2Glow <span>⌄</span></button>
      <button>${monthKey} <span>⌄</span></button>
    </div>
  </header>
  <main>
    <section class="hero-grid">
      <article class="hero-card primary">
        <div class="card-label">本月全渠道销售</div>
        <div class="hero-value">${money.format(currentTotal)}</div>
        <div class="hero-meta"><span class="${mom >= 0 ? 'up' : 'down'}">${mom == null ? '暂无环比' : `${mom >= 0 ? '↑' : '↓'} ${percent(Math.abs(mom))} 环比上月同期`}</span><span>目标 ${money.format(totalTarget)}</span></div>
        <div class="progress"><i style="width:${Math.min(targetProgress * 100, 100)}%"></i></div>
        <div class="progress-copy"><strong>月度达成 ${percent(targetProgress)}</strong><span>时间进度 ${percent(timeProgress)}</span></div>
      </article>
      <article class="metric-card"><div class="metric-icon purple">昨</div><div><span>昨日销售</span><strong>${money.format(yesterday.total || 0)}</strong><small>截至 ${yesterdayKey}</small></div></article>
      <article class="metric-card"><div class="metric-icon cyan">7D</div><div><span>过去7天销售</span><strong>${money.format(sum(lastSeven, 'total'))}</strong><small>${lastSeven.length} 个数据日</small></div></article>
      <article class="metric-card"><div class="metric-icon amber">补</div><div><span>本月平台补贴</span><strong>${money.format(subsidyTotal)}</strong><small>不含 Lazada 补贴</small></div></article>
    </section>

    <section class="channel-grid">
      ${[
        ['TikTok', tiktokTotal, target.tiktok, '#7047eb', '内容电商'],
        ['Shopee', sum(monthRows, 'shopee'), null, '#15a6a6', '货架渠道'],
        ['Lazada', sum(monthRows, 'lazada'), null, '#f5a623', '货架渠道'],
        ['货架合计', shelfTotal, target.shelf, '#2457d6', 'Shopee + Lazada'],
      ].map(([name, value, channelTarget, color, note]) => `
        <article class="channel-card" style="--accent:${color}">
          <div class="channel-head"><span>${name}</span><small>${note}</small></div>
          <strong>${money.format(value)}</strong>
          ${channelTarget ? `<div class="mini-progress"><i style="width:${Math.min(value / channelTarget * 100, 100)}%"></i></div><p>月目标达成 ${percent(value / channelTarget)}</p>` : '<p>当前未配置独立月目标</p>'}
        </article>`).join('')}
    </section>

    <section class="chart-grid">
      <article class="panel wide"><div class="panel-head"><div><span>本月每日趋势</span><small>销售柱形 + 平台补贴折线</small></div><div class="legend-note">单位：人民币</div></div><div id="trend" class="chart"></div></article>
      <article class="panel"><div class="panel-head"><div><span>渠道销售结构</span><small>本月累计贡献</small></div></div><div id="share" class="chart"></div><div class="share-caption"><strong>${percent(currentTotal ? shelfTotal / currentTotal : 0)}</strong><span>货架销售占比</span></div></article>
    </section>

    <section class="bottom-grid">
      <article class="panel"><div class="panel-head"><div><span>经营进度</span><small>目标进度与时间进度对照</small></div></div><div class="goal-list">
        <div><label>全渠道目标</label><b>${percent(targetProgress)}</b><div><i style="width:${Math.min(targetProgress * 100, 100)}%"></i></div></div>
        <div><label>货架目标</label><b>${percent(target.shelf ? shelfTotal / target.shelf : 0)}</b><div><i style="width:${Math.min((target.shelf ? shelfTotal / target.shelf : 0) * 100, 100)}%"></i></div></div>
        <div><label>TikTok目标</label><b>${percent(target.tiktok ? tiktokTotal / target.tiktok : 0)}</b><div><i style="width:${Math.min((target.tiktok ? tiktokTotal / target.tiktok : 0) * 100, 100)}%"></i></div></div>
        <div class="time"><label>自然月时间</label><b>${percent(timeProgress)}</b><div><i style="width:${timeProgress * 100}%"></i></div></div>
      </div></article>
      <article class="panel"><div class="panel-head"><div><span>口径说明</span><small>当前版本数据规则</small></div></div><ul class="rules"><li><b>Shopee销售</b> DMS Y列“实收GMV（人民币）”</li><li><b>Shopee补贴</b> DMS Z列“平台补贴”</li><li><b>TikTok</b> DMS实收GMV及平台补贴</li><li><b>Lazada</b> RMB销售，暂不计算补贴</li><li><b>货架销售</b> Shopee + Lazada</li></ul></article>
      <article class="panel health"><div class="panel-head"><div><span>数据健康</span><small>上线前重点提示</small></div></div><div class="health-row"><span>数据更新</span><b class="good">正常</b></div><div class="health-row"><span>同比去年同期</span><b class="warn">同口径历史不足</b></div><div class="health-row"><span>目标配置</span><b class="good">已连接</b></div><div class="health-row"><span>Lazada补贴</span><b class="muted">不纳入</b></div></article>
    </section>
  </main>
  <footer>数据源：Google Sheets · 数据快照进入 GitHub · Cloudflare 提供看板服务</footer>
`;

const dates = monthRows.map(row => row.date.slice(8, 10));
const trend = echarts.init(document.querySelector('#trend'));
trend.setOption({
  tooltip: { trigger: 'axis', valueFormatter: value => money.format(value) },
  legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: '#69708a' } },
  grid: { left: 52, right: 58, top: 48, bottom: 28 },
  xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: '#dce1ef' } }, axisLabel: { color: '#8a91aa' } },
  yAxis: [{ type: 'value', splitLine: { lineStyle: { color: '#edf0f7' } }, axisLabel: { color: '#8a91aa', formatter: value => `${Math.round(value / 1000)}k` } }, { type: 'value', splitLine: { show: false }, axisLabel: { show: false } }],
  series: [
    { name: 'TikTok', type: 'bar', stack: 'sales', data: monthRows.map(row => row.tiktok), itemStyle: { color: '#7047eb' }, barMaxWidth: 18 },
    { name: 'Shopee', type: 'bar', stack: 'sales', data: monthRows.map(row => row.shopee), itemStyle: { color: '#15a6a6' } },
    { name: 'Lazada', type: 'bar', stack: 'sales', data: monthRows.map(row => row.lazada), itemStyle: { color: '#f5a623', borderRadius: [4, 4, 0, 0] } },
    { name: '平台补贴', type: 'line', yAxisIndex: 1, data: monthRows.map(row => row.subsidy), smooth: true, symbolSize: 6, lineStyle: { width: 3, color: '#e94d83' }, itemStyle: { color: '#e94d83' } },
  ],
});

const share = echarts.init(document.querySelector('#share'));
share.setOption({
  tooltip: { trigger: 'item', formatter: params => `${params.name}<br>${money.format(params.value)} · ${params.percent}%` },
  legend: { bottom: 0, icon: 'circle', textStyle: { color: '#69708a' } },
  series: [{ type: 'pie', radius: ['52%', '74%'], center: ['50%', '44%'], label: { show: false }, itemStyle: { borderColor: '#fff', borderWidth: 4 }, data: [
    { name: 'TikTok', value: tiktokTotal, itemStyle: { color: '#7047eb' } },
    { name: 'Shopee', value: sum(monthRows, 'shopee'), itemStyle: { color: '#15a6a6' } },
    { name: 'Lazada', value: sum(monthRows, 'lazada'), itemStyle: { color: '#f5a623' } },
  ] }],
});

window.addEventListener('resize', () => { trend.resize(); share.resize(); });
