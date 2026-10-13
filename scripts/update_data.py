"""Offline rebuild of curated sources, readable CSV exports and quality checks.

No scraping, tuning, deployment or git operations. Edit data/input with evidence
first; frozen experiments and human annotations require a separate version.
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if __name__ == "__main__":
    subprocess.run(["node", "scripts/build.mjs"], cwd=ROOT, check=True)
    subprocess.run([sys.executable, "analysis/data_quality_check.py"], cwd=ROOT, check=True)
