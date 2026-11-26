from services import runtime


def test_standby_only_when_asked(monkeypatch):
    monkeypatch.delenv("BFS_STANDBY", raising=False)
    assert runtime.standby() is False
    monkeypatch.setenv("BFS_STANDBY", "0")
    assert runtime.standby() is False
    monkeypatch.setenv("BFS_STANDBY", "1")
    assert runtime.standby() is True
