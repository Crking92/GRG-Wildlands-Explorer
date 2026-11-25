/* FEMA NFHL effective flood hazard zones; mapped designations, not a flood prediction. */
(function(root){
'use strict';
const server='https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer',source=server+'/28',acre=4046.8564224;
const clean=v=>typeof v==='string'&&v.trim()&&!['NULL','<NULL>'].includes(v.trim().toUpperCase())?v.trim():null;
const oid=v=>/^\d+$/.test(String(v))?String(v):null;
const attrs=f=>Object.fromEntries(Object.entries(f.properties||{}).map(([k,v])=>[k.toUpperCase(),v]));
const union=(t,fs)=>fs.length===1?fs[0]:t.union(t.featureCollection(fs));
function category(zone,sub,flag){
 if(!zone)return 'unclassified';
 if(zone==='D'||zone==='OPEN WATER'||zone==='UNMAPPED'||zone==='AREA NOT INCLUDED')return 'undetermined';
 if(flag==='T')return sub?.includes('FLOODWAY')?'floodway':'sfha';
 if(flag!=='F')return 'undetermined';
 if(zone==='X'&&sub==='0.2 PCT ANNUAL CHANCE FLOOD HAZARD')return 'moderate';
 if(zone==='X'&&sub==='AREA OF MINIMAL FLOOD HAZARD')return 'minimal';
 return 'other_mapped';
}
const colors={floodway:'#23659c',sfha:'#4faecf',moderate:'#d4a75c',minimal:'#8baf93',other_mapped:'#b8a2d8',undetermined:'#87929d',unclassified:'#87929d'};
// Exact bounding-box rejection of entire remote polygon components; no simplification.
const limits=Object.freeze({raw:2000000,retained:1000000});
function selectComponents(f,bbox,budget){
 const g=f.geometry,polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;
 if(!Array.isArray(polys)||!polys.length)throw Error('Invalid FEMA polygon components');
 const keep=[];
 for(const poly of polys){if(!Array.isArray(poly)||!poly.length)throw Error('Invalid FEMA polygon rings');let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,n=0;
  for(const ring of poly){if(!Array.isArray(ring)||ring.length<4)throw Error('Invalid FEMA ring');for(const c of ring){if(!Array.isArray(c)||!Number.isFinite(c[0])||!Number.isFinite(c[1])||Math.abs(c[0])>180||Math.abs(c[1])>90)throw Error('Invalid FEMA coordinates');n++;budget.raw++;if(budget.raw>limits.raw)throw Error('FEMA raw geometry safety limit exceeded (2,000,000 vertices)');minX=Math.min(minX,c[0]);maxX=Math.max(maxX,c[0]);minY=Math.min(minY,c[1]);maxY=Math.max(maxY,c[1])}if(ring[0][0]!==ring.at(-1)[0]||ring[0][1]!==ring.at(-1)[1])throw Error('Unclosed FEMA ring')}
  if(maxX<bbox[0]||minX>bbox[2]||maxY<bbox[1]||minY>bbox[3])continue;
  budget.retained+=n;if(budget.retained>limits.retained)throw Error('FEMA local geometry safety limit exceeded (1,000,000 vertices)');keep.push(poly)
 }
 if(!keep.length)return null;
 return {type:'Feature',id:f.id,properties:f.properties,geometry:keep.length===1?{type:'Polygon',coordinates:keep[0]}:{type:'MultiPolygon',coordinates:keep}};
}
async function retrieve(t,site,query,signal,progress=()=>{}){
 const bbox=t.bbox(site),area=t.area(site);if(!Number.isFinite(area)||area<=0||area/acre>1000||t.area(t.bboxPolygon(bbox))/acre>5000)throw Error('Study exceeds flood analysis limits; subdivide the area.');
 const m=await query(source,{f:'json'},signal);
 if(m.id!==28||!String(m.name).toLowerCase().includes('flood hazard zone')||m.geometryType!=='esriGeometryPolygon')throw Error('Unexpected FEMA layer metadata');
 const fieldNames=(m.fields||[]).map(f=>String(f.name).toUpperCase()),objectField=(m.fields||[]).find(f=>f.type==='esriFieldTypeOID')?.name;
 if(!objectField||!['FLD_ZONE','ZONE_SUBTY','SFHA_TF','FLD_AR_ID','DFIRM_ID'].every(k=>fieldNames.includes(k)))throw Error('Required FEMA fields unavailable');
 const where={where:'1=1',geometry:bbox.join(','),geometryType:'esriGeometryEnvelope',inSR:'4326',spatialRel:'esriSpatialRelIntersects'};
 const idx=await query(source+'/query',{...where,returnIdsOnly:'true',f:'json'},signal);
 // Some services may return null instead of an empty ID array. Never assume absence.
 if(idx.objectIds===null&&!idx.exceededTransferLimit){const count=await query(source+'/query',{...where,returnCountOnly:'true',f:'json'},signal);if(count.count===0&&!count.exceededTransferLimit)return [];throw Error('Null feature index could not be verified as empty')}
 if(!Array.isArray(idx.objectIds)||idx.exceededTransferLimit)throw Error('Incomplete FEMA polygon index');
 const ids=idx.objectIds.map(oid);if(ids.some(v=>v===null)||new Set(ids).size!==ids.length||ids.length>500)throw Error('Invalid or excessive FEMA polygon IDs');
 const fs=[],budget={raw:0,retained:0};
 for(let i=0;i<ids.length;i+=30){
  if(signal.aborted)throw Error('Canceled');const batch=ids.slice(i,i+30);progress('Retrieving FEMA polygons '+(i+1)+'–'+Math.min(i+30,ids.length)+' of '+ids.length+'…');
  const r=await query(source+'/query',{objectIds:batch.join(','),outFields:[objectField,'FLD_ZONE','ZONE_SUBTY','SFHA_TF','FLD_AR_ID','DFIRM_ID'].join(','),returnGeometry:'true',outSR:'4326',f:'geojson'},signal);
  if(r.exceededTransferLimit||!Array.isArray(r.features)||r.features.length!==batch.length)throw Error('Incomplete FEMA polygon response');
  const seen=new Set();for(const f of r.features){const id=oid(attrs(f)[objectField.toUpperCase()]??f.id);if(!id||!batch.includes(id)||seen.has(id)||!['Polygon','MultiPolygon'].includes(f.geometry?.type))throw Error('Invalid FEMA geometry or polygon ID');seen.add(id);
   const local=selectComponents(f,bbox,budget);if(local)fs.push(local)}
 }
 Object.defineProperty(fs,'candidate_count',{value:ids.length});return fs;
}
function composition(t,site,fs){
 const total=t.area(site);if(!Number.isFinite(total)||total<=0)throw Error('Invalid study area');
 const groups=new Map();
 for(const f of fs){const p=attrs(f),part=t.intersect(t.featureCollection([site,f]));if(!part)continue;const a=t.area(part);if(!Number.isFinite(a))throw Error('Invalid flood intersection');if(a<=0)continue;
  const zone=clean(p.FLD_ZONE)?.toUpperCase()||null,sub=clean(p.ZONE_SUBTY)?.toUpperCase()||null,flag=clean(p.SFHA_TF)?.toUpperCase()||null;if(flag!==null&&!['T','F'].includes(flag))throw Error('Unrecognized FEMA SFHA flag');
  const cat=category(zone,sub,flag),key=JSON.stringify([zone,sub,flag]);if(!groups.has(key))groups.set(key,{zone,subtype:sub,sfha_flag:flag,category:cat,color:colors[cat],parts:[],source_ids:new Set(),dfirm_ids:new Set()});const g=groups.get(key);g.parts.push(part);if(clean(p.FLD_AR_ID))g.source_ids.add(clean(p.FLD_AR_ID));if(clean(p.DFIRM_ID))g.dfirm_ids.add(clean(p.DFIRM_ID));
 }
 const rows=[...groups.values()].map(g=>{const geometry=union(t,g.parts);if(!geometry)throw Error('Flood-zone dissolve failed');const a=t.area(geometry);if(!Number.isFinite(a)||a<=0)throw Error('Invalid flood-zone area');return {zone:g.zone,subtype:g.subtype,sfha_flag:g.sfha_flag,category:g.category,color:g.color,geometry,area:a,source_ids:[...g.source_ids],dfirm_ids:[...g.dfirm_ids]}}).sort((a,b)=>b.area-a.area);
 const covered=rows.length?t.area(union(t,rows.map(r=>r.geometry))):0,sum=rows.reduce((s,r)=>s+r.area,0),tol=Math.max(.1,total*.0001);if(!Number.isFinite(covered)||covered<0||sum-covered>tol||covered-total>tol||sum>total+tol)throw Error('Overlapping flood classifications or inconsistent area; results withheld');
 const gap=Math.max(0,total-covered),unknown=rows.filter(r=>['undetermined','unclassified'].includes(r.category)).reduce((s,r)=>s+r.area,0),sfha=rows.filter(r=>r.sfha_flag==='T').reduce((s,r)=>s+r.area,0);
 const complete=rows.length>0&&gap<=tol&&unknown<=tol;
 return {rows,total,covered:Math.min(total,covered),gap,unknown,sfha,complete,status:!rows.length?'no_data':complete?'estimated':'partial_coverage',candidate_count:fs.candidate_count??fs.length,overlap:Math.max(0,sum-covered)};
}
root.GRGFlood=Object.freeze({version:'0.60.1',server,source,retrieve,composition,category,colors});
})(globalThis);
