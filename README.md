# Wildlands Explorer
Glass Root Garden · Land & Ecology

A free, public, educational web map for exploring, measuring and understanding real landscapes. Start in Hays County, Texas. The design is inspired by exploration games; no achievements, points, leaderboards or artificial ecological scores.

## Alpha 0.8.1
- Real aerial imagery and topographic basemaps from USGS.
- TPWD ecological communities overlay with opacity adjustment and source legend.
- Draw a study area, estimate acreage and perimeter using Turf, and export GeoJSON.
- Inspect a map point for TPWD mapped habitat and USGS elevation (external lookups; not yet browser-tested).
- Mobile-responsive dark green interface, compass and coordinate navigation.
- Address and place search via Photon / OpenStreetMap (explicit submit, temporary in-memory caching and per-browser request spacing; public demo service for reasonable usage only, no availability guarantee).
- Experimental parcel point selection via City of Dripping Springs public GIS layer sourced from Hays CAD; preserves full Polygon/MultiPolygon and holes, requests only ID, county and dataset vintage fields, not owner information. Coverage, currency, terms and browser response still require verification. Manual boundaries remain available.
- Separate existing-condition and proposed-habitat zone layers: draw named polygons, record notes, calculate approximate acres and square feet, switch views without changing the other layer, and export both as one GeoJSON FeatureCollection. Session-only; browser QA pending. No field verification, automatic suitability or legal accuracy implied.
- On-demand habitat composition: query all eleven TPWD EMS regional polygon layers, clip to selected study area, dissolve same-class overlaps, check cross-class overlaps, report acres/percent of full boundary and explicit unmapped remainder, toggle class overlays and export CSV. Alpha limits: 1,000 study acres, 5,000 bounding-box acres, 500 candidate polygons, 300,000 vertices, 90-second request timeout. No partial percentages on errors. Source metadata inspected; live browser QA and numerical comparison against QGIS pending.
- No API keys, accounts, paid services or server.

## Deploy free
GitHub repository Settings > Pages > Build and deployment > Source: Deploy from a branch > main / (root) > Save.
Expected URL after successful deployment: https://crking92.github.io/GRG-Wildlands-Explorer/

## Source registry
| Dataset | Provider / source | Purpose | Status |
| --- | --- | --- | --- |
| Aerial imagery | [USGS National Map](https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer) | Visual reference | Coded; browser QA pending |
| Topography | [USGS National Map](https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer) | Terrain reference | Coded; browser QA pending |
| Ecological Mapping Systems 2020 | [TPWD / MoRAP](https://tpwd.texas.gov/server/rest/services/Vegetation_Mapping/Texas_Ecological_Mapping_Systems_Data_2020/MapServer) | Modeled vegetation map and point identification | Coded; browser QA pending |
| Elevation | [USGS EPQS / 3DEP](https://apps.nationalmap.gov/epqs/) | Point elevation | Coded; browser QA pending |
| Place search | [Photon](https://github.com/komoot/photon), [OpenStreetMap](https://www.openstreetmap.org/copyright) | Address and place geocoding | Coded; browser QA pending; no availability guarantee |
| Experimental parcels | [City of Dripping Springs / Hays CAD](https://services6.arcgis.com/XnTA1N5QxtOFa9o8/ArcGIS/rest/services/CODS_Public_Map/FeatureServer/6) | Point-to-parcel geometry selection | Coded; coverage, vintage, terms and browser QA pending |
| Parcels | [TxGIO](https://gio.texas.gov/stratmap/land-parcels.html), [Hays CAD](https://hayscad.com/data-downloads/) | Select existing parcel geometry | Research candidate only |

External services may change, be unavailable or impose usage restrictions. Verify dataset terms before redistribution; original code license does not extend to third-party data. Source dates and spatial accuracy must be recorded as available. Aerial imagery is not live. Mapped habitat is not field-confirmed vegetation or native cover. A point estimate is not a whole-area result. User-drawn acreage is approximate, not a legal survey. Unknown, unavailable and unmeasured values must never be reported as zero. No user accounts, private site data storage or analytics are included; external providers receive map, point and submitted place-search requests. Do not enter confidential addresses.

## Next milestones
1. Verify deployed page, imagery, map controls, mobile behavior, area calculations against known geometry, and source response formats. Record defects and fix before expansion.
2. Test search with public landmarks and addresses, test parcel selection with multiple known Hays County sites, verify coverage, vintage, terms and source schema; avoid displaying owner names. Research authoritative statewide parcel service before expanding.
3. Habitat polygon intersection implemented in 0.6. Test on small public parks and cross-ecoregion boundaries; compare against independently calculated QGIS intersections; test holes, multipart sites, incomplete data and request failure.
4. Add land cover and tree canopy; soil types and attributes; elevation range, slope and aspect; hydrology, wetlands and flood zones.
5. Add dated biodiversity occurrences and field survey measurements, keeping observations, modeled potential and recommendations distinct.
6. Add baseline comparisons and reproducible ecological reports.
7. Expand the two-map property master plan: test drawing, invalid polygons, mode switching, export and mobile behavior; add private local project import/export, explicit property and zone IDs, field-verification status, sampling points, soil lab records, photo points, plant inventories, management objectives, contractor notes, phases and report generation. Keep observed conditions separate from modeled evidence and proposed actions; preserve a dated baseline rather than overwriting it. Do not upload real client property details to the public repository.

## Project rules
- Zero additional expenses unless explicitly approved. Start on GitHub Pages; reconsider only if scale, usage policies or functionality demand it.
- Game-inspired presentation, scientific measurements. No game mechanics for now.
- Map first; quantify using authoritative sources; show uncertainty, method, date, units and coverage.
- Keep raw observations, source-derived estimates and recommendations separate.
- No made-up measurements, arbitrary scores, or duplicate research without reason.
- Do not infer species-level presence or native cover from mapped habitat.
- Build and test incrementally.

## Address-search patch (0.5.1)
- Numbered street searches first query [Hays County GIS address points, January 2023](https://services6.arcgis.com/XnTA1N5QxtOFa9o8/ArcGIS/rest/services/CODS_Public_Map/FeatureServer/0) through the public City of Dripping Springs service, then try Photon with exact house-number and normalized street matching. Named places continue to use Photon. Results identify their source; no match is preferable to a misleading fuzzy address. Coverage outside Hays County and newer development remains limited. Submitted queries go to the providers; do not submit confidential locations.
- Clear/reset and manual drawing now reset the parcel status text. User reports named place search, aerial imagery and boundary measurement working; exact-address patch confirmed working by user on November 24, 2026. JavaScript syntax and four synthetic address matching checks passed; no private address tested remotely.

## Workspace redesign (0.7)
- Desktop defaults to 55% map / 45% data (minimum 420 px data column); optional wider-map button. Mobile retains stacked layout. Leaflet resizes with the map container.
- Explore, Property, Point data and Plan sections preserve active map and study state. A finished boundary displays summary metrics across sections. Click an analyzed habitat class or a visible habitat polygon inside the finished study area to inspect class-level acreage, square footage, percent of total boundary, TPWD class name and code; independent checkboxes toggle visibility, with zoom-to-class control.
- Fixed habitat label contrast, hidden control visibility, and moved the analysis action adjacent to study geometry controls in 0.6.1. Negligible rounding residuals are omitted from display only; CSV retains the raw remainder.
- User screenshot confirms a successful habitat analysis for a drawn study area (three mapped classes, displayed coverage 100%); this does not independently validate spatial accuracy. Browser QA of 0.7 and comparison with independent GIS calculations remain pending.

## Data integrity and export acceptance criteria (2026-11-24)
Data integrity takes precedence over apparent completeness. The website must not fabricate environmental values or replace missing information with zero. These rules apply to every future dataset and report.

- Distinguish successful source retrieval, modeled estimates, field measurements, user-entered proposals, unavailable service, no data returned, not analyzed, partial coverage, outside coverage, and previously saved results. These states are not interchangeable. Zero is a valid measurement only when supported by the source and method.
- For each measurement retain the provider, dataset and source link, dataset vintage/version when known (otherwise explicitly unknown), UTC retrieval time, units, spatial extent, method, coverage, and limitations. A successful retrieval date is not the date of observation. Mapped habitat is not verified current vegetation, a species inventory, or a native cover estimate.
- Validate responses, required fields, numeric values and documented no-data sentinels; check pagination/record limits, geometry validity, area consistency and overlapping classes. Do not silently treat malformed responses or undocumented missing fields as valid data. Withhold totals if required inputs are incomplete unless a scientifically justified partial result is clearly labeled with coverage and denominator.
- Give readable errors and a retry path, preserve unrelated successful results, and never silently substitute another source or show old results for a changed boundary. Saved results are historical snapshots, not refreshed observations. Do not expose secrets or private client data in logs, reports or the public repository.
- Test network failures, timeouts, service errors returned with HTTP 200, invalid JSON, missing fields, empty responses, truncated results, unknown dataset vintage, legitimate zeros, boundary changes and stale responses. Compare spatial statistics with independent GIS calculations. Successful requests alone do not establish scientific accuracy.
- Current exports are separate boundary GeoJSON, zone GeoJSON and habitat CSV. A future complete-property export must include the selected boundary, zone geometry and notes, available measurements, clipped analysis geometry where appropriate, field observations, data status for every included/planned measurement, source registry, timestamps, methodology and limitations. Unavailable or unmeasured numeric values must be null/blank with an explicit status, not zero. Preserve data provenance in CSV and local project files, and do not include unrelated raw agency datasets or imagery unless explicitly supported and licensed. Export/import of a full project and a unified human-readable report are planned, not implemented.
- Current alpha already rejects failed/incomplete habitat queries and substantial overlap, clears results on boundary change, and displays errors for several failed lookups. Remaining QA includes explicit provider status per dataset, point request timeouts/schema/sentinel validation, consistent no-coverage vs empty-result labels, distinguishing unknown class names from classified coverage, simulated failure tests, and unified exports. Do not claim these planned safeguards are already complete.

## Client deliverable roadmap — Ecological Property Master Plan
Proposed Glass Root Garden client packet connecting Wildlands Explorer, field assessments and existing regional botanical/pollinator dashboards. This is a design specification, not an implemented report generator. Maintain an attractive, accessible visual narrative with a technical appendix; generate only sections supported by the purchased service scope and available evidence.

| Section | Content / input |
| --- | --- |
| Cover & executive snapshot | Client-approved property identifier, assessment date, study area, goals, key findings, top three next actions; no arbitrary ecological score |
| Existing conditions map | Dated aerial imagery, boundary, mapped habitats and field-verified zones, photos and legend, scale, north arrow, source dates |
| Environmental baseline | Habitat composition, soils, terrain, canopy, land cover, hydrology as available; chart, acreage, percent, units, status and interpretation for each |
| Field evidence | Dated plant inventory, invasive observations, soil/lab results, photo points, sampling methods and limitations; keep separate from modeled values |
| Biodiversity & plant selection | Link to regional native plant, grass identification, specialist bee and Lepidoptera dashboards; record county range evidence, host relationship sources and local occurrence separately; distinguish documented on-site presence, nearby observations, habitat potential and proposed species; recommend straight species meeting the approved regional native range; no unsupported ecosystem benefit claims |
| Proposed management map | Numbered zones, objectives, proposed plant communities, restoration treatments, access/constraints and areas to protect; distinguish proposed from observed |
| Zone action sheets | Existing condition, target condition, area, priority, selected plants and quantities if designed, establishment and maintenance actions, field-verification needs |
| Implementation & stewardship | Prioritized phases, seasonal tasks, monitoring indicators and repeat measurement methods; only include quantities, costs and schedules when supported and agreed |
| Technical appendix | Data source URLs, dataset vintages, retrieval dates, methods, coverage, unavailable data, field records, qualifications and applicable limitations |

Deliverables should be scoped to the actual service: consultation may produce a short summary/action list; biodiversity and ecological health assessment adds baseline and evidence; native landscape design adds proposed map and zone sheets; installation/contractor coordination adds implementation details; long-term stewardship adds monitoring and repeat comparisons; soil testing adds documented lab interpretation. No requirement that every client receive every section. Full master plan is modular, not a fixed-size mandatory package.

Implementation sequence: (1) common data/status/provenance schema; (2) local project save/import with immutable dated baseline and separate proposed zones; (3) complete structured export including missing statuses; (4) additional environmental datasets and versioned integrations with existing dashboards; (5) printable browser report template with preview, section selection, source appendix and review gate, then print-to-PDF without paid services. No live client records, addresses, photographs or confidential notes committed to the public repository. A report is a saved dated snapshot, not a claim of current conditions. Verify map image reuse and attribution terms before embedding/exporting. Keep professional/paid service deployment consistent with hosting terms; use a permitted free hosting alternative if necessary.

## Consulting integration foundation (0.7.2)
- Property → Export property snapshot (JSON) downloads a browser-local, versioned snapshot. Existing CSV and GeoJSON exports remain available. See [the export contract](docs/consulting-property-export.md) and [v1 JSON Schema](schemas/property-snapshot-v1.schema.json).
- Current data includes boundary metrics, source metadata, clipped habitat geometry and statistics, property-scoped point lookups and separate existing/proposed zones. Random IDs identify property, zone, point and snapshot. IDs remain stable for the exact selected boundary during the session; saved IDs persist in the JSON, but re-import is not implemented. Select a finished boundary before drawing zones; switching properties excludes previous zones from the active export. No client data uploaded by this feature. External GIS requests still transmit required coordinates; downloaded files are not encrypted.
- Six modular report definitions and missing-data sections for field inventories, lab results, biodiversity/nativity, host relationships, photographs, monitoring and recommendations are reserved. These collectors, dashboard connections, combined GIS export, project import and PDF report generation are not implemented. The GIS feature roadmap continues; no additional infrastructure or duplicated datasets introduced.
- Export builder synthetic tests cover missing numeric values, evidence separation, 50% partial coverage, property isolation, duplicate IDs and serialization. Browser testing, schema-validator execution and independent spatial QA remain pending. Earlier roadmap language about future structured export is superseded by this initial snapshot implementation.

## Soil mapping phase 1 (0.8)
- Optional SSURGO map-unit overlay from [USDA NRCS Soil Data Access WMS](https://sdmdataaccess.nrcs.usda.gov/Spatial/SDM.wms), MapunitPoly layer, WMS 1.1.1, transparent PNG. See [official service documentation](https://sdmdataaccess.nrcs.usda.gov/webservicehelp.aspx) and [layer help](https://sdmdataaccess.nrcs.usda.gov/LayerHelp.htm).
- Toggle in Explore > Map views or Property > Soils; independent opacity and visible status for off, zoom required, loading, failed tiles and loaded tiles (coverage unverified). Only requests at zoom 13 or closer; USDA applies its own scale thresholds. A blank tile is not proof of absent soils. No paid services or local national soil dataset.
- JSON snapshot records soil overlay source and display status; quantitative soil_map remains not_implemented. No soil acreage, percentages, properties or laboratory results are invented. Source registry records unknown vintage. No imagery is exported.
- Next: test actual tiles in browser at known Hays County sites; query SSURGO polygons by study boundary, verify complete response and metadata, calculate clipped composition with coverage/overlap checks, then add documented map-unit/component/horizon attributes. Preserve soil data in the existing snapshot schema. Do not conflate mapped estimates and field soil samples.
- JavaScript syntax and interface ID checks passed; live WMS rendering and coverage not independently tested.

## Soil map visibility patch (0.8.1)
- Persistent Show USDA soils and Soil settings controls; enabling soils zooms to at least 15. Default opacity 80%, independent layer ordering and retry control.
- Default source is the official [USDA NRCS cg_soils MUPolygon ArcGIS service](https://apps.geo.fpac.usda.gov/nrcs-geodata/rest/services/soils/cg_soils/MapServer/0), rendered by transparent map export requests. Original SDA WMS is explicitly selectable; no automatic source substitution. Snapshot tracks selected source and display status. Service-level metadata reports FY2026 (2026-05-08) but layer description still says FY2015; vintage conflict remains unresolved. No soil calculations or invented attributes.
- Source metadata verified, but actual image responses and deployed browser rendering remain unverified. Blank tiles do not establish absence of mapped soils. Syntax and interface ID checks passed.
