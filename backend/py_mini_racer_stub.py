"""
Stub to replace py_mini_racer (V8 JS engine) which crashes on macOS Apple Silicon.
We don't use any akshare functions that need JS evaluation, so this is safe.
"""


class MiniRacer:
    def eval(self, code):
        raise RuntimeError("py_mini_racer stub: JS evaluation not supported")

    def call(self, fn, *args):
        raise RuntimeError("py_mini_racer stub: JS evaluation not supported")
