/* Public USGS NHD legacy streams and WBD subwatersheds. */
(function(root){
'use strict';
const acre=4046.8564224;
const sources={stream:{server:'https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer',layer:6,fields:['gnis_name','reachcode','fcode','ftype'],geometry:'esriGeometryPolyline',name:'Flowline - Large Scale'},watershed:{server:'https://hydro.nationalmap.gov/arcgis/rest/services/wbd/MapServer',layer:6,fields:['huc12','name'],geometry:'esriGeometryPolygon',name:'12-digit HU (Subwatershed)'}};
const attrs=f=>Object.fromEntries(Object.entries(f.properties||{}).map(([k,v])=>[k.toLowerCase(),v]));
const str=v=>typeof v==='string'&&v.trim()?v.trim():null;
const oid=v=>/^\d+$/.test(String(v))?String(v):null;
const kinds={46000:'Stream/river — permanence unspecified',46003:'Intermittent stream/river',46006:'Perennial stream/river',46007:'Ephemeral stream/river'};
async function retrieve(id,t,site,query,signal,progress=()=>{}){
 const s=sources[id],url=s.server+'/'+s.layer,bbox=t.bbox(site),area=t.area(site);
 if(!Number.isFinite(area)||area<=0||area/acre>1000||t.area(t.bboxPolygon(bbox))/acre>5000)throw Error('Study exceeds analysis limits; subdivide.');
 const m=await query(url,{f:'json'},signal),fields=(m.fields||[]).map(f=>String(f.name).toLowerCase()),objectField=(m.fields||[]).find(f=>f.type==='esriFieldTypeOID')?.name;
 if(m.id!==s.layer||m.name!==s.name||m.geometryType!==s.geometry||!objectField||!s.fields.every(k=>fields.includes(k)))throw Error('Unexpected USGS layer metadata');
 const idx=await query(url+'/query',{where:id==='stream'?'ftype = 460':'1=1',geometry:bbox.join(','),geometryType:'esriGeometryEnvelope',inSR:'4326',spatialRel:'esriSpatialRelIntersects',returnIdsOnly:'true',f:'json'},signal);
 if(!Array.isArray(idx.objectIds)||idx.exceededTransferLimit)throw Error('Incomplete feature index');
 const ids=idx.objectIds.map(oid);if(ids.some(v=>v===null)||new Set(ids).size!==ids.length||ids.length>500)throw Error('Invalid or excessive feature IDs');
 const fs=[];let count=0;
 for(let i=0;i<ids.length;i+=20){if(signal.aborted)throw Error('Canceled');const batch=ids.slice(i,i+20);progress('Retrieving '+(i+1)+'–'+Math.min(i+20,ids.length)+' of '+ids.length+' features…');
 const r=await query(url+'/query',{objectIds:batch.join(','),outFields:[objectField,...s.fields].join(','),returnGeometry:'true',outSR:'4326',f:'geojson'},signal);
 if(r.exceededTransferLimit||!Array.isArray(r.features)||r.features.length!==batch.length)throw Error('Incomplete feature batch');
 const seen=new Set();for(const f of r.features){const key=oid(attrs(f)[objectField.toLowerCase()]??f.id),types=id==='stream'?['LineString','MultiLineString']:['Polygon','MultiPolygon'];if(!key||!batch.includes(key)||seen.has(key)||!types.includes(f.geometry?.type))throw Error('Invalid feature ID or geometry');seen.add(key);const cs=t.coordAll(f);if(!cs.length||cs.some(p=>!Number.isFinite(p[0])||!Number.isFinite(p[1])||Math.abs(p[0])>180||Math.abs(p[1])>90))throw Error('Invalid coordinates');count+=cs.length;if(count>300000)throw Error('Geometry complexity limit exceeded');fs.push(f)}
 }return fs;
}
// Clip each source segment by splitting at every boundary crossing, including holes.
// Planar intersection in lon/lat follows the source line representation; lengths geodesic.
function clipLine(t,site,lines){
 const rings=(site.geometry.type==='Polygon'?[site.geometry.coordinates]:site.geometry.coordinates).flat(1);
 const edges=[];for(const r of rings)for(let i=1;i<r.length;i++)edges.push([r[i-1],r[i]]);
 const n=lines.reduce((s,l)=>s+l.length-1,0);if(n*edges.length>3000000)throw Error('Stream clipping complexity limit exceeded');
 const cross=(a,b)=>a[0]*b[1]-a[1]*b[0],out=[];
 for(const line of lines){let run=null;for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],d=[b[0]-a[0],b[1]-a[1]],len=d[0]**2+d[1]**2;if(!len)continue;const ts=[0,1];
 for(const [c,e] of edges){if(Math.max(a[0],b[0])<Math.min(c[0],e[0])||Math.min(a[0],b[0])>Math.max(c[0],e[0])||Math.max(a[1],b[1])<Math.min(c[1],e[1])||Math.min(a[1],b[1])>Math.max(c[1],e[1]))continue;const v=[e[0]-c[0],e[1]-c[1]],q=[c[0]-a[0],c[1]-a[1]],den=cross(d,v);
 if(Math.abs(den)>1e-18){const u=cross(q,v)/den,w=cross(q,d)/den;if(u>0&&u<1&&w>=-1e-10&&w<=1+1e-10)ts.push(u)}else if(Math.abs(cross(q,d))<1e-18){for(const p of [c,e]){const u=((p[0]-a[0])*d[0]+(p[1]-a[1])*d[1])/len;if(u>0&&u<1)ts.push(u)}}}
 ts.sort((x,y)=>x-y);const at=u=>[a[0]+u*d[0],a[1]+u*d[1]];
 for(let j=1;j<ts.length;j++){const u=ts[j-1],v=ts[j];if(v-u<1e-10)continue;if(t.booleanPointInPolygon(t.point(at((u+v)/2)),site)){const p=at(u),q=at(v);if(run&&Math.hypot(run.at(-1)[0]-p[0],run.at(-1)[1]-p[1])<1e-10)run.push(q);else{run=[p,q];out.push(run)}}else run=null}
 }}return out;
}
function streams(t,site,fs){
 const rows=[];for(const f of fs){const p=attrs(f),code=Number(p.fcode);if(Number(p.ftype)!==460||!Number.isInteger(code)||Math.floor(code/100)!==460)throw Error('Unexpected non-stream feature');const lines=clipLine(t,site,f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates);if(!lines.length)continue;const geometry=t.multiLineString(lines),meters=t.length(geometry,{units:'meters'});if(!Number.isFinite(meters)||meters<=0)throw Error('Invalid stream length');rows.push({name:str(p.gnis_name),reachcode:str(p.reachcode),fcode:code,kind:kinds[code]||'Stream/river — other source code',meters,geometry})}
 const total=rows.reduce((s,r)=>s+r.meters,0);return {rows,total_meters:rows.length?total:null,status:rows.length?'estimated':'no_data',candidate_count:fs.length};
}
function watersheds(t,site,fs){
 const total=t.area(site),groups=new Map(),union=fs=>fs.length===1?fs[0]:t.union(t.featureCollection(fs));
 for(const f of fs){const p=attrs(f),part=t.intersect(t.featureCollection([site,f]));if(!part||t.area(part)<=0)continue;const h=str(p.huc12),name=str(p.name);if(!h||!/^\d{12}$/.test(h)||!name)throw Error('Invalid HUC12 identity');if(!groups.has(h))groups.set(h,{name,parts:[]});const g=groups.get(h);if(g.name!==name)throw Error('Conflicting watershed names');g.parts.push(part)}
 const rows=[...groups].map(([h,g])=>{const geometry=union(g.parts),area=geometry?t.area(geometry):NaN;if(!Number.isFinite(area)||area<=0)throw Error('Invalid watershed area');return {huc12:h,huc10:h.slice(0,10),huc8:h.slice(0,8),name:g.name,area,geometry}}).sort((a,b)=>b.area-a.area);
 const covered=rows.length?t.area(union(rows.map(r=>r.geometry))):0,sum=rows.reduce((s,r)=>s+r.area,0),tol=Math.max(.1,total*.0001);
 if(!Number.isFinite(total)||total<=0||!Number.isFinite(covered)||covered<0||sum-covered>tol||covered>total+tol||sum>total+tol)throw Error('Inconsistent watershed areas');
 return {rows,total,covered:Math.min(total,covered),gap:Math.max(0,total-covered),status:!rows.length?'no_data':total-covered>tol?'partial_coverage':'estimated',candidate_count:fs.length};
}
root.GRGHydro=Object.freeze({sources,retrieve,clipLine,streams,watersheds});
})(globalThis);
