import importlib.util
import os
import pathlib
import tarfile

spec = importlib.util.spec_from_file_location("data_backup", pathlib.Path(__file__).parent.parent / "tools" / "data_backup.py")
db = importlib.util.module_from_spec(spec)
spec.loader.exec_module(db)


def test_archive_holds_user_data_only_and_is_skipped_when_unchanged(tmp_path, capsys):
    data, dest = tmp_path / "data", tmp_path / "dest"
    (data / "classes").mkdir(parents=True)
    (data / "us_cache").mkdir()
    (data / "users.json").write_text('{"a": 1}')
    (data / "users.json.lock").write_text("")
    (data / "classes" / "ABC123.json").write_text('{"students": []}')
    (data / "us_cache" / "big.json").write_text("x" * 1000)              # a cache: never included
    (data / ".env").write_text("SECRET=1")                                # keys: never included
    assert db.main(str(data), str(dest)) == 0
    with tarfile.open(dest / "latest.tar.gz") as tar:
        assert sorted(tar.getnames()) == ["classes/ABC123.json", "users.json"]
    assert oct(os.stat(dest).st_mode & 0o777) == "0o700"
    n = len(os.listdir(dest))
    db.main(str(data), str(dest))
    assert "unchanged" in capsys.readouterr().out and len(os.listdir(dest)) == n
    (data / "users.json").write_text('{"a": 2}')
    db.main(str(data), str(dest))
    assert len([f for f in os.listdir(dest) if f.startswith("20")]) == 2
    for k in range(3):
        (data / "users.json").write_text('{"a": %d}' % (10 + k))
        db.main(str(data), str(dest), keep=2)
    assert len([f for f in os.listdir(dest) if f.startswith("20")]) == 2
