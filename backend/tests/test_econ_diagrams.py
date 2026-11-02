"""Which diagram-lab link a news case shows (services/econ_diagrams.py). No network: the DeepSeek
tagging itself (classify) is not exercised."""
from services import econ_diagrams as ed
from services.econ_concepts import CONCEPTS

V = ed.VERSION


def test_tagged_case_links_its_preset():
    case = {"concepts": ["supply_demand"], "diagram": {"preset": "supply_decrease", "currency": None, "v": V}}
    assert ed.diagram_view(case) == {"id": "sd", "preset": "supply_decrease", "currency": None}


def test_tagged_case_keeps_its_currency():
    case = {"concepts": ["exchange_rates"], "diagram": {"preset": "fx_demand_increase", "currency": "GBP", "v": V}}
    assert ed.diagram_view(case) == {"id": "forex", "preset": "fx_demand_increase", "currency": "GBP"}


def test_tagged_case_with_no_fitting_diagram_shows_none():
    case = {"concepts": ["supply_demand"], "diagram": {"preset": None, "currency": None, "v": V}}
    assert ed.diagram_view(case) is None


def test_unknown_preset_shows_none():
    assert ed.diagram_view({"concepts": ["supply_demand"], "diagram": {"preset": "made_up", "v": V}}) is None


def test_old_or_missing_tag_falls_back_to_the_first_concept_with_a_diagram():
    stale = {"preset": "tariff_imposed", "currency": "USD", "v": V - 1}
    case = {"concepts": ["monetary_policy", "exchange_rates"], "diagram": stale}   # no fallback for monetary_policy
    assert ed.diagram_view(case) == {"id": "forex", "preset": None, "currency": None}
    assert ed.diagram_view({"concepts": ["elasticity"]}) == {"id": "ped", "preset": None, "currency": None}


def test_no_diagram_for_cases_without_a_diagram_concept():
    assert ed.diagram_view({"concepts": ["monetary_policy"]}) is None
    assert ed.diagram_view({"concepts": []}) is None
    assert ed.diagram_view({}) is None


def test_needs_tag():
    assert ed.needs_tag({})
    assert ed.needs_tag({"diagram": {"preset": "subsidy", "v": V - 1}})
    assert not ed.needs_tag({"diagram": {"preset": None, "v": V}})


def test_allowed_diagrams():
    assert ed.allowed_diagrams(["exchange_rates", "elasticity"]) == {"forex", "ped", "tax", "sd"}
    assert ed.allowed_diagrams(None) == set()


def test_tables_agree_with_each_other_and_the_concepts():
    with_presets = {d for d, _ in ed.PRESETS.values()}
    for concept, diagrams in ed.ALLOWED.items():
        assert concept in CONCEPTS, concept
        assert diagrams <= with_presets, concept      # every allowed diagram has a preset to pick
    for concept, diagram in ed.FALLBACK.items():
        assert concept in CONCEPTS, concept
        assert diagram in ed.ALLOWED[concept], concept
