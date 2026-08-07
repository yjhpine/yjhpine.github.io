#!/usr/bin/env python3
"""Deprecated: use generate-toy-factory-art.py instead."""

from pathlib import Path
import runpy

if __name__ == "__main__":
    runpy.run_path(str(Path(__file__).with_name("generate-toy-factory-art.py")), run_name="__main__")
