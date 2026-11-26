"""
The server-rendered head of a US stock page (/stock/us/<TICKER>), in Chinese (the plain URL) and English (?lang=en).

main.py's /seo/stock/us/<symbol> route (nginx sends /stock/us/<TICKER> there) takes frontend/dist/index.html and calls
render() with the stock's latest quote. Each language gets its own title, description, Open Graph tags, html lang,
self-referencing canonical and zh / en / x-default hreflang links, plus a <noscript> summary for crawlers that do not
run scripts. `data-static` on <html> tells the inline head script in index.html and App.jsx to keep these tags.
"""
import html
import re

ROOT = "https://bestfriendstock.com"


def texts(name: str, sym: str, price: float, pct: float, lang: str) -> tuple:
    """(title, description) for one language; `name` is already HTML-escaped."""
    sign = "+" if pct > 0 else ""
    if lang == "en":
        return (f"{name} ({sym}) Stock Price, Chart and AI Analysis | Best Friend Stock",
                f"{name} ({sym}) US stock: latest price ${price:.2f}, {sign}{pct:.2f}% today. Candlestick chart, MACD and RSI "
                f"indicators, news sentiment and AI analysis, with paper trading to practise. For learning only, not "
                f"investment advice.")
    return (f"{name} ({sym}) 美股行情 · K线 · AI分析 | BestFriendStock",
            f"{name}（{sym}）美股实时行情：最新价 ${price:.2f}，涨跌幅 {sign}{pct:.2f}%。"
            f"查看K线图、MACD/RSI 技术指标、新闻情绪和 AI 分析，并可用模拟盘练习交易。仅供学习，不构成投资建议。")


def render(page: str, sym: str, name: str, price: float, pct: float, lang: str = "zh") -> str:
    lang = "en" if lang == "en" else "zh"
    e = html.escape
    title, desc = texts(e(name), sym, price, pct, lang)
    zh_url = f"{ROOT}/stock/us/{sym}"
    en_url = f"{zh_url}?lang=en"
    url = en_url if lang == "en" else zh_url

    def sub(pattern, repl):
        nonlocal page
        page = re.sub(pattern, lambda _m: repl, page, count=1)
    sub(r'<html lang="[^"]*"', f'<html lang="{"en" if lang == "en" else "zh-CN"}" data-static="1"')
    sub(r"<title>.*?</title>", f"<title>{title}</title>")
    sub(r'<meta name="description" content="[^"]*"', f'<meta name="description" content="{e(desc, quote=True)}"')
    sub(r'<meta property="og:title" content="[^"]*"', f'<meta property="og:title" content="{title}"')
    sub(r'<meta property="og:description" content="[^"]*"', f'<meta property="og:description" content="{e(desc, quote=True)}"')
    sub(r'<meta property="og:url" content="[^"]*"', f'<meta property="og:url" content="{url}"')
    sub(r'<meta property="og:locale" content="[^"]*"', f'<meta property="og:locale" content="{"en_US" if lang == "en" else "zh_CN"}"')
    sub(r'<meta name="twitter:title" content="[^"]*"', f'<meta name="twitter:title" content="{title}"')
    sub(r'<meta name="twitter:description" content="[^"]*"', f'<meta name="twitter:description" content="{e(desc, quote=True)}"')
    sub(r'<link rel="canonical" href="[^"]*"\s*/?>',
        f'<link rel="canonical" href="{url}" />\n    <link rel="alternate" hreflang="zh" href="{zh_url}" />'
        f'\n    <link rel="alternate" hreflang="en" href="{en_url}" />\n    <link rel="alternate" hreflang="x-default" href="{en_url}" />')
    summary = (f'<noscript><h1>{e(name)} ({sym})</h1><p>{e(desc)}</p>'
               f'<p><a href="{ROOT}/">Best Friend Stock</a></p></noscript>')
    return page.replace("<body>", "<body>" + summary, 1) if "<body>" in page else page
