/* USFWS NWI mapped wetland and deepwater features; not a jurisdictional delineation. */
(function(root){
'use strict';
const server='https://fwspublicservices.wim.usgs.gov/wetlandsmapservice/rest/services/Wetlands/MapServer',source=server+'/0',acre=4046.8564224;
const clean=v=>typeof v==='string'&&v.trim()&&!['NULL','<NULL>'].includes(v.trim().toUpperCase())?v.trim():null;
const oid=v=>/^\d+$/.test(String(v))?String(v):null;
const attrs=f=>Object.fromEntries(Object.entries(f.properties||{}).map(([k,v])=>[k.toUpperCase(),v]));
const union=(t,fs)=>fs.length===1?fs[0]:t.union(t.featureCollection(fs));
async function retrieve(t,site,query,signal,progress=()=>{}){
 const bbox=t.bbox(site),area=t.area(site);if(!Number.isFinite(area)||area<=0||area/acre>1000||t.area(t.bboxPolygon(bbox))/acre>5000)throw Error('Study exceeds wetland analysis limits; subdivide the area.');
 const m=await query(source,{f:'json'},signal);
 if(m.id!==0||String(m.name).toLowerCase()!=='wetlands'||m.geometryType!=='esriGeometryPolygon')throw Error('Unexpected NWI layer metadata');
 const fieldNames=(m.fields||[]).map(f=>String(f.name).toUpperCase()),objectField=(m.fields||[]).find(f=>f.type==='esriFieldTypeOID')?.name;
 if(!objectField||!['ATTRIBUTE','WETLAND_TYPE'].every(k=>fieldNames.includes(k)))throw Error('Required NWI fields unavailable');
 const where={where:'1=1',geometry:bbox.join(','),geometryType:'esriGeometryEnvelope',inSR:'4326',spatialRel:'esriSpatialRelIntersects'};
 const idx=await query(source+'/query',{...where,returnIdsOnly:'true',f:'json'},signal);
 // Some services may return null instead of an empty ID array. Never assume absence.
 if(idx.objectIds===null&&!idx.exceededTransferLimit){const count=await query(source+'/query',{...where,returnCountOnly:'true',f:'json'},signal);if(count.count===0&&!count.exceededTransferLimit)return [];throw Error('Null feature index could not be verified as empty')}
 if(!Array.isArray(idx.objectIds)||idx.exceededTransferLimit)throw Error('Incomplete NWI polygon index');
 const ids=idx.objectIds.map(oid);if(ids.some(v=>v===null)||new Set(ids).size!==ids.length||ids.length>500)throw Error('Invalid or excessive NWI polygon IDs');
 const fs=[];let vertices=0;
 for(let i=0;i<ids.length;i+=30){
  if(signal.aborted)throw Error('Canceled');const batch=ids.slice(i,i+30);progress('Retrieving NWI polygons '+(i+1)+'–'+Math.min(i+30,ids.length)+' of '+ids.length+'…');
  const r=await query(source+'/query',{objectIds:batch.join(','),outFields:[objectField,'ATTRIBUTE','WETLAND_TYPE'].join(','),returnGeometry:'true',outSR:'4326',f:'geojson'},signal);
  if(r.exceededTransferLimit||!Array.isArray(r.features)||r.features.length!==batch.length)throw Error('Incomplete NWI polygon response');
  const seen=new Set();for(const f of r.features){const id=oid(attrs(f)[objectField.toUpperCase()]??f.id);if(!id||!batch.includes(id)||seen.has(id)||!['Polygon','MultiPolygon'].includes(f.geometry?.type))throw Error('Invalid NWI geometry or polygon ID');seen.add(id);
   const coords=t.coordAll(f);if(!coords.length||coords.some(c=>!Number.isFinite(c[0])||!Number.isFinite(c[1])||Math.abs(c[0])>180||Math.abs(c[1])>90))throw Error('Invalid NWI coordinates');vertices+=coords.length;if(vertices>300000)throw Error('Wetland polygon complexity limit exceeded');fs.push(f)}
 }
 return fs;
}
const colors={'Freshwater Emergent Wetland':'#7fc319','Freshwater Forested/Shrub Wetland':'#008737','Freshwater Pond':'#678bc0','Lake':'#4a419e','Riverine':'#008fbf','Estuarine and Marine Deepwater':'#007c87','Estuarine and Marine Wetland':'#66c2a5','Other':'#b38753'};
function composition(t,site,fs){
 const total=t.area(site);if(!Number.isFinite(total)||total<=0)throw Error('Invalid study area');
 const groups=new Map();
 for(const f of fs){const p=attrs(f),part=t.intersect(t.featureCollection([site,f]));if(!part)continue;const a=t.area(part);if(!Number.isFinite(a))throw Error('Invalid intersection');if(a<=0)continue;
 const type=clean(p.WETLAND_TYPE),code=clean(p.ATTRIBUTE);if(!type||!code)throw Error('Intersecting feature lacks NWI type or code');
 const key=JSON.stringify([type,code]);if(!groups.has(key))groups.set(key,{type,code,parts:[]});groups.get(key).parts.push(part)}
 const rows=[...groups.values()].map(g=>{const geometry=union(t,g.parts),area=geometry?t.area(geometry):NaN;if(!Number.isFinite(area)||area<=0)throw Error('Invalid dissolved area');return {type:g.type,code:g.code,geometry,area,color:colors[g.type]||'#87929d'}}).sort((a,b)=>b.area-a.area);
 const covered=rows.length?t.area(union(t,rows.map(r=>r.geometry))):0,sum=rows.reduce((s,r)=>s+r.area,0),tol=Math.max(.1,total*.0001);
 if(!Number.isFinite(covered)||covered<0||sum-covered>tol||covered-total>tol||sum>total+tol)throw Error('Overlapping NWI classifications or inconsistent areas; results withheld');
 return {rows,total,covered:Math.min(total,covered),gap:Math.max(0,total-covered),overlap:Math.max(0,sum-covered),status:rows.length?'estimated':'no_data',candidate_count:fs.length};
}
root.GRGWetlands=Object.freeze({server,source,retrieve,composition});
})(globalThis);