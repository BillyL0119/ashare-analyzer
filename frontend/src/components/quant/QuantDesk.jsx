import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactECharts from '../../lib/echarts'
import useAuthStore from '../../store/authStore'
import useThemeStore from '../../store/themeStore'
import useCompareStore from '../../store/compareStore'
import { THEME } from '../../utils/chartHelpers'
import { isNum, fmtSignedPct, changeColor } from '../quotepage/format'
import '../quotepage/quotepage.css'
import '../factors/factors.css'
import './quant.css'
import SimpleView from './SimpleView'
import SplitTrend from './SplitTrend'

const MODE_KEY = 'bfs_quant_mode'
const readMode = () => { try { return localStorage.getItem(MODE_KEY) || 'simple' } catch { return 'simple' } }

// Admin-only research desk. The file behind it is built on Billy's Mac from Sharadar data (personal licence) by
// backend/research/signals.py and uploaded by tools/quant_publish.py; /api/admin/quant/signals checks the admin
// role on every request.

const S = {
  zh: {
    title: '量化研究台', onlyAdmin: '仅管理员可见', modeSimple: '简单模式', modePro: '专业模式',
    asOf: (d, n) => `数据截至 ${d} · 大盘股 ${n} 只`,
    disclaimer: '研究工具，不构成投资建议，历史结果不代表未来。数据来自 Sharadar，个人授权，请勿外传或截图公开。',
    signIn: '请先登录管理员账号', signInBtn: '登录', denied: '这个账号没有管理员权限。', missing: '还没有上传研究结果。在电脑上运行 quant_publish.py 后刷新。',
    failed: '加载失败，请稍后重试。', retry: '重试',
    trendTitle: '大盘趋势', trendSub: '市值加权大盘股指数与它的 10 个月均线',
    above: (g) => `在均线上方 ${g}%`, below: (g) => `在均线下方 ${Math.abs(g)}%`,
    aboveNote: '按规则：下个月正常持股。', belowNote: '按规则：下个月持有现金。',
    provNote: (thisMonth, above) => `这是按本月到目前为止的数据算的临时读数，规则只看每月最后一个交易日的收盘。本月规则状态：${thisMonth ? '持股' : '持现金'}（由上月底决定）。${above ? '月底如果仍在均线上方，下个月继续持股。' : '月底如果仍在均线下方，下个月持有现金。'}`,
    trendRule: '原规则：月初指数低于 10 个月均线，这个月就持有现金（按 3 个月美国国债利率计息）。2026-11-25 起研究台改用下面"分 5 份"的做法。原规则像一份保险，但没有以前写的那么好：2026-11-24 查错后按更真实的方法重算（看到信号的第二天才交易），按每日价格算，2005–2020 年指数最大回撤约 −54%，用这条规则后在 −21% 到 −36% 之间，取决于每月第几个交易日检查；最近 6 年从约 −26% 降到 −16% 到 −19%。代价是收益：2005–2020 年每年差 −2.3 到 +0.4 个百分点，最近 6 年每年少 1.6 到 3.4 个百分点。这是教科书上的固定规则，没有用这段数据调参数。',
    lineIndex: '大盘股指数', lineMa: '10 个月均线',
    rankTitle: '大盘股因子排名', rankSub: (f) => `综合 ${f} 个因子，在各自行业内比较，按历史预测力加权`,
    search: '输入代码或名称，看它排第几', top50: '模型组合前 50', all: '全部',
    notFound: '不在大盘股池里：市值不在前 1000，或股价低于 5 美元、成交额不足，或者代码有误。',
    keepNote: (n) => `模型组合是前 50 名，每季度调整一次。已经持有的股票，只要还在前 ${n} 名内就不用换，可以少交易。`,
    colRank: '排名', colStock: '股票', colSector: '行业', colCap: '市值 $B', colScore: '综合分',
    colPe: '市盈率', colFcf: 'FCF 收益率', colRoe: 'ROE', colShares: '股本变化', colRet: '1 年涨跌', colShort: '卖空比例',
    shortTip: (d) => `回补天数 ${d} 天（卖空股数 ÷ 日均成交量）`, shortHigh: '高',
    shortNote: (date, hi) => `卖空比例 = 被卖空的股数 ÷ 总股本，来自 FINRA 公开数据（${date} 结算）。达到 ${hi}% 标为“高”：这类股票通常波动更大，也可能出现轧空暴涨；它只是风险提示，不代表一定会跌。我们测试过把它当选股信号，没有效果，所以没加入模型。`,
    factorPct: '因子分位（0–100，行业内，越高越好）', groupFactors: '因子分位（0–100）', groupMetrics: '实际数值',
    credTitle: '这套方法过去表现如何', credSub: (y) => `${y}–2026 年向前滚动检验：每年只用当时之前的数据挑因子，扣除交易成本，大盘股池`,
    bench: (cw, dd) => `对照：买入市值加权大盘股（约等于标普 500）每年 ${cw}%，最大回撤 ${dd}`,
    colStep: '组合方式', colCagr: '年化', colDd: '最大回撤', colVsIdx: '相对指数', colT: 't 值', colBehind: '输给指数的年数',
    tNote: 't 值低于 2，说明相对指数的差别可能只是运气。',
    yearsTitle: '每年和指数比（模型组合前 50，未加趋势规则）',
    factorTitle: '用到的因子和它们的历史记录',
    colFactor: '因子', colIcT: '预测力 t 值', colTopEx: '前五分之一每年超额', colIcHalves: '预测力 2000–12 → 2013 至今',
    useTitle: '使用须知',
    use: [
      '这是一个筛选工具，不是预测器。排名靠前只说明估值和质量更有利，对单只股票下个月涨跌几乎没有预测力。',
      '选股模型的优势很依赖市场风格：查错后 2005–2020 年每年只比指数多 0.1%，最近 6 年多 4.5%（之前写的是 0.4% 和 4.9%），主要来自 2021–2022 年价值股反弹，统计上都不能排除运气。',
      '趋势规则在两段时间里都把最大回撤减半左右，这一点最稳定，但会少赚。用不用、怎么组合，取决于你更在意收益还是更在意避免大亏。',
      '我们试过另外 9 个信号（内部人交易、机构持仓、财报反应等）和多种风险控制，都没能提高准确性，所以没有加入。',
      '每周六上午自动更新；需要时也可以在电脑上运行 quant_publish.py --refresh。',
    ],
    liveTitle: '上线以来实盘跟踪', liveSub: (d) => `从 ${d} 起按规则真实记录，持仓在决定当时就存档，之后不改`,
    liveDays: (n) => `已跟踪 ${n} 个交易日`, liveEarly: '时间还太短，涨跌主要是运气；至少要 1–3 年才有参考价值。',
    liveCols: { model: '选股模型前 50', index: '标普 500（SPY）', index_trend: '指数 + 趋势规则', model_trend: '选股 + 趋势规则' },
    liveReturn: '上线以来', liveHold: '模型当前持仓（等权）', liveReview: (a, b) => `上次调整 ${a}，下次调整在 ${b} 之后`,
    liveChanges: '调整记录', liveBought: '买入', liveSold: '卖出', liveStart: '建仓',
    liveTrend: '趋势规则每月状态', liveIn: '持股', liveCash: '现金',
    aiTitle: 'AI 解读', aiSub: '用大白话解释这一页现在说了什么',
    aiBtn: '生成 AI 解读', aiBusy: '正在生成，大约需要 20–40 秒…', aiFail: '这次没有生成成功（AI 的回答没通过检查或服务暂时不可用），请稍后再试。',
    aiNote: '由 AI 根据本页的数据生成，每周数据更新后重新生成。它只解释规则和历史检验结果，不是投资建议，也可能有误；买不买、买多少由你自己决定。',
    valTitle: '四种用法的检验结果', valSub: (dev, ho) => `开发期 ${dev} 用来挑选方法；最近 6 年（${ho}）锁起来，所有方法定下来以后只检验了一次`,
    valDev: '2005–2020 开发期', valHold: '最近 6 年（只检验一次）', colRisk: '收益/风险',
    valAudit: (day) => `这些是 ${day} 查错后的数字：同样的规则，按更真实的方法重算（看到信号第二天才交易、两次调仓之间按实际持股计算、破产退市的股票多亏 30%、修正了一个让未来大涨股更容易入选的成交额数据错误）。交易成本翻倍，最近 6 年的结果每年只再少约 0.1 个百分点。`,
    valBefore: '查错前最近 6 年',
    valNote: (n, f) => `年化收益已扣除交易成本，持有现金的月份按 3 个月美国国债利率计息。收益/风险 = 年化收益 ÷ 年波动，越高越好。整个研究检验过 ${f} 个单项因子、比较过 ${n} 种组合方案；试得越多，碰巧好看的可能越大。`,
    cand: { index: '直接持有指数（约等于标普 500）', 'index + trend rule': '指数 + 趋势规则',
      'model (step E)': '选股模型前 50（当前排名）', 'model + inv-vol + sector + trend': '选股 + 按波动加权 + 行业上限 + 趋势规则' },
    steps: { 'A baseline': '基础：约 200 只，每月调整', 'B +sector-neutral': '加：行业内比较', 'C +IC weights': '加：按预测力加权',
      'D +quarterly, keep top30%': '加：季度调整 + 缓冲', 'E +50 names': '加：只持 50 只（当前模型）', 'F +trend rule (cash)': '再加：趋势规则（跌破均线持现金）' },
  },
  en: {
    title: 'Quant desk', onlyAdmin: 'Admins only', modeSimple: 'Simple', modePro: 'Full detail',
    asOf: (d, n) => `Data as of ${d} · ${n} large caps`,
    disclaimer: 'A research tool, not investment advice; past results do not predict the future. Data from Sharadar under a personal licence: do not share or post.',
    signIn: 'Sign in with an admin account to continue', signInBtn: 'Sign in', denied: 'This account does not have admin access.', missing: 'No research file has been uploaded yet. Run quant_publish.py on the Mac, then reload.',
    failed: 'Could not load the data. Try again.', retry: 'Retry',
    trendTitle: 'Market trend', trendSub: 'Cap-weighted large-cap index and its 10-month average',
    above: (g) => `${g}% above the average`, below: (g) => `${Math.abs(g)}% below the average`,
    aboveNote: 'Rule: stay invested next month.', belowNote: 'Rule: hold cash next month.',
    provNote: (thisMonth, above) => `A reading from the month so far; the rule acts only on month-end closes. This month the rule is ${thisMonth ? 'invested' : 'in cash'} (decided at last month’s close). ${above ? 'If it is still above the average at month-end, it stays invested next month.' : 'If it is still below the average at month-end, it holds cash next month.'}`,
    trendRule: 'Original rule: if the index starts a month below its 10-month average, hold cash that month (earning the 3-month Treasury bill rate). Since 2026-11-25 the desk follows the five-part version below. The original works like insurance, but less well than first shown: re-measured in the 2026-11-24 audit (trading the day after the signal), the index’s worst drawdown of about −54% in 2005–2020 (daily prices) became −21% to −36% depending on which trading day of the month it is checked, and about −26% became −16% to −19% in the last six years. The cost: −2.3 to +0.4 points a year in 2005–2020 and 1.6 to 3.4 points a year less in the last six years. A fixed textbook rule, not fitted to this data.',
    lineIndex: 'Large-cap index', lineMa: '10-month average',
    rankTitle: 'Large-cap factor ranking', rankSub: (f) => `${f} factors, compared within each sector, weighted by past predictive power`,
    search: 'Type a ticker or name to see its rank', top50: 'Model top 50', all: 'All',
    notFound: 'Not in the large-cap universe: not among the 1000 largest, under $5, too thinly traded, or a typo.',
    keepNote: (n) => `The model portfolio is the top 50, reviewed quarterly. A stock already held can stay while it is in the top ${n}, which saves trading.`,
    colRank: 'Rank', colStock: 'Stock', colSector: 'Sector', colCap: 'Cap $B', colScore: 'Score',
    colPe: 'P/E', colFcf: 'FCF yield', colRoe: 'ROE', colShares: 'Share change', colRet: '1-year', colShort: 'Short interest',
    shortTip: (d) => `${d} days to cover (shares short ÷ average daily volume)`, shortHigh: 'high',
    shortNote: (date, hi) => `Short interest = shares sold short ÷ shares outstanding, from FINRA’s public data (settled ${date}). ${hi}% or more is marked “high”: such stocks usually swing more and can be squeezed upwards; a risk flag, not a forecast of a fall. Tested as a ranking signal it did not help, so the model does not use it.`,
    factorPct: 'Factor percentiles (0–100 within sector, higher is better)', groupFactors: 'Factor percentiles (0–100)', groupMetrics: 'Actual figures',
    credTitle: 'How this method has done', credSub: (y) => `Walk-forward ${y}–2026: factors chosen each year from earlier data only, after trading costs, large caps`,
    bench: (cw, dd) => `Benchmark: cap-weighted large caps (about the S&P 500) ${cw}% a year, worst drawdown ${dd}`,
    colStep: 'Construction', colCagr: 'Per year', colDd: 'Worst drawdown', colVsIdx: 'vs index', colT: 't', colBehind: 'Years behind the index',
    tNote: 'A t below 2 means the difference from the index may be luck.',
    yearsTitle: 'Each year against the index (model top 50, no trend rule)',
    factorTitle: 'Factors used and their record',
    colFactor: 'Factor', colIcT: 'Predictive t', colTopEx: 'Top fifth excess / yr', colIcHalves: 'Predictive power 2000–12 → 2013 on',
    useTitle: 'Before using it',
    use: [
      'A screen, not a forecaster: a high rank means better value and quality, not that the stock will rise next month.',
      'The stock model depends on market style: after the audit, +0.1% a year over the index in 2005–2020 and +4.5% in the last six years (first shown as 0.4% and 4.9%), mostly the 2021–22 value rebound; neither rules out luck.',
      'The trend rule roughly halved the worst drawdown in both periods, the steadiest result here, but it gives up return. Whether to use it depends on how you weigh return against big losses.',
      'Nine more signals (insiders, institutions, earnings reactions and others) and several risk rules were tested and did not improve accuracy, so they are left out.',
      'Refreshed every Saturday morning; run quant_publish.py --refresh on the Mac to refresh by hand.',
    ],
    liveTitle: 'Live record since launch', liveSub: (d) => `Rules followed for real from ${d}; holdings are saved when decided and never changed`,
    liveDays: (n) => `${n} trading days tracked`, liveEarly: 'Too short to mean much: moves are mostly luck until one to three years have passed.',
    liveCols: { model: 'Stock model top 50', index: 'S&P 500 (SPY)', index_trend: 'Index + trend rule', model_trend: 'Stocks + trend rule' },
    liveReturn: 'Since launch', liveHold: 'Model holdings now (equal weight)', liveReview: (a, b) => `Last review ${a}; next after ${b}`,
    liveChanges: 'Reviews', liveBought: 'Bought', liveSold: 'Sold', liveStart: 'Opened',
    liveTrend: 'Trend rule by month', liveIn: 'Stocks', liveCash: 'Cash',
    aiTitle: 'AI reading', aiSub: 'What this page says right now, in plain words',
    aiBtn: 'Write the AI reading', aiBusy: 'Writing, about 20–40 seconds…', aiFail: 'It could not be written this time (the answer failed a check or the service is busy). Try again later.',
    aiNote: 'Written by AI from this page’s data and rewritten after each weekly update. It explains the rules and the tested results; it is not investment advice and may contain mistakes. Whether and how much to buy is your decision.',
    valTitle: 'Four ways to use it, tested', valSub: (dev, ho) => `Methods were chosen on ${dev}; the last six years (${ho}) were set aside and tested once after everything was fixed`,
    valDev: '2005–2020 development', valHold: 'Last six years (tested once)', colRisk: 'Return/risk',
    valAudit: (day) => `These are the figures after the ${day} audit: the same rules measured more realistically (trading the day after the signal, holding the shares between reviews, an extra 30% loss on bankrupt delistings, and a fixed data error that let future winners into the universe early). Doubling trading costs takes only about 0.1 point a year more off the last six years.`,
    valBefore: 'Last six years before the audit',
    valNote: (n, f) => `Returns are after trading costs; months in cash earn the 3-month Treasury bill rate. Return/risk = annual return ÷ annual volatility, higher is better. ${f} single factors and ${n} combinations were tested in all; the more tried, the likelier one looks good by chance.`,
    cand: { index: 'Hold the index (about the S&P 500)', 'index + trend rule': 'Index + trend rule',
      'model (step E)': 'Stock model top 50 (current ranking)', 'model + inv-vol + sector + trend': 'Stocks + vol weights + sector cap + trend rule' },
    steps: { 'A baseline': 'Base: ~200 names, monthly', 'B +sector-neutral': '+ within-sector ranks', 'C +IC weights': '+ weighted by predictive power',
      'D +quarterly, keep top30%': '+ quarterly with a buffer', 'E +50 names': '+ 50 names (current model)', 'F +trend rule (cash)': '+ trend rule (cash below the average)' },
  },
}

const FACTOR_LABEL = {
  zh: { earnings_yield: '盈利收益率', sales_yield: '销售收益率', fcf_yield: '自由现金流收益率', ebitda_ev: 'EBITDA/企业价值',
    gross_profit: '毛利/资产', roe: 'ROE', share_issuance: '少增发', book_to_market: '账面市值比', earnings_surprise: '盈利意外',
    asset_growth: '资产增长低', low_vol: '低波动', momentum: '动量', accruals: '应计低', leverage: '杠杆低', size: '小市值', reversal: '短期反转' },
  en: { earnings_yield: 'Earnings yield', sales_yield: 'Sales yield', fcf_yield: 'FCF yield', ebitda_ev: 'EBITDA/EV',
    gross_profit: 'Gross profit/assets', roe: 'ROE', share_issuance: 'Low issuance', book_to_market: 'Book/market', earnings_surprise: 'Earnings surprise',
    asset_growth: 'Low asset growth', low_vol: 'Low volatility', momentum: 'Momentum', accruals: 'Low accruals', leverage: 'Low leverage', size: 'Small size', reversal: 'Reversal' },
}

const SECTOR_ZH = { 'Basic Materials': '基础材料', 'Communication Services': '通信服务', 'Consumer Cyclical': '可选消费',
  'Consumer Defensive': '必需消费', Energy: '能源', 'Financial Services': '金融', Healthcare: '医疗保健', Industrials: '工业',
  'Real Estate': '房地产', Technology: '科技', Utilities: '公用事业' }

const num = (v, d = 1) => (isNum(v) ? v.toFixed(d) : '—')
const pct = (v, d = 1) => (isNum(v) ? `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(d)}%` : '—')
const signed = (v, d = 1) => (isNum(v) ? `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(d)}` : '—')

function TrendChart({ history, L }) {
  const theme = useThemeStore((s) => s.theme)
  const option = useMemo(() => {
    void theme
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-blue').trim() || '#6c9cff'
    const months = history.map((h) => `${h.month.slice(0, 4)}-${h.month.slice(4)}`)
    return {
      animation: false,
      grid: { left: 8, right: 8, top: 10, bottom: 22, containLabel: true },
      tooltip: { trigger: 'axis', confine: true, backgroundColor: THEME.tooltipBg, borderColor: THEME.border,
        textStyle: { color: THEME.tooltipText, fontSize: 12 } },
      xAxis: { type: 'category', data: months, boundaryGap: false, axisTick: { show: false },
        axisLine: { lineStyle: { color: THEME.border } }, axisLabel: { color: THEME.text, fontSize: 11, hideOverlap: true } },
      yAxis: { type: 'log', scale: true, axisLine: { show: false }, axisTick: { show: false },
        splitLine: { lineStyle: { color: THEME.border, opacity: 0.6 } }, axisLabel: { show: false } },
      series: [
        { name: L.lineIndex, type: 'line', showSymbol: false, data: history.map((h) => h.level), lineStyle: { width: 2, color: accent }, itemStyle: { color: accent } },
        { name: L.lineMa, type: 'line', showSymbol: false, data: history.map((h) => h.ma10), lineStyle: { width: 1.4, color: THEME.text, type: 'dashed' }, itemStyle: { color: THEME.text } },
      ],
    }
  }, [history, L, theme])
  return <div className="qd-chart"><ReactECharts option={option} notMerge style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} /></div>
}

function YearsChart({ years }) {
  const theme = useThemeStore((s) => s.theme)
  const option = useMemo(() => {
    void theme
    const ys = Object.keys(years)
    const up = changeColor(1)
    const down = changeColor(-1)
    return {
      animation: false,
      grid: { left: 8, right: 8, top: 10, bottom: 22, containLabel: true },
      tooltip: { trigger: 'axis', confine: true, backgroundColor: THEME.tooltipBg, borderColor: THEME.border,
        textStyle: { color: THEME.tooltipText, fontSize: 12 }, valueFormatter: (v) => `${v > 0 ? '+' : ''}${v} pp` },
      xAxis: { type: 'category', data: ys, axisTick: { show: false }, axisLine: { lineStyle: { color: THEME.border } },
        axisLabel: { color: THEME.text, fontSize: 11, hideOverlap: true } },
      yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false },
        splitLine: { lineStyle: { color: THEME.border, opacity: 0.6 } }, axisLabel: { color: THEME.text, fontSize: 11, formatter: (v) => `${v}` } },
      series: [{ type: 'bar', barMaxWidth: 18, data: ys.map((y) => ({ value: years[y].difference, itemStyle: { color: years[y].difference >= 0 ? up : down } })) }],
    }
  }, [years, theme])
  return <div className="qd-chart qd-chart-short"><ReactECharts option={option} notMerge style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} /></div>
}

function Ranking({ d, L, F, zh }) {
  const [q, setQ] = useState('')
  const [showAll, setShowAll] = useState(false)
  const navigate = useNavigate()
  const factors = d.config.chosen_factors
  const keepN = d.ranking.filter((r) => r.keep).length
  const si = d.short_interest || {}
  const hi = si.high_pct ?? 10
  const query = q.trim().toUpperCase()
  const rows = useMemo(() => {
    if (query) return d.ranking.filter((r) => r.ticker === query || r.ticker.startsWith(query) || (r.name || '').toUpperCase().includes(query)).slice(0, 30)
    return showAll ? d.ranking : d.ranking.filter((r) => r.top)
  }, [d.ranking, query, showAll])
  const open = (r) => {
    useCompareStore.getState().switchMarketAndAddSymbol('us', { code: r.ticker, name: r.name || r.ticker })
    navigate(`/stock/us/${encodeURIComponent(r.ticker)}`)
  }
  return (
    <section className="qp-card" aria-label={L.rankTitle}>
      <div className="qp-head">
        <div>
          <h3 className="qp-h">{L.rankTitle}</h3>
          <p className="qd-sub">{L.rankSub(factors.length)}</p>
        </div>
        <div className="qp-seg" role="group" aria-label={L.rankTitle}>
          <button type="button" aria-pressed={!showAll} onClick={() => setShowAll(false)}>{L.top50}</button>
          <button type="button" aria-pressed={showAll} onClick={() => setShowAll(true)}>{L.all} {d.ranking.length}</button>
        </div>
      </div>
      <label className="qd-search" htmlFor="qd-search">
        <span className="sr-only">{L.search}</span>
        <input id="qd-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={L.search} autoComplete="off" />
      </label>
      {query && rows.length === 0 && <p className="qd-note" role="status">{L.notFound}</p>}
      <p className="qd-note">{L.keepNote(keepN)}</p>
      {rows.length > 0 && (
        <div className="fl-table-wrap qd-scroll">
          <table className="fl-table qd-table">
            <thead>
              <tr className="qd-group">
                <th colSpan={5} aria-hidden="true" />
                <th colSpan={factors.length} scope="colgroup" title={L.factorPct}>{L.groupFactors}</th>
                <th colSpan={6} scope="colgroup">{L.groupMetrics}</th>
              </tr>
              <tr>
                <th scope="col">{L.colRank}</th><th scope="col">{L.colStock}</th><th scope="col">{L.colSector}</th>
                <th scope="col">{L.colCap}</th><th scope="col">{L.colScore}</th>
                {factors.map((f) => <th key={f} scope="col" title={L.factorPct}>{F[f] || f}</th>)}
                <th scope="col">{L.colPe}</th><th scope="col">{L.colFcf}</th><th scope="col">{L.colRoe}</th>
                <th scope="col">{L.colShares}</th><th scope="col">{L.colShort}</th><th scope="col">{L.colRet}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ticker} className={r.top ? 'qd-top' : r.keep ? 'qd-keep' : ''}>
                  <td>{r.rank}</td>
                  <td className="qd-stock">
                    <button type="button" className="fl-sym" onClick={() => open(r)}>{r.ticker}</button>
                    {r.name && <span className="fl-name">{r.name}</span>}
                  </td>
                  <td className="qd-sector">{zh ? SECTOR_ZH[r.sector] || r.sector : r.sector}</td>
                  <td>{num(r.mcap_bn, 1)}</td>
                  <td className="strong">{num(r.score, 0)}</td>
                  {factors.map((f) => <td key={f} className="qd-pct">{num(r.factors[f], 0)}</td>)}
                  <td>{num(r.metrics.pe, 1)}</td>
                  <td>{pct(r.metrics.fcf_yield)}</td>
                  <td>{pct(r.metrics.roe)}</td>
                  <td>{isNum(r.metrics.share_change) ? `${signed(r.metrics.share_change)}%` : '—'}</td>
                  <td className={isNum(r.metrics.short_pct) && r.metrics.short_pct >= hi ? 'qd-high' : ''}
                    title={isNum(r.metrics.days_to_cover) ? L.shortTip(r.metrics.days_to_cover) : undefined}>
                    {isNum(r.metrics.short_pct) ? pct(r.metrics.short_pct) : '—'}
                    {isNum(r.metrics.short_pct) && r.metrics.short_pct >= hi && <span className="qd-flag">{L.shortHigh}</span>}
                  </td>
                  <td style={{ color: changeColor(r.metrics.return_1y) }}>{isNum(r.metrics.return_1y) ? fmtSignedPct(r.metrics.return_1y) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="qd-foot">{L.factorPct}</p>
      {si.settlement_date && <p className="qd-foot">{L.shortNote(si.settlement_date, hi)}</p>}
    </section>
  )
}

function AiReading({ token, lang, L }) {
  const [state, setState] = useState('loading')       // loading | none | busy | ok | failed
  const [res, setRes] = useState(null)
  useEffect(() => {
    let alive = true
    fetch('/api/admin/quant/explain', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => { if (!alive) return; if (j.available === false) setState('none'); else { setRes(j); setState('ok') } })
      .catch(() => alive && setState('none'))
    return () => { alive = false }
  }, [token])
  const make = async () => {
    setState('busy')
    try {
      const r = await fetch('/api/admin/quant/explain', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      if (!r.ok) throw new Error(String(r.status))
      setRes(await r.json())
      setState('ok')
    } catch { setState('failed') }
  }
  const sections = res ? (lang === 'zh' ? res.zh : res.en) : null
  return (
    <section className="qp-card" aria-label={L.aiTitle}>
      <div className="qp-head"><div>
        <h3 className="qp-h">{L.aiTitle}</h3>
        <p className="qd-sub">{L.aiSub}</p>
      </div></div>
      {state === 'loading' && <div className="qp-skel" style={{ height: 80, marginTop: 8 }} aria-busy="true" />}
      {(state === 'none' || state === 'failed') && (
        <div className="qd-msg qd-ai-start">
          {state === 'failed' && <p role="alert">{L.aiFail}</p>}
          <button type="button" className="qd-btn" onClick={make}>{L.aiBtn}</button>
        </div>
      )}
      {state === 'busy' && <p className="qd-note" role="status" aria-live="polite">{L.aiBusy}</p>}
      {state === 'ok' && sections && (
        <div className="qd-ai">
          {sections.map((x) => (
            <div key={x.title} className="qd-ai-sec">
              <h4 className="fl-sub">{x.title}</h4>
              <p>{x.body}</p>
            </div>
          ))}
        </div>
      )}
      <p className="qd-foot">{L.aiNote}</p>
    </section>
  )
}

function LiveChart({ series, L }) {
  const theme = useThemeStore((s) => s.theme)
  const option = useMemo(() => {
    void theme
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-blue').trim() || '#6c9cff'
    const colors = { model: accent, index: THEME.text, index_trend: '#a99ad6', model_trend: '#3fb67a' }
    return {
      animation: false,
      grid: { left: 8, right: 8, top: 10, bottom: 22, containLabel: true },
      tooltip: { trigger: 'axis', confine: true, backgroundColor: THEME.tooltipBg, borderColor: THEME.border,
        textStyle: { color: THEME.tooltipText, fontSize: 12 } },
      xAxis: { type: 'category', data: series.map((x) => x.date), boundaryGap: false, axisTick: { show: false },
        axisLine: { lineStyle: { color: THEME.border } }, axisLabel: { color: THEME.text, fontSize: 11, hideOverlap: true } },
      yAxis: { type: 'value', scale: true, axisLine: { show: false }, axisTick: { show: false },
        splitLine: { lineStyle: { color: THEME.border, opacity: 0.6 } }, axisLabel: { color: THEME.text, fontSize: 11 } },
      series: Object.keys(L.liveCols).map((k) => ({ name: L.liveCols[k], type: 'line', showSymbol: false,
        data: series.map((x) => x[k]), lineStyle: { width: k === 'model' ? 2 : 1.4, color: colors[k] }, itemStyle: { color: colors[k] } })),
    }
  }, [series, L, theme])
  return <div className="qd-chart qd-chart-short"><ReactECharts option={option} notMerge style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} /></div>
}

function Live({ live, L }) {
  const months = Object.entries(live.trend_months || {})
  return (
    <section className="qp-card" aria-label={L.liveTitle}>
      <div className="qp-head"><div>
        <h3 className="qp-h">{L.liveTitle}</h3>
        <p className="qd-sub">{L.liveSub(live.started)}</p>
      </div></div>
      <p className="qd-note">{L.liveDays(live.trading_days)} · {L.liveEarly}</p>
      <div className="fl-table-wrap">
        <table className="fl-table qd-steps">
          <thead><tr><th scope="col">{L.colStep}</th><th scope="col">{L.liveReturn}</th></tr></thead>
          <tbody>
            {Object.keys(L.liveCols).map((k) => (
              <tr key={k}><td>{L.liveCols[k]}</td>
                <td style={{ color: changeColor(live.returns[k]) }}>{isNum(live.returns[k]) ? fmtSignedPct(live.returns[k]) : '—'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {live.series.length > 1 && <LiveChart series={live.series} L={L} />}
      <h4 className="fl-sub">{L.liveHold}</h4>
      <p className="qd-foot" style={{ marginTop: 0 }}>{L.liveReview(live.last_review, live.next_review_after)}</p>
      <div className="qd-chips">{live.holdings.map((t) => <span key={t} className="bfs-chip qd-chip">{t}</span>)}</div>
      <h4 className="fl-sub">{L.liveChanges}</h4>
      <ul className="qd-list">
        {live.reviews.map((rv, n) => (
          <li key={rv.date}><b>{rv.date}</b> {n === 0 ? `${L.liveStart} ${rv.bought.length}` : `${L.liveBought} ${rv.bought.join(', ') || '—'} · ${L.liveSold} ${rv.sold.join(', ') || '—'}`}</li>
        ))}
      </ul>
      {months.length > 0 && (
        <>
          <h4 className="fl-sub">{L.liveTrend}</h4>
          <ul className="qd-list">{months.map(([m, inv]) => <li key={m}><b>{m}</b> {inv ? L.liveIn : L.liveCash}</li>)}</ul>
        </>
      )}
    </section>
  )
}

function Validation({ v, L }) {
  const ho = v.holdout_period.replace(/(\d{4})(\d{2})\d{2}/g, '$1-$2')
  return (
    <section className="qp-card" aria-label={L.valTitle}>
      <div className="qp-head"><div>
        <h3 className="qp-h">{L.valTitle}</h3>
        <p className="qd-sub">{L.valSub(v.dev_period, ho)}</p>
      </div></div>
      <div className="fl-table-wrap">
        <table className="fl-table qd-steps qd-val">
          <thead>
            <tr className="qd-group">
              <th aria-hidden="true" />
              <th colSpan={3} scope="colgroup">{L.valDev}</th>
              <th colSpan={4} scope="colgroup">{L.valHold}</th>
            </tr>
            <tr>
              <th scope="col">{L.colStep}</th>
              <th scope="col">{L.colCagr}</th><th scope="col">{L.colDd}</th><th scope="col">{L.colRisk}</th>
              <th scope="col">{L.colCagr}</th><th scope="col">{L.colDd}</th><th scope="col">{L.colRisk}</th><th scope="col">{L.colVsIdx}</th>
            </tr>
          </thead>
          <tbody>
            {v.candidates.map((c) => {
              const a = v.dev[c] || {}
              const b = v.holdout[c] || {}
              return (
                <tr key={c}>
                  <td>{L.cand[c] || c}</td>
                  <td>{pct(a.cagr)}</td><td>{pct(a.max_drawdown)}</td><td>{num(a.return_per_risk, 2)}</td>
                  <td className="qd-sep">{pct(b.cagr)}</td><td>{pct(b.max_drawdown)}</td><td>{num(b.return_per_risk, 2)}</td>
                  <td>{c === 'index' ? '—' : signed(b.vs_cap_weight)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {v.audited_at && (
        <p className="qd-foot">
          {L.valAudit(v.audited_at)}{' '}
          {v.before_audit && `${L.valBefore}: ${v.candidates.map((c) => `${L.cand[c] || c} ${pct(v.before_audit.holdout[c]?.cagr)}`).join(' · ')}`}
        </p>
      )}
      <p className="qd-foot">{L.valNote(v.trials, v.factors_tested)}</p>
    </section>
  )
}

function Credibility({ d, L, F }) {
  const p = d.portfolio
  const cw = p.benchmarks.cap_weight
  return (
    <section className="qp-card" aria-label={L.credTitle}>
      <div className="qp-head"><div>
        <h3 className="qp-h">{L.credTitle}</h3>
        <p className="qd-sub">{L.credSub(p.first_year)}</p>
      </div></div>
      <p className="qd-note">{L.bench(num(cw.cagr), pct(cw.max_drawdown))}</p>
      <div className="fl-table-wrap">
        <table className="fl-table qd-steps">
          <thead><tr>
            <th scope="col">{L.colStep}</th><th scope="col">{L.colCagr}</th><th scope="col">{L.colDd}</th>
            <th scope="col">{L.colVsIdx}</th><th scope="col">{L.colT}</th><th scope="col">{L.colBehind}</th>
          </tr></thead>
          <tbody>
            {Object.entries(p.steps).map(([k, s]) => (
              <tr key={k} className={k.startsWith('E') ? 'qd-top' : ''}>
                <td>{L.steps[k] || k}</td>
                <td>{pct(s.cagr)}</td><td>{pct(s.max_drawdown)}</td>
                <td>{signed(s.vs_cap_weight)}</td><td>{num(s.t_vs_cap_weight, 2)}</td><td>{s.years_behind_cap_weight}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="qd-foot">{L.tNote}</p>
      {p.by_year?.['E +50 names'] && (
        <>
          <h4 className="fl-sub">{L.yearsTitle}</h4>
          <YearsChart years={p.by_year['E +50 names']} />
        </>
      )}
      <h4 className="fl-sub">{L.factorTitle}</h4>
      <div className="fl-table-wrap">
        <table className="fl-table qd-steps">
          <thead><tr>
            <th scope="col">{L.colFactor}</th><th scope="col">{L.colIcT}</th><th scope="col">{L.colTopEx}</th><th scope="col">{L.colIcHalves}</th>
          </tr></thead>
          <tbody>
            {Object.entries(d.factors).map(([f, r]) => (
              <tr key={f}>
                <td>{F[f] || f}</td>
                <td>{num(r.all?.ic_t, 1)}</td>
                <td>{signed(r.all?.top_excess_annual)}</td>
                <td>{num(r['2000_2012']?.ic_mean, 3)} → {num(r['2013_now']?.ic_mean, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function QuantDesk({ lang, onOpenAuth }) {
  const L = S[lang === 'zh' ? 'zh' : 'en']
  const F = FACTOR_LABEL[lang === 'zh' ? 'zh' : 'en']
  const { session, loading: authLoading } = useAuthStore()
  const token = session?.access_token
  const [state, setState] = useState('loading')       // loading | ok | signin | denied | missing | failed
  const [d, setD] = useState(null)
  const [mode, setModeState] = useState(readMode)
  const setMode = (m) => { setModeState(m); try { localStorage.setItem(MODE_KEY, m) } catch { /* private mode */ } }

  const load = useCallback(async () => {
    if (authLoading) return
    if (!token) { setState('signin'); return }
    setState('loading')
    try {
      const r = await fetch('/api/admin/quant/signals', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      if (r.status === 401) { setState('signin'); return }
      if (r.status === 403) { setState('denied'); return }
      if (r.status === 404) { setState('missing'); return }
      if (!r.ok) throw new Error(String(r.status))
      setD(await r.json())
      setState('ok')
    } catch { setState('failed') }
  }, [authLoading, token])
  useEffect(() => { load() }, [load])

  if (state !== 'ok') {
    return (
      <div className="qd">
        <h2 className="fl-title">{L.title}</h2>
        {state === 'loading' && <div className="qp-skel" style={{ height: 240 }} aria-busy="true" />}
        {state === 'signin' && <div className="qd-msg"><p>{L.signIn}</p><button type="button" className="qd-btn" onClick={onOpenAuth}>{L.signInBtn}</button></div>}
        {state === 'denied' && <div className="qd-msg"><p>{L.denied}</p></div>}
        {state === 'missing' && <div className="qd-msg"><p>{L.missing}</p></div>}
        {state === 'failed' && <div className="qd-msg" role="alert"><p>{L.failed}</p><button type="button" className="qd-btn" onClick={load}>{L.retry}</button></div>}
      </div>
    )
  }
  const t = d.trend
  return (
    <div className="qd">
      <header className="qd-header">
        <div>
          <h2 className="fl-title">{L.title} <span className="qd-badge">{L.onlyAdmin}</span></h2>
          <p className="qd-meta">{L.asOf(d.as_of, d.universe.size)}</p>
        </div>
        <p className="qd-disclaimer">{L.disclaimer}</p>
      </header>
      <div className="qp-seg qd-mode" role="group" aria-label={L.title}>
        <button type="button" aria-pressed={mode === 'simple'} onClick={() => setMode('simple')}>{L.modeSimple}</button>
        <button type="button" aria-pressed={mode === 'pro'} onClick={() => setMode('pro')}>{L.modePro}</button>
      </div>

      {mode === 'simple' ? <SimpleView d={d} lang={lang} /> : (<>
      <section className="qp-card" aria-label={L.trendTitle}>
        <div className="qp-head"><div>
          <h3 className="qp-h">{L.trendTitle}</h3>
          <p className="qd-sub">{L.trendSub}</p>
        </div></div>
        <div className="qd-trend">
          <div className="qd-state">
            <span className={`qd-dot ${t.above ? 'up' : 'down'}`} aria-hidden="true" />
            <div>
              <div className="qd-state-main">{t.above ? L.above(t.gap_pct) : L.below(t.gap_pct)}</div>
              <div className="qd-state-note">{t.provisional ? L.provNote(t.this_month_invested, t.above) : (t.above ? L.aboveNote : L.belowNote)}</div>
            </div>
          </div>
          <TrendChart history={t.history} L={L} />
        </div>
        <p className="qd-foot">{L.trendRule}</p>
        <SplitTrend split={t.split} live={t.split?.live} reviewAfter={d.live?.next_review_after} zh={lang === 'zh'} />
      </section>

      <Ranking d={d} L={L} F={F} zh={lang === 'zh'} />
      {d.live && <Live live={d.live} L={L} />}
      {d.validation && <Validation v={d.validation} L={L} />}
      <Credibility d={d} L={L} F={F} />

      <section className="qp-card" aria-label={L.useTitle}>
        <div className="qp-head"><h3 className="qp-h">{L.useTitle}</h3></div>
        <ul className="fl-read">{L.use.map((line) => <li key={line}>{line}</li>)}</ul>
      </section>
      </>)}

      <AiReading token={token} lang={lang === 'zh' ? 'zh' : 'en'} L={L} />
    </div>
  )
}
