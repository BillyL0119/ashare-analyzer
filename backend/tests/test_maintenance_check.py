import importlib.util
import pathlib
from datetime import date

spec = importlib.util.spec_from_file_location("maintenance_check", pathlib.Path(__file__).parent.parent.parent / "tools" / "maintenance_check.py")
mc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mc)


def test_holiday_table_is_flagged_from_november_of_its_last_year():
    years = {2026, 2027, 2028}
    assert mc.check_holidays(date(2027, 11, 30), years) == []
    assert mc.check_holidays(date(2028, 10, 31), years) == []
    assert "2029" in mc.check_holidays(date(2028, 11, 1), years)[0]
    assert "already 2029" in mc.check_holidays(date(2029, 1, 2), years)[0]


def test_membership_and_desk_age():
    assert mc.check_membership(date(2027, 6, 1), "2026-08-18") == []
    assert "days old" in mc.check_membership(date(2027, 9, 1), "2026-08-18")[0]
    assert mc.check_desk(6.5) == [] and "stopped" in mc.check_desk(15)[0] and "never" in mc.check_desk(None)[0]


def test_the_real_files_load():
    assert max(mc.load_holiday_years()) >= 2028
