"""Sitemap entries for the pages that exist in two languages."""
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
        if not loc.startswith(root) or loc[len(root):] not in BILINGUAL:
            return block
        en = f"{loc}?lang=en"
        alts = "".join(f'\n    <xhtml:link rel="alternate" hreflang="{h}" href="{u}"/>'
                       for h, u in (("zh", loc), ("en", en), ("x-default", en)))
        zh_block = block[:-len("</url>")].rstrip() + alts + "\n  </url>"
        return zh_block + "\n  " + zh_block.replace(f"<loc>{loc}</loc>", f"<loc>{en}</loc>")
    xml = re.sub(r"<url>\s*<loc>([^<]+)</loc>.*?</url>", one, xml, flags=re.S)
    return xml.replace('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
                       '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">')
