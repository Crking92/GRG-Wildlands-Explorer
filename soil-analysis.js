/* SSURGO analysis, independent of the display-only soil overlay. */
(function(root){
'use strict';
const source='https://apps.geo.fpac.usda.gov/nrcs-geodata/rest/services/soils/cg_soils/MapServer/0';
const acre=4046.8564224, limits={acres:1000,envelope_acres:5000,features:500,vertices:300000};
const attrs=f=>Object.fromEntries(Object.entries(f.properties||{}).map(([k,v])=>[k.toLowerCase(),v]));
const clean=v=>typeof v==='string'&&v.trim()&&!['NULL','<NULL>'].includes(v.trim().toUpperCase())?v.trim():null;
function id(v){return (typeof v==='number'||typeof v==='string')&&/^\d+$/.test(String(v))?String(v):null}
function union(t,fs){return fs.length===1?fs[0]:t.union(t.featureCollection(fs))}
async function fetchFeatures(t,site,query,signal,progress=()=>{}){
 const bbox=t.bbox(site),area=t.area(site);if(!Number.isFinite(area)||area<=0||area/acre>limits.acres||t.area(t.bboxPolygon(bbox))/acre>limits.envelope_acres)throw Error('Study area exceeds soil analysis limits; subdivide the site.');
 const params={where:'1=1',geometry:bbox.join(','),geometryType:'esriGeometryEnvelope',inSR:'4326',spatialRel:'esriSpatialRelIntersects'};
 const ids=await query(source+'/query',{...params,f:'json',returnIdsOnly:'true'},signal);
 if(!ids||ids.exceededTransferLimit||!Array.isArray(ids.objectIds))throw Error('Invalid or incomplete USDA polygon index.');
 const keys=ids.objectIds.map(id);if(keys.some(x=>x===null)||new Set(keys).size!==keys.length)throw Error('Invalid or duplicate USDA polygon identifiers.');
 if(keys.length>limits.features)throw Error('More than 500 candidate soil polygons; subdivide the site.');
 const result=[];let vertices=0;
 for(let i=0;i<keys.length;i+=40){
  if(signal.aborted)throw Error('Canceled');progress('Retrieving soil polygons '+(i+1)+'–'+Math.min(i+40,keys.length)+' of '+keys.length+'…');
  const batch=keys.slice(i,i+40),r=await query(source+'/query',{f:'geojson',objectIds:batch.join(','),outFields:'objectid,mukey,musym,muname,areasymbol,mukind,spatialver,nationalmusym',returnGeometry:'true',outSR:'4326'},signal);
  if(!r||r.exceededTransferLimit||!Array.isArray(r.features)||r.features.length!==batch.length)throw Error('Incomplete USDA polygon response.');
  const got=new Set();
  for(const f of r.features){
   const p=attrs(f),oid=id(p.objectid??f.id);
   if(!oid||got.has(oid)||!batch.includes(oid)||!['Polygon','MultiPolygon'].includes(f.geometry?.type))throw Error('Unexpected USDA polygon identifier or geometry.');
   got.add(oid);const coords=t.coordAll(f);if(!coords.length||coords.some(c=>c.length<2||!Number.isFinite(c[0])||!Number.isFinite(c[1])||Math.abs(c[0])>180||Math.abs(c[1])>90))throw Error('Invalid USDA polygon coordinates.');
   vertices+=coords.length;if(vertices>limits.vertices)throw Error('Soil geometry exceeds browser complexity limit; subdivide the site.');
   result.push(f);
  }
 }
 return result;
}
function composition(t,site,features){
 const total=t.area(site);if(!Number.isFinite(total)||total<=0)throw Error('Invalid study area.');
 const groups=new Map();
 for(const f of features){
  const p=attrs(f),key=id(p.mukey),symbol=clean(p.musym),name=clean(p.muname),survey=clean(p.areasymbol),kind=clean(p.mukind),national=clean(p.nationalmusym);
  const part=t.intersect(t.featureCollection([site,f]));if(!part)continue;const a=t.area(part);if(!Number.isFinite(a))throw Error('Invalid clipped soil area.');if(a<=0)continue;
  if(!key||!symbol||!name||!survey)throw Error('Intersecting soil polygon has missing map-unit identifiers or name; composition withheld.');
  if(!groups.has(key))groups.set(key,{key,symbol,name,survey,kind,national,versions:new Set(),parts:[]});
  const g=groups.get(key);if(g.symbol!==symbol||g.name!==name||g.survey!==survey||g.kind!==kind||g.national!==national)throw Error('Conflicting attributes for soil map unit '+key+'.');
  if(p.spatialver!==null&&p.spatialver!==undefined)g.versions.add(String(p.spatialver));g.parts.push(part);
 }
 const rows=[...groups.values()].map(g=>{const geometry=union(t,g.parts);if(!geometry)throw Error('Soil map-unit dissolve failed.');const area=t.area(geometry);if(!Number.isFinite(area)||area<=0)throw Error('Invalid dissolved soil area.');return {key:g.key,symbol:g.symbol,name:g.name,survey:g.survey,kind:g.kind,national:g.national,spatial_versions:[...g.versions].sort(),geometry,area}}).sort((a,b)=>b.area-a.area);
 const covered=rows.length?t.area(union(t,rows.map(r=>r.geometry))):0,sum=rows.reduce((s,r)=>s+r.area,0),tol=Math.max(.1,total*.0001);
 if(!Number.isFinite(covered)||covered<0||sum-covered>tol||covered-total>tol||sum>total+tol)throw Error('Soil polygons overlap or exceed the study boundary; percentages withheld.');
 return {rows,total,covered:Math.min(total,covered),gap:Math.max(0,total-covered),overlap:Math.max(0,sum-covered),status:!rows.length?'no_data':(total-covered)>tol?'partial_coverage':'estimated',candidate_count:features.length};
}
root.GRGSoilAnalysis=Object.freeze({source,limits,fetchFeatures,composition});
})(globalThis);
