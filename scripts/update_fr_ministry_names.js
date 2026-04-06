const fs = require('fs');
const tr = JSON.parse(fs.readFileSync('D:/germany-ngo-map/data/fr/translations_fr_en.json', 'utf8'));

// Level 1 ministry name overrides with "Ministry of" prefix
const ministryNames = {
  "Agriculture et souveraineté alimentaire": "Ministry of Agriculture & Food Sovereignty",
  "Agriculture, souveraineté alimentaire et forêt": "Ministry of Agriculture, Food Sovereignty & Forestry",
  "Armées": "Ministry of the Armed Forces",
  "Armées et anciens combattants": "Ministry of the Armed Forces & Veterans",
  "Budget et comptes publics": "Ministry of Budget & Public Accounts",
  "Culture": "Ministry of Culture",
  "Enseignement supérieur et recherche": "Ministry of Higher Education & Research",
  "Europe et affaires étrangères": "Ministry of Europe & Foreign Affairs",
  "Fonction publique, simplification et transformation de l'action publique": "Ministry of Civil Service & Public Transformation",
  "Intérieur": "Ministry of the Interior",
  "Intérieur et outre-mer": "Ministry of the Interior & Overseas Territories",
  "Justice": "Ministry of Justice",
  "Logement et rénovation urbaine": "Ministry of Housing & Urban Renovation",
  "Outre-Mer": "Ministry of Overseas Territories",
  "Partenariat avec les collectivités territoriales et décentralisation": "Ministry of Local Authorities & Decentralization",
  "Santé et accès aux soins": "Ministry of Health & Healthcare Access",
  "Santé et prévention": "Ministry of Health & Prevention",
  "Services du Premier ministre": "Prime Minister's Office",
  "Solidarités et des Familles": "Ministry of Solidarity & Families",
  "Solidarités, autonomie et égalité entre les femmes et les hommes": "Ministry of Solidarity, Autonomy & Gender Equality",
  "Sports et jeux olympiques et paralympiques": "Ministry of Sports & Olympic/Paralympic Games",
  "Sports, jeunesse et vie associative": "Ministry of Sports, Youth & Community Life",
  "Transformation et fonction publiques": "Ministry of Public Service Transformation",
  "Transition écologique et cohésion des territoires": "Ministry of Green Transition & Territorial Cohesion",
  "Transition écologique, énergie, climat et prévention des risques": "Ministry of Green Transition, Energy & Climate",
  "Transition énergétique": "Ministry of Energy Transition",
  "Travail et emploi": "Ministry of Labor & Employment",
  "Travail, plein emploi et insertion": "Ministry of Labor, Employment & Integration",
  "Économie, finances et industrie": "Ministry of Economy, Finance & Industry",
  "Économie, finances et souveraineté industrielle et numérique": "Ministry of Economy, Finance & Digital Sovereignty",
  "Éducation nationale": "Ministry of National Education",
  "Éducation nationale et  jeunesse": "Ministry of National Education & Youth",
};

let updated = 0;
for (const [fr, en] of Object.entries(ministryNames)) {
  if (tr[fr] !== en) {
    console.log(`  ${fr}`);
    console.log(`    OLD: ${tr[fr] || '(none)'}`);
    console.log(`    NEW: ${en}`);
    tr[fr] = en;
    updated++;
  }
}

fs.writeFileSync('D:/germany-ngo-map/data/fr/translations_fr_en.json', JSON.stringify(tr, null, 2));
console.log(`\nUpdated ${updated} ministry translations. Total: ${Object.keys(tr).length}`);
