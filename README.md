# Wildlands Explorer
Glass Root Garden · Land & Ecology

A free, public, educational web map for exploring, measuring and understanding real landscapes. Start in Hays County, Texas. The design is inspired by exploration games; no achievements, points, leaderboards or artificial ecological scores.

## Alpha 0.7
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
- Desktop defaults to 46% map / 54% data (minimum 420 px data column); optional wider-map button. Mobile retains stacked layout. Leaflet resizes with the map container.
- Explore, Property, Point data and Plan sections preserve active map and study state. A finished boundary displays summary metrics across sections. Click an analyzed habitat class or a visible habitat polygon inside the finished study area to inspect class-level acreage, square footage, percent of total boundary, TPWD class name and code; independent checkboxes toggle visibility, with zoom-to-class control.
- Fixed habitat label contrast, hidden control visibility, and moved the analysis action adjacent to study geometry controls in 0.6.1. Negligible rounding residuals are omitted from display only; CSV retains the raw remainder.
- User screenshot confirms a successful habitat analysis for a drawn study area (three mapped classes, displayed coverage 100%); this does not independently validate spatial accuracy. Browser QA of 0.7 and comparison with independent GIS calculations remain pending.
