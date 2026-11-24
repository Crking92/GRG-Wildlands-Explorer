/* Regional Texas surface geology, not site-verified bedrock. */
(function module(root){
'use strict';
const base='https://feature.geographic.texas.gov/arcgis/rest/services/Geologic_Database/GeologicDatabaseofTexas_250k/MapServer',acre=4046.8564224,colors=['#c99d75','#93b5c5','#a6bf89','#c7a0c7','#dfc27a','#85b5ae','#d29c98','#9fa9cf'];
const method='Retrieve all intersecting polygon IDs, fetch complete candidate geometries in WGS84, intersect with study boundary, dissolve by exact rockunit_id and code, measure geodesic acreage with Turf, and join published descriptions by exact rockunit_id.';
const limitations='Regional surface geology from 1:250,000 source maps (1961–1987 atlas compilation; digital project completed 2007). Not a parcel-scale geologic survey, verified bedrock depth, soil depth, engineering assessment or groundwater determination. Surficial deposits may cover bedrock. Map contacts are approximate; digitized boundaries do not increase source detail.';
function coverage(total,covered,sum,rows){
 const tol=Math.max(.1,total*.0001);
 if(![total,covered,sum].every(Number.isFinite)||total<=0||covered<0||sum<0||sum+tol<covered||covered-total>tol||sum-covered>tol)throw Error('Overlapping geologic units or invalid area partition; estimates withheld');
 return {status:!rows?'no_data':total-covered>tol?'partial_coverage':'estimated',study_area_acres:total/acre,mapped_area_acres:Math.min(total,covered)/acre,unmapped_area_acres:Math.max(0,total-covered)/acre,minor_overlap_acres:Math.max(0,sum-covered)/acre,coverage_percent:100*Math.min(total,covered)/total};
}
function attributes(id,code,records){
 const clean=v=>typeof v==='string'&&v.trim()?v.trim():null;
 const matches=records.filter(a=>a.rockunit_id===id&&a.rockunit_cd===code);
 const fields=['short_nm','long_nm','description','period','epoch_or_series','sheet_nm','sheet_cd','group_'];
 const unique=[...new Map(matches.map(a=>{const v=Object.fromEntries(fields.map(k=>[k,clean(a[k])]));return [JSON.stringify(v),v]})).values()];
 return {attribute_status:unique.length===1?'retrieved':unique.length?'ambiguous':'not_reported',attributes:unique.length===1?unique[0]:null};
}
function composition(site,features,t){
 const total=t.area(site),groups=new Map();let coords=0;
 for(const f of features){
  if(!['Polygon','MultiPolygon'].includes(f.geometry?.type))throw Error('Non-polygon geologic geometry');
  const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
  for(const p of polys)for(const ring of p){coords+=ring.length;if(coords>400000)throw Error('Geology geometry too complex; choose smaller study area');for(const q of ring)if(!Array.isArray(q)||!Number.isFinite(q[0])||!Number.isFinite(q[1])||Math.abs(q[0])>180||Math.abs(q[1])>90)throw Error('Invalid WGS84 geometry')}
  const a=f.properties??{},id=typeof a.rockunit_id==='string'?a.rockunit_id:null,code=typeof a.rockunit_cd==='string'?a.rockunit_cd:null;
  if(!id&&!code)throw Error('Rock-unit identity missing');const key=JSON.stringify([id,code]);const g=groups.get(key)??{unit_id:id,code,parts:[],source_object_ids:[]};
  const part=t.intersect(t.featureCollection([site,f]));if(!part||t.area(part)<=0)continue;g.parts.push(part);g.source_object_ids.push(a.objectid);groups.set(key,g);
 }
 const union=p=>p.length===1?p[0]:t.union(t.featureCollection(p));
 const rows=[...groups.values()].map(g=>{const geometry=union(g.parts);if(!geometry)throw Error('Could not dissolve rock unit');const area=t.area(geometry);return {unit_id:g.unit_id,code:g.code,source_object_ids:g.source_object_ids,geometry,area_acres:area/acre,percent_of_study_area:100*area/total}}).sort((a,b)=>b.area_acres-a.area_acres);
 const covered=rows.length?t.area(union(rows.map(r=>r.geometry))):0;
 return {rows,summary:coverage(total,covered,rows.reduce((s,r)=>s+r.area_acres*acre,0),rows.length)};
}
async function analyze(site,t,json,signal,progress=()=>{}){
 const bbox=t.bbox(site),total=t.area(site);
 if(!Number.isFinite(total)||total<=0||total/acre>1000||t.area(t.bboxPolygon(bbox))/acre>5000)throw Error('Choose a study area up to 1,000 acres with bounding rectangle up to 5,000 acres');
 if(bbox[0]<-107||bbox[2]>-93||bbox[1]<25||bbox[3]>37)throw Error('Texas regional dataset only');
 const get=(layer,p)=>json(base+'/'+layer+'/query',p,signal);
 progress('Checking mapped rock-unit polygon IDs…');
 const j=await get(9,{f:'json',where:'1=1',geometry:bbox.join(','),geometryType:'esriGeometryEnvelope',inSR:'4326',spatialRel:'esriSpatialRelIntersects',returnIdsOnly:'true'});
 if(j.exceededTransferLimit||!Array.isArray(j.objectIds)&&j.objectIds!==null)throw Error('Incomplete rock-unit index');
 const ids=[...new Set(j.objectIds||[])];if(ids.length>200||ids.some(i=>!Number.isInteger(i)))throw Error('Too many or invalid candidate polygon IDs');
 const features=[];
 for(let i=0;i<ids.length;i+=10){const batch=ids.slice(i,i+10);progress('Retrieving rock-unit polygons '+(i+1)+'–'+(i+batch.length)+' of '+ids.length+'…');const q=await get(9,{f:'geojson',objectIds:batch.join(','),outFields:'objectid,rockunit_id,rockunit_cd',outSR:'4326',returnGeometry:'true'});if(q.exceededTransferLimit||!Array.isArray(q.features)||q.features.length!==batch.length||new Set(q.features.map(f=>f.properties?.objectid)).size!==batch.length||q.features.some(f=>!batch.includes(f.properties?.objectid)))throw Error('Incomplete rock-unit geometry response');features.push(...q.features)}
 if(signal.aborted)throw Error('Canceled');progress('Intersecting mapped geology with study boundary…');const result=composition(site,features,t);
 const keys=[...new Set(result.rows.map(r=>r.unit_id).filter(Boolean))],records=[];let attrError=null;
 try{for(let i=0;i<keys.length;i+=20){const batch=keys.slice(i,i+20);progress('Retrieving original formation descriptions…');const where='rockunit_id IN ('+batch.map(k=>"'"+k.replace(/'/g,"''")+"'").join(',')+')';const q=await get(11,{f:'json',where,outFields:'rockunit_id,rockunit_cd,short_nm,long_nm,description,period,epoch_or_series,sheet_nm,sheet_cd,group_',returnGeometry:'false'});if(q.exceededTransferLimit||!Array.isArray(q.features)||q.features.some(f=>!batch.includes(f.attributes?.rockunit_id)))throw Error('Incomplete or mismatched formation descriptions');records.push(...q.features.map(f=>f.attributes))}}
 catch(e){if(signal.aborted)throw e;attrError=String(e.message||e);records.length=0}
 if(signal.aborted)throw Error('Canceled');
 result.rows=result.rows.map((r,i)=>({...r,color:colors[i%colors.length],...(attrError?{attribute_status:'unavailable',attributes:null}:attributes(r.unit_id,r.code,records))}));
 Object.assign(result.summary,{source_id:'texas_gdt_250k',source_url:base+'/9',attributes_url:base+'/11',map_scale:250000,source_vintage:'Geologic Atlas 1961–1987; digital compilation completed 2007',retrieved_at:new Date().toISOString(),attribute_request_error:attrError,evidence_kind:'mapped_estimate',verification_status:'not_field_verified',method,limitations,rows:result.rows.map(({geometry,color,...r})=>r)});
 return result;
}
root.GRGGeology=Object.freeze({analyze,coverage,attributes,composition});
})(globalThis);
