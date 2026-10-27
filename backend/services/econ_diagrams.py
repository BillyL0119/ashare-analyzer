"""
Diagram presets for the economics case library (the diagram lab at /diagrams).

Each case gets the one lab preset that draws its story, e.g. "supply_decrease" for an OPEC cut, or
none when no lab diagram fits. DeepSeek picks from the fixed list below using the case's own
headline and explanation; the pick is kept only if the diagram belongs to one of the case's
concepts. The preset carries no numbers: figures shown next to a diagram are the case's quoted data.

Stored on the case as {"preset": id or None, "currency": code or None, "v": VERSION}. Until a case
has been tagged, diagram_view() falls back to the diagram of its first concept with no preset.
"""
import json
import logging
import os

from services.econ_concepts import CONCEPTS

logger = logging.getLogger("econ_diagrams")

VERSION = 1

# preset id -> (diagram id, what it means; shown to the model)
PRESETS = {
    "demand_increase": ("sd", "demand for a good or service rises (demand curve shifts right)"),
    "demand_decrease": ("sd", "demand for a good or service falls (demand curve shifts left)"),
    "supply_increase": ("sd", "supply of a good rises, e.g. more output, released stockpiles, lower costs (supply shifts right)"),
    "supply_decrease": ("sd", "supply of a good falls, e.g. output cuts, disruption, higher costs (supply shifts left)"),
    "price_ceiling": ("controls", "a legal maximum price or price cap (rent control, energy price cap)"),
    "price_floor": ("controls", "a legal minimum price (minimum wage, minimum alcohol price, guaranteed farm price)"),
    "indirect_tax": ("tax", "a new or higher tax on a specific good or service (sugar tax, fuel duty, VAT on one product)"),
    "subsidy": ("tax", "a subsidy or tax break paid per unit of a specific good (EV subsidy, farm subsidy)"),
    "ped_inelastic": ("ped", "a price change for a good with few substitutes, where the story is about revenue or how little buyers react"),
    "ped_elastic": ("ped", "a price change for a good with many substitutes, where buyers react strongly"),
    "neg_production": ("externality", "production that harms third parties (pollution, emissions)"),
    "pos_consumption": ("externality", "consumption that benefits third parties (vaccines, education, healthcare)"),
    "neg_consumption": ("externality", "consumption that harms third parties (smoking, alcohol, sugary drinks)"),
    "pos_production": ("externality", "production that benefits third parties (research spillovers, training)"),
    "ad_increase": ("adas", "aggregate demand rises for the whole economy: rate cuts, QE, fiscal stimulus, a consumer or export boom"),
    "ad_decrease": ("adas", "aggregate demand falls for the whole economy: rate rises, austerity, confidence or spending slump"),
    "sras_decrease": ("adas", "economy-wide costs rise (energy or oil price shock, wage costs), cutting short-run aggregate supply: cost-push inflation"),
    "sras_increase": ("adas", "economy-wide costs fall (cheaper energy), raising short-run aggregate supply"),
    "lras_increase": ("adas", "the economy's productive capacity grows (productivity, investment, skills, infrastructure)"),
    "phillips_move_up": ("phillips", "the story is about the trade-off: falling unemployment with rising inflation"),
    "phillips_move_down": ("phillips", "the story is about the trade-off: rising unemployment with falling inflation"),
    "phillips_shift_up": ("phillips", "inflation expectations rise or stay high (the short-run Phillips curve shifts up)"),
    "phillips_shift_down": ("phillips", "inflation expectations fall (the short-run Phillips curve shifts down)"),
    "fx_demand_increase": ("forex", "demand for a currency rises (higher interest rates there, more exports or inflows), so it appreciates"),
    "fx_demand_decrease": ("forex", "demand for a currency falls (lower rates, fewer exports or inflows), so it depreciates"),
    "fx_supply_increase": ("forex", "more of a currency is sold (capital outflows, more imports, selling by investors), so it depreciates"),
    "fx_supply_decrease": ("forex", "less of a currency is sold (fewer outflows or imports), so it appreciates"),
    "tariff_imposed": ("tariff", "a country imposes or raises a tariff on imports"),
    "tariff_removed": ("tariff", "a country removes or cuts a tariff on imports"),
}

# Diagrams that may illustrate each concept (a pick outside these is dropped)
ALLOWED = {
    "supply_demand": {"sd", "controls", "tax", "ped"},
    "supply_shock": {"sd", "adas"},
    "elasticity": {"ped", "tax", "sd"},
    "govt_intervention": {"controls", "tax", "externality", "sd", "tariff"},
    "externalities": {"externality", "tax"},
    "trade_protectionism": {"tariff", "sd"},
    "exchange_rates": {"forex"},
    "balance_of_payments": {"forex"},
    "demand_pull_inflation": {"adas", "phillips"},
    "cost_push_inflation": {"adas", "phillips", "sd"},
    "monetary_policy": {"adas", "forex", "phillips"},
    "quantitative_easing": {"adas", "forex"},
    "fiscal_policy": {"adas"},
    "growth_cycle": {"adas"},
    "unemployment": {"adas", "phillips"},
    "wages_inequality": {"controls", "sd"},
    "firms_costs": {"sd"},
}

# Before a case is tagged: the diagram its concepts most often need
FALLBACK = {
    "supply_demand": "sd", "supply_shock": "sd", "elasticity": "ped", "externalities": "externality",
    "trade_protectionism": "tariff", "exchange_rates": "forex", "demand_pull_inflation": "adas",
    "cost_push_inflation": "adas", "growth_cycle": "adas", "fiscal_policy": "adas", "unemployment": "phillips",
}

CURRENCIES = ("GBP", "USD", "EUR", "CNY", "JPY", "KRW")


def allowed_diagrams(concepts) -> set:
    out = set()
    for k in concepts or []:
        out |= ALLOWED.get(k, set())
    return out


def needs_tag(case: dict) -> bool:
    tag = case.get("diagram")
    return not isinstance(tag, dict) or tag.get("v") != VERSION


def diagram_view(case: dict) -> dict | None:
    """{"id", "preset", "currency"} for the lab link, or None when no diagram fits."""
    tag = case.get("diagram")
    if isinstance(tag, dict) and tag.get("v") == VERSION:
        preset = tag.get("preset")
        if preset not in PRESETS:
            return None
        return {"id": PRESETS[preset][0], "preset": preset, "currency": tag.get("currency")}
    for k in case.get("concepts") or []:
        if k in FALLBACK:
            return {"id": FALLBACK[k], "preset": None, "currency": None}
    return None


def _prompt(concepts: list) -> str:
    fits = allowed_diagrams(concepts)
    options = "\n".join(f"- {pid}: {desc}" for pid, (dia, desc) in PRESETS.items() if dia in fits)
    return (
        "You match economics news cases to one textbook diagram for secondary-school students (IB, A-Level, AP). "
        "Pick the single preset below whose mechanism the story itself describes, in the direction the story "
        "describes (for example oil prices falling because supply rises is supply_increase, not supply_decrease). "
        "If the story is about something else (company results, a forecast with no change yet, politics, a "
        "market that the presets do not cover) or the direction is unclear, answer null. Prefer null to a guess.\n"
        "Presets:\n" + (options or "(none)") + "\n\n"
        "For an fx_ preset, also give the ISO code of the currency whose market is drawn (the one that "
        "appreciates or depreciates) if it is one of " + ", ".join(CURRENCIES) + ", else null.\n"
        'Return JSON only: {"preset": "<id>" | null, "currency": "<code>" | null}'
    )


def classify(case: dict) -> dict | None:
    """Ask the model for this case's preset. Returns the tag to store, or None without an API key."""
    api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if not api_key:
        return None
    concepts = [k for k in case.get("concepts") or [] if k in CONCEPTS]
    fits = allowed_diagrams(concepts)
    tag = {"preset": None, "currency": None, "v": VERSION}
    if not fits:
        return tag                               # no lab diagram for these concepts: no model call
    part = case.get("en") or {}
    from openai import OpenAI
    client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com", timeout=60, max_retries=0)
    resp = client.chat.completions.create(
        model="deepseek-chat", max_tokens=60, temperature=0, response_format={"type": "json_object"},
        messages=[{"role": "system", "content": _prompt(concepts)},
                  {"role": "user", "content": f"Headline: {case.get('title')}\nWhat happened: {part.get('what')}\n"
                                              f"The economics: {part.get('angle')}\nConcepts: {', '.join(concepts)}"}],
    )
    out = json.loads(resp.choices[0].message.content or "{}")
    preset = out.get("preset") if isinstance(out, dict) else None
    if preset in PRESETS and PRESETS[preset][0] in fits:
        tag["preset"] = preset
        cur = out.get("currency")
        if PRESETS[preset][0] == "forex" and cur in CURRENCIES:
            tag["currency"] = cur
    elif preset:
        logger.info("case %s: dropped diagram %r (not in %s)", case.get("id"), preset, sorted(fits))
    return tag
