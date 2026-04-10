#!/usr/bin/env node
/**
 * Compile supplier enrichment from all sources into a single file.
 * Sources: auto-generated (councils/NHS) + 3 research batches.
 */
const fs = require('fs');
const path = require('path');
const OUT = path.resolve(__dirname, '..', 'data', 'recipients', 'uk', 'supplier_enrichment.json');

const enrichment = {};

// 1. Auto-generated councils and NHS
const autoPath = path.resolve(__dirname, '..', 'data', 'recipients', 'uk', 'supplier_enrichment_auto.json');
if (fs.existsSync(autoPath)) {
  const auto = JSON.parse(fs.readFileSync(autoPath));
  Object.assign(enrichment, auto);
}

// 2. Research batches (hardcoded from agent results)
const batch1 = [
  {"name":"Student Loans Company Ltd","sector":"Public Finance","employees":3000,"hq":"Glasgow","description":"Administers student loans, grants, and repayments for approximately 9 million borrowers across the UK on behalf of DfE."},
  {"name":"The Office For Students","sector":"Education Regulation","employees":450,"hq":"Bristol","description":"Independent regulator of higher education in England, distributing teaching and capital grants to universities and colleges."},
  {"name":"UK HEALTH SECURITY AGENCY (UKHSA)","sector":"Public Health","employees":6000,"hq":"London","description":"Provides health protection services including infectious disease surveillance, pandemic preparedness, and emergency response for DHSC."},
  {"name":"BAE SYSTEMS SURFACE SHIPS LIMITED","sector":"Defence / Shipbuilding","employees":4500,"hq":"Glasgow","description":"Designs and builds complex warships for the Royal Navy, including the Type 26 frigate programme at Govan and Scotstoun shipyards."},
  {"name":"LEIDOS EUROPE, LIMITED","sector":"Defence / IT Services","employees":3500,"hq":"Farnborough","description":"Delivers logistics information systems and managed IT services to MoD, operating the Defence Logistics framework."},
  {"name":"Network Rail","sector":"Transport / Rail Infrastructure","employees":42000,"hq":"London","description":"Owns and operates Britain's railway infrastructure including 20,000 miles of track, 30,000 bridges, and 2,500 stations."},
  {"name":"VIVO DEFENCE SERVICES LIMITED","sector":"Defence / Facilities Management","employees":4500,"hq":"Aldershot","description":"Maintains and manages the UK military built estate including barracks, training facilities, and housing across MoD sites nationwide."},
  {"name":"British Broadcasting Corporation","sector":"Media / Broadcasting","employees":22000,"hq":"London","description":"UK public service broadcaster funded primarily by the licence fee, providing television, radio, and digital content."},
  {"name":"Barclays Bank PLC","sector":"Financial Services","employees":90000,"hq":"London","description":"Provides government banking, payment processing, and financial services to MoD and DfT."},
  {"name":"ASPIRE DEFENCE LIMITED","sector":"Defence / Infrastructure","employees":1200,"hq":"Andover","description":"Delivers and maintains accommodation and facilities at the Salisbury Plain military garrisons under a 35-year PFI contract with MoD."},
  {"name":"BOEING DEFENCE UK LTD","sector":"Defence / Aerospace","employees":2000,"hq":"London","description":"Provides military aircraft and support services to MoD including P-8A Poseidon maritime patrol, Chinook helicopters, and Apache support."},
  {"name":"DEVONPORT ROYAL DOCKYARD LIMITED","sector":"Defence / Naval Engineering","employees":5000,"hq":"Plymouth","description":"Operates the Devonport naval base refitting and maintaining Royal Navy warships and nuclear submarines, owned by Babcock International."},
  {"name":"EDF Energy Customers plc","sector":"Energy / Utilities","employees":13000,"hq":"London","description":"Supplies electricity and gas to MoD and Defra estates under centralised government energy procurement frameworks."},
  {"name":"Bowmer And Kirkland Limited","sector":"Construction","employees":2000,"hq":"Heage","description":"Delivers school building and refurbishment projects for DfE under the Priority Schools Building Programme."},
  {"name":"National Highways Limited","sector":"Transport / Road Infrastructure","employees":7500,"hq":"Birmingham","description":"Plans, designs, builds, and operates England's motorways and major A-roads network comprising approximately 4,300 miles."},
  {"name":"BALFOUR BEATTY VINCI JV - HS2 (N2)","sector":"Transport / Construction","employees":5000,"hq":"London","description":"Joint venture delivering the northern section of HS2 Phase 1 between Birmingham and the West Midlands interchange."},
  {"name":"SUPPLY CHAIN COORDINATION LIMITED  SCCL ONLY","sector":"Healthcare / Procurement","employees":3000,"hq":"Alfreton","description":"Manages NHS supply chain logistics, procuring and distributing medical equipment and PPE to NHS trusts across England."},
  {"name":"BAE SYSTEMS (OPERATIONS) LIMITED","sector":"Defence / Aerospace","employees":12000,"hq":"Warton","description":"Manufactures and supports military aircraft and electronic warfare systems for MoD, including Typhoon production and Tempest development."},
  {"name":"VINCI CONSTRUCTION UK LTD","sector":"Construction","employees":3500,"hq":"Watford","description":"Delivers building and civil engineering projects for DWP and MoD including office refurbishments and defence infrastructure."},
  {"name":"Bam Construction Limited","sector":"Construction","employees":2500,"hq":"Hemel Hempstead","description":"Constructs and refurbishes schools, colleges, and university buildings for DfE under government education construction frameworks."},
  {"name":"NAVANTIA UK LTD.","sector":"Defence / Shipbuilding","employees":400,"hq":"Bristol","description":"UK subsidiary of Spanish state shipbuilder providing design and engineering support for the Fleet Solid Support ship programme."},
  {"name":"SERCO LTD","sector":"Outsourcing / Public Services","employees":12000,"hq":"Hook","description":"Delivers outsourced public services for DWP and DfT including employment programmes, prisoner transport, and traffic management."},
  {"name":"BABCOCK LAND DEFENCE LIMITED","sector":"Defence / Land Systems","employees":1500,"hq":"Bristol","description":"Maintains and overhauls British Army armoured vehicles, weapons systems, and land equipment at MoD workshops."},
  {"name":"CENTRE FOR HEALTH & DISABILITY ASSESSMENTS LTD","sector":"Healthcare / Assessments","employees":3500,"hq":"London","description":"Conducts PIP and Work Capability health assessments for DWP claimants on behalf of Maximus UK."},
  {"name":"MITIE FM LTD","sector":"Facilities Management","employees":5000,"hq":"London","description":"Provides facilities management, security, and building maintenance services across DWP's Jobcentre and office estate."},
  {"name":"MITIE FM LTD - 2WM","sector":"Facilities Management","employees":5000,"hq":"London","description":"Provides facilities management, security, and building maintenance services across DWP's Jobcentre and office estate."},
  {"name":"Boxxe Limited","sector":"IT / Reseller","employees":500,"hq":"York","description":"Supplies IT hardware, software licensing, and cloud solutions to DfE and DfT through government digital procurement frameworks."},
  {"name":"CAPGEMINI UK PLC","sector":"IT / Consulting","employees":14000,"hq":"London","description":"Delivers large-scale digital transformation, IT consulting, and systems integration for Cabinet Office, Defra, and DfT."},
  {"name":"ATOS IT SERVICES UK LTD TRADING AS INDEPENDENT ASSESSMENT SERVICES","sector":"IT Services","employees":8000,"hq":"London","description":"Operates critical IT infrastructure and digital services for DWP including hosting and application management for benefits systems."},
  {"name":"GOVIA THAMESLINK RAILWAY LIMITED","sector":"Transport / Rail Operations","employees":7500,"hq":"London","description":"Operates the UK's largest rail franchise spanning Thameslink, Southern, Great Northern, and Gatwick Express."},
  {"name":"RHEINMETALL MAN MILITARY VEHICLES UK LTD","sector":"Defence / Military Vehicles","employees":400,"hq":"Bristol","description":"Supplies and supports MAN military logistics and tactical trucks for the British Army's vehicle fleet."},
  {"name":"INGEUS UK LTD","sector":"Employment Services","employees":2000,"hq":"London","description":"Delivers DWP-funded welfare-to-work programmes helping long-term unemployed and disabled people into employment."},
  {"name":"National Savings and Investments","sector":"Public Finance","employees":150,"hq":"London","description":"HM Treasury's savings agency offering Premium Bonds and other government-backed products for retail savers."},
];

const batch2 = [
  {"name":"ALEXANDER MANN SOLUTIONS LTD","sector":"Recruitment","employees":4500,"hq":"London","description":"Global talent acquisition firm providing recruitment process outsourcing to DWP and other government departments."},
  {"name":"ALEXANDER MANN SOLUTIONS LTD-2WM","sector":"Recruitment","employees":4500,"hq":"London","description":"Global talent acquisition firm providing recruitment process outsourcing to DWP and other government departments."},
  {"name":"Qinetiq Plc","sector":"Defence Technology","employees":7000,"hq":"Farnborough","description":"Defence science and technology company providing test, evaluation, and advisory services to MoD."},
  {"name":"THALES UK LIMITED","sector":"Defence / Electronics","employees":7000,"hq":"London","description":"Delivers advanced electronics, radar, sonar, and communications systems for UK military platforms."},
  {"name":"MODUS SERVICES LIMITED","sector":"Facilities Management","employees":300,"hq":"London","description":"Provides workplace furnishing, fit-out, and facilities management services for DWP Jobcentre offices."},
  {"name":"LEONARDO UK LTD","sector":"Defence / Aerospace","employees":7000,"hq":"Edinburgh","description":"Designs and manufactures helicopters, electronics, and cyber security systems for UK defence programmes."},
  {"name":"LANDMARC SUPPORT SERVICES LIMITED","sector":"Defence Estates","employees":800,"hq":"Wilton","description":"Manages and maintains the MoD's UK military training estate including ranges and training areas."},
  {"name":"G4S SECURE SOLUTIONS UK LTD","sector":"Security Services","employees":25000,"hq":"London","description":"Provides security guarding, cash handling, and court custody services across government buildings."},
  {"name":"G4S SECURE SOLUTIONS UK LTD-2WM","sector":"Security Services","employees":25000,"hq":"London","description":"Provides security guarding, cash handling, and court custody services across government buildings."},
  {"name":"GENOMICS ENGLAND LTD","sector":"Healthcare / Genomics","employees":600,"hq":"London","description":"DHSC-owned company running the national genomic medicine service, sequencing genomes for precision medicine in the NHS."},
  {"name":"RMPA SERVICES PLC","sector":"Facilities Management","employees":1500,"hq":"Birmingham","description":"Delivers property maintenance and facilities management for DWP's Jobcentre Plus and government office network."},
  {"name":"REED IN PARTNERSHIP LIMITED","sector":"Employment Services","employees":1000,"hq":"London","description":"Delivers welfare-to-work programmes helping unemployed individuals find sustained employment on behalf of DWP."},
  {"name":"NORTHERN TRAINS LIMITED","sector":"Rail Transport","employees":7000,"hq":"Sheffield","description":"Government-owned train company running commuter and regional rail services across Northern England."},
  {"name":"Met Office","sector":"Meteorology","employees":2200,"hq":"Exeter","description":"National weather service providing forecasting, climate research, and severe weather warnings, funded by Defra."},
  {"name":"SOFTCAT PLC","sector":"IT / Reseller","employees":2200,"hq":"Marlow","description":"IT infrastructure reseller supplying software licensing, cloud services, and cybersecurity to government departments."},
  {"name":"AMEY DEFENCE SERVICES LIMITED","sector":"Defence Infrastructure","employees":1500,"hq":"Oxford","description":"Maintains and operates MoD built estate under long-term strategic partnering contracts."},
  {"name":"ALLPAY LIMITED","sector":"Payment Services","employees":350,"hq":"Hereford","description":"Provides bill payment and collection services enabling DWP benefit recipients to make payments across multiple channels."},
  {"name":"ROLLS-ROYCE PLC","sector":"Defence / Aerospace Engineering","employees":42000,"hq":"London","description":"Engineers gas turbine engines for military aircraft and nuclear propulsion systems for Royal Navy submarines."},
  {"name":"PENSION PROTECTION FUND","sector":"Pensions","employees":400,"hq":"Croydon","description":"Statutory corporation paying compensation to members of defined-benefit pension schemes when employers become insolvent."},
  {"name":"VITOL AVIATION UK LTD","sector":"Energy / Fuel Supply","employees":100,"hq":"London","description":"Aviation fuel trading subsidiary supplying jet fuel to MoD for military aircraft and vehicle operations."},
  {"name":"MAXIMUS UK SERVICES LTD","sector":"Health / Employment Services","employees":5000,"hq":"London","description":"Delivers health assessment and disability benefit assessments on behalf of DWP."},
  {"name":"Teleperformance Limited","sector":"Business Process Outsourcing","employees":10000,"hq":"London","description":"Operates contact centres handling DWP telephone enquiries for Universal Credit, pensions, and other benefits."},
  {"name":"LOCKHEED MARTIN UK LIMITED","sector":"Defence / Aerospace","employees":1600,"hq":"London","description":"Provides advanced defence systems and training solutions for the UK MoD."},
  {"name":"Kier Construction Eastern","sector":"Construction","employees":4000,"hq":"Tempsford","description":"Regional construction delivering school building and refurbishment projects under DfE frameworks."},
  {"name":"OCCAR-EA","sector":"Defence / International","employees":300,"hq":"Bonn","description":"International organisation managing collaborative European defence procurement programmes including A400M for MoD."},
  {"name":"FIRST MTR SOUTH WESTERN TRAINS LTD","sector":"Rail Transport","employees":5500,"hq":"London","description":"Operates South Western Railway franchise running commuter services from London Waterloo."},
  {"name":"GREAT WESTERN RAILWAY","sector":"Rail Transport","employees":6000,"hq":"Swindon","description":"Operates the Great Western franchise connecting London Paddington with South West England and Wales."},
  {"name":"LONDON NORTH EASTERN RAILWAY","sector":"Rail Transport","employees":3500,"hq":"London","description":"Government-owned operator running intercity services on the East Coast Main Line."},
  {"name":"WEST MIDLANDS TRAINS","sector":"Rail Transport","employees":3000,"hq":"Birmingham","description":"Operates West Midlands Railway and London Northwestern Railway commuter services."},
  {"name":"TRANSPORT UK EAST MIDLANDS LIMITED","sector":"Rail Transport","employees":2500,"hq":"Derby","description":"Operates East Midlands Railway providing intercity and regional rail services."},
  {"name":"COMPUTACENTER UK LTD","sector":"IT / Infrastructure","employees":7000,"hq":"Hatfield","description":"Supplies IT workplace hardware, data centre infrastructure, and managed services to government departments."},
  {"name":"IBM UNITED KINGDOM LTD","sector":"IT / Consulting","employees":15000,"hq":"London","description":"Provides enterprise IT infrastructure, cloud computing, and systems integration for MoD and cross-government."},
  {"name":"NEST CORPORATION","sector":"Pensions","employees":500,"hq":"London","description":"Government-established workplace pension scheme providing auto-enrolment services for employers and workers."},
  {"name":"Capita Business Services Ltd","sector":"Business Process Outsourcing","employees":50000,"hq":"London","description":"Delivers IT, digital, and business process outsourcing including army recruitment and pension administration."},
  {"name":"Capita Business Services Ltd - Turing","sector":"Business Process Outsourcing","employees":50000,"hq":"London","description":"Delivers IT and business process outsourcing services to government departments."},
];

const batch3 = [
  {"name":"Galliford Try Building Ltd","sector":"Construction","employees":3200,"hq":"Uxbridge","description":"Delivers school buildings and public facilities under DfE capital frameworks."},
  {"name":"Reds10 (Uk) Limited","sector":"Modular Construction","employees":250,"hq":"Driffield","description":"Specialist in modular offsite construction delivering rapid-build schools for DfE."},
  {"name":"SEVERN TRENT SERVICES DEFENCE LIMITED","sector":"Utilities","employees":200,"hq":"Coventry","description":"Provides water and wastewater services to MoD military bases and defence estates."},
  {"name":"SHARED SERVICES CONNECTED LTD","sector":"Shared Services","employees":1800,"hq":"Stoke-on-Trent","description":"Government-owned shared services provider delivering HR, payroll, and finance across departments."},
  {"name":"VOLKERFITZPATRICK LIMITED","sector":"Civil Engineering","employees":1500,"hq":"Hertford","description":"Civil engineering contractor delivering road, rail and bridge projects for DfT and National Highways."},
  {"name":"Tilbury Douglas Construction Limited","sector":"Construction","employees":1200,"hq":"Dartford","description":"National building and civil engineering contractor delivering schools and transport infrastructure."},
  {"name":"Wates Construction Limited","sector":"Construction","employees":3500,"hq":"Leatherhead","description":"Family-owned construction group building schools and public sector buildings under DfE frameworks."},
  {"name":"Morgan Sindall Construction And Infrastructure Ltd","sector":"Construction","employees":6500,"hq":"London","description":"Listed construction company delivering schools and public buildings through DfE frameworks."},
  {"name":"SKANSKA CONSTRUCTION UK LIMITED","sector":"Construction","employees":5000,"hq":"Rickmansworth","description":"UK arm of Swedish construction multinational delivering major road, rail, and defence infrastructure."},
  {"name":"Government Property Agency","sector":"Public Sector / Property","employees":900,"hq":"London","description":"Executive agency managing and optimising the government office estate across civil service departments."},
  {"name":"PA CONSULTING SERVICES LTD","sector":"Management Consulting","employees":4000,"hq":"London","description":"Innovation and transformation consultancy advising government on strategy, technology, and digital programmes."},
  {"name":"BRITISH TELECOMMUNICATIONS PUBLIC LIMITED COMPANY","sector":"Telecommunications","employees":100000,"hq":"London","description":"Provides secure communications networks and managed IT services to MoD and defence."},
  {"name":"SUPACAT LIMITED","sector":"Defence / Vehicles","employees":250,"hq":"Dunkeswell","description":"Specialist defence vehicle manufacturer supplying high-mobility tactical vehicles to the British military."},
  {"name":"Bpp Professional Education Limited","sector":"Education / Training","employees":2000,"hq":"London","description":"Professional education provider delivering apprenticeships in accounting, law, and business funded by DfE."},
  {"name":"Qa Limited","sector":"Education / Training","employees":2500,"hq":"London","description":"Technology skills and training provider delivering digital apprenticeships and IT upskilling for DfE."},
  {"name":"Lifetime Training Group Limited","sector":"Education / Training","employees":1400,"hq":"London","description":"National apprenticeship training provider in hospitality, retail, and business skills funded by DfE."},
  {"name":"Cambridge Education","sector":"Education Consulting","employees":300,"hq":"London","description":"Education advisory firm supporting school improvement and local authority education services for DfE."},
  {"name":"Kaplan Financial Limited","sector":"Education / Training","employees":1500,"hq":"London","description":"Professional education provider delivering accountancy and financial apprenticeship training funded by DfE."},
  {"name":"Multiverse Group Limited","sector":"Education / Training","employees":1000,"hq":"London","description":"Tech apprenticeship provider delivering digital and data apprenticeships as an alternative to university via DfE funding."},
  {"name":"BABCOCK INTEGRATED TECHNOLOGY LIMITED","sector":"Defence / Engineering","employees":3000,"hq":"Bristol","description":"Defence technology subsidiary providing systems integration and technical support to MoD."},
  {"name":"BABCOCK AEROSPACE LIMITED","sector":"Defence / Aerospace","employees":800,"hq":"Bristol","description":"Aerospace arm of Babcock providing military aircraft maintenance and pilot training to MoD."},
  {"name":"KUWAIT PETROLEUM INTERNATIONAL AVIATION COMPANY (UK) LTD","sector":"Energy / Aviation Fuel","employees":500,"hq":"Kuwait City","description":"Aviation fuel supplier providing jet fuel to MoD military airbases."},
  {"name":"FUJITSU SERVICES LTD","sector":"IT Services","employees":8000,"hq":"London","description":"Provides tax systems, data centre hosting, and digital infrastructure to HMRC."},
  {"name":"DEFENCE TRAINING SERVICES LIMITED","sector":"Defence / Training","employees":150,"hq":"Bordon","description":"Provides military skills instruction and simulation-based training services to MoD."},
  {"name":"INFECTED BLOOD COMPENSATION AUTHORITY (IBCA)","sector":"Public Sector / Compensation","employees":400,"hq":"London","description":"Arms-length body administering compensation payments to victims of the contaminated blood scandal."},
  {"name":"Phoenix Software Ltd","sector":"IT / Software Licensing","employees":350,"hq":"York","description":"Software licensing reseller supplying Microsoft and enterprise software to government departments."},
  {"name":"ANCALA WATER SERVICES (ESTATES) LIMITED","sector":"Utilities / Water","employees":100,"hq":"Edinburgh","description":"Private water utility providing regulated water services to MoD defence estates in Scotland."},
  {"name":"JFD LIMITED","sector":"Defence / Subsea","employees":550,"hq":"Inchinnan","description":"World-leading submarine rescue and diving equipment manufacturer providing underwater life support to the Royal Navy."},
  {"name":"ORGANISATION FOR JOINT ARMAMENTS CO-OPERATION EXECUTIVE","sector":"Defence / International","employees":300,"hq":"Bonn","description":"International organisation managing collaborative European defence procurement including A400M for MoD."},
  {"name":"EIFFAGE KIER FERROVIAL BAM JOINT VENTURE","sector":"Construction / Rail","employees":4000,"hq":"London","description":"Major JV delivering HS2 civil engineering works on the London-Birmingham high-speed rail line."},
  {"name":"SKANSKA COSTAIN STRABAG S1 JOINT","sector":"Construction / Rail","employees":3500,"hq":"London","description":"JV consortium delivering HS2 Section 1 tunnelling and civil engineering on the southern section."},
  {"name":"NOTTINGHAM UNIVERSITY HOSPITALS NHS TRUST","sector":"NHS","employees":18000,"hq":"Nottingham","description":"Major acute teaching hospital trust running Queen's Medical Centre and Nottingham City Hospital."},
  {"name":"MANCHESTER UNIVERSITY NHS FOUNDATION TRUST","sector":"NHS","employees":28000,"hq":"Manchester","description":"One of the largest NHS trusts in England operating 10 hospitals including Manchester Royal Infirmary."},
  {"name":"HEALTH AND SOCIAL CARE BOARD","sector":"Public Health / NI","employees":800,"hq":"Belfast","description":"Northern Ireland health commissioning body managing health and social care service delivery."},
  {"name":"NHS RESOLUTION FORMERLY LITIGATION AUTHORITY","sector":"NHS / Legal","employees":350,"hq":"London","description":"Manages clinical negligence claims against the NHS and provides indemnity cover for NHS bodies."},
  {"name":"NHS BLOOD AND TRANSPLANT (NHSBT)","sector":"NHS","employees":6000,"hq":"Bristol","description":"Special health authority managing the national blood supply and organ transplant matching service."},
];

// Merge all batches
for (const batch of [batch1, batch2, batch3]) {
  for (const s of batch) {
    enrichment[s.name] = s;
  }
}

console.log('Total enrichment entries:', Object.keys(enrichment).length);

// Count by type
const sectors = {};
Object.values(enrichment).forEach(e => {
  const s = e.sector || 'Unknown';
  sectors[s] = (sectors[s] || 0) + 1;
});
Object.entries(sectors).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([s, c]) => console.log(`  ${s}: ${c}`));

fs.writeFileSync(OUT, JSON.stringify(enrichment, null, 2));
console.log('\nWritten to', OUT, '(' + (fs.statSync(OUT).size / 1024).toFixed(0) + 'KB)');
