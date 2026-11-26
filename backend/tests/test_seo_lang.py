from services.seo_lang import with_language_versions

XML = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://bestfriendstock.com/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://bestfriendstock.com/stock/us/AAPL</loc>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://bestfriendstock.com/paper</loc>
    <priority>0.6</priority>
  </url>
</urlset>"""


def test_bilingual_pages_are_listed_twice_with_alternates():
    out = with_language_versions(XML)
    assert 'xmlns:xhtml="http://www.w3.org/1999/xhtml"' in out
    assert out.count("<loc>https://bestfriendstock.com/paper</loc>") == 1
    assert out.count("<loc>https://bestfriendstock.com/paper?lang=en</loc>") == 1
    assert out.count('hreflang="x-default" href="https://bestfriendstock.com/?lang=en"') == 2
    assert out.count("hreflang") == 4 * 2 * 3          # home, AAPL, paper and factors (added), each in two languages
    assert "<loc>https://bestfriendstock.com/factors?lang=en</loc>" in out
    import xml.dom.minidom
    xml.dom.minidom.parseString(out)                                             # still well-formed


def test_stock_pages_are_bilingual_and_sp500_members_are_added():
    from services.seo_lang import sp500_stock_entries, sp500_tickers, with_language_versions
    tickers = sp500_tickers()
    assert 480 < len(tickers) < 530 and "AAPL" in tickers and "BRK.B" in tickers and "CELG" not in tickers
    extra = sp500_stock_entries(XML, "2026-11-26")
    assert "stock/us/AAPL</loc>" not in extra and "stock/us/MSFT</loc>" in extra          # AAPL is already listed in XML
    out = with_language_versions(XML.replace("</urlset>", extra + "\n</urlset>"))
    assert out.count("<loc>https://bestfriendstock.com/stock/us/AAPL</loc>") == 1
    assert out.count("<loc>https://bestfriendstock.com/stock/us/AAPL?lang=en</loc>") == 1
    assert out.count("<loc>https://bestfriendstock.com/stock/us/MSFT?lang=en</loc>") == 1
    import xml.dom.minidom
    xml.dom.minidom.parseString(out)
