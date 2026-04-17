# Budget Galaxy — Next Session prompt

Paste this as your first message to Claude:

---

Continuamos Budget Galaxy. Estado actual: **86.54% MHCLG coverage** (167/411 councils, £122.61B / £141.68B). Récord single-day: +21.34pp (65.2% → 86.54% en 2 días).

Working directory: D:\germany-ngo-map

Lee el handoff completo:
`C:\Users\Usuario\.claude\projects\c--Users-Usuario-Desktop-latam-aviation-api\memory\project_budget_galaxy_handoff_2026-04-17.md`

## Estado actual del techo sin UK VPS

**Techo confirmado en ~86.5%.** Los councils restantes grandes son:
- Dorset £721M — no en Wayback (CDX confirma 0 spend CSVs)
- Northumberland £604M — TLS + JS blocked, no en Wayback
- Tameside £486M — IA crawler tampoco llega
- Blackburn £348M — datashare subdomain TCP-blocked
- PCCs grandes: GMP £923M, West Midlands £892M, West Yorkshire £672M, Thames Valley £650M
- Oxfordshire partial (4/12 ya shippeados) — los otros 8 meses no están archivados

Todos necesitan UK VPS.

## Si compraste UK VPS (Hetzner London €4/mo)

IP del VPS: [COMPLETAR ACÁ]
SSH key: misma que Vultr (~/.ssh/id_agro_intel) o nueva

**Prioridad desde UK VPS:**
1. Dorset £721M
2. Northumberland £604M
3. Oxfordshire CC — los 8 meses restantes (ya tenemos 4/12)
4. Tameside £486M
5. Blackburn £348M
6. PCCs grandes (7 de ellos = ~£5B combined)

Método:
```bash
ssh root@{HETZNER_IP} "curl -sL -A 'Mozilla/5.0' -o /tmp/{council}.csv '{URL}'"
scp root@{HETZNER_IP}:/tmp/{council}.csv data/uk/local_authorities/spend/{council}/
```

Lanzá 6 agentes en paralelo para los que necesitan discovery de URL (Dorset, Northumberland). Los con URL confirmada (Tameside, Blackburn) bajan directo.

## Si NO compraste UK VPS

El techo sin nueva infra es ~86.5%. Opciones restantes de bajo ROI:

### Quality improvements (0pp pero data limpia)
- **Nottingham rebalance**: 35% del spend cayó en Central Services por cost-centre codes. Manual overrides para reasignar a Environment/Housing.
- **Wakefield apostrophe re-classify**: mejora mapping después del fix de apóstrofe del 2026-04-16.
- **Darlington May/Aug/Dec recovery**: 3 archivos con SQL header corruption, ~£30-45M recuperable.
- **North Lincolnshire Feb amount fix**: Excel serial numbers corruption.

### Colchester manual download (+0.06pp)
12 XLSX SharePoint auth-gated. Abrís browser logged en Microsoft, bajás los 12, yo proceso.

### Shire Districts long tail (+0.3-0.5pp)
~155 uncovered, £20M avg, £3.1B total. Batches de 6 agentes cada uno. Muy marginal.

## Pipeline recipe (referencia rápida)

```bash
cd /d/germany-ngo-map
# 1. Download files to data/uk/local_authorities/spend/{slug}/
# 2. Add to auto_configs.json
# 3. node scripts/validate_auto_configs.js
# 4. ANTHROPIC_API_KEY="sk-ant-api03-T7M..." node scripts/classify_council_departments.js --council "Name" --dept-col "X" --purpose-col "Y" --header-hint "Z" --encoding utf8 --file f1.csv ...
# 5. node scripts/build_council_spend_lookup.js 2024
# 6. Add NAME_ALIAS in inject_council_spend_metadata.js si lookup key ≠ tree name
# 7. node scripts/inject_council_spend_metadata.js 2024
# 8. Verificar coverage con python+json.load con encoding='utf-8' explícito (hay char 0x9d en el tree)
# 9. git add + commit + push
```

## Descubrimientos reusables (consolidados)

1. **SharePoint download.aspx rewrite**: `/:x:/s/{site}/{TOKEN}?e=...` → `/sites/{site}/_layouts/15/download.aspx?share={TOKEN}`
2. **Wayback if_/id_ replay**: `web.archive.org/web/2025id_/{url}` para geo-blocked
3. **Wayback Save Page Now con IA S3 auth**: para councils sin snapshots pero alcanzables por IA crawler
4. **Vultr Miami proxy**: para Incapsula WAFs que bloquean AR pero permiten US
5. **Manifest re-audit green/yellow**: ROI más alto sobre "never built"
6. **Parallel 6-agent batches**: 75% hit rate probado sobre 28 probes
7. **Drupal /jsonapi + /document-search?field_document_target_id={term}**: para localgov_services_page sites
8. **WordPress customfilter AJAX**: Somerset pattern (POST admin-ajax.php)
