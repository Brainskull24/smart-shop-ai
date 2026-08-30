import sys
from pathlib import Path

# Ensure the workspace root (parent of scraper/) is on sys.path
# so that `from scraper.app.xxx import ...` works when running pytest
# from the workspace root or from inside the scraper/ directory.
ROOT = Path(__file__).parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
