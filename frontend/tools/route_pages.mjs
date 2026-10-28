// After `vite build`: write dist/<route>.html for each top-level page with its own title,
// description, Open Graph tags and canonical URL, so crawlers and link previews stop seeing every
// page as a copy of the home page. The app itself is unchanged: same scripts, same SPA routing.
// nginx picks these up with `try_files $uri $uri.html /index.html;` in `location /`. (Not
// dist/<route>/index.html: a directory makes nginx redirect /heatmap to /heatmap/.)
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
  macro: ['经济日历 - CPI、非农、美联储议息、GDP 发布时间与解读 | BestFriendStock',
    '美国、中国、欧元区、日本、英国的重要经济数据日历：预期值、前值、实际值，以及每项数据为什么影响股市的通俗解释。'],
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

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const swap = (html, re, value) => (re.test(html) ? html.replace(re, value) : html)

for (const [route, [title, desc]] of Object.entries(PAGES)) {
  const url = `https://bestfriendstock.com/${route}`
  let html = base
  html = swap(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
  html = swap(html, /<meta name="description" content="[^"]*"/, `<meta name="description" content="${esc(desc)}"`)
  html = swap(html, /<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${esc(title)}"`)
  html = swap(html, /<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${esc(desc)}"`)
  html = swap(html, /<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${url}"`)
  html = swap(html, /<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${esc(title)}"`)
  html = swap(html, /<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${esc(desc)}"`)
  html = swap(html, /<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${url}"`)
  writeFileSync(join(dist, `${route}.html`), html)
}
console.log(`route pages: ${Object.keys(PAGES).length} written`)
