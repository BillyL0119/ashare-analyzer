// After `vite build`: write dist/<route>.html for each top-level page with its own title,
// description, Open Graph tags and canonical URL, so crawlers and link previews stop seeing every
// page as a copy of the home page. The app itself is unchanged: same scripts, same SPA routing.
// nginx picks these up with `try_files $uri $uri.html /index.html;` in `location /`. (Not
// dist/<route>/index.html: a directory makes nginx redirect /heatmap to /heatmap/.)
// dist/cases/<id>.html, one page per economics case, is written by the backend instead
// (backend/services/case_pages.py), which rewrites them whenever this build replaces index.html.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const base = readFileSync(join(dist, 'index.html'), 'utf8')

const PAGES = {
  screener: ['美股选股器 - 按行业、市值、估值筛选 5000+ 美国上市公司 | BestFriendStock',
    '免费美股选股器：按行业、市值、市盈率、涨跌幅、成交量和 52 周高点筛选 5000 多家美国上市公司，实时报价，一键查看个股分析。专为学生设计，仅供学习。'],
  heatmap: ['市场热力图 - 美股与A股板块涨跌全景 | BestFriendStock',
    '一张图看懂今天的市场：美股市值前 500 家公司和 A 股重点公司按板块分组，面积代表市值，颜色代表涨跌。点击任意方块查看个股。'],
  macro: ['财经日历 - 经济数据、财报、新股上市、拆股与分红日历 | BestFriendStock',
    '按周查看美股财经日历：CPI、非农、美联储议息等经济数据（预期值、前值、实际值及通俗解释），以及每天的公司财报、新股上市、拆股和除息分红。'],
  factors: ['因子实验室 - 用十年真实价格检验动量、低波动选股规则 | BestFriendStock',
    '免费的量化因子学习工具：用每个月当时的标普 500 成分股和含分红的十年真实价格回测动量和低波动规则，看扣除成本后的收益、回撤、是否只是运气，以及幸存者偏差会把结果美化多少，并查看今天按因子排名靠前的股票。仅供学习，不构成投资建议。'],
  news: ['每日大事件 - 市场重大新闻 | BestFriendStock', '每天汇总影响美股和 A 股的重要新闻，按市场、经济、公司分类，中英文来源。'],
  bank_views: ['大行观点 - 顶级投行研究观点汇总 | BestFriendStock', '高盛、摩根士丹利、摩根大通等投行对市场、行业和个股的公开观点汇总，附 AI 速读。'],
  class: ['班级 - 老师布置作业、查看全班模拟交易与学习进度 | BestFriendStock',
    '经济学老师的免费班级工具：学生用班级码加入，老师布置会自动完成的学习任务和历史穿越作业，查看全班的模拟交易收益与进度，导出 CSV。'],
  cases: ['经济学案例库 - IB、A-Level、AP 论文可用的真实新闻案例 | BestFriendStock',
    '每天从真实新闻里挑出经济学论文可用的案例：对应 IB、A-Level、AP、IGCSE 考纲知识点，附可引用的数据、评估角度和练习题。'],
  diagrams: ['经济学图表实验室 - 可拖动的供求、AD-AS、外部性、汇率、关税图 | BestFriendStock',
    '免费的经济学互动图表：拖动曲线或选择真实冲击（OPEC 减产、央行加息），图表按 IB、A-Level、AP 的标注习惯自动重画，附通俗解释、对应考纲章节和用到这张图的新闻案例。'],
  governor: ['当一次美联储主席 - 回到2021通胀、1979沃尔克、2007金融危机亲手决定利率 | BestFriendStock',
    '免费的央行模拟游戏：回到真实的历史关头，每个季度决定美国的利率，看通胀、失业和通胀预期怎么变化，最后和真实的美联储比成绩。数据来自美联储官方数据库。'],
  'time-machine': ['历史穿越交易 - 回到2008金融危机、2020疫情暴跌、2015股灾做投资决定 | BestFriendStock',
    '回到真实的历史时刻：只能看到当天以前的真实行情和新闻，用虚拟资金一天天做决定，结束后和一直持有指数基金比较，并学习 A-Level、IB、AP 对应考点。'],
  paper: ['模拟炒股 - 用虚拟资金练习美股与A股交易 | BestFriendStock', '免费模拟炒股：美股 10 万美元、A 股 100 万元虚拟资金，实时价格成交，收益曲线与标普 500 / 沪深 300 对比，全球排行榜。'],
  study: ['经济学学习中心 - A-Level、IB、AP、IGCSE 与美股入门 | BestFriendStock', '结合真实市场案例学习经济学：A-Level、IB、AP 宏微观、IGCSE 课程知识点，以及美股和 K 线入门。'],
  universities: ['全球商学院指南 - 100+ 顶尖商学院与 AI 模拟面试 | BestFriendStock', '全球 100 多所顶尖商学院的排名、学费、录取要求和就业数据，支持学校对比，以及 AI 招生模拟面试与录取评估。'],
  career: ['金融求职指南 - 投行、研究、交易岗位与 AI 模拟面试 | BestFriendStock', '了解投行、股票研究、交易、资管等金融岗位的工作内容、薪资和招聘时间线，并用 AI 进行技术面和行为面模拟面试。'],
  'ai-teacher': ['AI 经济学老师 - 免费的股票与经济学问答 | BestFriendStock', '随时向 AI 老师提问投资和经济学问题，按你的水平讲解，支持中文、英文、日语、韩语和法语。'],
}

// English versions, served at /<route>?lang=en (nginx: try_files $uri$lang_sfx.html). Google is told about both with
// hreflang links, so English searchers get these and Chinese searchers keep the Chinese pages (the default URLs stay
// Chinese so existing rankings, Baidu included, are not disturbed).
const EN = {
  '': ['Best Friend Stock | Free stock analysis, paper trading and economics for students',
    'Free for students: US and China stock charts and analysis, paper trading with $100,000 of virtual cash, an economics study center for A-Level, IB, AP and IGCSE, real-news essay cases and a business school guide.'],
  screener: ['US Stock Screener: filter 5,000+ US-listed companies | Best Friend Stock',
    'Free US stock screener: filter more than 5,000 US-listed companies by sector, market cap, P/E, price change, volume and 52-week high, with live quotes and one-click stock pages. Built for students.'],
  heatmap: ['Market Heatmap: US and China sectors at a glance | Best Friend Stock',
    "Today's market in one picture: the 500 largest US companies and key China A-shares grouped by sector, sized by market cap and coloured by today's move. Click any tile for the stock."],
  macro: ['Economic Calendar: data releases, earnings, IPOs, splits and dividends | Best Friend Stock',
    'The US market calendar by week: CPI, jobs reports and Fed meetings with forecast, previous and actual values explained in plain words, plus each day’s earnings, IPOs, splits and ex-dividend dates.'],
  factors: ['Factor Lab: test momentum and low-volatility rules on ten years of prices | Best Friend Stock',
    'A free quant learning tool: back-test momentum and low-volatility stock rules on the S&P 500 as it was each month, with dividends and costs, see whether a result is luck, how much survivorship bias flatters it, and today’s ranking.'],
  news: ['Daily Market News | Best Friend Stock', 'The news that moved US and China stocks today, grouped by market, economy and company, from English and Chinese sources.'],
  bank_views: ['Bank Research Views: Goldman Sachs, Morgan Stanley, JPMorgan | Best Friend Stock',
    'Public market, sector and stock views from Goldman Sachs, Morgan Stanley, JPMorgan and other banks in one place, with a short AI summary.'],
  class: ['Classes: assignments and progress for economics teachers | Best Friend Stock',
    'A free class tool for economics teachers: students join with a class code, teachers set self-checking study tasks and history-trading assignments, and see the whole class’s paper-trading returns and progress.'],
  cases: ['Economics Case Library: real-news examples for IB, A-Level and AP essays | Best Friend Stock',
    'Real news turned into economics essay examples every day, matched to IB, A-Level, AP and IGCSE syllabus points, with figures you can cite, evaluation points and practice questions.'],
  diagrams: ['Economics Diagram Lab: interactive supply and demand, AD-AS, externalities | Best Friend Stock',
    'Free interactive economics diagrams: drag a curve or pick a real shock (an OPEC cut, a rate rise) and the diagram redraws with IB, A-Level and AP labels, a plain explanation and the news cases that use it.'],
  governor: ['Be the Fed Chair: set interest rates through 2021, 1979 and 2007 | Best Friend Stock',
    'A free central-bank game: go back to real turning points, set US interest rates each quarter, watch inflation, unemployment and expectations respond, then compare your record with the real Fed. Federal Reserve data.'],
  'time-machine': ['History Time Machine: trade through 2008, 2020 and 2022 | Best Friend Stock',
    'Go back to real market moments: see only the prices and news known on each day, decide day by day with virtual money, then compare with simply holding an index fund, with the matching A-Level, IB and AP topics.'],
  paper: ['Paper Trading: practise US and China stocks with virtual cash | Best Friend Stock',
    'Free paper trading: $100,000 of virtual cash for US stocks and ¥1,000,000 for China A-shares, filled at live prices, with your return compared with the S&P 500 and a global leaderboard.'],
  study: ['Economics Study Center: A-Level, IB, AP, IGCSE and stock basics | Best Friend Stock',
    'Learn economics with real market examples: A-Level, IB, AP micro and macro and IGCSE topics, plus beginner lessons on US stocks and candlestick charts.'],
  universities: ['Business School Guide: 100+ top schools and AI mock interviews | Best Friend Stock',
    'Rankings, fees, entry requirements and graduate outcomes for more than 100 top business schools, side-by-side comparison, and AI admissions mock interviews.'],
  career: ['Finance Career Guide: banking, research and trading roles with AI mock interviews | Best Friend Stock',
    'What investment banking, equity research, trading and asset management jobs involve, what they pay and when they hire, with AI technical and behavioural mock interviews.'],
  'ai-teacher': ['AI Economics Teacher: free questions on stocks and economics | Best Friend Stock',
    'Ask the AI teacher anything about investing and economics at your level, in English, Chinese, Japanese, Korean or French.'],
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const swap = (html, re, value) => (re.test(html) ? html.replace(re, value) : html)

const HOME_ZH = [base.match(/<title>([\s\S]*?)<\/title>/)[1], base.match(/<meta name="description" content="([^"]*)"/)[1]]

// One page in one language: its own title, description, Open Graph, canonical, html lang and hreflang links.
// data-static tells the inline head script in index.html to leave these tags alone.
function page(route, lang, title, desc) {
  const path = route ? `/${route}` : '/'
  const zhUrl = `https://bestfriendstock.com${path}`
  const enUrl = `${zhUrl}?lang=en`
  const url = lang === 'en' ? enUrl : zhUrl
  let html = base
  html = swap(html, /<html lang="[^"]*"/, `<html lang="${lang === 'en' ? 'en' : 'zh-CN'}" data-static="1"`)
  html = swap(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
  html = swap(html, /<meta name="description" content="[^"]*"/, `<meta name="description" content="${esc(desc)}"`)
  html = swap(html, /<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${esc(title)}"`)
  html = swap(html, /<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${esc(desc)}"`)
  html = swap(html, /<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${url}"`)
  html = swap(html, /<meta property="og:locale" content="[^"]*"/, `<meta property="og:locale" content="${lang === 'en' ? 'en_US' : 'zh_CN'}"`)
  html = swap(html, /<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${esc(title)}"`)
  html = swap(html, /<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${esc(desc)}"`)
  html = swap(html, /<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${url}" />
    <link rel="alternate" hreflang="zh" href="${zhUrl}" />
    <link rel="alternate" hreflang="en" href="${enUrl}" />
    <link rel="alternate" hreflang="x-default" href="${enUrl}" />`)
  return html
}

let written = 0
for (const [route, [title, desc]] of Object.entries(PAGES)) {
  writeFileSync(join(dist, `${route}.html`), page(route, 'zh', title, desc))
  const [t, d] = EN[route]
  writeFileSync(join(dist, `${route}.en.html`), page(route, 'en', t, d))
  written += 2
}
// the home page: index.html stays the plain app shell (it answers every other path too)
writeFileSync(join(dist, '_home.html'), page('', 'zh', ...HOME_ZH))
writeFileSync(join(dist, '_home.en.html'), page('', 'en', ...EN['']))
written += 2
console.log(`route pages: ${written} written (Chinese and English)`)
