"""Run independent Python quality checks and the maintained Node checks."""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if __name__ == "__main__":
    subprocess.run([sys.executable, "analysis/data_quality_check.py"], cwd=ROOT, check=True)
    subprocess.run(["node", "scripts/check.mjs"], cwd=ROOT, check=True)
    subprocess.run(["node", "scripts/check-pages.mjs"], cwd=ROOT, check=True)
