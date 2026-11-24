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
 usfs_canopy_image:{provider:'USDA Forest Service / GeoPlatform',dataset:'NLCD CONUS tree canopy ImageServer',url:'https://imagery.geoplatform.gov/iipp/rest/services/Vegetation/USFS_EDW_NLCD_TCC_CONUS/ImageServer',vintage:null,limitations:'30 m source; visual display and experimental native-grid estimates; source revision and independent scientific validation pending.'},
 nlcd_land_image:{provider:'USGS Annual NLCD / Esri hosted imagery',dataset:'Annual NLCD Land Cover ImageServer',url:'https://di-nlcd.img.arcgis.com/arcgis/rest/services/USA_NLCD_Annual_LandCover/ImageServer',vintage:null,limitations:'30 m source; visual display and experimental native-grid estimates; source revision and independent scientific validation pending.'},
 nlcd_impervious_image:{provider:'USGS Annual NLCD / Esri hosted imagery',dataset:'Annual NLCD Fractional Impervious Surface ImageServer',url:'https://di-nlcd.img.arcgis.com/arcgis/rest/services/USA_NLCD_Annual_LandCover_Fractional_Impervious_Surface/ImageServer',vintage:null,limitations:'30 m source; visual display and experimental raw native-grid estimates, never derived from styled maps.'},
 usgs_nhd_legacy:{provider:'USGS',dataset:'Legacy NHD Flowline - Large Scale (6)',url:'https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/6',vintage:null,limitations:'NHD maintenance retired October 1, 2023; stream/river features only; mapped permanence is not current flow.'},
 usgs_wbd_huc12:{provider:'USGS',dataset:'Watershed Boundary Dataset HUC12 (6)',url:'https://hydro.nationalmap.gov/arcgis/rest/services/wbd/MapServer/6',vintage:null,limitations:'Regional hydrologic units, not site-specific drainage. Parent codes derived from HUC12; parent names not retrieved.'},
 usfws_nwi:{provider:'US Fish and Wildlife Service',dataset:'National Wetlands Inventory Wetlands layer 0',url:'https://fwspublicservices.wim.usgs.gov/wetlandsmapservice/rest/services/Wetlands/MapServer/0',vintage:null,limitations:'Mapped biological wetlands and deepwater features, not jurisdictional delineation. Areas outside returned polygons are not confirmed upland.'},
 fema_nfhl:{provider:'FEMA',dataset:'National Flood Hazard Layer, effective Flood Hazard Zones (28)',url:'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28',vintage:null,limitations:'Effective map designations, not actual flood events or legal determinations. Individual effective dates not retrieved. Unmapped and undetermined areas are not safe by default.'},
 usgs_3dep_dem:{provider:'USGS',dataset:'3DEP Bare Earth DEM dynamic mosaic',url:'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer',vintage:null,limitations:'Multi-resolution source mosaic; local acquisition date, original resolution and vertical datum not established. Experimental service-grid estimates.'},
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
 function rasterSection(id,label,sourceId){
  const r=input.rasters?.[id],d=r?.data;const base={source_id:sourceId,year:null,retrieved_at:null,method:'Raw native-grid raster analysis; no result available',evidence_kind:'mapped_estimate',verification_status:'not_field_verified',coverage_percent:null,study_area_acres:acres,valid_area_acres:null,missing_area_acres:null,percent_of_study_area:null,estimated_covered_acres:null};
  if(!d)return {...section(r?.status||'not_analyzed',label,[],r?.detail??null),...base};
  if(d.source_id!==sourceId||d.status!==r.status||!['estimated','partial_coverage','no_data'].includes(d.status)||!Array.isArray(d.records)||!Number.isFinite(d.study_area_acres)||Math.abs(d.study_area_acres-acres)>Math.max(.01,acres*.01))throw Error('Invalid raster result association');
  const v=finite(d.valid_area_acres),m=finite(d.missing_area_acres),total=finite(d.study_area_acres),cov=finite(d.coverage_percent);
  if(v<0||m<0||total<=0||Math.abs(v+m-total)>Math.max(.00001,total*1e-7)||Math.abs(cov-100*v/total)>.0001)throw Error('Raster coverage inconsistent');
  if(d.status!=='estimated'&&(d.percent_of_study_area!==null||d.estimated_covered_acres!==null||d.records.some(x=>x.percent_of_study_area!==null)))throw Error('Incomplete raster has full-site result');
  if(id==='land'&&Math.abs(d.records.reduce((a,x)=>a+finite(x.acres),0)-v)>Math.max(.00001,total*1e-7))throw Error('Land cover areas inconsistent');
  if(id!=='land'&&d.status==='estimated'&&(finite(d.estimated_covered_acres)<0||d.estimated_covered_acres>total+1e-7||Math.abs(finite(d.percent_of_study_area)-100*d.estimated_covered_acres/total)>.0001))throw Error('Fractional raster result inconsistent');
  return {...section(d.status,label,copy(d.records),r.detail??null),...copy(d),experimental:true};
 }
 function floodSection(){
 const f=input.flood,d=f?.data,base={source_id:'fema_nfhl',retrieved_at:null,method:'FEMA polygons intersected with study boundary; dissolved by zone, subtype and SFHA flag; geodesic area',study_area_acres:acres,mapped_coverage_percent:null,unmapped_area_acres:null,undetermined_area_acres:null,designated_sfha_acres:null,designated_sfha_percent:null,known_designated_sfha_acres:null,effective_date:null,evidence_kind:'mapped_estimate',verification_status:'not_field_verified',wetlands_status:input.wetlands?.status||'not_analyzed',streams_status:input.hydro?.stream?.status||'not_analyzed',watersheds_status:input.hydro?.watershed?.status||'not_analyzed',aquifers_status:'not_implemented'};
 if(!d)return {...section(f?.status||'not_analyzed','FEMA mapped flood zones',[],f?.detail??null),...base};
 const total=finite(d.total),covered=finite(d.covered),gap=finite(d.gap),unknown=finite(d.unknown),sfha=finite(d.sfha),overlap=finite(d.overlap),tol=Math.max(.1,total*.0001);
 if(total<=0||Math.abs(total-acres*4046.8564224)>tol||[covered,gap,unknown,sfha,overlap].some(v=>v<0)||covered>total+tol||Math.abs(covered+gap-total)>tol||unknown>covered+tol||sfha>covered+tol||overlap>tol)throw Error('Invalid flood analysis coverage');
 const records=d.rows.map(r=>{const a=finite(r.area);if(a<=0||a>total+tol||![null,'T','F'].includes(r.sfha_flag)||!['floodway','sfha','moderate','minimal','other_mapped','undetermined','unclassified'].includes(r.category))throw Error('Invalid flood zone record');return {zone:r.zone,subtype:r.subtype,sfha_flag:r.sfha_flag,category:r.category,area_acres:a/4046.8564224,percent_of_study_area:a/total*100,geometry:polygon(r.geometry).geometry,source_flood_area_ids:copy(r.source_ids||[]),dfirm_ids:copy(r.dfirm_ids||[]),color:r.color}});
 const sum=records.reduce((a,r)=>a+r.area_acres*4046.8564224,0),sumSfha=records.filter(r=>r.sfha_flag==='T').reduce((a,r)=>a+r.area_acres*4046.8564224,0),sumUnknown=records.filter(r=>['undetermined','unclassified'].includes(r.category)).reduce((a,r)=>a+r.area_acres*4046.8564224,0);
 if(Math.abs(sum-covered-overlap)>tol||Math.abs(sumSfha-sfha)>tol||Math.abs(sumUnknown-unknown)>tol)throw Error('Inconsistent flood zone totals');
 const complete=records.length>0&&gap<=tol&&unknown<=tol,status=!records.length?'no_data':complete?'estimated':'partial_coverage';
 return {...section(status,'FEMA mapped flood zones',records,'Mapped designations, not a flood prediction. No returned polygon or minimal mapped hazard does not establish safety.'),...base,retrieved_at:d.retrieved??null,mapped_coverage_percent:covered/total*100,unmapped_area_acres:gap/4046.8564224,undetermined_area_acres:unknown/4046.8564224,designated_sfha_acres:complete?sfha/4046.8564224:null,designated_sfha_percent:complete?sfha/total*100:null,known_designated_sfha_acres:records.length?sfha/4046.8564224:null,minor_overlap_m2:overlap};
 }
 function wetlandsSection(){
 const w=input.wetlands,d=w?.data,base={source_id:'usfws_nwi',retrieved_at:null,method:'NWI polygons intersected with study boundary, dissolved by wetland type and Cowardin code; geodesic area',study_area_acres:acres,mapped_feature_acres:null,mapped_feature_percent:null,area_outside_returned_features_acres:null,source_mapping_date:null,verification_status:'not_field_verified',evidence_kind:'mapped_estimate'};
 if(!d)return {...section(w?.status||'not_analyzed','NWI wetlands and surface waters',[],w?.detail??null),...base};
 const total=finite(d.total),covered=finite(d.covered),gap=finite(d.gap),overlap=finite(d.overlap),tol=Math.max(.1,total*.0001);
 if(total<=0||Math.abs(total-acres*4046.8564224)>tol||[covered,gap,overlap].some(x=>x<0)||covered>total+tol||Math.abs(covered+gap-total)>tol||overlap>tol)throw Error('Invalid NWI areas');
 const records=d.rows.map(r=>{const a=finite(r.area);if(a<=0||a>total+tol||!r.type||!r.code)throw Error('Invalid NWI feature');return {wetland_type:r.type,cowardin_code:r.code,area_acres:a/4046.8564224,percent_of_study_area:a/total*100,geometry:polygon(r.geometry).geometry,color:r.color}});
 if(Math.abs(records.reduce((a,r)=>a+r.area_acres*4046.8564224,0)-covered-overlap)>tol)throw Error('Inconsistent NWI area totals');
 return {...section(records.length?'estimated':'no_data','NWI wetlands and surface waters',records,'No returned features do not establish absence of wetlands. Areas outside mapped polygons are not verified upland.'),...base,retrieved_at:d.retrieved??null,mapped_feature_acres:records.length?covered/4046.8564224:null,mapped_feature_percent:records.length?covered/total*100:null,area_outside_returned_features_acres:gap/4046.8564224,minor_overlap_m2:overlap};
 }
 function hydroSection(id){
 const r=input.hydro?.[id],d=r?.data,stream=id==='stream',label=stream?'Mapped stream centerlines':'Mapped HUC12 subwatersheds',base={source_id:stream?'usgs_nhd_legacy':'usgs_wbd_huc12',retrieved_at:null,source_mapping_date:null,method:stream?'Clip line segments at property boundaries; sum geodesic lengths of mapped stream/river centerlines.':'Intersect and dissolve polygons by HUC12; geodesic area; parent HUC codes derived from prefix.',verification_status:'not_field_verified',evidence_kind:'mapped_estimate',study_area_acres:acres,...(stream?{mapped_length_m:null,mapped_length_ft:null}:{mapped_coverage_percent:null,area_outside_returned_units_acres:null})};
 if(!d)return {...section(r?.status||'not_analyzed',label,[],r?.detail??null),...base};
 if(!Array.isArray(d.rows))throw Error('Invalid hydrography result');
 if(stream){const records=d.rows.map(x=>{const m=finite(x.meters),g=x.geometry?.geometry;if(m<=0||!g||g.type!=='MultiLineString'||!Array.isArray(g.coordinates)||!g.coordinates.length||g.coordinates.some(l=>!Array.isArray(l)||l.length<2||l.some(p=>!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])||Math.abs(p[0])>180||Math.abs(p[1])>90)))throw Error('Invalid stream record');return {name:x.name??null,reachcode:x.reachcode??null,fcode:x.fcode,kind:x.kind,length_m:m,length_ft:m/.3048,geometry:copy(g)}});
 const sum=records.reduce((s,x)=>s+x.length_m,0);if(records.length&&Math.abs(sum-finite(d.total_meters))>Math.max(.001,sum*1e-8))throw Error('Stream totals inconsistent');
 return {...section(records.length?'estimated':'no_data',label,records,'No mapped features do not establish absence. Legacy NHD stream/river centerlines; not current flow.'),...base,retrieved_at:d.retrieved??null,mapped_length_m:records.length?sum:null,mapped_length_ft:records.length?sum/.3048:null}}
 const total=finite(d.total),covered=finite(d.covered),gap=finite(d.gap),tol=Math.max(.1,total*.0001);
 if(total<=0||Math.abs(total-acres*4046.8564224)>tol||covered<0||gap<0||covered>total+tol||Math.abs(covered+gap-total)>tol)throw Error('Invalid watershed coverage');
 const records=d.rows.map(x=>{const a=finite(x.area);if(a<=0||a>total+tol||!/^\d{12}$/.test(x.huc12)||x.huc10!==x.huc12.slice(0,10)||x.huc8!==x.huc12.slice(0,8)||!x.name)throw Error('Invalid watershed record');return {name:x.name,huc12:x.huc12,huc10:x.huc10,huc8:x.huc8,area_acres:a/4046.8564224,percent_of_study_area:a/total*100,geometry:polygon(x.geometry).geometry}});
 if(Math.abs(records.reduce((s,x)=>s+x.area_acres*4046.8564224,0)-covered)>tol)throw Error('Watershed totals inconsistent');
 return {...section(!records.length?'no_data':gap>tol?'partial_coverage':'estimated',label,records,'Regional hydrologic units; not site-specific drainage boundaries.'),...base,retrieved_at:d.retrieved??null,mapped_coverage_percent:covered/total*100,area_outside_returned_units_acres:gap/4046.8564224};
 }
 function profileSection(){
 const p=input.terrain?.profile;if(!p)return null;
 const coord=v=>Array.isArray(v)&&v.length===2&&v.every(Number.isFinite)&&Math.abs(v[0])<=180&&Math.abs(v[1])<85;
 if(p.property_id!==id||!p.profile_id||!statuses.includes(p.status)||!Array.isArray(p.endpoints)||p.endpoints.length>2||!p.endpoints.every(coord))throw Error('Invalid profile association or endpoints');
 const d=p.data,base={profile_id:p.profile_id,property_id:id,status:p.status,detail:p.detail??null,endpoints:copy(p.endpoints),source_id:'usgs_3dep_dem',source_resolution_m:null,acquisition_date:null,vertical_datum:null,evidence_kind:'mapped_estimate',verification_status:'not_field_verified',scope:'user-defined transect; may extend beyond property'};
 if(!d)return {...base,data:null};
 if(d.source_id!==base.source_id||d.status!==p.status||!['estimated','partial_coverage','no_data'].includes(d.status)||p.endpoints.length!==2||!Array.isArray(d.samples)||d.samples.length<2||d.samples.length>401||d.sample_count!==d.samples.length||!Number.isFinite(d.length_m)||d.length_m<1||d.length_m>5000||![1,2,5,10,20,30].includes(d.requested_grid_m)||d.geometry?.type!=='LineString'||d.geometry.coordinates?.length!==d.samples.length)throw Error('Invalid profile grid or samples');
 const same=(a,b)=>coord(a)&&coord(b)&&a.every((x,i)=>Math.abs(x-b[i])<1e-9);
 const interval=d.length_m/(d.samples.length-1);if(Math.abs(finite(d.sample_interval_m)-interval)>1e-7||!same(p.endpoints[0],d.samples[0].coordinates)||!same(p.endpoints[1],d.samples.at(-1).coordinates))throw Error('Invalid profile interval or endpoints');
 for(const [i,x] of d.samples.entries()){if(!coord(x.coordinates)||!same(x.coordinates,d.geometry.coordinates[i])||Math.abs(finite(x.distance_m)-i*interval)>1e-6||x.elevation_m!==null&&(!Number.isFinite(x.elevation_m)||x.elevation_m< -500||x.elevation_m>9000))throw Error('Invalid profile sample')}
 const v=d.samples.filter(x=>x.elevation_m!==null),n=v.length,missing=d.samples.length-n,expected=!n?'no_data':missing?'partial_coverage':'estimated';
 if(d.status!==expected||d.valid_sample_count!==n||d.missing_sample_count!==missing||Math.abs(finite(d.valid_sample_percent)-100*n/d.samples.length)>1e-7)throw Error('Profile sample coverage inconsistent');
 const lo=n?Math.min(...v.map(x=>x.elevation_m)):null,hi=n?Math.max(...v.map(x=>x.elevation_m)):null;
 if(d.valid_only_min_m!==lo||d.valid_only_max_m!==hi)throw Error('Invalid profile sample extrema');
 if(expected==='estimated'){if(d.min_m!==lo||d.max_m!==hi||Math.abs(finite(d.relief_m)-(hi-lo))>1e-7||![d.lowest_sample,d.highest_sample].every((p,i)=>p&&p.elevation_m===[lo,hi][i]&&v.some(x=>x.distance_m===p.distance_m&&same(x.coordinates,p.coordinates)&&x.elevation_m===p.elevation_m)))throw Error('Profile extrema inconsistent')}
 else if([d.min_m,d.max_m,d.relief_m,d.lowest_sample,d.highest_sample].some(x=>x!==null))throw Error('Incomplete profile has full-line extrema');
 return {...base,data:copy(d)};
 }
 function drainageSection(r=input.terrain?.drainage,isAlternate=false){
 const d=r?.data,base={source_id:'usgs_3dep_dem',evidence_kind:'modeled_terrain_interpretation',verification_status:'not_field_verified',source_resolution_m:null,acquisition_date:null,vertical_datum:null,maximum_local_contributing_area_acres:null,grid:null,coverage_percent:null,limitations:'Local unconditioned terrain screening, not a hydraulic model or a watershed delineation. Outside-grid contributions unknown.'};
 if(!d)return {...section(r?.status||'not_analyzed','Potential drainage',[],r?.detail??null),...base};
 const total=finite(d.study_area_acres),v=finite(d.valid_area_acres),m=finite(d.missing_area_acres),tol=Math.max(.00001,total*1e-7),g=d.grid;
 if(d.source_id!==base.source_id||d.evidence_kind!==base.evidence_kind||r.status!==d.status||!['estimated','partial_coverage','no_data'].includes(d.status)||total<=0||Math.abs(total-acres)>Math.max(.01,acres*.01)||v<0||m<0||Math.abs(v+m-total)>tol||Math.abs(finite(d.coverage_percent)-100*v/total)>.0001)throw Error('Invalid drainage coverage');
 const complete=v>0&&m<=Math.max(.0001,total*4046.8564224*1e-9)/4046.8564224,expected=!v?'no_data':complete?'estimated':'partial_coverage';
 if(d.status!==expected||![1,2,5,10,20,30].includes(d.requested_grid_m)||![100,250,500].includes(d.requested_context_buffer_projected_m)||g?.crs!=='EPSG:3857'||!Number.isInteger(g.width)||!Number.isInteger(g.height)||g.width<3||g.height<3||g.width*g.height>60000||g.width>1000||g.height>1000||!Array.isArray(g.bbox)||g.bbox.length!==4||!g.bbox.every(Number.isFinite)||Math.abs(g.bbox[2]-g.bbox[0]-g.width*d.requested_grid_m)>.001||Math.abs(g.bbox[3]-g.bbox[1]-g.height*d.requested_grid_m)>.001)throw Error('Invalid drainage grid');
 if(d.minimum_requested_grid_m!==undefined&&(![1,2,5,10,20,30].includes(d.minimum_requested_grid_m)||d.minimum_requested_grid_m>d.requested_grid_m))throw Error('Invalid drainage grid preference');
 const n=g.width*g.height,cn=d.context_valid_cells,ca=finite(d.context_valid_area_acres);
 if(d.context_total_cells!==n||!Number.isInteger(cn)||cn<0||cn>n||ca<0||ca+tol<v||Math.abs(finite(d.context_valid_cell_percent)-100*cn/n)>.0001||!Number.isInteger(d.site_cells)||d.site_cells<1||d.site_cells>n)throw Error('Invalid drainage context');
 function checkRow(x){const a=finite(x.area_acres);if(a<0||a>v+tol||(!complete&&x.percent_of_study_area!==null)||(complete&&Math.abs(finite(x.percent_of_study_area)-100*a/total)>.0001)||(!v&&x.percent_of_valid_area!==null)||(v&&Math.abs(finite(x.percent_of_valid_area)-100*a/v)>.0001))throw Error('Invalid drainage class share');return a}
 for(const rows of [d.accumulation_classes,d.routing_classes]){if(!Array.isArray(rows)||rows.length!==5||new Set(rows.map(x=>x.label)).size!==5||rows.some(x=>!x.label)||Math.abs(rows.reduce((s,x)=>s+checkRow(x),0)-v)>tol)throw Error('Drainage classes inconsistent')}
 checkRow(d.edge_or_nodata_influenced_area);
 if(v){const peak=finite(d.maximum_local_contributing_area_acres);if(peak<=0||peak>ca+tol||!Number.isInteger(d.maximum_cell_index)||d.maximum_cell_index<0||d.maximum_cell_index>=n)throw Error('Invalid local contributing area maximum')}else if(d.maximum_local_contributing_area_acres!==null||d.maximum_cell_index!==null)throw Error('No-data drainage has maximum');
 const mfd=d.mfd_comparison??null;
 if(mfd){
  if(mfd.status==='unavailable'){if(mfd.maximum_local_contributing_area_acres!==null||!Array.isArray(mfd.accumulation_classes)||mfd.accumulation_classes.length)throw Error('Unavailable MFD has values')}
  else{
   if(mfd.status!==d.status||mfd.exponent!==1.1||mfd.evidence_kind!=='modeled_terrain_interpretation'||mfd.verification_status!=='not_field_verified'||!mfd.method||!mfd.limitations)throw Error('Invalid MFD provenance or status');
   if(!Array.isArray(mfd.accumulation_classes)||mfd.accumulation_classes.length!==5||mfd.accumulation_classes.some((x,i)=>x.label!==d.accumulation_classes[i].label)||Math.abs(mfd.accumulation_classes.reduce((s,x)=>s+checkRow(x),0)-v)>tol)throw Error('MFD class area inconsistent');
   for(const x of [mfd.same_accumulation_class_area,mfd.multiple_receivers_area,mfd.edge_or_nodata_influenced_area])checkRow(x);
   if(v){const peak=finite(mfd.maximum_local_contributing_area_acres);if(peak<=0||peak>ca+tol||!Number.isInteger(mfd.maximum_cell_index)||mfd.maximum_cell_index<0||mfd.maximum_cell_index>=n)throw Error('Invalid MFD peak')}else if(mfd.maximum_local_contributing_area_acres!==null||mfd.maximum_cell_index!==null)throw Error('No-data MFD has peak');
   if(cn){const lo=finite(mfd.context_elevation_min_m),hi=finite(mfd.context_elevation_max_m);if(lo< -500||hi>9000||lo>hi)throw Error('Invalid MFD context elevation')}else if(mfd.context_elevation_min_m!==null||mfd.context_elevation_max_m!==null)throw Error('No-data MFD has elevation');
   for(const k of ['horizontal_equal_neighbor_percent','vertical_equal_neighbor_percent'])if(mfd[k]!==null&&(finite(mfd[k])<0||mfd[k]>100))throw Error('Invalid equal-neighbor diagnostic');
  }
 }
 const dep=d.depressions??null;
 if(dep){
  if(!['estimated','unavailable'].includes(dep.status)||!Array.isArray(dep.depth_classes))throw Error('Invalid depression model status');
  const fields=['site_depression_area_acres','site_fill_volume_m3','maximum_site_depth_m'];
  if(dep.status==='unavailable'){if(fields.some(k=>dep[k]!==null)||dep.depth_classes.length)throw Error('Unavailable depression model has values')}
  else {
   if(d.status!=='estimated'||cn!==n||dep.evidence_kind!=='modeled_terrain_interpretation'||dep.verification_status!=='not_field_verified'||!dep.method||!dep.limitations)throw Error('Incomplete context or provenance for depression model');
   const [a,vol,depth]=fields.map(k=>finite(dep[k]));
   if(a<0||a>total+tol||vol<0||depth<0||depth>9500||vol>a*4046.8564224*depth+Math.max(.001,vol*1e-8)||((a===0)!==(depth===0))||((a===0)!==(vol===0)))throw Error('Invalid depression area, depth or volume');
   const labels=['>0–<0.15 m','0.15–<0.3 m','0.3–<0.6 m','0.6–<1 m','1 m+'];
   if(dep.depth_classes.length!==labels.length||dep.depth_classes.some((x,i)=>x.label!==labels[i]||typeof x.color!=='string'||finite(x.area_acres)<0||Math.abs(finite(x.percent_of_study_area)-100*x.area_acres/total)>.0001)||Math.abs(dep.depth_classes.reduce((sum,x)=>sum+x.area_acres,0)-a)>tol)throw Error('Depression classes inconsistent');
  }
 }
 const ch=d.conditioned??null;
 if(ch){
  if(ch.status==='unavailable'){if(ch.maximum_local_contributing_area_acres!==null||!Array.isArray(ch.accumulation_classes)||ch.accumulation_classes.length||['maximum_cell_index','context_outlet_cells','context_outlet_contributing_area_acres','routing_classes','filled_site_area','changed_receiver_area','edge_influenced_area'].some(k=>ch[k]!=null))throw Error('Unavailable conditioned model has values')}
  else{
   if(ch.status!=='estimated'||d.status!=='estimated'||cn!==n||ch.evidence_kind!=='modeled_terrain_interpretation'||ch.verification_status!=='not_field_verified'||!ch.method||!ch.limitations)throw Error('Invalid conditioned coverage or provenance');
   if(!Array.isArray(ch.accumulation_classes)||ch.accumulation_classes.length!==5||ch.accumulation_classes.some((x,i)=>x.label!==d.accumulation_classes[i].label)||Math.abs(ch.accumulation_classes.reduce((s,x)=>s+checkRow(x),0)-v)>tol)throw Error('Invalid conditioned accumulation classes');
   const labels=['Lower filled-surface neighbor','Imposed flat direction','Open context edge outlet'];
   if(!Array.isArray(ch.routing_classes)||ch.routing_classes.length!==3||ch.routing_classes.some((x,i)=>x.label!==labels[i])||Math.abs(ch.routing_classes.reduce((s,x)=>s+checkRow(x),0)-v)>tol)throw Error('Invalid conditioned routing classes');
   for(const x of [ch.filled_site_area,ch.changed_receiver_area,ch.edge_influenced_area])checkRow(x);
   if(dep?.status==='estimated'&&Math.abs(ch.filled_site_area.area_acres-dep.site_depression_area_acres)>tol)throw Error('Conditioned fill disagrees with depression model');
   const peak=finite(ch.maximum_local_contributing_area_acres);
   if(peak<=0||peak>ca+tol||!Number.isInteger(ch.maximum_cell_index)||ch.maximum_cell_index<0||ch.maximum_cell_index>=n||!Number.isInteger(ch.context_outlet_cells)||ch.context_outlet_cells<1||ch.context_outlet_cells>2*g.width+2*g.height-4||Math.abs(finite(ch.context_outlet_contributing_area_acres)-ca)>Math.max(tol,ca*1e-7))throw Error('Invalid conditioned outlets or contributing area');
  }
 }
 const dg=d.depression_groups??null;
 if(dg){
  if(!Array.isArray(dg.groups)||!['estimated','unavailable'].includes(dg.status))throw Error('Invalid depression group status');
  if(dg.status==='unavailable'){if(dg.groups.length||dg.context_group_count!==null)throw Error('Unavailable depression groups have values')}
  else{
   if(d.status!=='estimated'||cn!==n||dep?.status!=='estimated'||ch?.status!=='estimated'||dg.evidence_kind!=='modeled_terrain_interpretation'||dg.verification_status!=='not_field_verified'||!dg.method||!dg.limitations||!Number.isInteger(dg.context_group_count)||dg.context_group_count<dg.groups.length||dg.context_group_count>n)throw Error('Invalid depression group provenance or coverage');
   let area=0,volume=0,max=0,cells=0,contextArea=0;const ids=new Set(),exitCells=new Set(),index=i=>Number.isInteger(i)&&i>=0&&i<n;
   for(const x of dg.groups){
    if(!Number.isInteger(x.group_number)||x.group_number<1||x.group_number>dg.context_group_count||x.id!=='D'+x.group_number||ids.has(x.id)||!Number.isInteger(x.context_cells)||x.context_cells<1||x.context_cells>n||!index(x.lowest_original_cell)||typeof x.edge_influenced!=='boolean')throw Error('Invalid depression group identity');
    ids.add(x.id);cells+=x.context_cells;
    const a=finite(x.site_area_acres),c=finite(x.context_area_acres),sv=finite(x.site_fill_volume_m3),cv=finite(x.context_fill_volume_m3),sm=finite(x.site_max_depth_m),cm=finite(x.context_max_depth_m);
    if(a<=0||c<=0||a>c+tol||a>v+tol||c>ca+tol||sv<=0||cv<=0||sv>cv+Math.max(.001,cv*1e-8)||sm<=0||cm<sm||cm>9500||sv>a*4046.8564224*sm+Math.max(.001,sv*1e-8)||cv>c*4046.8564224*cm+Math.max(.001,cv*1e-8)||Math.abs(finite(x.percent_of_site)-100*a/total)>.0001||Math.abs(finite(x.percent_of_group_in_site)-100*a/c)>.0001||Math.abs(finite(x.site_mean_depth_m)-sv/(a*4046.8564224))>1e-8||Math.abs(finite(x.context_mean_depth_m)-cv/(c*4046.8564224))>1e-8)throw Error('Invalid depression group measurements');
    if(!Array.isArray(x.exits)||!x.exits.length||x.exits.length>x.context_cells)throw Error('Invalid depression exits');
    let peak=0;for(const e of x.exits){if(!index(e.from_cell)||!index(e.to_cell)||e.from_cell===e.to_cell||exitCells.has(e.from_cell)||Math.abs(Math.floor(e.from_cell/g.width)-Math.floor(e.to_cell/g.width))>1||Math.abs(e.from_cell%g.width-e.to_cell%g.width)>1||typeof e.edge_influenced!=='boolean'||finite(e.filled_elevation_m)< -500||e.filled_elevation_m>9000||finite(e.local_contributing_area_acres)<=0||e.local_contributing_area_acres>ca+tol)throw Error('Invalid depression exit transition');exitCells.add(e.from_cell);peak=Math.max(peak,e.local_contributing_area_acres)}
    if(Math.abs(finite(x.peak_exit_local_contributing_area_acres)-peak)>tol)throw Error('Invalid depression exit peak');
    area+=a;volume+=sv;max=Math.max(max,sm);contextArea+=c;
   }
   if(cells>n||contextArea>ca+tol||Math.abs(area-dep.site_depression_area_acres)>tol||Math.abs(volume-dep.site_fill_volume_m3)>Math.max(.001,volume*1e-8)||Math.abs(max-dep.maximum_site_depth_m)>1e-8)throw Error('Depression group totals inconsistent');
  }
 }
 const lc=d.local_catchment??null;
 if(lc){
  const x=dg?.groups?.find(z=>z.group_number===lc.group_number&&z.id===lc.group_id);
  if(!x||!['estimated','unavailable'].includes(lc.status))throw Error('Invalid local catchment group or status');
  if(lc.status==='unavailable'){if(Object.keys(lc).some(k=>!['status','group_id','group_number','detail'].includes(k)))throw Error('Unavailable catchment has values')}
  else{
   if(d.status!=='estimated'||cn!==n||ch?.status!=='estimated'||dg.status!=='estimated'||lc.evidence_kind!=='modeled_terrain_interpretation'||lc.verification_status!=='not_field_verified'||!lc.method||!lc.limitations)throw Error('Invalid catchment provenance');
   const count=lc.context_cells,edge=lc.edge_contact_cells;
   if(!Number.isInteger(count)||count<x.context_cells||count>n||lc.upstream_only_cells!==count-x.context_cells||!Number.isInteger(edge)||edge<0||edge>Math.min(count,2*g.width+2*g.height-4)||lc.edge_contact!==(edge>0))throw Error('Invalid catchment cells');
   const [a,b,c,ga,gs,u,us,uo]=['local_area_acres','site_area_acres','outside_site_area_acres','group_area_acres','group_site_area_acres','upstream_only_area_acres','upstream_only_site_area_acres','upstream_only_outside_site_area_acres'].map(k=>finite(lc[k]));
   if(a<=0||a>ca+tol||b>v+tol||[b,c,ga,gs,u,us,uo].some(x=>x<0)||Math.abs(a-b-c)>tol||Math.abs(ga-x.context_area_acres)>tol||Math.abs(gs-x.site_area_acres)>tol||Math.abs(a-ga-u)>tol||Math.abs(b-gs-us)>tol||Math.abs(u-us-uo)>tol||Math.abs(c-(ga-gs)-uo)>tol||Math.abs(finite(lc.site_share_percent)-100*b/a)>.0001||Math.abs(finite(lc.outside_share_percent)-100*c/a)>.0001)throw Error('Invalid catchment area partition');
  }
 }
 function validateErosion(er,d,ch,n,total,tol){
 if(!er)return;
 if(er.status==='unavailable'){if(Object.keys(er).some(k=>!['status','detail'].includes(k))||typeof er.detail!=='string')throw Error('Unavailable erosion screening has values');return}
 if(!['estimated','partial_coverage','no_data'].includes(er.status)||d.status!=='estimated'||ch?.status!=='estimated'||er.evidence_kind!=='modeled_terrain_interpretation'||er.verification_status!=='not_field_verified'||!er.method||!er.limitations||er.index_unit!=='m (area/width × gradient)')throw Error('Invalid erosion screening provenance');
 const [a,b,c,e,z,p]=['valid_area_acres','excluded_outer_area_acres','excluded_filled_or_flat_area_acres','edge_influenced_valid_area_acres','zero_index_area_acres','coverage_percent'].map(k=>er[k]);
 if(![a,b,c,e,z,p].every(Number.isFinite)||[a,b,c,e,z,p].some(x=>x<0)||Math.abs(a+b+c-total)>tol||e>a+tol||z>a+tol||Math.abs(p-100*a/total)>.0001||p>100.0001)throw Error('Invalid erosion screening coverage');
 const expected=a===0?'no_data':total-a<=Math.max(.0001,total*4046.8564224*1e-9)/4046.8564224?'estimated':'partial_coverage';
 if(er.status!==expected)throw Error('Invalid erosion screening status');
 if(!a){if(er.mean_index_m!==null||er.maximum_index_m!==null||er.maximum_cell_index!==null)throw Error('No-data erosion screening contains an index')}
 else if(!Number.isFinite(er.mean_index_m)||!Number.isFinite(er.maximum_index_m)||er.mean_index_m<0||er.maximum_index_m<0||er.mean_index_m>er.maximum_index_m+Math.max(1e-9,er.maximum_index_m*1e-9)||!Number.isInteger(er.maximum_cell_index)||er.maximum_cell_index<0||er.maximum_cell_index>=n)throw Error('Invalid erosion screening index');
}
 const er=d.erosion_screening??null;validateErosion(er,d,ch,n,total,tol);
 function validateSoilErosion(q,er,total){
 if(!q)return;
 if(!er||!['estimated','partial_coverage','no_data'].includes(er.status)||!['estimated','no_data'].includes(q.status)||q.source_id!=='usda_sda_tabular'||q.spatial_source_id!=='usda_ssurgo_rest'||q.verification_status!=='not_field_verified'||!q.spatial_retrieved_at||!q.method||!q.limitations||!Array.isArray(q.rows)||!q.rows.length||q.rows.length>25)throw Error('Invalid soil terrain comparison provenance');
 const tol=Math.max(.0001,er.valid_area_acres*.001),num=x=>Number.isFinite(x)&&x>=0,keys=new Set();let sum=0;
 if(q.terrain_valid_area_acres!==er.valid_area_acres||!num(q.soil_terrain_intersection_acres)||q.soil_terrain_intersection_acres>er.valid_area_acres+tol||q.status!==(q.soil_terrain_intersection_acres>0?'estimated':'no_data'))throw Error('Invalid soil terrain coverage');
 for(const u of q.rows){if(!u.mukey||keys.has(u.mukey)||!num(u.mapped_area_acres)||u.mapped_area_acres>total+tol||!num(u.terrain_intersection_acres)||!num(u.edge_influenced_intersection_acres)||u.edge_influenced_intersection_acres>u.terrain_intersection_acres+tol)throw Error('Invalid soil terrain unit');keys.add(u.mukey);sum+=u.terrain_intersection_acres;
 if(u.terrain_intersection_acres===0?(u.mean_terrain_index_m!==null||u.maximum_terrain_index_m!==null):(!num(u.mean_terrain_index_m)||!num(u.maximum_terrain_index_m)||u.mean_terrain_index_m>u.maximum_terrain_index_m+Math.max(1e-9,u.maximum_terrain_index_m*1e-9)))throw Error('Invalid soil terrain index');
 const e=u.erodibility;if(!e||!Array.isArray(e.components))throw Error('Missing component evidence');
 for(const k of ['kw','kf']){const a=e[k],valid=x=>x===null||num(x)&&x<=1;if(!a||!valid(a.known_share_mean)||!valid(a.full_unit_mean)||!(a.known_component_share_percent===null||num(a.known_component_share_percent)&&a.known_component_share_percent<=100.01)||a.full_unit_mean!==null&&(!e.component_share_complete||Math.abs(a.known_component_share_percent-100)>.01||a.full_unit_mean!==a.known_share_mean)||a.known_share_mean!==null&&!(a.known_component_share_percent>0))throw Error('Invalid soil factor coverage')}
 }
 if(Math.abs(sum-q.soil_terrain_intersection_acres)>tol)throw Error('Invalid soil terrain partition');
}
 const se=d.soil_erosion_comparison??null;validateSoilErosion(se,er,total);
 function validateCoverTerrain(cs,er){
 if(!cs)return;
 const ids={land:'nlcd_land_image',canopy:'usfs_canopy_image',impervious:'nlcd_impervious_image'},num=v=>Number.isFinite(v)&&v>=0;
 if(!er||!['estimated','partial_coverage','no_data'].includes(er.status)||typeof cs!=='object'||Array.isArray(cs)||!Object.keys(cs).length)throw Error('Invalid cover comparison context');
 const tol=Math.max(.00001,er.valid_area_acres*1e-7);
 for(const [id,q] of Object.entries(cs)){
  if(!ids[id]||q.dataset!==id||q.source_id!==ids[id]||!q.source_url||!q.retrieved_at||!Array.isArray(q.source_raster_ids)||!q.source_raster_ids.length||!q.source_raster_ids.every(Number.isInteger)||!/^\d{4}$/.test(q.year)||q.service_grid_resolution_m!==30||!q.service_grid_crs||!['web_mercator','albers_equal_area'].includes(q.service_grid_projection)||q.verification_status!=='not_field_verified'||q.evidence_kind!=='mapped_estimate_and_modeled_terrain_interpretation'||!q.method||!q.limitations||!Array.isArray(q.rows))throw Error('Invalid cover comparison provenance');
  const t=q.terrain_valid_area_acres,a=q.sampled_area_acres,m=q.missing_sample_area_acres,b=q.partial_boundary_cell_area_acres,e=q.edge_influenced_sample_area_acres;
  if(![t,a,m,b,e].every(num)||Math.abs(t-er.valid_area_acres)>tol||Math.abs(a+m-t)>tol||b>t+tol||e>a+tol||(t===0?q.coverage_percent!==null:!num(q.coverage_percent)||Math.abs(q.coverage_percent-100*a/t)>.0001))throw Error('Invalid cover comparison coverage');
  const expected=!a?'no_data':m<=Math.max(.0001,t*4046.8564224*1e-9)/4046.8564224?'estimated':'partial_coverage';if(q.status!==expected)throw Error('Invalid cover comparison status');
  const mean=q.mean_mapped_percent_of_sampled_area;if(id==='land'||!a){if(mean!==null)throw Error('Unexpected cover fraction')}else if(!num(mean)||mean>100)throw Error('Invalid mean cover fraction');
  let sum=0,edge=0;const codes=new Set();for(const row of q.rows){if(!Number.isInteger(row.code)||codes.has(row.code)||(id==='land'?![11,12,21,22,23,24,31,41,42,43,52,71,81,82,90,95].includes(row.code):row.code<0||row.code>4)||!row.name||!num(row.area_acres)||row.area_acres<=0||!a||!num(row.percent_of_sampled_area)||Math.abs(row.percent_of_sampled_area-100*row.area_acres/a)>.0001||!num(row.mean_terrain_index_m)||!num(row.maximum_terrain_index_m)||row.mean_terrain_index_m>row.maximum_terrain_index_m+Math.max(1e-9,row.maximum_terrain_index_m*1e-9)||!num(row.edge_influenced_area_acres)||row.edge_influenced_area_acres>row.area_acres+tol)throw Error('Invalid cover terrain class');codes.add(row.code);sum+=row.area_acres;edge+=row.edge_influenced_area_acres}
  if(Math.abs(sum-a)>tol||Math.abs(edge-e)>tol)throw Error('Invalid cover comparison class partition');
 }
}
 const cv=d.cover_terrain_comparisons??null;validateCoverTerrain(cv,er);
 function validateHabTerrain(q,er,total){
 if(!q)return;
 if(!er||!['estimated','partial_coverage','no_data'].includes(er.status)||q.source_id!=='tpwd_ems'||!q.source_url||q.source_service_vintage!=='2020'||q.original_map_object_resolution_m!==10||!q.spatial_retrieved_at||q.evidence_kind!=='mapped_estimate_and_modeled_terrain_interpretation'||q.verification_status!=='not_field_verified'||!q.method||!q.limitations||!Array.isArray(q.rows)||q.rows.length>500)throw Error('Invalid habitat comparison provenance');
 const num=v=>Number.isFinite(v)&&v>=0,t=q.terrain_valid_area_acres,a=q.habitat_terrain_intersection_acres,g=q.unmapped_terrain_area_acres,x=q.minor_geometry_excess_acres,tol=Math.max(.0001,er.valid_area_acres*.001);
 if(![t,a,g,x].every(num)||Math.abs(t-er.valid_area_acres)>Math.max(.00001,t*1e-7)||Math.abs(a+g-x-t)>Math.max(.00001,t*1e-7)||x>tol||g>t+tol||q.status!==(a===0?'no_data':g>tol?'partial_coverage':'estimated'))throw Error('Invalid habitat terrain coverage');
 let sum=0,mapped=0;const keys=new Set();
 for(const u of q.rows){const k=u.code+'|'+u.name;if(typeof u.code!=='string'||!u.name||keys.has(k)||!num(u.mapped_area_acres)||u.mapped_area_acres<=0||!num(u.terrain_intersection_acres)||u.terrain_intersection_acres>u.mapped_area_acres+Math.max(.0001,u.mapped_area_acres*.005)||!num(u.edge_influenced_intersection_acres)||u.edge_influenced_intersection_acres>u.terrain_intersection_acres+tol)throw Error('Invalid habitat terrain class');keys.add(k);sum+=u.terrain_intersection_acres;mapped+=u.mapped_area_acres;
 if(u.terrain_intersection_acres===0?(u.mean_terrain_index_m!==null||u.maximum_terrain_index_m!==null):(!num(u.mean_terrain_index_m)||!num(u.maximum_terrain_index_m)||u.mean_terrain_index_m>u.maximum_terrain_index_m+Math.max(1e-9,u.maximum_terrain_index_m*1e-9)))throw Error('Invalid habitat terrain index');
 }
 if(Math.abs(sum-a)>Math.max(.00001,t*1e-7)||mapped>total+Math.max(.01,total*.01))throw Error('Invalid habitat terrain class partition');
}
 const ht=d.habitat_terrain_comparison??null;validateHabTerrain(ht,er,total);
 const q=d.resampling_comparison??null,alt=d.resampling_alternate??null;
 if(d.requested_interpolation!==undefined&&d.requested_interpolation!==(isAlternate?'RSP_BilinearInterpolation':'RSP_NearestNeighbor'))throw Error('Invalid drainage interpolation');
 if(isAlternate&&(q||alt))throw Error('Nested resampling comparison');
 let validatedAlternate=null;
 if(q){
  if(!['in_progress','canceled','unavailable','compared'].includes(q.status))throw Error('Invalid resampling status');
  if(q.status!=='compared'){if(alt||Object.keys(q).some(k=>!['status','detail'].includes(k)))throw Error('Incomplete resampling has values')}
  else{
   if(!alt||q.verification_status!=='not_field_verified'||q.evidence_kind!=='modeled_terrain_interpretation'||!q.limitations||d.requested_interpolation!=='RSP_NearestNeighbor'||alt.requested_interpolation!=='RSP_BilinearInterpolation'||q.baseline_requested_interpolation!==d.requested_interpolation||q.alternate_requested_interpolation!==alt.requested_interpolation||q.baseline_retrieved_at!==d.retrieved_at||q.alternate_retrieved_at!==alt.retrieved_at)throw Error('Invalid resampling provenance');
   validatedAlternate=drainageSection({status:alt.status,data:alt},true);
   const sameGrid=h=>h?.crs===g.crs&&h.width===g.width&&h.height===g.height&&Array.isArray(h.bbox)&&h.bbox.length===4&&h.bbox.every((x,i)=>x===g.bbox[i]);
   if(!sameGrid(q.grid)||!sameGrid(alt.grid)||alt.status!==d.status||alt.requested_grid_m!==d.requested_grid_m||alt.requested_context_buffer_projected_m!==d.requested_context_buffer_projected_m||alt.context_valid_cells!==cn||Math.abs(alt.valid_area_acres-v)>tol||q.paired_valid_context_cells!==cn||!Number.isInteger(q.changed_context_cells)||q.changed_context_cells<0||q.changed_context_cells>cn||!cn||!v||Math.abs(finite(q.paired_valid_site_acres)-v)>tol||Math.abs(finite(q.changed_context_percent)-100*q.changed_context_cells/cn)>.0001)throw Error('Invalid resampling paired coverage');
   const rmse=finite(q.rmse_difference_m),max=finite(q.maximum_absolute_difference_m),mean=finite(q.mean_signed_difference_m);
   if(rmse<0||max<0||Math.abs(mean)>rmse+1e-8||rmse>max+1e-8||max>9500||(q.changed_context_cells===0&&(max!==0||rmse!==0||mean!==0)))throw Error('Invalid resampling differences');
   for(const k of ['d8_same_class_percent','mfd_same_class_percent'])if(finite(q[k])<0||q[k]>100)throw Error('Invalid paired class agreement');
   if(!mfd||!alt.mfd_comparison||q.baseline_horizontal_equal_percent!==mfd.horizontal_equal_neighbor_percent||q.baseline_vertical_equal_percent!==mfd.vertical_equal_neighbor_percent||q.alternate_horizontal_equal_percent!==alt.mfd_comparison.horizontal_equal_neighbor_percent||q.alternate_vertical_equal_percent!==alt.mfd_comparison.vertical_equal_neighbor_percent)throw Error('Resampling diagnostics inconsistent');
  }
 }else if(alt)throw Error('Alternate model without comparison');
 return {...section(d.status,'Potential drainage',[],r.detail??null),...base,...copy(d),depressions:dep?copy(dep):null,conditioned:ch?copy(ch):null,depression_groups:dg?copy(dg):null,local_catchment:lc?copy(lc):null,erosion_screening:er?copy(er):null,soil_erosion_comparison:se?copy(se):null,cover_terrain_comparisons:cv?copy(cv):null,habitat_terrain_comparison:ht?copy(ht):null,mfd_comparison:mfd?copy(mfd):null,resampling_comparison:q?copy(q):null,resampling_alternate:validatedAlternate,experimental:true,cell_grid_export:'Separate local CSV per requested interpolation; snapshot includes model summaries and grid metadata only'};
 }
 function terrainCatalogSection(){
 const r=input.terrain?.catalog,d=r?.data,base={status:r?.status||'not_analyzed',detail:r?.detail??null,source_url:'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer',verification_status:'catalog_only_not_pixel_provenance',scope:'study_bounding_box',records:[],query_bbox_wgs84:null,retrieved_at:null,limitations:'Candidate raster records only; exact analytical grid sources, native DEM resolution and vertical datum remain unverified.'};
 if(!['not_analyzed','in_progress','canceled','unavailable','no_data','catalog_candidates'].includes(base.status))throw Error('Invalid elevation catalog status');
 if(!d){if(['no_data','catalog_candidates'].includes(base.status))throw Error('Missing elevation catalog response');return base}
 const b=d.query_bbox_wgs84;
 if(d.status!==base.status||d.source_url!==base.source_url||d.scope!==base.scope||d.verification_status!==base.verification_status||!Array.isArray(b)||b.length!==4||!b.every(Number.isFinite)||b[0]>=b[2]||b[1]>=b[3]||Math.abs(b[0])>180||Math.abs(b[2])>180||Math.abs(b[1])>90||Math.abs(b[3])>90||b[2]-b[0]>1||b[3]-b[1]>1||!Array.isArray(d.records)||d.records.length>200||d.status!==(d.records.length?'catalog_candidates':'no_data')||!d.retrieved_at||!d.limitations)throw Error('Invalid elevation catalog response');
 const keys=['object_id','name','title','category_code','dataset_id','source','vertical_datum_reported','acquisition_date','acquisition_date_raw','resolution_x_reported','resolution_y_reported','start_date_raw','end_date_raw','publication_date_raw','metadata_url','download_url','best_code','dem_type_code'];
 const records=d.records.map(x=>{if(!Number.isSafeInteger(x.object_id)||x.object_id<0)throw Error('Invalid catalog object ID');const out={};for(const k of keys){const v=x[k]??null;if(v!==null&&!(typeof v==='string'&&v.length<=1500)&&!(typeof v==='number'&&Number.isFinite(v)))throw Error('Invalid catalog attribute');out[k]=v}return out});
 if(new Set(records.map(x=>x.object_id)).size!==records.length)throw Error('Duplicate catalog object IDs');
 return {...base,records,query_bbox_wgs84:copy(b),retrieved_at:d.retrieved_at,limitations:d.limitations};
 }
 function terrainSection(){
 const r=input.terrain,d=r?.data,base={source_id:'usgs_3dep_dem',retrieved_at:null,source_resolution_m:null,acquisition_date:null,vertical_datum:null,requested_grid_m:null,coverage_percent:null,study_area_acres:acres,min_m:null,max_m:null,mean_m:null,relief_m:null,valid_area_acres:null,missing_area_acres:null,verification_status:'not_field_verified',evidence_kind:'mapped_estimate',slope_statistics_status:r?.status||'not_analyzed',aspect_statistics_status:r?.status||'not_analyzed',gradients:null,elevation_profile:profileSection(),drainage:drainageSection(),source_catalog:terrainCatalogSection()};
 if(!d)return {...section(r?.status||'not_analyzed','Property elevation',[],r?.detail??null),...base};
 const total=finite(d.study_area_acres),valid=finite(d.valid_area_acres),missing=finite(d.missing_area_acres),cov=finite(d.coverage_percent);
 if(d.source_id!==base.source_id||r.status!==d.status||!['estimated','partial_coverage','no_data'].includes(d.status)||total<=0||Math.abs(total-acres)>Math.max(.01,acres*.01)||valid<0||missing<0||Math.abs(valid+missing-total)>Math.max(.00001,total*1e-7)||Math.abs(cov-100*valid/total)>.0001||![1,2,5,10,20,30].includes(d.requested_grid_m))throw Error('Invalid elevation coverage or source');
 if(d.status==='estimated'){const min=finite(d.min_m),max=finite(d.max_m),mean=finite(d.mean_m),relief=finite(d.relief_m);if(valid<=0||missing>Math.max(.0001,total*1e-9)/4046.8564224||min>mean||mean>max||Math.abs(relief-(max-min))>1e-7)throw Error('Invalid elevation statistics')}
 else if([d.min_m,d.max_m,d.mean_m,d.relief_m].some(v=>v!==null))throw Error('Incomplete elevation has full-site results');
 const g=d.gradients;
 if(g){if(!['estimated','partial_coverage','no_data','unavailable'].includes(g.status)||d.slope_statistics_status!==g.status||d.aspect_statistics_status!==g.status)throw Error('Invalid terrain gradient status');
 if(g.status!=='unavailable'){const gv=finite(g.valid_area_acres),gm=finite(g.missing_area_acres),gc=finite(g.coverage_percent),tol=Math.max(.00001,total*1e-7);
 if(gv<0||gm<0||gv>valid+tol||Math.abs(gv+gm-total)>tol||Math.abs(gc-100*gv/total)>.0001||g.requested_grid_m!==d.requested_grid_m||g.neighbor_buffer_cells!==1)throw Error('Invalid gradient coverage');
 const complete=gv>0&&gm<=Math.max(.0001,total*4046.8564224*1e-9)/4046.8564224,expected=!gv?'no_data':complete?'estimated':'partial_coverage';if(g.status!==expected)throw Error('Gradient coverage status inconsistent');
 for(const [rows,n] of [[g.slope_classes,6],[g.aspect_classes,9]]){if(!Array.isArray(rows)||rows.length!==n||new Set(rows.map(x=>x.label)).size!==n)throw Error('Invalid terrain classes');
 let sum=0;for(const x of rows){const a=finite(x.area_acres);if(a<0||!x.label||!x.color||(!complete&&x.percent_of_study_area!==null)||(complete&&Math.abs(finite(x.percent_of_study_area)-100*a/total)>.0001)||(!gv&&x.percent_of_valid_area!==null)||(gv&&Math.abs(finite(x.percent_of_valid_area)-100*a/gv)>.0001))throw Error('Invalid gradient class values');sum+=a}if(Math.abs(sum-gv)>tol)throw Error('Gradient class total inconsistent')}
 if(gv){const mean=finite(g.valid_only_mean_slope_percent),max=finite(g.valid_only_max_slope_percent);if(mean<0||max<mean||(complete&&(g.mean_slope_percent!==mean||g.max_slope_percent!==max)))throw Error('Invalid gradient statistics')}else if(g.valid_only_mean_slope_percent!==null||g.valid_only_max_slope_percent!==null)throw Error('No-data slope has values');
 if(!complete&&(g.mean_slope_percent!==null||g.max_slope_percent!==null))throw Error('Incomplete slope has full-site values');
 }}
 return {...section(d.status,'Property elevation',[],r.detail??null),...base,...copy(d),experimental:true};
 }
 const points=(input.points||[]).map(p=>{if(p.property_id!==id)throw Error('Point belongs to another property');if(!p.point_id||p.geometry?.type!=='Point'||p.geometry.coordinates?.length!==2||!p.geometry.coordinates.every(Number.isFinite)||!statuses.includes(p.habitat?.status)||!statuses.includes(p.elevation?.status))throw Error('Invalid point record');return copy(p)});
 const pointStates=points.flatMap(p=>[p.habitat.status,p.elevation.status]);const pointStatus=!points.length?'not_analyzed':pointStates.every(s=>s==='estimated')?'estimated':pointStates.some(s=>s==='estimated')?'partial_coverage':pointStates.includes('in_progress')?'in_progress':pointStates.includes('unavailable')?'unavailable':pointStates.every(s=>s==='no_data')?'no_data':'not_analyzed';
 return {schema_version:version,format:'grg_property_snapshot',snapshot_id:snapshot,exported_at:input.exported_at,app_version:input.app_version,privacy:{classification:'private_local_client_record',storage:'explicit local download; no upload by exporter',contains_coordinates:true},property:{property_id:id,boundary:site,area_acres:acres,perimeter_ft:perimeter,source_id:source,parcel_metadata:parcel,boundary_recorded_at:input.boundary_recorded_at??null,method:'Turf 7.2 geodesic area and boundary length; approximate, not legal survey',verification_status:'not_field_verified'},source_registry:copy(sources),map_display_context:input.map_display_context?copy(input.map_display_context):null,environment:{habitat_composition:habitat,soil_map:soil,tree_canopy:rasterSection('canopy','Tree canopy','usfs_canopy_image'),land_cover:rasterSection('land','Land cover','nlcd_land_image'),impervious_surfaces:rasterSection('impervious','Impervious surfaces','nlcd_impervious_image'),terrain:terrainSection(),hydrology:{...floodSection(),wetlands:wetlandsSection(),streams:hydroSection('stream'),watersheds:hydroSection('watershed')},historical_imagery:absent('historical_imagery'),point_estimates:section(pointStatus,'Mapped point estimates',points,'Point values only; status per measurement. Not a site-wide measurement.')},maps:{existing_conditions:section(existing.length?'not_field_verified':'not_surveyed','Existing conditions zones',existing,'User-drawn conditions, not field verified.'),proposed_management:section(proposed.length?'proposed':'not_analyzed','Proposed management zones',proposed,'Planning suggestions, not existing conditions.')},field_observations:{plant_inventory:absent('field_plant_inventory'),soil_sampling:absent('soil_sampling'),laboratory_results:absent('laboratory_results'),wildlife:absent('observed_wildlife'),photographs:absent('photographs')},regional_evidence:{nativity:absent('regional_nativity'),biodiversity:absent('regional_biodiversity')},potential_relationships:{bees:absent('potential_bee_relationships'),lepidoptera:absent('potential_lepidoptera_relationships')},recommendations:{native_communities:absent('recommended_native_communities'),restoration_objectives:absent('restoration_objectives'),management:absent('management_recommendations')},monitoring:{permanent_points:absent('monitoring_points'),history:absent('monitoring_history')},report_templates:templates.map(t=>({...t,status:'not_implemented'})),limitations:['This is a dated snapshot, not a current field survey or validated report.','Empty records with a missing-data status do not mean zero.','Field inventories, laboratory records, dashboard connections, attachments, history, project import and PDF generation are not implemented in this alpha.','Existing and proposed zones may overlap; their totals are not additive.','Client data must not be committed to public repositories. External map and point requests are separate from the local export.']};
}
root.GRGPropertyExport=Object.freeze({version,build,statuses:[...statuses]});
})(globalThis);
