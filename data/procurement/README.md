# data/procurement/

Procurement enrichment via Contracts Finder (UK OCDS feed).

**See [`_DRAFT_NOT_WIRED.md`](_DRAFT_NOT_WIRED.md) for current status and integration instructions.**

## Quick commands

```bash
# 1. Ingest contract awards for a year
python scripts/procurement_ingest_contracts_finder.py --year 2024

# 2. Resolve supplier identities to our CH numbers
python scripts/procurement_resolve_to_suppliers.py

# 3. Aggregate per supplier
python scripts/procurement_aggregate_by_supplier.py
```

## Status

- [x] Scripts written and pilot-tested
- [ ] Full 2024 ingestion (awaiting alignment)
- [ ] Integration into supplier profiles (awaiting alignment)
