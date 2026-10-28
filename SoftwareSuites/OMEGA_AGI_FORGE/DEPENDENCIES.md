# Dependencies

Runtime and tests use only the Python standard library (argparse, ast, hashlib, json, pathlib, sqlite3, subprocess, urllib, unittest, and related modules). There are no pinned runtime dependencies. `pyproject.toml` declares Python >=3.10 and setuptools as the build backend; installing/building a wheel may provision the build tool via pip, but normal CLI operation does not.

No third-party package was installed during this session. Python 3.14.6 and SQLite 3.54.1 were observed on the device. The OS-supplied setuptools version and packaging build were not checked.