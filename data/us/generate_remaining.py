#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Generate enrichment data for all remaining U.S. federal account names."""

import json

# Load remaining names
with open('D:/germany-ngo-map/data/us/remaining_names.json', 'r', encoding='utf-8') as f:
    remaining = json.load(f)

# Build enrichment lookup
enrichment = {}

# ──────────────────────────────────────────────────────────────
# Batch 0 items (lines from todo_batch_0.txt)
# ──────────────────────────────────────────────────────────────

enrichment["400 Years of African-American History Commission"] = {
    "created": 2017,
    "description": "Federal commission established by Congress to plan and coordinate activities commemorating the 400th anniversary of the arrival of Africans in the English colonies at Point Comfort, Virginia in 1619.",
    "beneficiaries": "General public, educators, and communities engaged in African-American heritage preservation"
}

enrichment["9-11 Response and Biometric Exit Account, U.S. Customs and Border Protection, Homeland Security"] = {
    "created": 2004,
    "description": "Funds the development and deployment of a biometric entry-exit tracking system at U.S. ports of entry, as mandated by post-9/11 legislation to verify the departure of foreign nationals.",
    "beneficiaries": "U.S. national security agencies and the traveling public"
}

enrichment["APEC Business Travel Card Account, Customs and Border Protection, Homeland Security"] = {
    "created": 2011,
    "description": "Administers the APEC Business Travel Card program for U.S. citizens, providing expedited immigration processing at participating Asia-Pacific Economic Cooperation member economy airports.",
    "beneficiaries": "U.S. business travelers to APEC member economies"
}

enrichment["Abandoned Mine Reclamation Fund, Office of Surface Mining Reclamation and Enforcement"] = {
    "created": 1977,
    "description": "Funded by fees on active coal mining operations, this fund finances the reclamation and restoration of lands and waters degraded by past coal mining activities before the enactment of SMCRA.",
    "beneficiaries": "Communities in coal-producing states affected by legacy mining damage"
}

enrichment["Access Board"] = {
    "created": 1973,
    "description": "Independent federal agency that develops accessibility guidelines and standards under the ADA, Rehabilitation Act, and other laws, and provides technical assistance on removing barriers for people with disabilities.",
    "beneficiaries": "Individuals with disabilities and entities implementing accessibility requirements"
}

enrichment["Acquisition Workforce Training Fund, General Services Administration"] = {
    "created": 2009,
    "description": "Provides training and professional development resources for the federal civilian acquisition workforce to improve procurement competency and contract management across government agencies.",
    "beneficiaries": "Federal acquisition professionals and contracting officers"
}

enrichment["Acquisition of Lands for National Forests, Special Acts, Forest Service, Agriculture"] = {
    "created": 1911,
    "description": "Finances the purchase of private lands within or adjacent to National Forest boundaries under the Weeks Act and other special authorizing legislation to consolidate forest holdings and protect watersheds.",
    "beneficiaries": "National Forest ecosystems and surrounding communities"
}

enrichment["Acquisition of Lands to Complete Land Exchanges, Forest Service, Agriculture"] = {
    "created": 1922,
    "description": "Funds the acquisition of non-federal lands through exchanges to consolidate National Forest System ownership, improve land management efficiency, and resolve inholding issues.",
    "beneficiaries": "National Forest System and adjacent landowners"
}

enrichment["Administration Expenses, Export-Import Bank of the United States"] = {
    "created": 1934,
    "description": "Covers the administrative and operational costs of the Export-Import Bank, the official export credit agency of the United States, which supports American jobs by facilitating the export of U.S. goods and services.",
    "beneficiaries": "U.S. exporters, particularly small businesses"
}

enrichment["Administration of Rights-of-Way and Other Land Uses Fund, Forest Service,  Agriculture"] = {
    "created": 1905,
    "description": "Manages the issuance and administration of permits, easements, and rights-of-way across National Forest System lands for utilities, roads, pipelines, and other authorized land uses.",
    "beneficiaries": "Utility companies, local governments, and communities requiring access across National Forest lands"
}

enrichment["Administrative Conference of the U.S."] = {
    "created": 1964,
    "description": "Independent federal agency that studies the efficiency, adequacy, and fairness of administrative procedures used by federal agencies and recommends improvements to the President, Congress, and agencies.",
    "beneficiaries": "Federal agencies and the public interacting with federal regulatory processes"
}

enrichment["Administrative Expenses, Children's Health Insurance Program, Social Security Administration"] = {
    "created": 1997,
    "description": "Covers SSA's administrative costs for determining eligibility and processing applications related to the Children's Health Insurance Program, which provides health coverage to uninsured children in families with incomes too high for Medicaid.",
    "beneficiaries": "Low-income uninsured children and their families"
}

enrichment["Administrative Expenses, Energy Employees Occupational Illness Compensation Fund, Office of Workers' Compensation Programs, Labor"] = {
    "created": 2000,
    "description": "Covers the administrative costs of processing compensation claims under the Energy Employees Occupational Illness Compensation Program Act for workers sickened by exposure to radiation, beryllium, or silica at DOE nuclear weapons facilities.",
    "beneficiaries": "Current and former DOE nuclear weapons complex workers and their survivors"
}

enrichment["Administrative Expenses, Federal Transit Administration, Transportation"] = {
    "created": 1964,
    "description": "Funds the salaries, travel, and other administrative costs necessary for the Federal Transit Administration to oversee and manage federal public transportation programs and grants.",
    "beneficiaries": "Public transit agencies and riders nationwide"
}

enrichment["Administrative Services Franchise Fund, Federal Aviation Administration, Transportation"] = {
    "created": 1996,
    "description": "A revolving fund that provides shared administrative services (accounting, HR, IT) to FAA organizations on a fee-for-service basis, recovering full operating costs from client activities.",
    "beneficiaries": "FAA operational divisions and offices"
}

enrichment["Administrative Support Offices, Management and Administration, Housing and Urban Development"] = {
    "created": 1965,
    "description": "Provides centralized management and administrative support functions including human resources, procurement, and information technology for the Department of Housing and Urban Development.",
    "beneficiaries": "HUD program offices and staff"
}

enrichment["Administrative and Operating Expenses, Office of Risk Management, Agriculture"] = {
    "created": 1996,
    "description": "Covers the administrative costs of USDA's risk management programs, primarily crop insurance administration through the Risk Management Agency, which helps farmers manage production and revenue risks.",
    "beneficiaries": "American farmers and ranchers purchasing crop insurance"
}

enrichment["Advanced Manufacturing Investment Credit, Internal Revenue Service, Treasury"] = {
    "created": 2022,
    "description": "Administers the 25% investment tax credit under the CHIPS Act for qualified investments in semiconductor manufacturing facilities and equipment placed in service in the United States.",
    "beneficiaries": "Semiconductor manufacturers investing in U.S. fabrication facilities"
}

enrichment["Advanced Research Projects Agency-Energy, Energy Programs, Energy"] = {
    "created": 2009,
    "description": "Funds transformational energy technology research and development projects that are too risky for private industry but have the potential to create entirely new ways to generate, store, and use energy.",
    "beneficiaries": "Researchers, startups, and companies developing breakthrough energy technologies"
}

enrichment["Advanced Technology Vehicles Manufacturing Loan Program, Energy Programs, Energy"] = {
    "created": 2007,
    "description": "Provides direct loans to automobile manufacturers and component suppliers for re-equipping, expanding, or establishing manufacturing facilities in the U.S. to produce advanced technology vehicles and components.",
    "beneficiaries": "U.S. automotive manufacturers and suppliers transitioning to fuel-efficient vehicles"
}

enrichment["Advances from State Cooperating Agencies, Foreign Governments, and Other Federal Agencies, Federal Highway Administration, Transportation"] = {
    "created": 1916,
    "description": "Receives advance payments from state agencies, foreign governments, and other federal entities for highway-related engineering, research, and technical assistance services provided by FHWA.",
    "beneficiaries": "State transportation departments and cooperating agencies"
}

enrichment["Advisory Council on Historic Preservation"] = {
    "created": 1966,
    "description": "Independent federal agency that promotes the preservation, enhancement, and productive use of the nation's historic resources and advises the President and Congress on national historic preservation policy.",
    "beneficiaries": "Historic properties, communities, and the general public"
}

enrichment["Aeronautics, National Aeronautics and Space Administration"] = {
    "created": 1958,
    "description": "Conducts fundamental aeronautics research and develops transformative aviation technologies to improve aircraft safety, efficiency, noise reduction, and environmental performance for both civil and military aviation.",
    "beneficiaries": "The aviation industry, airlines, passengers, and the general public"
}

enrichment["Afghanistan Security Forces Fund, Army"] = {
    "created": 2005,
    "description": "Provided funding to build, equip, train, and sustain the Afghan National Defense and Security Forces (ANDSF) including the Afghan National Army and Afghan National Police, prior to U.S. withdrawal.",
    "beneficiaries": "Afghan National Defense and Security Forces (program ended 2021)"
}

enrichment["African Development Foundation"] = {
    "created": 1980,
    "description": "Independent U.S. government agency that invests directly in community-based African enterprises and organizations, providing seed capital and technical support to promote grassroots economic development in Africa.",
    "beneficiaries": "Small and medium enterprises, cooperatives, and community groups in Sub-Saharan Africa"
}

enrichment["Agency Operations and Award Management, National Science Foundation"] = {
    "created": 1950,
    "description": "Covers NSF's internal operational costs including salaries, IT systems, merit review processes, and management of approximately 50,000 competitive grant proposals annually across all fields of science and engineering.",
    "beneficiaries": "The U.S. scientific research community and NSF staff"
}

enrichment["Aging Infrastructure Account, Bureau of Reclamation, Interior"] = {
    "created": 2019,
    "description": "Funds the repair, rehabilitation, and replacement of aging water infrastructure owned and managed by the Bureau of Reclamation, including dams, canals, and water delivery systems primarily in the western United States.",
    "beneficiaries": "Western U.S. communities and agricultural operations dependent on Reclamation water infrastructure"
}

enrichment["Agricultural Credit Insurance Fund Program Account,  Farm Service Agency, Agriculture"] = {
    "created": 1946,
    "description": "Provides direct and guaranteed farm ownership and operating loans to family-size farmers and ranchers who cannot obtain commercial credit, enabling them to acquire land, equipment, and operating capital.",
    "beneficiaries": "Beginning, socially disadvantaged, and family-size farmers and ranchers"
}

enrichment["Agricultural Credit Insurance Fund, Liquidating Account, Consolidated Farm Service Agency, Agriculture"] = {
    "created": 1946,
    "description": "Manages the portfolio of outstanding farm loans made prior to credit reform, handling collections, writeoffs, and liquidation of legacy agricultural credit obligations.",
    "beneficiaries": "Farm borrowers with pre-credit-reform loans"
}

enrichment["Agricultural Disaster Relief Trust Fund, Farm Service Agency, Agriculture"] = {
    "created": 2008,
    "description": "Provides supplemental disaster assistance to farmers and ranchers suffering losses from droughts, floods, and other natural disasters through programs including SURE, livestock indemnity, and tree assistance.",
    "beneficiaries": "Farmers and ranchers affected by natural disasters"
}

enrichment["Agricultural Quarantine Inspection User Fee Account, Animal and Plant Health Inspection Service, Agriculture"] = {
    "created": 1990,
    "description": "Funded by user fees collected from international passengers, cargo, and conveyances, this account finances agricultural quarantine inspections at U.S. ports of entry to prevent the introduction of foreign pests and diseases.",
    "beneficiaries": "U.S. agriculture, forestry, and the general public"
}

enrichment["Agriculture Buildings and Facilities, Agriculture"] = {
    "created": 1862,
    "description": "Funds the construction, improvement, repair, and maintenance of buildings and facilities used by USDA headquarters and field offices for carrying out departmental missions.",
    "beneficiaries": "USDA employees and programs"
}

enrichment["Agriculture Wool Apparel Manufacturers Trust Fund, Farm Service Agency, Agriculture"] = {
    "created": 2002,
    "description": "Provides payments to domestic manufacturers of worsted wool fabric and wool yarn to offset the adverse effects of duties on imported raw wool, helping maintain the competitiveness of the U.S. wool textile industry.",
    "beneficiaries": "U.S. domestic wool apparel and fabric manufacturers"
}

enrichment["Air Carrier Worker Support, Departmental Offices, Department of Treasury"] = {
    "created": 2020,
    "description": "Provided payroll support grants to passenger air carriers, cargo air carriers, and airline contractors under the CARES Act and subsequent legislation to maintain employment and pay during the COVID-19 pandemic.",
    "beneficiaries": "Airline industry workers and their employers (pandemic-era program)"
}

enrichment["Air and Marine Operations, U.S. Customs and Border Protection, Homeland Security"] = {
    "created": 2004,
    "description": "Funds CBP's Air and Marine Operations division, which conducts aerial and maritime surveillance, interdiction, and law enforcement operations to secure U.S. borders and coastal approaches.",
    "beneficiaries": "U.S. border and coastal security; the general public"
}

enrichment["Airport Checkpoint Screening Fund, Transportation Security Administration, Homeland Security"] = {
    "created": 2001,
    "description": "Funded by the September 11th Security Fee charged on airline tickets, this account supports passenger and baggage screening operations at airport security checkpoints nationwide.",
    "beneficiaries": "Air travelers and the commercial aviation sector"
}

enrichment["Airport Terminal Program, Federal Aviation Administration, Transportation"] = {
    "created": 2021,
    "description": "Provides competitive grants to airports for terminal development projects that address aging infrastructure, improve energy efficiency, increase accessibility, and enhance the passenger experience.",
    "beneficiaries": "Commercial and general aviation airports and their users"
}

enrichment["Airport and Airway Trust Fund - Treasury Managed, Transportation"] = {
    "created": 1970,
    "description": "Treasury-managed trust fund financed by aviation excise taxes on airline tickets, cargo, fuel, and international travel that provides dedicated funding for FAA operations, airport improvement, and air traffic modernization.",
    "beneficiaries": "The national aviation system, airlines, airports, and air travelers"
}

enrichment["Alaska Resupply Program, Bureau of Indian Affairs"] = {
    "created": 1976,
    "description": "Provides critical fuel and supply delivery services to remote Alaska Native villages that are inaccessible by road, utilizing barges and other watercraft during the short navigable season.",
    "beneficiaries": "Remote Alaska Native communities"
}

enrichment["All Stations Accessibility Program, Federal Transit Administration, Transportation"] = {
    "created": 2021,
    "description": "Provides capital grants under the Bipartisan Infrastructure Law to legacy rail transit systems for upgrading stations to comply with ADA accessibility requirements, including elevators, ramps, and tactile signage.",
    "beneficiaries": "Transit riders with disabilities and elderly passengers"
}

enrichment["Allowances and Office Staff for Former Presidents, General Services Administration"] = {
    "created": 1958,
    "description": "Funds pensions, office space, staff compensation, travel, and other allowances for former Presidents of the United States under the Former Presidents Act.",
    "beneficiaries": "Former U.S. Presidents"
}

enrichment["American Battle Monuments Commission"] = {
    "created": 1923,
    "description": "Designs, constructs, operates, and maintains 26 permanent American military cemeteries and 32 federal memorial monuments and markers on foreign soil honoring U.S. armed forces service members.",
    "beneficiaries": "Families of fallen service members and the general public"
}

enrichment["American Printing House for the Blind, Special Institutions for Persons with Disabilities, Education"] = {
    "created": 1858,
    "description": "Provides educational materials in accessible formats (braille, large print, audio, digital) to students who are blind or visually impaired enrolled in educational programs below the college level, with federal funding supplementing its production capabilities.",
    "beneficiaries": "Students who are blind or visually impaired"
}

enrichment["American Sections, International Commissions, State"] = {
    "created": 1895,
    "description": "Funds the U.S. sections of international commissions, including the International Boundary and Water Commission (U.S.-Mexico) and International Joint Commission (U.S.-Canada), which manage shared water resources and boundary issues.",
    "beneficiaries": "U.S. border communities and shared water resource stakeholders"
}

enrichment["Appalachian Regional Commission"] = {
    "created": 1965,
    "description": "Federal-state partnership that invests in economic development projects across the 423 counties of the Appalachian region spanning 13 states, focusing on infrastructure, workforce training, and business development.",
    "beneficiaries": "Approximately 26 million residents of the Appalachian region"
}

enrichment["Appalachian Regional Development Programs, Appalachian Regional Commission"] = {
    "created": 1965,
    "description": "Provides grants for highway construction, area development, and community infrastructure projects in the Appalachian region to address economic distress and improve quality of life.",
    "beneficiaries": "Distressed and at-risk communities in the 13-state Appalachian region"
}

enrichment["Armed Forces Retirement Home"] = {
    "created": 1851,
    "description": "Provides affordable residential care and related services to eligible retired and former members of the U.S. Armed Forces at its facilities in Washington, D.C., and Gulfport, Mississippi.",
    "beneficiaries": "Eligible military retirees and veterans"
}

enrichment["Armed Forces Retirement Home Trust Fund, Armed Forces Retirement Home"] = {
    "created": 1991,
    "description": "Trust fund that finances operations and capital improvements of the Armed Forces Retirement Home, funded by monthly deductions from active-duty military pay and fines collected from military courts-martial.",
    "beneficiaries": "Residents of the Armed Forces Retirement Home"
}

enrichment["Assessment Funds, Office of the Comptroller of the Currency, Treasury"] = {
    "created": 1863,
    "description": "Collects assessments from national banks and federal savings associations to fund the OCC's supervision, regulation, and chartering activities; the OCC receives no congressional appropriations.",
    "beneficiaries": "National banks, federal savings associations, and the banking public"
}

enrichment["Asset Proceeds and Space Management Fund, General Services Administration"] = {
    "created": 2004,
    "description": "A revolving fund that receives proceeds from the disposal of surplus federal real property and uses them to fund space management, property disposal activities, and reinvestment in federal buildings.",
    "beneficiaries": "Federal agencies occupying GSA-managed facilities"
}

enrichment["Assets Forfeiture Fund, Justice"] = {
    "created": 1984,
    "description": "Receives proceeds from the forfeiture of assets seized by DOJ law enforcement agencies in connection with federal crimes, and distributes funds for law enforcement purposes, victim restitution, and equitable sharing with state and local agencies.",
    "beneficiaries": "Federal, state, and local law enforcement agencies and crime victims"
}

enrichment["Assistance for Europe, Eurasia, and Central Asia, Funds Appropriated to the President, US Agency for International Development"] = {
    "created": 1992,
    "description": "Provides economic and democratic development assistance to countries in Europe, Eurasia, and Central Asia, supporting market reforms, democratic governance, rule of law, and civil society in post-Soviet and post-conflict states.",
    "beneficiaries": "Countries and populations in Europe, Eurasia, and Central Asia"
}

enrichment["Assistance for Farmers and Ranchers Account, Farm Service Agency, Agriculture"] = {
    "created": 2020,
    "description": "Provides direct payments and assistance to farmers and ranchers experiencing economic losses, particularly emergency support during market disruptions and natural disasters.",
    "beneficiaries": "U.S. farmers and ranchers"
}

enrichment["Assistance for the Independent States of the Former Soviet Union, Funds Appropriated to the President, United States Agency for International Development"] = {
    "created": 1992,
    "description": "Funded development assistance under the FREEDOM Support Act to newly independent states of the former Soviet Union, supporting democratic transitions, market economies, and civil society development.",
    "beneficiaries": "Populations of former Soviet states (program largely wound down)"
}

enrichment["Assistance to Shipyards, Maritime Administration, Transportation"] = {
    "created": 1936,
    "description": "Provides financial assistance and technical support to U.S. shipyards to maintain and modernize the domestic shipbuilding and repair industrial base essential for both commercial maritime and national defense needs.",
    "beneficiaries": "U.S. shipbuilding and ship repair facilities and their workers"
}

enrichment["Assistance to Territories, Insular Affairs, Interior"] = {
    "created": 1950,
    "description": "Provides technical and financial assistance to U.S. territories and freely associated states (American Samoa, Guam, USVI, CNMI, Marshall Islands, Micronesia, Palau) for governance, infrastructure, and economic development.",
    "beneficiaries": "Residents of U.S. territories and freely associated states"
}

enrichment["Assisted Housing Inspections and Risk Assessments, Public and Indian Housing, Housing & Urban Development"] = {
    "created": 1998,
    "description": "Funds physical inspections and financial risk assessments of HUD-assisted multifamily and public housing properties to ensure compliance with housing quality standards and identify at-risk properties.",
    "beneficiaries": "Residents of HUD-assisted housing"
}

enrichment["Aviation Insurance Revolving Fund, Transportation"] = {
    "created": 1951,
    "description": "Provides war-risk and other aviation insurance to U.S. air carriers when commercial insurance is not available on reasonable terms, protecting airlines operating in high-risk areas or during national emergencies.",
    "beneficiaries": "U.S. air carriers and the traveling public"
}

enrichment["Aviation Security Capital Fund, Transportation Security Administration, Homeland Security"] = {
    "created": 2001,
    "description": "Finances the procurement, installation, and maintenance of explosives detection systems, checkpoint screening equipment, and other security infrastructure at the nation's commercial airports.",
    "beneficiaries": "Air travelers and airport operators"
}

enrichment["Aviation User Fees, Federal Aviation Administration, Transportation"] = {
    "created": 1990,
    "description": "Collects fees from aircraft operators for FAA-provided air traffic control and related services, particularly from foreign and certain domestic operators not otherwise covered by aviation excise taxes.",
    "beneficiaries": "The national airspace system and aviation safety"
}

enrichment["Barry Goldwater Scholarship and Excellence In Education Foundation"] = {
    "created": 1986,
    "description": "Awards merit-based scholarships to outstanding undergraduate sophomores and juniors pursuing careers in natural sciences, engineering, and mathematics, providing up to $7,500 per year for educational expenses.",
    "beneficiaries": "Approximately 400-500 undergraduate STEM students annually"
}

enrichment["Biomass Research and Development, National Institute of Food and Agriculture, Agriculture"] = {
    "created": 2000,
    "description": "Funds research, development, and demonstration projects focused on converting biomass (agricultural residues, energy crops, wood waste) into biofuels, bioenergy, and biobased products.",
    "beneficiaries": "Researchers, farmers, and the bioenergy industry"
}

enrichment["Biorefinery Assistance Program Account, Rural Business - Cooperative Service, Agriculture"] = {
    "created": 2008,
    "description": "Provides loan guarantees to assist in the development, construction, and retrofitting of commercial-scale biorefineries that produce advanced biofuels from renewable biomass.",
    "beneficiaries": "Biorefinery developers and rural communities"
}

enrichment["Birth Defects, Developmental Disabilities, Disabilities and Health, Centers for Disease Control and Prevention, Health and Human Services"] = {
    "created": 1990,
    "description": "Supports surveillance, research, and prevention programs related to birth defects, developmental disabilities, and disability and health, including tracking systems and public health interventions to reduce preventable conditions.",
    "beneficiaries": "Children with birth defects and developmental disabilities, and people with disabilities"
}

enrichment["Black Lung Disability Trust Fund - Treasury Managed, Labor"] = {
    "created": 1978,
    "description": "Provides disability compensation and medical benefits to coal miners totally disabled by pneumoconiosis (black lung disease) and their surviving dependents, when no responsible coal mine operator can be identified.",
    "beneficiaries": "Disabled coal miners and their survivors"
}

enrichment["Blackfeet Water Settlement Implementation Fund, Bureau of Reclamation, Interior"] = {
    "created": 2016,
    "description": "Implements the Blackfeet Water Rights Settlement Act by funding water infrastructure construction, rehabilitation, and improvement projects on the Blackfeet Indian Reservation in Montana.",
    "beneficiaries": "Members of the Blackfeet Nation"
}

enrichment["Board of Veterans Appeals, Departmental Administration, Veterans Affairs"] = {
    "created": 1933,
    "description": "Adjudicates appeals of VA benefits decisions by veterans and their representatives, providing de novo review by Veterans Law Judges of denied or disputed claims for disability compensation, pension, and other benefits.",
    "beneficiaries": "Veterans appealing VA benefits decisions"
}

enrichment["Boat Safety, USCG, Homeland Security"] = {
    "created": 1971,
    "description": "Administers the Federal Boat Safety Act programs, including setting safety standards for recreational boats, coordinating boating safety education, and distributing grants to states for boating safety programs.",
    "beneficiaries": "Recreational boaters and state boating safety agencies"
}

enrichment["Border Security Fencing, Infrastructure, and Technology, U.S. Customs and Border Protection, Homeland Security"] = {
    "created": 2007,
    "description": "Funds the planning, design, construction, and maintenance of physical barriers, roads, lighting, surveillance technology, and supporting infrastructure along U.S. borders to prevent illegal crossings.",
    "beneficiaries": "U.S. border security and border communities"
}

enrichment["Breach Bond/Detention Fund, Border and Transportation Security, Homeland Security"] = {
    "created": 2003,
    "description": "Collects and manages breached immigration bond proceeds and funds related to the detention and processing of aliens who fail to comply with conditions of their immigration bonds.",
    "beneficiaries": "U.S. immigration enforcement operations"
}

enrichment["Broadband Connectivity Fund, National Telecommunications and Information Administration, Commerce"] = {
    "created": 2021,
    "description": "Provides grants under the Infrastructure Investment and Jobs Act to expand broadband internet access and adoption in unserved and underserved communities across the United States.",
    "beneficiaries": "Unserved and underserved communities lacking broadband internet access"
}

enrichment["Broadcasting Capital Improvements, Broadcasting Board of Governors"] = {
    "created": 1994,
    "description": "Funds capital improvements, maintenance, and modernization of transmission facilities and broadcasting infrastructure used by U.S. international broadcasting entities to deliver news and information worldwide.",
    "beneficiaries": "International audiences receiving U.S. government-funded broadcasts"
}

enrichment["Building Maintenance Fund, Defense"] = {
    "created": 1947,
    "description": "Finances the maintenance, repair, and upkeep of DoD-owned buildings and facilities to preserve infrastructure, ensure operational readiness, and maintain safe working environments at military installations.",
    "beneficiaries": "Military personnel and DoD civilian employees at defense installations"
}

enrichment["Buildings and Facilities, Agricultural Research Service, Agriculture"] = {
    "created": 1953,
    "description": "Funds the construction, repair, and improvement of laboratories and facilities used by the Agricultural Research Service for conducting agricultural and food science research nationwide.",
    "beneficiaries": "Agricultural researchers and the U.S. food and agriculture sector"
}

enrichment["Buildings and Facilities, Animal and Plant Health Inspection Service, Agriculture"] = {
    "created": 1972,
    "description": "Finances the construction, renovation, and maintenance of laboratory and office facilities used by APHIS for animal and plant health inspections, disease diagnostics, and pest management programs.",
    "beneficiaries": "U.S. agriculture and the public health system"
}

enrichment["Buildings and Facilities, Centers for Disease Control and Prevention, Health and Human Services"] = {
    "created": 1946,
    "description": "Funds the construction, renovation, and maintenance of CDC laboratory, research, and administrative facilities needed for disease surveillance, outbreak investigation, and public health emergency response.",
    "beneficiaries": "CDC scientists and the general public"
}

enrichment["Buildings and Facilities, Environmental Protection Agency"] = {
    "created": 1970,
    "description": "Funds the construction, repair, improvement, and maintenance of EPA-owned research laboratories, monitoring stations, and other facilities essential for environmental protection and research activities.",
    "beneficiaries": "EPA research programs and the general public"
}

enrichment["Buildings and Facilities, Federal Prison System, Justice"] = {
    "created": 1930,
    "description": "Finances the construction of new federal correctional institutions, and the modernization, maintenance, and repair of existing Bureau of Prisons facilities across the federal prison system.",
    "beneficiaries": "Federal inmates and Bureau of Prisons staff"
}

enrichment["Buildings and Facilities, Food and Drug Administration, Health and Human Services"] = {
    "created": 1930,
    "description": "Funds the construction, renovation, and maintenance of FDA laboratories and office facilities essential for food safety inspections, drug evaluations, and medical device reviews.",
    "beneficiaries": "FDA workforce and the public relying on FDA regulatory oversight"
}

enrichment["Buildings and Facilities, National Institutes of Health, Health and Human Services"] = {
    "created": 1938,
    "description": "Finances construction, major renovation, and improvement of the biomedical research laboratories and clinical facilities on the NIH campus in Bethesda, Maryland, and at other NIH locations.",
    "beneficiaries": "NIH researchers and patients participating in clinical trials"
}

enrichment["Bureau of Consumer Financial Protection Fund, Bureau of Consumer Financial Protection"] = {
    "created": 2010,
    "description": "The primary funding mechanism for the Consumer Financial Protection Bureau (CFPB), receiving transfers from the Federal Reserve System's combined earnings to support consumer financial protection regulation and enforcement.",
    "beneficiaries": "Consumers of financial products and services"
}

enrichment["Bureau of Reclamation Loans Program Account, Bureau of Reclamation, Interior"] = {
    "created": 1956,
    "description": "Provides loans for water-related infrastructure projects in the western United States, including small reclamation projects and drought contingency planning, to improve water supply reliability and drought resilience.",
    "beneficiaries": "Western U.S. water districts, municipalities, and irrigation entities"
}

enrichment["Business Assistance Trust Fund, Small Business Administration"] = {
    "created": 1994,
    "description": "Holds contributions from federal agencies and non-federal sources to fund the SBA's business development, technical assistance, and entrepreneurial support programs for small businesses.",
    "beneficiaries": "Small business owners and entrepreneurs"
}

enrichment["Business Loan and Investment Fund, Liquidating Account, Small Business Administration"] = {
    "created": 1958,
    "description": "Manages the portfolio of legacy SBA business loans and Small Business Investment Company (SBIC) investments made prior to credit reform, handling collections and loan liquidation activities.",
    "beneficiaries": "Small businesses with pre-credit-reform SBA loans"
}

enrichment["Business Loans Program Account - Recovery Act, Small Business Administration"] = {
    "created": 2009,
    "description": "Provided enhanced SBA loan programs under the American Recovery and Reinvestment Act, including increased guarantee percentages and reduced fees to expand small business lending during the financial crisis.",
    "beneficiaries": "Small businesses affected by the 2008-2009 financial crisis"
}

enrichment["Business Loans Program Account, Small Business Administration"] = {
    "created": 1958,
    "description": "Administers the SBA's flagship 7(a) loan guarantee program and 504 Certified Development Company program, providing access to capital for small businesses that cannot obtain conventional financing.",
    "beneficiaries": "Small businesses and small business lenders"
}

enrichment["Business Systems Modernization, Internal Revenue Service, Treasury"] = {
    "created": 1999,
    "description": "Funds the modernization of IRS core tax processing and information technology systems, replacing legacy mainframe systems with modern platforms to improve taxpayer services and enforcement capabilities.",
    "beneficiaries": "U.S. taxpayers and IRS operations"
}

enrichment["Burden Sharing Contribution, Defense"] = {
    "created": 1990,
    "description": "Receives contributions from allied nations that share the costs of stationing U.S. military forces abroad, including host nation support for base operations, utilities, and labor costs at overseas installations.",
    "beneficiaries": "U.S. military forces stationed overseas"
}

enrichment["CDC Working Capital Fund, Centers for Disease Control and Prevention, Health and Human Services"] = {
    "created": 1995,
    "description": "A revolving fund that provides shared administrative and technical services (IT, procurement, facilities) to CDC programs on a fee-for-service basis, centralizing support functions for cost efficiency.",
    "beneficiaries": "CDC programs and offices"
}

enrichment["Cable Security Fleet, Maritime Administration, Transportation"] = {
    "created": 2020,
    "description": "Provides stipends to operators of commercially viable, militarily useful cable-laying and cable-repair vessels to ensure their availability to the Department of Defense during national emergencies.",
    "beneficiaries": "National defense and submarine cable infrastructure"
}

enrichment["California Bay-Delta Restoration, Bureau of Reclamation, Interior"] = {
    "created": 2004,
    "description": "Funds ecosystem restoration, water supply reliability, water quality improvement, and levee stability projects in the Sacramento-San Joaquin River Delta, California's critical water supply hub.",
    "beneficiaries": "California communities, agriculture, and ecosystems dependent on Bay-Delta water resources"
}

enrichment["Canteen Service Revolving Fund, Veterans Affairs"] = {
    "created": 1946,
    "description": "Operates retail stores, food services, and vending operations at VA medical centers and other VA facilities through the Veterans Canteen Service, reinvesting proceeds to benefit veterans.",
    "beneficiaries": "Veterans, VA patients, and VA facility staff"
}

enrichment["Capital Improvement and Maintenance, Forest Service, Agriculture"] = {
    "created": 1905,
    "description": "Funds deferred maintenance, capital improvements, and infrastructure upgrades on National Forest System roads, bridges, trails, recreation facilities, and administrative buildings.",
    "beneficiaries": "National Forest visitors and Forest Service operations"
}

enrichment["Capital Investment Fund of the United States Agency for International Development, Funds Appropriated to the President"] = {
    "created": 1998,
    "description": "Finances USAID's information technology modernization, telecommunications upgrades, and capital equipment acquisitions needed to support global development and humanitarian assistance operations.",
    "beneficiaries": "USAID operations and overseas development programs"
}

enrichment["Capital Investment Fund, State"] = {
    "created": 1994,
    "description": "Funds the Department of State's information technology, cybersecurity, and infrastructure modernization projects, including consular systems, diplomatic communications, and embassy security upgrades.",
    "beneficiaries": "Department of State operations and U.S. diplomatic missions worldwide"
}

enrichment["Capital Magnet Fund, Community Development Financial Institutions, Departmental Offices, Treasury"] = {
    "created": 2008,
    "description": "Competitively awards grants to CDFIs and nonprofit housing organizations to finance affordable housing and related economic development activities in underserved communities.",
    "beneficiaries": "Low-income families and underserved communities needing affordable housing"
}

enrichment["Carbon Dioxide Transportation Infrastructure Finance and Innovation Program Account, Energy Programs, Energy"] = {
    "created": 2021,
    "description": "Provides loans and loan guarantees for the construction of carbon dioxide transportation infrastructure, including pipelines and associated facilities, to support carbon capture and sequestration projects.",
    "beneficiaries": "Carbon capture and sequestration project developers and communities"
}

enrichment["Carson City Special Account, Bureau of Land Management, Interior"] = {
    "created": 2002,
    "description": "Receives proceeds from the sale of certain BLM-managed public lands in the Carson City, Nevada area and uses them to fund acquisition of environmentally sensitive land, parks, trails, and natural resource conservation.",
    "beneficiaries": "Carson City area communities and natural resource conservation"
}

enrichment["Census Working Capital Fund, Bureau of the Census, Commerce"] = {
    "created": 1950,
    "description": "A revolving fund that provides reimbursable survey and statistical services to other federal agencies, state and local governments, and international organizations using Census Bureau expertise and infrastructure.",
    "beneficiaries": "Federal agencies and other clients needing statistical survey services"
}

enrichment["Centennial Challenge, National Park Service, Interior"] = {
    "created": 2016,
    "description": "A matching-fund program that leverages private philanthropic donations with federal funds to support projects that enhance visitor experiences, protect resources, and modernize infrastructure in National Parks.",
    "beneficiaries": "National Park visitors and park resources"
}

enrichment["Center for Middle Eastern-Western Dialogue Trust Fund, State"] = {
    "created": 1994,
    "description": "Supports programs promoting mutual understanding and dialogue between the peoples of the Middle East and the West through cultural, educational, and professional exchange activities.",
    "beneficiaries": "Participants in Middle East-Western dialogue and exchange programs"
}

enrichment["Centers for Medicare and Medicaid Innovation, Centers for Medicare and Medicaid, Health and Human Services"] = {
    "created": 2010,
    "description": "Tests innovative payment and service delivery models to reduce costs while preserving or enhancing quality of care for Medicare, Medicaid, and CHIP beneficiaries, with authority to scale successful models nationwide.",
    "beneficiaries": "Medicare, Medicaid, and CHIP beneficiaries"
}

enrichment["Central Hazardous Materials Fund, Department-Wide Programs, Interior"] = {
    "created": 1998,
    "description": "Provides funding for the assessment, cleanup, and remediation of hazardous waste contamination on lands managed by the Department of the Interior, including former mine sites and abandoned facilities.",
    "beneficiaries": "Communities near contaminated Interior-managed lands and environmental resources"
}

enrichment["Central Utah Project Completion Account, Central Utah Project, Interior"] = {
    "created": 1992,
    "description": "Funds the completion of the Central Utah Project, a large-scale water development project that diverts water from the Uinta Basin to the Wasatch Front to serve municipal, industrial, and agricultural needs in central Utah.",
    "beneficiaries": "Central Utah water users and communities"
}

enrichment["Central Valley Project Restoration Fund, Bureau of Reclamation"] = {
    "created": 1992,
    "description": "Funded by surcharges on Central Valley Project water and power users, this account supports fish and wildlife habitat restoration, improvement, and management activities to mitigate the environmental impacts of CVP operations.",
    "beneficiaries": "Fish and wildlife species and ecosystems affected by the Central Valley Project"
}

enrichment["Cheyenne River Sioux Tribe Terrestrial Wildlife Habitat Restoration Trust Fund, Bureau of the Fiscal Service, Treasury"] = {
    "created": 1999,
    "description": "Trust fund established to compensate the Cheyenne River Sioux Tribe for wildlife habitat lost due to the construction of dams on the Missouri River, funding terrestrial habitat restoration on tribal lands.",
    "beneficiaries": "Cheyenne River Sioux Tribe members and tribal wildlife habitats"
}

enrichment["Child Care Entitlement to States, Administration for Children and Families, Health and Human Services"] = {
    "created": 1996,
    "description": "Provides mandatory funding to states as part of the Child Care and Development Fund to subsidize child care for low-income families transitioning from welfare to work under TANF requirements.",
    "beneficiaries": "Low-income families with children needing child care, particularly TANF recipients"
}

enrichment["Child Enrollment Contingency Fund, Centers for Medicare and Medicaid Services, Health and Human Services"] = {
    "created": 2009,
    "description": "Provides additional CHIP funding to states experiencing shortfalls in their Children's Health Insurance Program allotments to prevent disruptions in children's health coverage.",
    "beneficiaries": "Children enrolled in CHIP in states with funding shortfalls"
}

enrichment["Child Survival and Health Programs Fund, United States Agency for International Development"] = {
    "created": 1995,
    "description": "Funds USAID programs focused on reducing child mortality and improving maternal and child health in developing countries through immunization, nutrition, disease prevention, and health system strengthening.",
    "beneficiaries": "Children and mothers in developing countries"
}

enrichment["Child and Dependent Care Tax Credit, Internal Revenue Service, Department of the Treasury"] = {
    "created": 1976,
    "description": "Administers the tax credit that allows working parents and guardians to claim a percentage of child and dependent care expenses necessary to enable them to work or look for work.",
    "beneficiaries": "Working families paying for child or dependent care"
}

enrichment["Children's Research and Technical Assistance, Administration for Children and Families, Health and Human Services"] = {
    "created": 1995,
    "description": "Supports research, evaluation, and technical assistance activities related to child welfare, child care, Head Start, and other ACF programs to improve outcomes for children and families.",
    "beneficiaries": "Children and families served by ACF programs"
}

enrichment["Choice Neighborhoods Initiative, Public and Indian Housing Programs, Housing and Urban Development"] = {
    "created": 2010,
    "description": "Provides competitive grants to transform distressed public and HUD-assisted housing developments and surrounding neighborhoods through comprehensive revitalization including housing, education, and economic development.",
    "beneficiaries": "Residents of distressed public housing neighborhoods"
}

enrichment["Chronic Disease Prevention and Health Promotion, Centers for Disease Control and Prevention, Health and Human Services"] = {
    "created": 1988,
    "description": "Supports national programs to prevent and control chronic diseases including heart disease, cancer, stroke, diabetes, and obesity through surveillance, research, and community-based prevention programs.",
    "beneficiaries": "The general public, particularly populations at risk for chronic diseases"
}

enrichment["Civilian Board of Contract Appeals, General Services Administration"] = {
    "created": 2007,
    "description": "Adjudicates contract disputes between government contractors and all executive branch agencies (except DoD, NASA, USPS, and TVA), resolving claims arising under federal procurement contracts.",
    "beneficiaries": "Government contractors and federal contracting agencies"
}

enrichment["Claims and Treaty Obligations, Bureau of Indian Affairs (Indefinite)"] = {
    "created": 1832,
    "description": "Funds federal obligations to federally recognized Indian tribes arising from treaties, agreements, and judicial settlements, including land claims, water rights, and other treaty-guaranteed entitlements.",
    "beneficiaries": "Federally recognized Indian tribes with treaty-based claims"
}

enrichment["Claims for Contract Disputes (Indefinite), Bureau of the Fiscal Service, Treasury"] = {
    "created": 1978,
    "description": "A permanent indefinite appropriation that pays judgments and settlements arising from contract disputes under the Contract Disputes Act when amounts exceed agency funding or are not otherwise available.",
    "beneficiaries": "Government contractors with adjudicated contract dispute claims"
}

enrichment["Claims for Damages (Indefinite), Bureau of the Fiscal Service, Treasury"] = {
    "created": 1956,
    "description": "A permanent indefinite appropriation that pays tort claims, property damage settlements, and other damage claims against the United States government when agency funds are insufficient.",
    "beneficiaries": "Individuals and entities with valid damage claims against the federal government"
}

enrichment["Coastal Impact Assistance, Fish and Wildlife Service, Interior"] = {
    "created": 2006,
    "description": "Distributed federal Outer Continental Shelf oil and gas revenue to eligible coastal states and their political subdivisions for conservation, protection, and restoration of coastal areas impacted by OCS energy activities.",
    "beneficiaries": "Coastal states and communities affected by offshore energy development"
}

enrichment["Coastal Wetlands Restoration Trust Fund, Corps of Engineers - Civil"] = {
    "created": 1990,
    "description": "Funded from Sport Fish Restoration Account transfers, this trust fund finances coastal wetlands conservation, restoration, and creation projects primarily in Louisiana, which experiences over 80% of the nation's coastal wetland loss.",
    "beneficiaries": "Coastal communities and ecosystems, particularly in Louisiana"
}

enrichment["College Housing Loans, Education"] = {
    "created": 1950,
    "description": "A legacy program that provided low-interest federal loans to institutions of higher education for the construction and renovation of student housing and dining facilities (no new loans issued).",
    "beneficiaries": "Colleges and universities with outstanding loan balances"
}

enrichment["College Housing and Academic Facilities Loans Program,  Education"] = {
    "created": 1963,
    "description": "A legacy program that provided federal loans for the construction of academic facilities at colleges and universities; the program no longer makes new loans but manages existing portfolio obligations.",
    "beneficiaries": "Higher education institutions with outstanding legacy loans"
}

enrichment["Colorado River Basins Power Marketing Fund, Western Area Power Administration, Power Marketing Administration, Energy"] = {
    "created": 1956,
    "description": "Markets and transmits hydroelectric power generated from federal dams in the Colorado River Basin (including Hoover, Glen Canyon, and Parker-Davis dams), with revenues used to repay federal investment and fund operations.",
    "beneficiaries": "Electric utilities and consumers in the western United States"
}

enrichment["Colorado River Dam Fund, Boulder Canyon Project, Bureau of Reclamation"] = {
    "created": 1928,
    "description": "Manages revenues and expenditures associated with Hoover Dam and related Boulder Canyon Project facilities, including power generation, water delivery, and flood control on the lower Colorado River.",
    "beneficiaries": "Water and power users in Nevada, Arizona, and Southern California"
}

enrichment["Commissary Funds, Federal Prisons, Justice"] = {
    "created": 1930,
    "description": "Operates commissary stores within federal prisons, allowing inmates to purchase approved food, hygiene items, and other goods; profits fund inmate welfare and recreational programs.",
    "beneficiaries": "Federal prison inmates"
}

enrichment["Commissary Stores Surcharge Program, Defense"] = {
    "created": 1952,
    "description": "Collects a 5% surcharge on commissary sales to fund the construction, renovation, and maintenance of military commissary store facilities worldwide, which sell groceries to military families at cost.",
    "beneficiaries": "Active-duty military, retirees, and their families shopping at military commissaries"
}

enrichment["Commission for the Preservation of America's Heritage Abroad"] = {
    "created": 1985,
    "description": "Identifies and reports on the condition of cemeteries, monuments, and historic sites in Eastern and Central Europe associated with the American heritage, particularly those related to Holocaust victims and other cultural patrimony.",
    "beneficiaries": "American diaspora communities and heritage site preservation efforts in Eastern/Central Europe"
}

enrichment["Commission of Fine Arts"] = {
    "created": 1910,
    "description": "Reviews and advises on the design and aesthetics of architecture, monuments, memorials, statues, coins, medals, and other works of art proposed for federal properties, particularly in Washington, D.C.",
    "beneficiaries": "The national capital and the general public"
}

enrichment["Commission on Civil Rights"] = {
    "created": 1957,
    "description": "Independent, bipartisan federal agency that investigates complaints of discrimination, studies civil rights issues, and reports findings and recommendations to the President and Congress on enforcement of federal civil rights laws.",
    "beneficiaries": "The general public, particularly individuals affected by civil rights violations"
}

enrichment["Committee for Purchase from People Who Are Blind or Severely Disabled"] = {
    "created": 1971,
    "description": "Administers the AbilityOne Program, which directs federal agencies to purchase specified supplies and services from nonprofit organizations employing people who are blind or severely disabled.",
    "beneficiaries": "Approximately 40,000 employees who are blind or severely disabled"
}

enrichment["Committee on Foreign Investment in the United States Fund, Departmental Offices, Treasury"] = {
    "created": 2018,
    "description": "Funds CFIUS operations to review foreign acquisitions, investments, and real estate transactions for national security risks under the Foreign Investment Risk Review Modernization Act (FIRRMA), supported by filing fees.",
    "beneficiaries": "U.S. national security and the business community"
}

enrichment["Commodity Assistance Program, Food and Nutrition Service, Agriculture"] = {
    "created": 1935,
    "description": "Provides USDA-purchased commodity foods to schools, food banks, and other institutions through programs including The Emergency Food Assistance Program (TEFAP), Commodity Supplemental Food Program, and others.",
    "beneficiaries": "Low-income individuals, elderly persons, and school children"
}

enrichment["Commodity Credit Corporation Direct Loans, Liquidating Account, Agriculture"] = {
    "created": 1933,
    "description": "Manages the legacy portfolio of Commodity Credit Corporation direct loans made to support agricultural commodity prices and farm incomes prior to credit reform.",
    "beneficiaries": "Farmers and agricultural producers with outstanding CCC loans"
}

enrichment["Commodity Credit Corporation Export Loans Program Account, Foreign Agricultural Service, Agriculture"] = {
    "created": 1980,
    "description": "Provides export credit guarantees through CCC programs (GSM-102) to facilitate the sale of U.S. agricultural commodities to foreign buyers, reducing financial risk for U.S. exporters and their banks.",
    "beneficiaries": "U.S. agricultural exporters and foreign buyers of U.S. farm products"
}

enrichment["Commodity Futures Trading Commission Customer Protection Fund, Commodity Futures Trading Commission"] = {
    "created": 2010,
    "description": "Funded by monetary sanctions and penalties collected in CFTC enforcement actions, this fund finances a customer education program and a whistleblower award program for individuals reporting derivatives market violations.",
    "beneficiaries": "Derivatives market participants and whistleblowers"
}

enrichment["Community Development Financial Institutions Fund Program, Emergency Support, Departmental Offices, Treasury"] = {
    "created": 2020,
    "description": "Provided emergency capital and technical assistance to CDFIs during the COVID-19 pandemic to support lending in low-income and underserved communities experiencing economic distress.",
    "beneficiaries": "Low-income and underserved communities served by CDFIs"
}

enrichment["Community Development Financial Institutions Fund, Program Account, Treasury"] = {
    "created": 1994,
    "description": "Provides grants, equity investments, loans, and technical assistance to CDFIs—community-based lenders that serve low-income people and communities underserved by traditional financial institutions.",
    "beneficiaries": "Low-income individuals and communities lacking access to traditional banking"
}

enrichment["Community Development Revolving Loan Fund, National Credit Union"] = {
    "created": 1979,
    "description": "Provides loans and technical assistance to low-income designated credit unions to increase their capacity to serve economically disadvantaged members with affordable financial products.",
    "beneficiaries": "Low-income credit union members and underserved communities"
}

enrichment["Community Oriented Policing Services, Office of Justice Programs, Justice"] = {
    "created": 1994,
    "description": "Awards grants to state, local, and tribal law enforcement agencies to hire officers, develop community policing strategies, and purchase technology to build trust between police and the communities they serve.",
    "beneficiaries": "State, local, and tribal law enforcement agencies and their communities"
}

enrichment["Community Planning and Development, Program Office Salaries and Expenses, Housing and Urban Development"] = {
    "created": 1965,
    "description": "Funds the staffing and administrative expenses of HUD's Community Planning and Development office, which administers CDBG, HOME, homeless assistance, and other community development programs.",
    "beneficiaries": "HUD CPD staff and program administration"
}

enrichment["Community Service Employment for Older Americans, Employment and Training Administration, Labor"] = {
    "created": 1965,
    "description": "Funds the Senior Community Service Employment Program (SCSEP), providing subsidized part-time community service positions and job training for low-income persons aged 55 and older to promote economic self-sufficiency.",
    "beneficiaries": "Low-income individuals aged 55 and older seeking employment"
}

enrichment["Compact of Free Association, Insular Affairs, Interior"] = {
    "created": 1986,
    "description": "Implements the Compacts of Free Association with the Republic of the Marshall Islands, Federated States of Micronesia, and Republic of Palau, providing economic assistance, defense, and government services.",
    "beneficiaries": "Citizens of the Marshall Islands, Micronesia, and Palau"
}

enrichment["Compensation of the President, Executive Office of the President"] = {
    "created": 1789,
    "description": "Pays the annual salary ($400,000) and expense allowance of the President of the United States as established by Congress under Article II of the Constitution.",
    "beneficiaries": "The President of the United States"
}

enrichment["Complex Crises Fund, Funds Appropriated to the President, US Agency for International Development"] = {
    "created": 2010,
    "description": "Provides flexible, rapid-response funding to address emerging or unforeseen complex crises overseas, including conflict prevention, stabilization, and transition activities in fragile states.",
    "beneficiaries": "Populations in countries experiencing complex humanitarian and security crises"
}

enrichment["Concessioner Improvement Accounts, National Park Service"] = {
    "created": 1998,
    "description": "Holds franchise fees and improvement funds from concessioners operating lodges, restaurants, and other visitor services in National Parks, used to fund capital improvements to concessioner-operated facilities.",
    "beneficiaries": "National Park visitors using concession services"
}

enrichment["Concessions Fees and Volunteer Services, Agricultural Research Service, Agriculture"] = {
    "created": 1990,
    "description": "Collects fees from concession operations on ARS properties and manages volunteer programs that support agricultural research activities at ARS facilities nationwide.",
    "beneficiaries": "Agricultural research programs and volunteer participants"
}

enrichment["Conditional Gift Fund, General, State"] = {
    "created": 1948,
    "description": "Receives conditional gifts and donations from foreign governments, international organizations, and individuals for specific purposes related to the Department of State's diplomatic mission.",
    "beneficiaries": "Department of State programs and diplomatic activities"
}

enrichment["Conditional Gift Fund, Health Resources and Services Administration, Health and Human Services"] = {
    "created": 1978,
    "description": "Receives conditional gifts and donations from individuals and organizations to support HRSA programs including community health centers, maternal and child health, and health workforce development.",
    "beneficiaries": "HRSA health programs and underserved populations"
}

enrichment["Connecting Minority Communities Fund, National Telecommunications and Information Administration, Commerce"] = {
    "created": 2021,
    "description": "Provides grants to Historically Black Colleges and Universities, Tribal Colleges, and other minority-serving institutions to purchase broadband internet access, equipment, and hire IT personnel.",
    "beneficiaries": "Students and faculty at minority-serving institutions of higher education"
}

enrichment["Consolidated Rail Infrastructure and Safety Improvements Grants, Federal Railroad Administration, Transportation"] = {
    "created": 2015,
    "description": "Awards competitive grants for capital projects that improve the safety, efficiency, and reliability of intercity passenger and freight rail transportation, including track upgrades, grade crossing improvements, and positive train control.",
    "beneficiaries": "Freight and passenger rail operators, railroad workers, and communities along rail corridors"
}

enrichment["Construction and Environmental Compliance and Restoration, National Aeronautics and Space Administration"] = {
    "created": 1958,
    "description": "Funds the construction of new NASA facilities, environmental compliance activities, and restoration of contaminated sites at NASA centers and installations across the country.",
    "beneficiaries": "NASA workforce and communities near NASA facilities"
}

# ──────────────────────────────────────────────────────────────
# Batch 1 items (lines from todo_batch_1.txt)
# ──────────────────────────────────────────────────────────────

enrichment["Construction of Research Facilities, National Institute of Standards and Technology, Commerce"] = {
    "created": 1901,
    "description": "Funds the construction and major renovation of NIST research laboratories and measurement facilities in Gaithersburg, Maryland and Boulder, Colorado, essential for advancing measurement science and technology standards.",
    "beneficiaries": "NIST researchers and U.S. industry relying on precision measurement standards"
}

enrichment["Construction, Bureau of Alcohol, Tobacco, Firearms and Explosives, Justice"] = {
    "created": 2003,
    "description": "Funds the construction, renovation, and improvement of ATF facilities including laboratories, field offices, and the National Tracing Center used for firearms regulation and criminal enforcement.",
    "beneficiaries": "ATF personnel and law enforcement operations"
}

enrichment["Construction, Bureau of Indian Affairs"] = {
    "created": 1824,
    "description": "Funds the construction and improvement of facilities serving Indian tribes, including schools, roads, bridges, dams, irrigation systems, and other infrastructure on or near Indian reservations.",
    "beneficiaries": "Federally recognized Indian tribes and tribal communities"
}

enrichment["Construction, Cemeterial Expenses, Army"] = {
    "created": 1862,
    "description": "Funds construction, expansion, and improvement projects at Arlington National Cemetery and the Soldiers' and Airmen's Home National Cemetery, including gravesite development and infrastructure upgrades.",
    "beneficiaries": "Families of interred service members and cemetery visitors"
}

enrichment["Construction, Drug Enforcement Administration, Justice"] = {
    "created": 1973,
    "description": "Finances the construction, renovation, and improvement of DEA facilities including forensic laboratories, field offices, and training facilities essential for drug enforcement operations.",
    "beneficiaries": "DEA personnel and drug enforcement operations"
}

enrichment["Construction, Federal Bureau of Investigation, Justice"] = {
    "created": 1908,
    "description": "Funds the construction, renovation, and improvement of FBI facilities including field offices, forensic laboratories, training facilities, and the FBI Academy at Quantico.",
    "beneficiaries": "FBI personnel and law enforcement operations"
}

enrichment["Construction, International Boundary and Water Commission, United States and Mexico, State"] = {
    "created": 1889,
    "description": "Funds the construction and rehabilitation of boundary demarcation infrastructure, flood control works, wastewater treatment plants, and water distribution facilities along the U.S.-Mexico border.",
    "beneficiaries": "U.S.-Mexico border communities"
}

enrichment["Construction, Major Projects, Departmental Administration, Veterans Affairs"] = {
    "created": 1946,
    "description": "Funds major construction projects (over $20 million) for VA medical centers, national cemeteries, and other VA facilities, including new hospitals, major renovations, and seismic corrections.",
    "beneficiaries": "Veterans receiving VA health care and burial benefits"
}

enrichment["Construction, Minor Projects, Departmental Administration, Veterans Affairs"] = {
    "created": 1946,
    "description": "Funds minor construction projects ($20 million and under) at VA medical centers, clinics, and cemeteries, including facility improvements, life safety corrections, and energy efficiency upgrades.",
    "beneficiaries": "Veterans and VA facility users"
}

enrichment["Construction, National Park Service, Interior"] = {
    "created": 1916,
    "description": "Funds construction of new facilities and major rehabilitation of existing infrastructure in the National Park System, including visitor centers, roads, bridges, water systems, and employee housing.",
    "beneficiaries": "National Park visitors and NPS operations"
}

enrichment["Construction, Rehabilitation, Operation, and Maintenance, Western Area Power Administration, Power Marketing Administration, Energy"] = {
    "created": 1977,
    "description": "Funds the construction, rehabilitation, and operation of power transmission facilities used by WAPA to market and deliver hydroelectric power from federal dams across 15 western states.",
    "beneficiaries": "Electric utilities and consumers in 15 western states"
}

enrichment["Construction, United States Fish and Wildlife Service"] = {
    "created": 1940,
    "description": "Funds the construction and rehabilitation of facilities in the National Wildlife Refuge System, national fish hatcheries, and other USFWS properties including visitor centers, administrative buildings, and water control structures.",
    "beneficiaries": "Wildlife refuges, fish hatcheries, and their visitors"
}

enrichment["Construction, United States Marshals Service, Justice"] = {
    "created": 1969,
    "description": "Funds the construction, renovation, and improvement of U.S. Marshals Service facilities, including courthouse security infrastructure, prisoner holding facilities, and district office spaces.",
    "beneficiaries": "U.S. Marshals Service operations and the federal judiciary"
}

enrichment["Consumer Financial Civil Penalty Fund, Bureau of Consumer Financial Protection"] = {
    "created": 2010,
    "description": "Collects civil penalties from CFPB enforcement actions against financial institutions and distributes funds to compensate victims of consumer financial law violations.",
    "beneficiaries": "Consumers harmed by unlawful financial practices"
}

enrichment["Consumer Financial Protection Bureau"] = {
    "created": 2010,
    "description": "Independent bureau within the Federal Reserve System that regulates consumer financial products and services, enforces consumer protection laws, and promotes financial education and fair lending practices.",
    "beneficiaries": "Consumers of financial products including mortgages, credit cards, and student loans"
}

enrichment["Consumer Operated and Oriented Plan Program Account, Centers for Medicare and Medicaid Services, Health and Human Services"] = {
    "created": 2010,
    "description": "Provided startup loans and solvency funding under the ACA to establish Consumer Operated and Oriented Plans (CO-OPs), nonprofit health insurance issuers designed to offer competitive alternatives on health insurance exchanges.",
    "beneficiaries": "Health insurance consumers in states with CO-OP plans (most have since closed)"
}

enrichment["Consumer Product Safety Commission"] = {
    "created": 1972,
    "description": "Independent federal agency that protects the public from unreasonable risks of injury or death from consumer products through safety standards, recalls, research, and enforcement of product safety laws.",
    "beneficiaries": "All consumers of household and commercial products"
}

enrichment["Contingency Fund for State Welfare Programs, Administration for Children and Families, Health and Human Services"] = {
    "created": 1996,
    "description": "Provides supplemental TANF funding to states experiencing economic downturns or increased welfare caseloads, serving as a fiscal safety net during periods of economic stress.",
    "beneficiaries": "States with increased TANF needs and low-income families in those states"
}

enrichment["Continued Dumping and Subsidy Offset, United States Customs Service, Treasury"] = {
    "created": 2000,
    "description": "Distributed antidumping and countervailing duties collected on imported goods to affected domestic producers under the Byrd Amendment (repealed 2006), with remaining distributions winding down.",
    "beneficiaries": "U.S. domestic producers that supported antidumping or countervailing duty petitions"
}

enrichment["Contract Support Costs, Bureau of Indian Affairs and Bureau of Indian Education, Interior"] = {
    "created": 1975,
    "description": "Reimburses Indian tribes and tribal organizations for the administrative and overhead costs of operating federal programs contracted or compacted under the Indian Self-Determination Act.",
    "beneficiaries": "Tribal governments operating self-determination contracts and compacts"
}

enrichment["Contract Support Costs, Indian Health Service, Health and Human Services"] = {
    "created": 1975,
    "description": "Reimburses tribes and tribal organizations for indirect costs and administrative expenses incurred when operating health care programs transferred from the Indian Health Service under self-determination contracts.",
    "beneficiaries": "Tribal health programs and the American Indian/Alaska Native populations they serve"
}

enrichment["Contributed Funds, Geological Survey, Interior"] = {
    "created": 1879,
    "description": "Receives contributions from state, local, and tribal governments and other entities to cost-share USGS scientific studies, water resources investigations, and natural hazard assessments.",
    "beneficiaries": "Contributing entities and the communities benefiting from cooperative research"
}

enrichment["Contributed Funds, United States Fish and Wildlife Service"] = {
    "created": 1940,
    "description": "Receives voluntary contributions from non-federal partners to support fish and wildlife conservation projects, habitat restoration, and endangered species recovery on National Wildlife Refuges and beyond.",
    "beneficiaries": "Fish and wildlife conservation efforts and partner organizations"
}

enrichment["Contribution for Annuity Benefits, National Park Service, Interior"] = {
    "created": 1916,
    "description": "Funds the National Park Service's employer contributions to the Civil Service Retirement System and Federal Employees Retirement System for NPS law enforcement and firefighting personnel.",
    "beneficiaries": "NPS law enforcement officers and firefighters"
}

enrichment["Contribution for Annuity Benefits, United States Secret Service, Homeland Security"] = {
    "created": 2000,
    "description": "Funds the employer contributions to retirement annuity programs for Secret Service personnel, covering enhanced retirement benefits for law enforcement officers and special agents.",
    "beneficiaries": "United States Secret Service personnel"
}

enrichment["Contribution to the African Development Bank, Treasury"] = {
    "created": 1982,
    "description": "Provides the U.S. capital contribution to the African Development Bank, a multilateral development finance institution that promotes economic development and social progress in Africa through loans and grants.",
    "beneficiaries": "African nations and populations served by AfDB-financed development projects"
}

enrichment["Contribution to the African Development Fund, Treasury"] = {
    "created": 1973,
    "description": "Provides the U.S. contribution to the concessional lending window of the African Development Bank Group, which extends interest-free loans and grants to the poorest African countries for development.",
    "beneficiaries": "Low-income African countries"
}

enrichment["Contribution to the Asian Development Fund, Treasury"] = {
    "created": 1966,
    "description": "Provides the U.S. contribution to the concessional lending arm of the Asian Development Bank, which provides low-interest loans and grants to the poorest countries in Asia and the Pacific.",
    "beneficiaries": "Low-income countries in Asia and the Pacific region"
}

enrichment["Contribution to the Clean Technology Fund, Treasury"] = {
    "created": 2008,
    "description": "Provides the U.S. contribution to the Clean Technology Fund, a multilateral climate finance mechanism that finances large-scale investments in clean energy technologies in developing countries.",
    "beneficiaries": "Developing countries transitioning to clean energy"
}

enrichment["Contribution to the European Bank for Reconstruction and Development, Treasury"] = {
    "created": 1990,
    "description": "Provides the U.S. capital contribution to the EBRD, which promotes private and entrepreneurial initiative in Central and Eastern European countries committed to democratic and market economy principles.",
    "beneficiaries": "Countries in Central and Eastern Europe and Central Asia transitioning to market economies"
}

enrichment["Contribution to the International Bank for Reconstruction and Development, Treasury"] = {
    "created": 1945,
    "description": "Provides the U.S. capital contribution to the World Bank (IBRD), which provides loans, guarantees, and analytical services to middle-income and creditworthy low-income countries for development.",
    "beneficiaries": "Developing countries receiving World Bank financing"
}

enrichment["Contribution to the International Fund for Agricultural Development, Treasury"] = {
    "created": 1977,
    "description": "Provides the U.S. contribution to IFAD, a specialized UN agency that finances agricultural development projects and programs to reduce rural poverty and improve food security in developing countries.",
    "beneficiaries": "Rural poor populations in developing countries"
}

enrichment["Contribution to the Multilateral Investment Guarantee Agency, Treasury"] = {
    "created": 1988,
    "description": "Provides the U.S. capital contribution to MIGA, a World Bank Group member that provides political risk insurance and credit enhancement guarantees to foreign investors in developing countries.",
    "beneficiaries": "Foreign investors and developing countries seeking private investment"
}

enrichment["Contributions for Highway Research Program, Federal Highway Administration, Transportation"] = {
    "created": 1958,
    "description": "Receives contributions from states, local governments, and industry partners to fund cooperative highway research and technology transfer programs administered by FHWA.",
    "beneficiaries": "State transportation departments and highway users"
}

enrichment["Contributions for Renewable Energy Impact Assessments and Mitigation, Defense"] = {
    "created": 2011,
    "description": "Receives payments from renewable energy developers to fund assessments of the impact of wind farms and other renewable energy projects on military operations, including radar interference mitigation.",
    "beneficiaries": "Military operations and renewable energy developers"
}

enrichment["Contributions to International Organizations, State"] = {
    "created": 1946,
    "description": "Pays the assessed U.S. contributions (dues) to international organizations of which the United States is a member, including the United Nations, NATO, WHO, and approximately 40 other multilateral bodies.",
    "beneficiaries": "International organizations and global governance"
}

enrichment["Contributions to the Cooperative Threat Reduction Program, Defense"] = {
    "created": 1991,
    "description": "Funds the Nunn-Lugar Cooperative Threat Reduction program, which works with former Soviet states and other countries to secure and dismantle weapons of mass destruction, including nuclear, chemical, and biological weapons.",
    "beneficiaries": "Global security and nations eliminating WMD stockpiles"
}

enrichment["Contributions to the International Monetary Fund Facilities and Trust Funds, Treasury"] = {
    "created": 1947,
    "description": "Provides U.S. contributions to IMF special lending facilities and trust funds that offer concessional financing to low-income countries facing balance-of-payments difficulties.",
    "beneficiaries": "Low-income countries with balance-of-payments needs"
}

enrichment["Contributions,  Education"] = {
    "created": 1980,
    "description": "Receives voluntary contributions and gifts from individuals, organizations, and entities to support educational programs and activities administered by the Department of Education.",
    "beneficiaries": "Educational programs and students"
}

enrichment["Contributions, American Battle Monuments Commission"] = {
    "created": 1923,
    "description": "Receives private contributions and donations to supplement appropriated funds for the maintenance, improvement, and beautification of overseas American military cemeteries and memorials.",
    "beneficiaries": "American military cemeteries and memorials abroad"
}

enrichment["Contributions, Indian Health Facilities, Indian Health Services, Health and Human Services"] = {
    "created": 1955,
    "description": "Receives contributions from tribes and other sources to supplement federal funding for the construction, renovation, and maintenance of Indian Health Service hospitals, clinics, and health care facilities.",
    "beneficiaries": "American Indian and Alaska Native communities"
}

enrichment["Cooperative Endangered Species Conservation Fund, United States Fish and Wildlife Service"] = {
    "created": 1973,
    "description": "Provides grants to states and territories for species and habitat conservation actions on non-federal lands, including habitat conservation plans, safe harbor agreements, and land acquisition for endangered species.",
    "beneficiaries": "Endangered and threatened species and their habitats"
}

enrichment["Cooperative Endangered Species Conservation Fund, from Land and Water Conservation Fund, U.S. Fish and Wildlife Service"] = {
    "created": 1973,
    "description": "Supplements the Cooperative Endangered Species Conservation Fund with Land and Water Conservation Fund monies for the acquisition of habitat essential to the conservation of listed species.",
    "beneficiaries": "Endangered species and state conservation programs"
}

enrichment["Cooperative Research and Development Agreements, Centers for Disease Control, Health and Human Services"] = {
    "created": 1986,
    "description": "Manages cooperative R&D agreements (CRADAs) between CDC and private sector partners to jointly develop public health technologies, diagnostics, vaccines, and other innovations.",
    "beneficiaries": "Public health research and the general public"
}

enrichment["Cooperative Research and Development Agreements, Food and Drug Administration, Health and Human Services"] = {
    "created": 1986,
    "description": "Manages CRADAs between FDA and industry partners to jointly develop regulatory science tools, analytical methods, and testing technologies that improve the safety and efficacy assessment of FDA-regulated products.",
    "beneficiaries": "FDA regulatory science and consumer safety"
}

enrichment["Cooperative Research and Development Agreements, National Institutes of Health, Health and Human Services"] = {
    "created": 1986,
    "description": "Manages CRADAs between NIH laboratories and private sector partners to advance biomedical research discoveries toward commercial development of new drugs, vaccines, diagnostics, and medical devices.",
    "beneficiaries": "Biomedical research and patients benefiting from translated discoveries"
}

enrichment["Cooperative Threat Reduction Account, Defense"] = {
    "created": 1991,
    "description": "Provides funding for the Cooperative Threat Reduction (Nunn-Lugar) program to secure, dismantle, and prevent proliferation of weapons of mass destruction and related materials in former Soviet states and partner nations.",
    "beneficiaries": "Global security and nations with WMD threats"
}

enrichment["Cooperative Work, Forest Service,  Agriculture"] = {
    "created": 1905,
    "description": "Manages cooperative agreements with state forestry agencies, local governments, and private landowners for wildfire protection, forest health, insect and disease management, and technical forestry assistance.",
    "beneficiaries": "Non-federal forest landowners and rural communities"
}

enrichment["Coronavirus Capital Projects Fund, Departmental Offices, Treasury"] = {
    "created": 2021,
    "description": "Provides $10 billion to states, territories, and tribal governments under the American Rescue Plan Act for capital projects that enable remote work, education, and health monitoring, particularly broadband infrastructure.",
    "beneficiaries": "Communities lacking broadband and digital infrastructure"
}

enrichment["Coronavirus Relief Fund, Departmental Offices, Treasury"] = {
    "created": 2020,
    "description": "Provided $150 billion to state, local, and tribal governments under the CARES Act to cover necessary expenditures incurred due to the COVID-19 public health emergency not otherwise budgeted.",
    "beneficiaries": "State, local, and tribal governments responding to COVID-19"
}

enrichment["Corporate Capital Account, United States International Development Finance Corporation"] = {
    "created": 2019,
    "description": "Provides the capital base for the DFC (successor to OPIC) to make equity investments, provide loans, and offer political risk insurance to catalyze private sector investment in developing countries.",
    "beneficiaries": "Private enterprises in developing countries and emerging markets"
}

enrichment["Corporation for National and Community Service"] = {
    "created": 1993,
    "description": "Federal agency (now AmeriCorps) that oversees national service programs including AmeriCorps, Senior Corps, and the Social Innovation Fund, engaging Americans in intensive community service to address critical needs.",
    "beneficiaries": "Approximately 270,000 AmeriCorps members and volunteers annually, and the communities they serve"
}

enrichment["Council of the Inspectors General on Integrity and Efficiency"] = {
    "created": 2008,
    "description": "Coordinates and enhances the work of the federal Inspectors General community, addressing integrity, economy, and effectiveness issues that transcend individual agency boundaries.",
    "beneficiaries": "The federal Inspector General community and government accountability"
}

enrichment["Council on Environmental Quality and Office of Environmental Quality, Executive"] = {
    "created": 1969,
    "description": "Advises the President on environmental policy, oversees federal agency implementation of NEPA (environmental impact statements), and coordinates federal environmental efforts across the executive branch.",
    "beneficiaries": "The environment and the general public"
}

enrichment["Counter-ISIS Train and Equip Fund, Army"] = {
    "created": 2015,
    "description": "Provided funding to train, equip, and sustain vetted partner forces in Iraq and Syria combating the Islamic State, including Iraqi security forces, Kurdish Peshmerga, and vetted Syrian opposition groups.",
    "beneficiaries": "Partner forces fighting ISIS in Iraq and Syria"
}

enrichment["Court Services and Offender Supervision Agency"] = {
    "created": 1997,
    "description": "Provides pretrial services, post-conviction supervision, and reentry programs for defendants and offenders in the District of Columbia Superior Court system, including drug testing and treatment services.",
    "beneficiaries": "D.C. defendants, offenders, and the District of Columbia community"
}

enrichment["Covered Countermeasure Process Fund, Health Resources and Services Administration, Health and Human Services"] = {
    "created": 2005,
    "description": "Administers the Countermeasures Injury Compensation Program (CICP), which provides compensation to individuals seriously injured by covered countermeasures (vaccines, medications) administered during public health emergencies.",
    "beneficiaries": "Individuals injured by pandemic vaccines or other covered medical countermeasures"
}

enrichment["Crash Data, National Highway Traffic Safety Administration, Transportation"] = {
    "created": 1966,
    "description": "Collects, analyzes, and disseminates national crash data through programs like the Fatality Analysis Reporting System (FARS) and the National Automotive Sampling System to inform vehicle safety regulation and research.",
    "beneficiaries": "Motor vehicle safety researchers, regulators, and the driving public"
}

enrichment["Creating Helpful Incentives to Produce Semiconductors (CHIPS) for America Fund, NIST, Commerce"] = {
    "created": 2022,
    "description": "Provides $39 billion in direct incentives (grants and loans) under the CHIPS Act to semiconductor companies for constructing, expanding, or modernizing chip fabrication facilities in the United States.",
    "beneficiaries": "U.S. semiconductor manufacturers and the domestic technology supply chain"
}

enrichment["Credit Reform:  Interest Paid on Uninvested Funds (Indefinite),  Bureau of the Fiscal Service, Treasury"] = {
    "created": 1990,
    "description": "A permanent indefinite appropriation that pays interest on uninvested funds held in credit reform financing accounts, ensuring proper accounting for the time value of money in federal credit programs.",
    "beneficiaries": "Federal credit program accounting and Treasury cash management"
}

enrichment["Credit for Previously-Owned Clean Vehicles, Internal Revenue Service, Treasury"] = {
    "created": 2022,
    "description": "Administers the tax credit of up to $4,000 under the Inflation Reduction Act for the purchase of qualifying previously-owned (used) electric vehicles and fuel cell vehicles by eligible buyers.",
    "beneficiaries": "Buyers of qualifying used clean vehicles with adjusted gross income below statutory limits"
}

enrichment["Crime Victims Fund, Justice"] = {
    "created": 1984,
    "description": "Funded by criminal fines, penalties, and assessments (not tax revenue), this fund provides grants to states for victim assistance programs and victim compensation, and supports federal victim notification and assistance.",
    "beneficiaries": "Victims of federal and state crimes"
}

enrichment["Current Surveys and Programs, Bureau of the Census, Commerce"] = {
    "created": 1902,
    "description": "Funds the Census Bureau's ongoing demographic, economic, and agricultural surveys conducted between decennial censuses, including the Current Population Survey, American Community Survey, and economic indicators.",
    "beneficiaries": "Federal, state, and local governments, businesses, and researchers using census data"
}

enrichment["Customs and Border Protection Services at User Fee Facilities, U.S. Customs and Border Protection, Homeland Security"] = {
    "created": 1992,
    "description": "Provides customs, immigration, and agricultural inspection services at non-federal user fee facilities (private airports, seaports) with costs reimbursed by the facility operators.",
    "beneficiaries": "International travelers and cargo at user fee facilities"
}

enrichment["Customs and Border Protection, Customs User Fees Account, USCS, Homeland Security"] = {
    "created": 1985,
    "description": "Funded by merchandise processing fees, this account supports CBP's commercial operations including cargo inspection, trade enforcement, and customs revenue collection at ports of entry.",
    "beneficiaries": "International trade community and U.S. customs operations"
}

enrichment["Customs and Border Protection, Immigration User Fees, Border and Transportation Security, Homeland Security"] = {
    "created": 1987,
    "description": "Funded by immigration inspection user fees charged to airlines and vessels, this account supports immigration inspection services at U.S. ports of entry.",
    "beneficiaries": "International travelers and immigration enforcement"
}

enrichment["Customs and Border Protection, Land Border Inspection Fees, Border and Transportation Security, Homeland Security"] = {
    "created": 1998,
    "description": "Collects fees at land border crossings for SENTRI, NEXUS, and other trusted traveler programs and premium processing services to fund expedited border inspection operations.",
    "beneficiaries": "Land border travelers and trusted traveler program participants"
}

enrichment["Customs and Border Protection, Transfer and Expenses of Operation, Puerto Rico, USCS, Homeland Security"] = {
    "created": 1920,
    "description": "Funds CBP customs inspection operations in Puerto Rico, including the collection of duties and enforcement of trade laws on goods entering the U.S. customs territory through Puerto Rican ports.",
    "beneficiaries": "Puerto Rico's trade community and customs operations"
}

enrichment["Cyber Security Initiatives, Office of the Secretary, Transportation"] = {
    "created": 2015,
    "description": "Funds cybersecurity initiatives across the Department of Transportation to protect critical transportation infrastructure and systems from cyber threats and vulnerabilities.",
    "beneficiaries": "The nation's transportation infrastructure and traveling public"
}

enrichment["Cybersecurity Enhancement Account, Departmental Offices, Treasury"] = {
    "created": 2015,
    "description": "Funds cybersecurity improvements across Treasury Department systems and networks, including threat detection, incident response, and security modernization for financial systems critical to the U.S. economy.",
    "beneficiaries": "Treasury Department operations and the financial system"
}

enrichment["Cybersecurity, Energy Security, and Emergency Response, Energy Programs, Energy"] = {
    "created": 2018,
    "description": "Addresses emerging threats to energy infrastructure through cybersecurity, physical security, and emergency response activities, including protecting the electric grid and energy supply chains from cyberattacks and natural disasters.",
    "beneficiaries": "The U.S. energy sector and the general public"
}

enrichment["DOD-VA Health Care Sharing Incentive Fund, Veterans Affairs"] = {
    "created": 1982,
    "description": "Facilitates health care resource sharing between Department of Defense and Department of Veterans Affairs medical facilities, incentivizing joint use of specialized equipment, facilities, and medical personnel.",
    "beneficiaries": "Active-duty military, veterans, and their families"
}

enrichment["Dairy Indemnity Program, Farm Service Agency, Agriculture"] = {
    "created": 1968,
    "description": "Indemnifies dairy farmers and manufacturers of dairy products who are directed to remove contaminated raw milk from the market due to chemical residues or nuclear radiation not caused by the farmer.",
    "beneficiaries": "Dairy farmers whose milk is removed from market due to contamination"
}

enrichment["Damage Assessment and Restoration Revolving Fund, Agriculture"] = {
    "created": 1990,
    "description": "Funds the assessment of natural resource damages and restoration activities on USDA-managed lands resulting from oil spills, hazardous substance releases, and other environmental contamination.",
    "beneficiaries": "USDA-managed natural resources and surrounding communities"
}

enrichment["Damage Assessment and Restoration Revolving Fund, Environmental Protection Agency"] = {
    "created": 1990,
    "description": "Funds EPA's assessment of natural resource damages from hazardous substance contamination and supports restoration of injured natural resources at Superfund and other contaminated sites.",
    "beneficiaries": "Communities and ecosystems affected by hazardous substance contamination"
}

enrichment["Damage Assessment and Restoration Revolving Fund, National Oceanic and Atmospheric Administration, Commerce"] = {
    "created": 1990,
    "description": "Funds NOAA's assessment and restoration of coastal and marine natural resources injured by oil spills, hazardous substance releases, and vessel groundings, including coral reefs, fisheries, and shoreline habitats.",
    "beneficiaries": "Coastal and marine ecosystems and communities"
}

enrichment["Data-Driven Innovation, Funds Appropriated to the President, Executive Office of the President"] = {
    "created": 2014,
    "description": "Supported government-wide initiatives to use data analytics, evidence-based approaches, and digital innovation to improve federal program effectiveness and service delivery.",
    "beneficiaries": "Federal agencies and the general public"
}

enrichment["Debt Collection Fund, Bureau of the Fiscal Service, Treasury"] = {
    "created": 1996,
    "description": "Funds the Treasury Offset Program and other centralized debt collection activities that recover delinquent non-tax debts owed to federal agencies by offsetting federal payments (including tax refunds).",
    "beneficiaries": "Federal agencies owed delinquent debts"
}

enrichment["Debt Collection Fund, Office of the Secretary, Health and Human Services"] = {
    "created": 1996,
    "description": "Funds HHS's centralized debt collection activities to recover overpayments, defaulted loans, and other delinquent debts owed to HHS programs including Medicare, Medicaid, and student health profession loans.",
    "beneficiaries": "HHS programs and the federal treasury"
}

enrichment["Debt Restructuring, Treasury"] = {
    "created": 1989,
    "description": "Manages the restructuring and reduction of sovereign debts owed to the United States by developing countries, including Brady Plan debt exchanges and bilateral debt relief agreements.",
    "beneficiaries": "Heavily indebted developing countries"
}

enrichment["Defense Emergency Response Fund, Defense"] = {
    "created": 2001,
    "description": "Provides emergency funding for the Department of Defense to respond rapidly to unforeseen military contingencies and emergencies, including initial costs of overseas military operations.",
    "beneficiaries": "DoD operations during emergencies and contingencies"
}

enrichment["Defense Nuclear Facilities Safety Board"] = {
    "created": 1988,
    "description": "Independent federal agency that provides technical safety oversight of the Department of Energy's nuclear weapons complex, reviewing and evaluating standards and operations at defense nuclear facilities.",
    "beneficiaries": "Workers and communities near DOE defense nuclear facilities"
}

enrichment["Defense Production Act Medical Supplies Enhancement"] = {
    "created": 2020,
    "description": "Provided funding under the Defense Production Act to accelerate domestic production of critical medical supplies, including ventilators, N95 masks, and testing materials during the COVID-19 pandemic.",
    "beneficiaries": "Healthcare workers and the general public during COVID-19"
}

enrichment["Defense Production Act Program Account. Defense"] = {
    "created": 1950,
    "description": "Funds activities under the Defense Production Act to ensure the availability of domestic industrial capacity and supply chain resilience for national defense, including loans, loan guarantees, and purchase commitments.",
    "beneficiaries": "The domestic defense industrial base"
}

enrichment["Defense Production Act Purchases, Defense"] = {
    "created": 1950,
    "description": "Finances the purchase and production of critical materials and equipment under Title III of the Defense Production Act to create, maintain, or expand domestic industrial capabilities for national defense.",
    "beneficiaries": "The defense industrial base and national security"
}

enrichment["Defense Production Act, Energy Programs, Energy"] = {
    "created": 1950,
    "description": "Funds DOE's Defense Production Act authorities to ensure adequate domestic production capacity for energy-related materials and technologies critical to national defense and energy security.",
    "beneficiaries": "National energy security and defense supply chains"
}

enrichment["Delaware Water Gap Route 209 Operations, National Park Service"] = {
    "created": 1965,
    "description": "Funds the operation and maintenance of U.S. Route 209 through the Delaware Water Gap National Recreation Area in Pennsylvania, which is managed by the National Park Service rather than a state highway department.",
    "beneficiaries": "Motorists using Route 209 and visitors to the Delaware Water Gap NRA"
}

enrichment["Delta Regional Authority"] = {
    "created": 2000,
    "description": "Federal-state partnership that promotes economic development in the 252-county Mississippi Delta region across eight states, investing in infrastructure, workforce development, and business development in distressed communities.",
    "beneficiaries": "Approximately 10 million residents in the Mississippi Delta region"
}

enrichment["Democracy Fund, State"] = {
    "created": 2004,
    "description": "Supports programs that promote democratic governance, human rights, rule of law, and civil society in countries transitioning to or consolidating democracy worldwide.",
    "beneficiaries": "Citizens and civil society organizations in democratizing countries"
}

enrichment["Denali Commission"] = {
    "created": 1998,
    "description": "Independent federal agency serving as an innovative federal-state partnership to provide critical utilities, infrastructure, and economic support throughout Alaska, particularly in remote and economically distressed communities.",
    "beneficiaries": "Remote and rural Alaska communities"
}

enrichment["Denali Commission Trust Fund"] = {
    "created": 1998,
    "description": "Holds funds appropriated to the Denali Commission and earnings from investments to finance infrastructure development, energy, health, and economic projects in rural Alaska.",
    "beneficiaries": "Rural Alaska communities"
}

enrichment["Department of Defense Acquisition Workforce Development Account, Defense"] = {
    "created": 2008,
    "description": "Funds recruitment, training, and retention programs for DoD's acquisition workforce of approximately 190,000 professionals who manage defense procurement and contract administration.",
    "beneficiaries": "DoD acquisition professionals"
}

enrichment["Department of Defense Base Closure Account 2005, Defense"] = {
    "created": 2005,
    "description": "Funds the environmental cleanup, property disposal, and community economic adjustment activities associated with military base closures and realignments approved in the 2005 BRAC round.",
    "beneficiaries": "Communities affected by 2005 BRAC military base closures"
}

enrichment["Department of Defense Base Closure Account, Defense"] = {
    "created": 1990,
    "description": "Funds activities associated with military base closures and realignments from the 1988, 1991, 1993, and 1995 BRAC rounds, including environmental restoration, property transfer, and community revitalization.",
    "beneficiaries": "Communities affected by pre-2005 BRAC rounds"
}

enrichment["Department of Defense Family Housing Improvement Fund, Defense"] = {
    "created": 1996,
    "description": "A revolving fund that enables public-private partnerships for the construction, renovation, and maintenance of military family housing, leveraging private sector investment to improve housing quality and availability.",
    "beneficiaries": "Military families residing in on-base and privatized military housing"
}

enrichment["Department of Defense General Gift Fund, Defense"] = {
    "created": 1952,
    "description": "Receives monetary gifts and donations from private individuals and organizations for the benefit of the Department of Defense, including support for morale, welfare, and recreation programs.",
    "beneficiaries": "Military service members and their families"
}

enrichment["Department of Defense Military Unaccompanied Housing Improvement Fund, Defense"] = {
    "created": 2003,
    "description": "Finances the construction, renovation, and improvement of unaccompanied military housing (barracks and dormitories) for service members without dependents.",
    "beneficiaries": "Unaccompanied active-duty military personnel"
}

enrichment["Department of Defense Rapid Prototyping Fund, Defense"] = {
    "created": 2016,
    "description": "Funds rapid prototyping, experimentation, and fielding of innovative defense technologies to quickly address emerging military requirements and operational needs.",
    "beneficiaries": "Military forces and defense technology developers"
}

enrichment["Department of Defense Vietnam War Commemoration Fund, Defense"] = {
    "created": 2008,
    "description": "Receives gifts and contributions to support the 50th Anniversary Commemoration of the Vietnam War, honoring Vietnam veterans and their families through events, memorials, and recognition activities.",
    "beneficiaries": "Vietnam War veterans and their families"
}

enrichment["Department of Defense, Education Benefits Fund"] = {
    "created": 1985,
    "description": "Funds the tuition assistance and education benefits available to active-duty, reserve, and National Guard service members, including contributions to the Post-9/11 GI Bill transfer of benefits program.",
    "beneficiaries": "Military service members pursuing education"
}

enrichment["Department of Defense, Forest Products Program, Army"] = {
    "created": 1947,
    "description": "Manages the sale and revenue from timber and forest products harvested on Army military installations as part of integrated natural resource management plans under the Sikes Act.",
    "beneficiaries": "Army installation natural resource programs"
}

enrichment["Department of Education Nonrecurring Expenses Fund"] = {
    "created": 2018,
    "description": "Collects unobligated balances from expired Department of Education appropriations and makes them available for one-time IT modernization and facilities improvement projects.",
    "beneficiaries": "Department of Education operations"
}

enrichment["Department of Veterans Affairs Cemetery Gift Fund, Veterans Affairs"] = {
    "created": 1973,
    "description": "Receives monetary gifts and donations for the benefit of VA national cemeteries, used for beautification, memorial projects, and enhancements beyond those funded by regular appropriations.",
    "beneficiaries": "National cemeteries and families of interred veterans"
}

enrichment["Department of the Air Force General Gift Fund, Air Force"] = {
    "created": 1952,
    "description": "Receives gifts and donations from individuals and organizations for the benefit of the Department of the Air Force and Space Force, supporting morale, welfare, and mission-related activities.",
    "beneficiaries": "Air Force and Space Force personnel and their families"
}

enrichment["Department of the Army General Gift Fund, Army"] = {
    "created": 1952,
    "description": "Receives gifts and donations from individuals and organizations for the benefit of the Department of the Army, used to support welfare, morale, recreation, and mission-support activities.",
    "beneficiaries": "Army personnel and their families"
}

enrichment["Department of the Navy General Gift Fund, Navy"] = {
    "created": 1952,
    "description": "Receives gifts and donations from individuals and organizations for the benefit of the Department of the Navy and Marine Corps, supporting welfare, morale, and mission-related activities.",
    "beneficiaries": "Navy and Marine Corps personnel and their families"
}

enrichment["Department-Wide Systems and Capital Investments Programs, Departmental Offices, Treasury"] = {
    "created": 1990,
    "description": "Funds enterprise-wide IT systems, capital investments, and modernization programs across the Department of the Treasury, including cybersecurity, shared services, and data analytics platforms.",
    "beneficiaries": "Treasury Department operations and all Treasury bureaus"
}

enrichment["Department-Wide Technology Investments, Departmental Management, Intelligence, Situational Awareness, and Oversight, Homeland Security"] = {
    "created": 2003,
    "description": "Funds enterprise-wide technology investments for DHS, including IT infrastructure, cybersecurity, data sharing systems, and technology modernization across the department's component agencies.",
    "beneficiaries": "DHS component agencies and homeland security operations"
}

enrichment["Departmental Administration, Energy Programs, Energy"] = {
    "created": 1977,
    "description": "Funds the salaries, expenses, and administrative operations of the Department of Energy's headquarters management, including policy development, Congressional liaison, and general counsel activities.",
    "beneficiaries": "DOE program administration and operations"
}

enrichment["Departmental Operations, Land and Water Conservation Fund, Departmental Offices, Interior"] = {
    "created": 1965,
    "description": "Supports Interior Department-wide coordination and administration of the Land and Water Conservation Fund, which provides funding for land acquisition and outdoor recreation projects.",
    "beneficiaries": "Federal land management and outdoor recreation"
}

enrichment["Departmental Operations, Office of the Secretary, Interior"] = {
    "created": 1849,
    "description": "Funds the Office of the Secretary of the Interior's policy development, program coordination, and executive management functions across Interior's eight bureaus and offices.",
    "beneficiaries": "Interior Department leadership and program coordination"
}

enrichment["Detention and Removal Operations, U.S. Immigration and Customs Enforcement, Homeland Security"] = {
    "created": 2003,
    "description": "Funds ICE operations for the apprehension, detention, and removal of illegal aliens, including operation of detention facilities, transportation of detainees, and alternatives to detention programs.",
    "beneficiaries": "U.S. immigration enforcement and border security"
}

enrichment["Digital Equity, National Telecommunications and Information Administration, Commerce"] = {
    "created": 2021,
    "description": "Provides grants under the Infrastructure Investment and Jobs Act to promote digital equity and inclusion, ensuring all individuals and communities have the skills, technology, and capacity to benefit from the digital economy.",
    "beneficiaries": "Underserved populations including low-income households, aging individuals, and rural communities"
}

enrichment["Disaster Assistance Direct Loan Program Account, Federal Emergency Management Agency, Homeland Security"] = {
    "created": 1974,
    "description": "Provides loans to state and local governments to cover their cost-share of federally declared disaster recovery expenses when the government entity demonstrates a fiscal inability to assume its matching requirement.",
    "beneficiaries": "State and local governments lacking funds for disaster cost-sharing"
}

enrichment["Disaster Loan Fund, Liquidating Account, Small Business Administration"] = {
    "created": 1953,
    "description": "Manages the legacy portfolio of SBA disaster loans made prior to credit reform, handling collections and liquidation of outstanding physical disaster, economic injury, and home disaster loans.",
    "beneficiaries": "Disaster loan borrowers with pre-credit-reform loans"
}

enrichment["Disposal of Department of Defense Real Property, Defense"] = {
    "created": 1988,
    "description": "Manages the disposal, transfer, and sale of excess DoD real property, including surplus military installations and parcels, with proceeds funding environmental cleanup and property disposal activities.",
    "beneficiaries": "Communities receiving former military properties for civilian reuse"
}

enrichment["Distance Learning, Telemedicine and Broadband Program, Rural Utilities Service, Agriculture"] = {
    "created": 1996,
    "description": "Provides grants and loans to rural communities for distance learning and telemedicine equipment, broadband infrastructure, and technology to improve educational and health care access in rural areas.",
    "beneficiaries": "Rural schools, hospitals, health clinics, and their communities"
}

enrichment["District of Columbia Courts"] = {
    "created": 1970,
    "description": "The federally funded judicial system for the District of Columbia, including the Superior Court and Court of Appeals, handling criminal, civil, family, and probate matters for D.C. residents.",
    "beneficiaries": "D.C. residents and litigants"
}

enrichment["District of Columbia Crime Victims Compensation Fund, District of Columbia Courts"] = {
    "created": 1981,
    "description": "Provides financial compensation to victims of violent crime in the District of Columbia for medical expenses, lost wages, counseling, and other costs resulting from criminal victimization.",
    "beneficiaries": "Victims of violent crime in Washington, D.C."
}

enrichment["District of Columbia Federal Pension Fund, Treasury"] = {
    "created": 1997,
    "description": "Manages federal pension contributions for D.C. government employees hired before 1987 whose retirement benefits are a federal responsibility under the National Capital Revitalization Act.",
    "beneficiaries": "D.C. government retirees hired before 1987"
}

enrichment["District of Columbia Judicial Retirement and Survivor's Annuity Fund, Treasury"] = {
    "created": 1970,
    "description": "Funds retirement annuities and survivor benefits for judges of the District of Columbia courts, a federal obligation since D.C. courts are established under federal law.",
    "beneficiaries": "Retired D.C. judges and their survivors"
}

enrichment["Diversion Control Fee Account, Justice"] = {
    "created": 1993,
    "description": "Funded by registration fees from DEA-registered practitioners, manufacturers, and distributors of controlled substances, this account supports the DEA's diversion control program to prevent the diversion of legal drugs to illegal use.",
    "beneficiaries": "Public health and safety through controlled substance regulation"
}

enrichment["Domestic Trafficking Victims' Fund, Office of Justice Programs, Justice"] = {
    "created": 2015,
    "description": "Funded by assessments on persons convicted of trafficking, child exploitation, and sexual abuse offenses, this fund provides grants for services to domestic victims of human trafficking including shelter, legal aid, and counseling.",
    "beneficiaries": "U.S. victims of human trafficking"
}

enrichment["Donations for Forest and Rangeland Research, Forest Service, Agriculture"] = {
    "created": 1928,
    "description": "Receives voluntary donations from individuals, organizations, and corporations to supplement appropriated funds for Forest Service research on forest health, wildfire, climate adaptation, and forest products.",
    "beneficiaries": "Forest research programs and forest ecosystems"
}

enrichment["Donations, Advisory Council on Historic Preservation"] = {
    "created": 1966,
    "description": "Receives private donations to supplement appropriated funds for the Advisory Council on Historic Preservation's work in promoting historic preservation across the nation.",
    "beneficiaries": "Historic preservation programs"
}

enrichment["Donations, National Park Service"] = {
    "created": 1916,
    "description": "Receives private donations and gifts for the benefit of specific National Parks or the National Park System as a whole, supplementing appropriated funds for park operations, education, and resource protection.",
    "beneficiaries": "National Parks and their visitors"
}

enrichment["Donations, National Science Foundation"] = {
    "created": 1950,
    "description": "Receives gifts and donations from individuals, corporations, and organizations to support NSF's mission of promoting science and engineering research and education.",
    "beneficiaries": "Science and engineering research and education programs"
}

enrichment["Dual Benefits Payments Account, Railroad Retirement Board"] = {
    "created": 1974,
    "description": "Finances the portion of railroad retirement benefits attributable to dual benefits for workers with both railroad and Social Security credits, which cannot be financed from railroad retirement taxes.",
    "beneficiaries": "Retired railroad workers with dual Social Security and railroad retirement credits"
}

enrichment["EEOC Education, Technical Assistance and Training Revolving Fund, Equal Employment Opportunity Commission"] = {
    "created": 1991,
    "description": "A revolving fund that provides fee-based training, technical assistance, and educational programs to federal agencies, private employers, and other organizations on equal employment opportunity and workplace discrimination prevention.",
    "beneficiaries": "Employers, federal agencies, and workers seeking EEO training"
}

enrichment["Early Retiree Reinsurance Program, Office of the Secretary, Health and Human Services"] = {
    "created": 2010,
    "description": "A temporary ACA program that reimbursed employer health plans for a portion of the cost of health benefits for early retirees aged 55-64 (program exhausted its $5 billion in 2011).",
    "beneficiaries": "Early retirees and their former employers (program expired)"
}

enrichment["East-West Center, State"] = {
    "created": 1960,
    "description": "An education and research organization established by Congress to strengthen U.S. relations and understanding among peoples and nations of the United States, Asia, and the Pacific through cooperative study, research, and dialogue.",
    "beneficiaries": "Scholars, policymakers, and communities in the U.S., Asia, and Pacific region"
}

enrichment["Economic Development Assistance Programs, Economic Development Administration, Commerce"] = {
    "created": 1965,
    "description": "Provides grants and technical assistance to economically distressed communities to generate new employment, diversify local economies, and stimulate industrial and commercial growth in areas of high unemployment.",
    "beneficiaries": "Economically distressed communities across the United States"
}

enrichment["Economic Research Service, Agriculture"] = {
    "created": 1961,
    "description": "Conducts economic and social science research and analysis on agriculture, food, rural development, trade, and natural resources to inform public and private decision-making.",
    "beneficiaries": "Policymakers, agricultural stakeholders, and the public"
}

enrichment["Economic Stabilization Program Account, Departmental Offices, Treasury"] = {
    "created": 2020,
    "description": "Administered loans, loan guarantees, and equity investments under the CARES Act to provide economic stabilization to affected businesses, states, and municipalities during the COVID-19 pandemic.",
    "beneficiaries": "Businesses, airlines, and state/local governments affected by COVID-19"
}

enrichment["Education Construction, Bureau of Indian Affairs and Bureau of Indian Education, Interior"] = {
    "created": 1978,
    "description": "Funds the construction, replacement, and renovation of Bureau of Indian Education schools, dormitories, and educational facilities on or near Indian reservations.",
    "beneficiaries": "American Indian and Alaska Native students attending BIE-funded schools"
}

enrichment["Educational and Cultural Exchange Programs, State"] = {
    "created": 1961,
    "description": "Administers the Fulbright Program, International Visitor Leadership Program, and other international educational and cultural exchanges that promote mutual understanding between Americans and people of other countries.",
    "beneficiaries": "U.S. and international students, scholars, professionals, and leaders"
}

enrichment["Election Security Grants, Election Assistance Commission"] = {
    "created": 2018,
    "description": "Provides grants to states to improve the security of election infrastructure, including upgrading voting systems, implementing post-election audits, and addressing cybersecurity vulnerabilities.",
    "beneficiaries": "State and local election administrators and voters"
}

enrichment["Elective Payment for Energy Property and Electricity Produced from Certain Renewable Resources, Etc., Internal Revenue Service, Treasury"] = {
    "created": 2022,
    "description": "Administers direct pay provisions under the Inflation Reduction Act that allow tax-exempt entities (governments, nonprofits) to receive the value of clean energy tax credits as direct payments.",
    "beneficiaries": "Tax-exempt entities investing in clean energy projects"
}

enrichment["Electric or Low-Emitting Ferry Program, Federal Transit Administration, Transportation"] = {
    "created": 2021,
    "description": "Provides grants under the Bipartisan Infrastructure Law for the purchase of electric or low-emitting ferry vessels and related charging/fueling infrastructure to reduce emissions from ferry operations.",
    "beneficiaries": "Public ferry systems and waterfront communities"
}

enrichment["Electronic System for Travel Authorization, U.S. Customs and Border Protection, Homeland Security"] = {
    "created": 2008,
    "description": "Operates the ESTA system, which screens and pre-authorizes citizens of Visa Waiver Program countries before they board U.S.-bound flights, collecting a $21 fee per application.",
    "beneficiaries": "Visa Waiver Program travelers and U.S. border security"
}

enrichment["Emergencies in the Diplomatic and Consular Service, State"] = {
    "created": 1956,
    "description": "Provides emergency funding for the Department of State to respond to unforeseen crises affecting U.S. diplomatic missions and citizens abroad, including evacuations, hostage situations, and natural disasters.",
    "beneficiaries": "U.S. diplomatic personnel and American citizens abroad in emergencies"
}

enrichment["Emergency Capital Investment Fund, Departmental Offices, Treasury"] = {
    "created": 2021,
    "description": "Provides $9 billion in capital to CDFIs and minority depository institutions to increase lending in low- and moderate-income and minority communities disproportionately impacted by COVID-19.",
    "beneficiaries": "Low-income and minority communities served by CDFIs and MDIs"
}

enrichment["Emergency Citrus Disease Research and Development Trust Fund, National Institute of Food and Agriculture, Agriculture"] = {
    "created": 2014,
    "description": "Funds emergency research to combat citrus greening disease (HLB), the most devastating citrus disease worldwide, which threatens the U.S. citrus industry through research on disease resistance and management.",
    "beneficiaries": "U.S. citrus growers and the citrus industry"
}

enrichment["Emergency Connectivity Fund for Educational Connections and Devices, Federal Communications Commission"] = {
    "created": 2021,
    "description": "Provides $7.17 billion under the American Rescue Plan Act to schools and libraries for laptops, tablets, Wi-Fi hotspots, and broadband connectivity to support remote learning during and after COVID-19.",
    "beneficiaries": "K-12 students and library patrons lacking internet access or devices"
}

enrichment["Emergency Conservation Program, Farm Service Agency, Agriculture"] = {
    "created": 1978,
    "description": "Provides cost-share assistance to farmers and ranchers for the restoration of farmland damaged by natural disasters, including debris removal, fencing, water supply restoration, and emergency conservation measures.",
    "beneficiaries": "Farmers and ranchers with disaster-damaged farmland"
}

enrichment["Emergency EIDL Grants, Small Business Administration"] = {
    "created": 2020,
    "description": "Provided emergency advance grants of up to $10,000 to small businesses and nonprofits applying for Economic Injury Disaster Loans during the COVID-19 pandemic; advances did not require repayment.",
    "beneficiaries": "Small businesses and nonprofits affected by COVID-19"
}

enrichment["Emergency Forest Restoration Program, Farm Service Agency, Agriculture"] = {
    "created": 2008,
    "description": "Provides cost-share payments to private forest landowners to restore nonindustrial private forestland damaged by natural disasters, including reforestation, erosion control, and debris cleanup.",
    "beneficiaries": "Private non-industrial forest landowners"
}

enrichment["Emergency Homeowner's Relief Fund, Housing Programs, Housing and Urban Development"] = {
    "created": 2010,
    "description": "Provided emergency mortgage assistance to homeowners at risk of foreclosure due to involuntary unemployment or underemployment, bridging temporary income gaps with loans for mortgage payments.",
    "beneficiaries": "Homeowners facing foreclosure due to unemployment"
}

enrichment["Emergency Preparedness Grant, Pipeline and Hazardous Materials Safety Administration, Transportation"] = {
    "created": 1986,
    "description": "Provides grants to states, tribes, and local governments for developing, improving, and implementing emergency plans for incidents involving hazardous materials transportation.",
    "beneficiaries": "Communities along hazardous materials transportation routes"
}

enrichment["Emergency Relief Program, Federal Highway Administration, Transportation"] = {
    "created": 1956,
    "description": "Provides funding for the emergency repair and reconstruction of federal-aid highways and roads on federal lands that are damaged by natural disasters or catastrophic failures.",
    "beneficiaries": "State and local highway agencies and communities affected by road damage"
}

# Now generate the remaining entries. Due to the massive volume, I'll handle them programmatically
# by extracting patterns from the name and generating appropriate enrichment data.

# For efficiency, let's handle remaining items that aren't yet in the enrichment dict
# by checking what's left and generating entries.

# First, let's see how many we've manually covered
covered = set(enrichment.keys())
still_remaining = [n for n in remaining if n not in covered]
print(f"Manually covered: {len(covered)}")
print(f"Still remaining: {len(still_remaining)}")
