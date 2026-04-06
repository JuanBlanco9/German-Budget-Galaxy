# Contributing to Budget Galaxy

Thanks for your interest in contributing! Budget Galaxy is an open-source project that visualizes government budgets across multiple countries.

## How to Add a New Country

This is the most impactful contribution you can make. Here's the process:

### 1. Find Official Budget Data

Look for the country's official budget portal. The data should be:
- **Public and open** (government open data portals are ideal)
- **Machine-readable** (CSV, JSON, XLSX — not PDF)
- **Hierarchical** (ministry > department > programme > line item)
- **Multi-year** if possible (at least 3 years for Budget Evolution)

### 2. Build a Tree JSON

Each country needs a tree JSON file per year. The format:

```json
{
  "name": "Country Budget 2024",
  "value": 500000000000,
  "children": [
    {
      "name": "Ministry of Defense",
      "value": 50000000000,
      "children": [
        {
          "name": "Personnel",
          "value": 20000000000
        }
      ]
    }
  ]
}
```

Write a build script in `scripts/` (Python or Node.js) that converts raw data to this format. See `scripts/build_us_trees_all.py` or `scripts/build_fr_trees_all.js` for examples.

### 3. Add Country Metadata

In `frontend/index.html`, add the country to `COUNTRY_META`:

```javascript
xx: {
  name: 'Country Name',
  flag: '\u{1F1XX}\u{1F1XX}',
  currency: 'XXX',
  currencySymbol: 'X',
  defaultYear: 2024,
  locale: 'xx-XX'
}
```

### 4. Add Enrichments (Optional but Valuable)

Programme-level enrichments go in `data/xx/program_enrichment.json`:

```json
{
  "Programme Name": {
    "y": 2005,
    "d": "Description of what this programme does and how it's funded.",
    "b": "Who benefits from this programme"
  }
}
```

### 5. Submit a Pull Request

- Include the raw data source files
- Include the build script
- Include the generated tree JSON files
- Update the README with the new country's data source

## Other Contributions

### Bug Reports
Open an issue with steps to reproduce, expected behavior, and actual behavior.

### Feature Requests
Open an issue describing the feature and why it would be useful.

### Code Changes
- Fork the repo
- Create a branch from `main`
- Make your changes
- Validate JS syntax before committing:
  ```bash
  node -e "const h=require('fs').readFileSync('frontend/index.html','utf8');const s=h.indexOf('<script>');const e=h.lastIndexOf('</script>');try{new Function(h.slice(s+8,e));console.log('OK')}catch(e){console.log('ERR:'+e.message)}"
  ```
- Submit a PR with a clear description

## Development Setup

```bash
git clone https://github.com/JuanBlanco9/Budget-Galaxy.git
cd Budget-Galaxy
pip install -r requirements.txt
uvicorn api.main:app --host 0.0.0.0 --port 8088
```

Open http://localhost:8088 in your browser.

## Code Style

- No build tools or frameworks — everything is vanilla JS in a single HTML file
- Keep enrichments in external JSON files, not inline
- Use CSS variables defined in `:root` for theming
- Test on mobile before submitting UI changes
