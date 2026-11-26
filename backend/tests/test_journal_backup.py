import importlib.util
import os
import pathlib

spec = importlib.util.spec_from_file_location("journal_backup", pathlib.Path(__file__).parent.parent / "tools" / "journal_backup.py")
jb = importlib.util.module_from_spec(spec)
spec.loader.exec_module(jb)


def test_snapshots_only_when_changed_and_old_ones_are_pruned(tmp_path, capsys):
    src, dest = tmp_path / "src", tmp_path / "dest"
    src.mkdir()
    assert jb.main(str(src), str(dest)) == 0 and not dest.exists()           # nothing to save yet
    (src / "a.json").write_text('{"entries": []}')
    jb.main(str(src), str(dest), keep=2)
    assert len(os.listdir(dest)) == 1
    jb.main(str(src), str(dest), keep=2)                                      # unchanged: no second snapshot
    assert len(os.listdir(dest)) == 1 and "unchanged" in capsys.readouterr().out
    assert oct(os.stat(dest).st_mode & 0o777) == "0o700"
    for n in range(3):                                                        # three changes, keep the newest two
        (src / "a.json").write_text('{"entries": [%d]}' % n)
        jb.main(str(src), str(dest), keep=2)
    assert len(os.listdir(dest)) == 2
