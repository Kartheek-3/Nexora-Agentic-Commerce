from __future__ import annotations

from pathlib import Path


OUTPUT = Path(__file__).resolve().parents[1] / "supabase" / "migrations" / "005_large_product_catalog.sql"


def main() -> None:
    # The migration itself is set-based SQL, so Supabase can generate the catalog
    # deterministically without a 1200-line insert file or runtime LLM dependency.
    print(f"Catalog migration is maintained at {OUTPUT}")


if __name__ == "__main__":
    main()
