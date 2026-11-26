from services import seo_stock

SHELL = """<!doctype html>
<html lang="zh-CN">
  <head>
    <title>BestFriendStock home</title>
    <meta name="description" content="home" />
    <meta property="og:title" content="home" />
    <meta property="og:description" content="home" />
    <meta property="og:url" content="https://bestfriendstock.com/" />
    <meta property="og:locale" content="zh_CN" />
    <meta name="twitter:title" content="home" />
    <meta name="twitter:description" content="home" />
    <link rel="canonical" href="https://bestfriendstock.com/" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>"""


def test_chinese_page_keeps_its_url_and_names_the_english_alternate():
    out = seo_stock.render(SHELL, "AAPL", "Apple Inc.", 355.58, 0.43, "zh")
    assert '<html lang="zh-CN" data-static="1">' in out
    assert "<title>Apple Inc. (AAPL) 美股行情" in out
    assert '<link rel="canonical" href="https://bestfriendstock.com/stock/us/AAPL" />' in out
    assert 'hreflang="en" href="https://bestfriendstock.com/stock/us/AAPL?lang=en"' in out
    assert 'hreflang="x-default" href="https://bestfriendstock.com/stock/us/AAPL?lang=en"' in out
    assert "$355.58，涨跌幅 +0.43%" in out


def test_english_page_has_its_own_tags():
    out = seo_stock.render(SHELL, "BRK.B", 'Berkshire "B" & Co', 480.1, -1.25, "en")
    assert '<html lang="en" data-static="1">' in out
    assert "<title>Berkshire &quot;B&quot; &amp; Co (BRK.B) Stock Price, Chart and AI Analysis | Best Friend Stock</title>" in out
    assert '<link rel="canonical" href="https://bestfriendstock.com/stock/us/BRK.B?lang=en" />' in out
    assert 'content="en_US"' in out and "-1.25% today" in out and "For learning only" in out
    assert '<noscript><h1>Berkshire &quot;B&quot; &amp; Co (BRK.B)</h1>' in out
    assert out.count("<title>") == 1 and "美股" not in out


def test_unknown_language_means_chinese():
    assert 'lang="zh-CN"' in seo_stock.render(SHELL, "MSFT", "Microsoft", 1.0, 0.0, "fr")
