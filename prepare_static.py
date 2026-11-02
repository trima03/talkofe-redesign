"""Copy Flask assets to Vercel's CDN directory without changing their URLs."""
from pathlib import Path
from shutil import copytree


def main():
    root = Path(__file__).resolve().parent
    copytree(root / "static", root / "public" / "static", dirs_exist_ok=True)


if __name__ == "__main__":
    main()
