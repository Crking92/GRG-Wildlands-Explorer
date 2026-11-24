# Wildlands Explorer
Glass Root Garden · Land & Ecology

A free, public, educational web map for exploring, measuring and understanding real landscapes. Start in Hays County, Texas. The design is inspired by exploration games; no achievements, points, leaderboards or artificial ecological scores.

## Alpha 0.4
- Real aerial imagery and topographic basemaps from USGS.
- TPWD ecological communities overlay with opacity adjustment and source legend.
- Draw a study area, estimate acreage and perimeter using Turf, and export GeoJSON.
- Inspect a map point for TPWD mapped habitat and USGS elevation (external lookups; not yet browser-tested).
- Mobile-responsive dark green interface, compass and coordinate navigation.
- Address and place search via Photon / OpenStreetMap (explicit submit, temporary in-memory caching and per-browser request spacing; public demo service for reasonable usage only, no availability guarantee).
- Experimental parcel point selection via City of Dripping Springs public GIS layer sourced from Hays CAD; preserves full Polygon/MultiPolygon and holes, requests only ID, county and dataset vintage fields, not owner information. Coverage, currency, terms and browser response still require verification. Manual boundaries remain available.
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
3. Quantify TPWD habitat acres and percentages by spatial intersection or clearly documented raster zonal statistics, including unmapped area.
4. Add land cover and tree canopy; soil types and attributes; elevation range, slope and aspect; hydrology, wetlands and flood zones.
5. Add dated biodiversity occurrences and field survey measurements, keeping observations, modeled potential and recommendations distinct.
6. Add baseline comparisons and reproducible ecological reports.

## Project rules
- Zero additional expenses unless explicitly approved. Start on GitHub Pages; reconsider only if scale, usage policies or functionality demand it.
- Game-inspired presentation, scientific measurements. No game mechanics for now.
- Map first; quantify using authoritative sources; show uncertainty, method, date, units and coverage.
- Keep raw observations, source-derived estimates and recommendations separate.
- No made-up measurements, arbitrary scores, or duplicate research without reason.
- Do not infer species-level presence or native cover from mapped habitat.
- Build and test incrementally.
