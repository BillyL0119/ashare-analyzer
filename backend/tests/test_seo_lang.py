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
    assert "AAPL?lang=en" not in out and out.count("hreflang") == 3 * 2 * 3     # home, paper, factors (added)
    assert "<loc>https://bestfriendstock.com/factors?lang=en</loc>" in out
    import xml.dom.minidom
    xml.dom.minidom.parseString(out)                                             # still well-formed
