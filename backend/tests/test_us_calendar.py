from datetime import date

from services import us_calendar as uc


def test_holidays_and_weekends_are_not_trading_days():
    assert not uc.is_trading_day("2026-11-26")          # Thanksgiving
    assert uc.is_trading_day("2026-11-27")              # half day still trades
    assert not uc.is_trading_day("2026-11-28")          # Saturday
    assert uc.next_trading_day("2026-12-24") == date(2026, 12, 28)   # skips Christmas and the weekend


def test_month_end_and_check_days():
    assert uc.last_trading_day(2026, 11) == date(2026, 11, 30)
    assert uc.last_trading_day(2027, 12) == date(2027, 12, 31)   # Jan 1 2028 is a Saturday: no Friday holiday
    assert uc.last_trading_day(2026, 5) == date(2026, 5, 29)     # 31st is a Sunday
    assert uc.check_days(2026, 12) == [date(2026, 12, 31), date(2027, 1, 4), date(2027, 1, 5),
                                       date(2027, 1, 6), date(2027, 1, 7)]
