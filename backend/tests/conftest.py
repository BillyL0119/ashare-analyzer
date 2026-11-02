# The backend imports its modules as top-level packages (`from services import ...`), the way
# uvicorn runs it from backend/. Put backend/ on the path so `pytest backend/tests` works from the
# repo root too.
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
