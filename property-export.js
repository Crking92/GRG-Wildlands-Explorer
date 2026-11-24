/* Glass Root Garden — browser-local, versioned consulting data export.
 * No fetch, storage, analytics or upload. Only explicit download by the caller.
 */
(function(root){
'use strict';
const version='1.0.0';
const statuses=['retrieved','estimated','field_verified','partial_coverage','unavailable','no_data','not_analyzed','not_surveyed','not_measured','not_implemented','not_field_verified','proposed','predicted','historical','in_progress','canceled'];
const sources={
 boundary_drawn:{provider:'User',dataset:'Drawn study boundary',url:null,vintage:null,limitations:'Approximate geometry; not a legal survey.'},
 hays_parcels:{provider:'Hays CAD via City of Dripping Springs',dataset:'Public parcel polygons',url:'https://services6.arcgis.com/XnTA1N5QxtOFa9o8/ArcGIS/rest/services/CODS_Public_Map/FeatureServer/6',vintage:null,limitations:'Coverage and source currency require verification; not a legal survey.'},
 tpwd_ems:{provider:'Texas Parks and Wildlife / MoRAP',dataset:'Texas Ecological Mapping Systems 2020 service',url:'https://tpwd.texas.gov/server/rest/services/Vegetation_Mapping/Texas_Ecological_Mapping_Systems_Data_2020/MapServer',vintage:'2020 service label; observation dates not established',limitations:'Modeled communities, not field-confirmed vegetation or species presence.'},
 usgs_aerial:{provider:'USGS / USDA',dataset:'USGS Imagery Only basemap',url:'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer',vintage:null,limitations:'Image acquisition date unknown; imagery not included in export.'},
 usgs_topo:{provider:'USGS',dataset:'USGS National Map topography',url:'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer',vintage:null,limitations:'Composite reference map; not exported as imagery.'},
 usda_sda_tabular:{provider:'USDA NRCS',dataset:'Soil Data Access SSURGO mapunit/component/chorizon tables',url:'https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest',vintage:null,limitations:'Representative soil survey values; spatial and tabular vintage equivalence unverified. Component percentages are not measured property coverage.'},
 usda_ssurgo_rest:{provider:'USDA NRCS',dataset:'SSURGO cg_soils MUPolygon ArcGIS map service',url:'https://apps.geo.fpac.usda.gov/nrcs-geodata/rest/services/soils/cg_soils/MapServer/0',vintage:'Service metadata reports FY2026 update, 2026-05-08; layer description still says FY2015, vintage conflict unresolved',limitations:'Mapped soil map units and calculated polygon intersections; not actual soil samples or laboratory measurements. Map units may include multiple components.'},
 usda_ssurgo:{provider:'USDA NRCS',dataset:'SSURGO soil map unit polygons via Soil Data Access WMS',url:'https://sdmdataaccess.nrcs.usda.gov/Spatial/SDM.wms',vintage:null,limitations:'Visual reference only; soil map units may contain multiple components. No parcel composition or field measurements calculated.'},
 mrlc_canopy_wms:{provider:'USDA Forest Service / MRLC',dataset:'NLCD CONUS tree canopy WMS',url:'https://www.mrlc.gov/geoserver/mrlc_NLCD-Tree-Canopy-Native_conus_year_data/wms',vintage:null,limitations:'Styled 30 m map only; requested date recorded in map display context, coverage and numerical acreage not calculated.'},
 mrlc_land_wms:{provider:'USGS / MRLC',dataset:'Annual NLCD land cover WMS',url:'https://www.mrlc.gov/geoserver/mrlc_Land-Cover-Native_conus_year_data/wms',vintage:null,limitations:'Styled 30 m map only; requested date recorded in map display context, coverage and numerical acreage not calculated.'},
 mrlc_impervious_wms:{provider:'USGS / MRLC',dataset:'Annual NLCD fractional impervious surface WMS',url:'https://www.mrlc.gov/geoserver/mrlc_Fractional-Impervious-Surface-Native_conus_year_data/wms',vintage:null,limitations:'Styled 30 m map only; requested date recorded in map display context, coverage and numerical acreage not calculated.'},
 usfs_canopy_image:{provider:'USDA Forest Service / GeoPlatform',dataset:'NLCD CONUS tree canopy ImageServer',url:'https://imagery.geoplatform.gov/iipp/rest/services/Vegetation/USFS_EDW_NLCD_TCC_CONUS/ImageServer',vintage:null,limitations:'30 m source; image display only; requested year from service date range, actual coverage unverified.'},
 nlcd_land_image:{provider:'USGS Annual NLCD / Esri hosted imagery',dataset:'Annual NLCD Land Cover ImageServer',url:'https://di-nlcd.img.arcgis.com/arcgis/rest/services/USA_NLCD_Annual_LandCover/ImageServer',vintage:null,limitations:'30 m source; image display only; requested year and coverage not verified at pixel level.'},
 nlcd_impervious_image:{provider:'USGS Annual NLCD / Esri hosted imagery',dataset:'Annual NLCD Fractional Impervious Surface ImageServer',url:'https://di-nlcd.img.arcgis.com/arcgis/rest/services/USA_NLCD_Annual_LandCover_Fractional_Impervious_Surface/ImageServer',vintage:null,limitations:'30 m source; image display only; no numerical estimates derived from styled maps.'},
 usgs_epqs:{provider:'USGS',dataset:'Elevation Point Query Service / 3DEP',url:'https://epqs.nationalmap.gov/v1/json',vintage:null,limitations:'Point estimate, not a whole-property elevation statistic.'}
};
const sections={
 soil_map:['not_analyzed','Soil map and composition'],
 tree_canopy:['not_implemented','Tree canopy'],
 land_cover:['not_implemented','Land cover and impervious surfaces'],
 terrain:['not_implemented','Whole-property terrain'],
 hydrology:['not_implemented','Hydrology and wetlands'],
 historical_imagery:['not_implemented','Historical imagery'],
 field_plant_inventory:['not_surveyed','Field plant inventory'],
 regional_nativity:['not_implemented','Regional nativity evidence'],
 soil_sampling:['not_measured','Soil sampling locations and measurements'],
 laboratory_results:['not_measured','Laboratory results'],
 observed_wildlife:['not_surveyed','On-site wildlife observations'],
 regional_biodiversity:['not_implemented','Regional biodiversity records'],
 potential_bee_relationships:['not_implemented','Documented potential bee relationships'],
 potential_lepidoptera_relationships:['not_implemented','Documented potential Lepidoptera relationships'],
 photographs:['not_implemented','Photographs and attachment references'],
 monitoring_points:['not_implemented','Permanent monitoring locations'],
 recommended_native_communities:['not_implemented','Recommended native plant communities'],
 restoration_objectives:['not_implemented','Structured restoration objectives'],
 management_recommendations:['not_implemented','Structured management recommendations'],
 monitoring_history:['not_implemented','Historical monitoring records']
};
const templates=[
 {id:'consultation',title:'Basic consultation',inputs:['property','environment','maps','recommendations']},
 {id:'ecological_assessment',title:'Biodiversity and ecological health assessment',inputs:['property','environment','maps','field_observations','regional_evidence','potential_relationships']},
 {id:'native_landscape_design',title:'Native landscape design',inputs:['property','maps','regional_evidence','recommendations','potential_relationships']},
 {id:'installation_coordination',title:'Installation and contractor coordination',inputs:['property','maps','recommendations']},
 {id:'soil_testing',title:'Soil testing and interpretation',inputs:['property','environment','field_observations']},
 {id:'stewardship',title:'Long-term stewardship',inputs:['property','maps','monitoring','field_observations','recommendations']}
];
const copy=x=>JSON.parse(JSON.stringify(x));
function section(status,label,records=[],detail=null){if(!statuses.includes(status))throw Error('Unknown status '+status);return {status,label,records,detail}}
function absent(key){return section(...sections[key])}
function finite(v){if(typeof v!=='number'||!Number.isFinite(v))throw Error('Invalid numeric measurement');return v}
function polygon(f){if(f?.type!=='Feature'||!['Polygon','MultiPolygon'].includes(f.geometry?.type))throw Error('Missing polygon geometry');return copy(f)}
function propertyId(value){if(typeof value!=='string'||!value)throw Error('Missing property ID');return value}
function build(input){
 const id=propertyId(input.property_id),snapshot=propertyId(input.snapshot_id),site=polygon(input.boundary),acres=finite(input.acres),perimeter=finite(input.perimeter_ft);
 if(acres<=0||perimeter<=0)throw Error('Invalid study area');
 const source=input.boundary_source==='hays_parcels'?'hays_parcels':'boundary_drawn';
 // Whitelist public parcel metadata; never carry arbitrary feature properties.
 const parcel=source==='hays_parcels'?{parcel_id:site.properties?.prop_id??null,tax_year:site.properties?.tax_year??null,county:site.properties?.county??null,date_acquired:site.properties?.date_acq??null}:null;
 site.properties={property_id:id,source_id:source,approx_acres:acres,approx_perimeter_ft:perimeter};
 const seen=new Set();
 function mapZones(list,layer){return (list||[]).map(z=>{if(z.properties?.property_id!==id||z.properties?.layer!==layer)throw Error('Zone is not associated with this property and layer');const f=polygon(z),p=f.properties;if(typeof p.zone_id!=='string'||!p.zone_id||seen.has(p.zone_id))throw Error('Missing or duplicate zone ID');seen.add(p.zone_id);f.properties={property_id:id,zone_id:p.zone_id,layer,name:p.name??null,notes:p.notes??null,approx_acres:finite(p.approx_acres),approx_sqft:finite(p.approx_sqft),created_at:p.created_at??null,evidence_kind:layer==='existing'?'user_entered_existing_condition':'proposed_recommendation',verification_status:layer==='existing'?'not_field_verified':'proposed',source_id:'boundary_drawn'};return f})}
 const existing=mapZones(input.existing,'existing'),proposed=mapZones(input.proposed,'proposed');
 const h=input.habitat;
 let habitat;
 if(h?.data){
  const d=h.data,total=finite(d.total),covered=finite(d.covered),gap=finite(d.gap),overlap=finite(d.overlap);if(total<=0||covered<0||gap<0||covered>total||Math.abs(total-acres*4046.8564224)>Math.max(.1,total*.0001))throw Error('Habitat result does not match study area');
  const records=d.rows.map(r=>{const area=finite(r.area);if(area<=0||area>total+Math.max(.1,total*.0001))throw Error('Invalid habitat area');return {class_id:r.code||null,class_name:r.name||null,classification_status:r.code&&r.name&&r.name!=='Unclassified source polygon'?'mapped_class':'unknown_class',area_acres:area/4046.8564224,percent_of_study_area:area/total*100,geometry:polygon(r.geometry).geometry,color:r.color??null}});
  const identified=records.filter(r=>r.classification_status==='mapped_class').reduce((s,r)=>s+r.area_acres*4046.8564224,0);
  const coverage=Math.min(total,identified)/total*100;
  const status=!records.length?'no_data':coverage<99.99?'partial_coverage':'estimated';
  habitat={...section(status,'Mapped habitat composition',records,'Modeled estimate; not field verified. No returned polygons do not establish absence.'),source_id:'tpwd_ems',retrieved_at:d.retrieved??null,method:'Turf 7.2 polygon intersection, same-class dissolve, geodesic area, overlap check; denominator is full study area',study_area_acres:total/4046.8564224,mapped_polygon_coverage_percent:covered/total*100,identified_class_coverage_percent:coverage,unmapped_area_acres:gap/4046.8564224,unmapped_percent:gap/total*100,minor_overlap_m2:overlap,verification_status:'not_field_verified',evidence_kind:'mapped_estimate'};
 }else habitat={...section(h?.status||'not_analyzed','Mapped habitat composition',[],h?.detail??null),source_id:'tpwd_ems',retrieved_at:null,method:'Turf polygon intersection; no result available',study_area_acres:acres,mapped_polygon_coverage_percent:null,identified_class_coverage_percent:null,unmapped_area_acres:null,unmapped_percent:null,minor_overlap_m2:null,verification_status:'not_field_verified',evidence_kind:'mapped_estimate'};
 const soilInput=input.soil;let soil;
 const soilMethod='Turf 7.2 polygon intersection, dissolve by MUKEY, geodesic area and overlap checks; denominator full study boundary';
 const soilBase={source_id:'usda_ssurgo_rest',method:soilMethod,study_area_acres:acres,verification_status:'not_field_verified',evidence_kind:'mapped_estimate'};
 if(soilInput?.data){
  const d=soilInput.data,total=finite(d.total),covered=finite(d.covered),gap=finite(d.gap),overlap=finite(d.overlap),tol=Math.max(.1,total*.0001);
  if(total<=0||covered<0||gap<0||overlap<0||covered>total||Math.abs(total-acres*4046.8564224)>tol||Math.abs(covered+gap-total)>tol||overlap>tol)throw Error('Soil result does not match the study area');
  const keys=new Set();
  function profile(r){const p=r.profile;if(!p)return {status:'not_analyzed',source_id:'usda_sda_tabular',map_unit_key:r.key,components:[],retrieved_at:null};if(p.map_unit_key!==r.key||p.source_id!=='usda_sda_tabular'||!['retrieved','no_data','unavailable','canceled','in_progress'].includes(p.status)||!Array.isArray(p.components))throw Error('Invalid soil profile association');return copy(p)}
  const records=d.rows.map(r=>{const area=finite(r.area);if(area<=0||area>total+tol||!r.key||!r.symbol||!r.name||!r.survey||keys.has(r.key))throw Error('Invalid soil map unit');keys.add(r.key);return {mukey:r.key,musym:r.symbol,muname:r.name,areasymbol:r.survey,mukind:r.kind??null,nationalmusym:r.national??null,spatial_versions:copy(r.spatial_versions||[]),soil_profile:profile(r),area_acres:area/4046.8564224,percent_of_study_area:area/total*100,geometry:polygon(r.geometry).geometry,color:r.color??null}});
  const sum=records.reduce((v,r)=>v+r.area_acres*4046.8564224,0);if(Math.abs(sum-covered-overlap)>tol)throw Error('Soil class areas are inconsistent');
  const status=!records.length?'no_data':gap>tol?'partial_coverage':'estimated';
  soil={...section(status,'Mapped soil composition',records,'Soil survey estimates. No returned polygons do not establish absence of soil.'),...soilBase,retrieved_at:d.retrieved??null,mapped_polygon_coverage_percent:covered/total*100,unmapped_area_acres:gap/4046.8564224,unmapped_percent:gap/total*100,minor_overlap_m2:overlap,component_and_horizon_status:records.length&&records.every(r=>r.soil_profile.status==='retrieved')?'retrieved':records.some(r=>r.soil_profile.status==='retrieved')?'partial_coverage':records.some(r=>r.soil_profile.status==='in_progress')?'in_progress':records.some(r=>r.soil_profile.status==='unavailable')?'unavailable':records.length&&records.every(r=>r.soil_profile.status==='no_data')?'no_data':'not_analyzed'};
 }else soil={...section(soilInput?.status||'not_analyzed','Mapped soil composition',[],soilInput?.detail??null),...soilBase,retrieved_at:null,mapped_polygon_coverage_percent:null,unmapped_area_acres:null,unmapped_percent:null,minor_overlap_m2:null,component_and_horizon_status:'not_analyzed'};
 const points=(input.points||[]).map(p=>{if(p.property_id!==id)throw Error('Point belongs to another property');if(!p.point_id||p.geometry?.type!=='Point'||p.geometry.coordinates?.length!==2||!p.geometry.coordinates.every(Number.isFinite)||!statuses.includes(p.habitat?.status)||!statuses.includes(p.elevation?.status))throw Error('Invalid point record');return copy(p)});
 const pointStates=points.flatMap(p=>[p.habitat.status,p.elevation.status]);const pointStatus=!points.length?'not_analyzed':pointStates.every(s=>s==='estimated')?'estimated':pointStates.some(s=>s==='estimated')?'partial_coverage':pointStates.includes('in_progress')?'in_progress':pointStates.includes('unavailable')?'unavailable':pointStates.every(s=>s==='no_data')?'no_data':'not_analyzed';
 return {schema_version:version,format:'grg_property_snapshot',snapshot_id:snapshot,exported_at:input.exported_at,app_version:input.app_version,privacy:{classification:'private_local_client_record',storage:'explicit local download; no upload by exporter',contains_coordinates:true},property:{property_id:id,boundary:site,area_acres:acres,perimeter_ft:perimeter,source_id:source,parcel_metadata:parcel,boundary_recorded_at:input.boundary_recorded_at??null,method:'Turf 7.2 geodesic area and boundary length; approximate, not legal survey',verification_status:'not_field_verified'},source_registry:copy(sources),map_display_context:input.map_display_context?copy(input.map_display_context):null,environment:{habitat_composition:habitat,soil_map:soil,tree_canopy:absent('tree_canopy'),land_cover:absent('land_cover'),terrain:absent('terrain'),hydrology:absent('hydrology'),historical_imagery:absent('historical_imagery'),point_estimates:section(pointStatus,'Mapped point estimates',points,'Point values only; status per measurement. Not a site-wide measurement.')},maps:{existing_conditions:section(existing.length?'not_field_verified':'not_surveyed','Existing conditions zones',existing,'User-drawn conditions, not field verified.'),proposed_management:section(proposed.length?'proposed':'not_analyzed','Proposed management zones',proposed,'Planning suggestions, not existing conditions.')},field_observations:{plant_inventory:absent('field_plant_inventory'),soil_sampling:absent('soil_sampling'),laboratory_results:absent('laboratory_results'),wildlife:absent('observed_wildlife'),photographs:absent('photographs')},regional_evidence:{nativity:absent('regional_nativity'),biodiversity:absent('regional_biodiversity')},potential_relationships:{bees:absent('potential_bee_relationships'),lepidoptera:absent('potential_lepidoptera_relationships')},recommendations:{native_communities:absent('recommended_native_communities'),restoration_objectives:absent('restoration_objectives'),management:absent('management_recommendations')},monitoring:{permanent_points:absent('monitoring_points'),history:absent('monitoring_history')},report_templates:templates.map(t=>({...t,status:'not_implemented'})),limitations:['This is a dated snapshot, not a current field survey or validated report.','Empty records with a missing-data status do not mean zero.','Field inventories, laboratory records, dashboard connections, attachments, history, project import and PDF generation are not implemented in this alpha.','Existing and proposed zones may overlap; their totals are not additive.','Client data must not be committed to public repositories. External map and point requests are separate from the local export.']};
}
root.GRGPropertyExport=Object.freeze({version,build,statuses:[...statuses]});
})(globalThis);
