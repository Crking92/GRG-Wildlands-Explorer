# Consulting property export contract — v1.0.0

Implemented in Wildlands Explorer alpha 0.7.2. This document and the JSON Schema describe the initial export, not a finished report or field data application.

## Current data flow
Select or draw a study area → analyze habitats → optionally inspect points inside the study area → draw existing/proposed zones → Property → Export property snapshot (JSON).

The export is an explicitly downloaded, private local file. No client data are written by the exporter to GitHub, a cloud database or browser persistent storage. It is not encrypted. Keep it on an appropriately protected device. Public map/search/point services still receive the coordinates or text needed for their requests. No customer records, addresses, photos, notes or completed reports belong in public GitHub.

Each exact boundary and boundary type receives a random property ID within the session; reselecting the same geometry in the same session reuses it. Each zone and point receives an independent random ID. New/different geometry receives a different property ID, not a silent revision. Each download has a snapshot ID and UTC timestamp. IDs are retained in downloaded files; reuse across sessions awaits import. Scope zones and point estimates by property ID; selecting another property hides prior zones and excludes them from its export. Export each property before leaving; session data are lost on reload. Boundary selection is required before drawing zones. Existing zones are not field-verified merely because they are called existing conditions. Zone polygons may extend beyond the boundary or overlap, and their totals must not be added as if disjoint. Point lookups outside the active boundary are displayed but not included as property evidence.

JSON is primary; existing habitat CSV, boundary GeoJSON and zone GeoJSON remain available. A combined GIS export, round-trip import, and report generator are later milestones. The export includes clipped habitat polygons and raw acreage/percentage values, not imagery pixels or unrelated agency datasets. Current visible tile-error status is only a display diagnostic, not evidence of complete imagery coverage.

## Evidence classes and future record fields

Every future record should carry its own stable ID, property ID, optional zone ID, geometry or spatial reference when applicable, evidence kind, status, verification, source IDs, observation date or unknown, retrieval timestamp, method, units, coverage and uncertainty. Null/empty records with a missing status are not zero. All fields below are proposed record contracts for future implementation; reserved sections currently export explicit missing statuses, not fabricated records.

| Section | Intended additional fields |
| --- | --- |
| Field plant inventory | Observation ID, taxon ID/scientific name, count or cover with units, identification confidence, observer, date, optional photo IDs |
| Regional nativity | Taxon ID, county FIPS and status, BONAP source/version, evidence and verification; not an on-site observation |
| Soil samples | Sample ID, point geometry, collection depth/date, method, metric, value/units, instrument, uncertainty |
| Laboratory results | Sample ID, lab and report ID, analyte, method, result, unit, detection limit/qualifier, original report attachment reference |
| Observed wildlife | Observation ID, taxon, date, location, method, evidence/verification |
| Regional biodiversity | Taxon, occurrence record ID, county/region, date, source, spatial resolution; never infer property presence |
| Potential bee and Lepidoptera relationships | Plant and insect taxon IDs, relationship type, host specificity, source citation, regional occurrence evidence, relationship confidence; prediction only, not proof of presence |
| Photographs | Photo ID, capture date/location, viewpoint, caption, rights, local attachment reference and optional checksum; not public upload |
| Monitoring points | Point ID, geometry, installation date, protocol, repeat photo direction, site/zone reference |
| Native plant communities | Recommendation ID, zone, candidate taxa, native-range evidence, site suitability rationale, design quantities if supported, verification needs |
| Objectives and management | Objective/action ID, zone, baseline/target, indicator, priority, method, timing, constraints and evidence |
| Monitoring history | Dated survey/snapshot IDs, measurement records, method version, comparable baseline, changes and limitations; preserve immutable snapshots |

Reuse versioned taxon and occurrence identifiers and existing Glass Root Garden dashboard data rather than re-scraping or duplicating datasets. Integrations are not yet connected. BONAP county range and host associations require source verification; regional occurrence, predicted ecological relationships and observed on-site records must remain separate.

## Six report modules (proposed mapping)
Basic consultation; biodiversity and ecological health assessment; native landscape design; installation and contractor coordination; soil testing and interpretation; long-term stewardship. The full master plan combines selected modules. The template IDs and input groups are reserved in JSON. No PDFs generated yet. Final titles, layout and service scope can be adjusted without changing evidence records.

## Validation
Structural schema: schemas/property-snapshot-v1.schema.json. The builder checks property associations, zone ID uniqueness, finite area, point record structure and habitat total agreement. This is not full GeoJSON or scientific validation. Browser QA, failure simulation, independent GIS comparison, attachment handling and round-trip validation are pending. Add new typed record schemas as each field module is implemented; do not claim that reserved sections are functional collectors.
