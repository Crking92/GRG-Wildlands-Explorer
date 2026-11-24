/* 3DEP raster catalog candidates, NOT per-cell mosaic provenance. */
(function(root){
'use strict';
const source='https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer';
const fields=['OBJECTID','Name','Category','Dataset_ID','Source','VerticalDatum','AcquisitionDate','Resolution_X','Resolution_Y','StartDate','EndDate','pubdate','title','Metadata','URL','Best','DEM_Type'];
const limitation='Catalog items intersect the study bounding box, not necessarily the property itself. Overlapping resolutions and overviews may be returned. Catalog records do not identify which raster supplied each exported elevation cell. Resolution field units and date encodings are not independently verified. No native resolution, flight date or datum assigned to the analytical grid.';
function text(v){return typeof v==='string'&&v.trim()?v.trim().slice(0,1500):null}
function number(v){return typeof v==='number'&&Number.isFinite(v)?v:null}
function raw(v){return text(v)??number(v)}
function date(v){if(typeof v!=='number'||!Number.isFinite(v))return null;const d=new Date(v);return Number.isFinite(d.getTime())&&d.getUTCFullYear()>=1900&&d.getUTCFullYear()<=2100?d.toISOString().slice(0,10):null}
function id(v){return Number.isSafeInteger(v)&&v>=0?v:null}
function record(f){const a=f?.attributes;if(!a||id(a.OBJECTID)===null)throw Error('Invalid raster catalog record');return {object_id:a.OBJECTID,name:text(a.Name),title:text(a.title),category_code:number(a.Category),dataset_id:text(a.Dataset_ID),source:text(a.Source),vertical_datum_reported:text(a.VerticalDatum),acquisition_date:date(a.AcquisitionDate),acquisition_date_raw:raw(a.AcquisitionDate),resolution_x_reported:raw(a.Resolution_X),resolution_y_reported:raw(a.Resolution_Y),start_date_raw:raw(a.StartDate),end_date_raw:raw(a.EndDate),publication_date_raw:raw(a.pubdate),metadata_url:text(a.Metadata),download_url:text(a.URL),best_code:number(a.Best),dem_type_code:number(a.DEM_Type)}}
async function retrieve(bbox,query,signal){
 if(!Array.isArray(bbox)||bbox.length!==4||!bbox.every(Number.isFinite)||bbox[0]>=bbox[2]||bbox[1]>=bbox[3]||Math.abs(bbox[0])>180||Math.abs(bbox[2])>180||Math.abs(bbox[1])>90||Math.abs(bbox[3])>90||bbox[2]-bbox[0]>1||bbox[3]-bbox[1]>1)throw Error('Catalog search requires a local study extent');
 const meta=await query(source,{f:'json'},signal);if(meta.name!=='3DEPElevation'||!fields.every(k=>meta.fields?.some(f=>f.name===k)))throw Error('Unexpected elevation catalog schema');
 const filter={where:'1=1',geometry:JSON.stringify({xmin:bbox[0],ymin:bbox[1],xmax:bbox[2],ymax:bbox[3],spatialReference:{wkid:4326}}),geometryType:'esriGeometryEnvelope',inSR:'4326',spatialRel:'esriSpatialRelIntersects',f:'json'};
 const idx=await query(source+'/query',{...filter,returnIdsOnly:'true'},signal);
 if(!Array.isArray(idx.objectIds)||idx.exceededTransferLimit||idx.objectIds.some(v=>id(v)===null)||new Set(idx.objectIds).size!==idx.objectIds.length)throw Error('Incomplete or invalid raster catalog index');
 const ids=idx.objectIds;if(ids.length>200)throw Error('More than 200 catalog candidates; select a smaller study area');
 const records=[];
 for(let i=0;i<ids.length;i+=40){if(signal?.aborted)throw Error('Canceled');const batch=ids.slice(i,i+40),r=await query(source+'/query',{objectIds:batch.join(','),outFields:fields.join(','),returnGeometry:'false',f:'json'},signal);if(r.exceededTransferLimit||!Array.isArray(r.features)||r.features.length!==batch.length)throw Error('Incomplete raster catalog batch');const rows=r.features.map(record);if(new Set(rows.map(x=>x.object_id)).size!==batch.length||rows.some(x=>!batch.includes(x.object_id)))throw Error('Raster catalog ID mismatch');records.push(...rows)}
 records.sort((a,b)=>(a.category_code===1?0:1)-(b.category_code===1?0:1)||a.object_id-b.object_id);
 return {status:records.length?'catalog_candidates':'no_data',source_url:source,scope:'study_bounding_box',query_bbox_wgs84:bbox,records,retrieved_at:new Date().toISOString(),verification_status:'catalog_only_not_pixel_provenance',limitations:limitation};
}
root.GRGTerrainCatalog=Object.freeze({source,fields,record,retrieve});
})(globalThis);
