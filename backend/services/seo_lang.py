"""Sitemap entries for the pages that exist in two languages (the main pages and every US stock page)."""
import json
import os
import re

# The main pages exist in Chinese (the plain URL) and English (?lang=en): see frontend/tools/route_pages.mjs
BILINGUAL = {"", "screener", "heatmap", "macro", "factors", "news", "bank_views", "class", "cases", "diagrams", "governor",
             "time-machine", "paper", "study", "universities", "career", "ai-teacher"}


def with_language_versions(xml: str) -> str:
    """Each bilingual page listed twice (Chinese, English) with hreflang alternates, as Google asks for."""
    root = "https://bestfriendstock.com/"
    if f"<loc>{root}factors</loc>" not in xml:                      # the factor lab page was missing from the list
        xml = xml.replace("</urlset>", f"  <url>\n    <loc>{root}factors</loc>\n    <changefreq>weekly</changefreq>\n"
                                       f"    <priority>0.6</priority>\n  </url>\n</urlset>")

    def one(m):
        block, loc = m.group(0), m.group(1)
        path = loc[len(root):] if loc.startswith(root) else None
        if path is None or not (path in BILINGUAL or re.fullmatch(r"stock/us/[A-Z0-9.\-]{1,10}", path)):
            return block
        en = f"{loc}?lang=en"
        alts = "".join(f'\n    <xhtml:link rel="alternate" hreflang="{h}" href="{u}"/>'
                       for h, u in (("zh", loc), ("en", en), ("x-default", en)))
        zh_block = block[:-len("</url>")].rstrip() + alts + "\n  </url>"
        return zh_block + "\n  " + zh_block.replace(f"<loc>{loc}</loc>", f"<loc>{en}</loc>")
    xml = re.sub(r"<url>\s*<loc>([^<]+)</loc>.*?</url>", one, xml, flags=re.S)
    return xml.replace('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
                       '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">')


def sp500_tickers() -> list:
    """Today's S&P 500 members from data/sp500_membership.json (tools/build_sp500_history.py): a stay with no end date."""
    path = os.path.join(os.path.dirname(__file__), "..", "data", "sp500_membership.json")
    try:
        with open(path, encoding="utf-8") as fh:
            members = json.load(fh)["members"]
    except (OSError, ValueError, KeyError):
        return []
    return sorted(t for t, spans in members.items() if any(e is None for _, e in spans) and re.fullmatch(r"[A-Z0-9.\-]{1,10}", t))


def sp500_stock_entries(xml: str, today: str) -> str:
    """<url> blocks for the S&P 500 stock pages the sitemap does not list yet."""
    listed = set(re.findall(r"<loc>https://bestfriendstock.com/stock/us/([^<]+)</loc>", xml))
    return "".join(f"\n  <url>\n    <loc>https://bestfriendstock.com/stock/us/{t}</loc>\n    <lastmod>{today}</lastmod>\n"
                   f"    <changefreq>daily</changefreq>\n    <priority>0.5</priority>\n  </url>"
                   for t in sp500_tickers() if t not in listed)
