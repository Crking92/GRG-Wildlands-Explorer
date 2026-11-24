/* TPWD ecological community polygon context for terrain screening. */
(function habitatModule(root){
'use strict';
const acre=4046.8564224;
const method='Intersect existing study-clipped, dissolved TPWD community polygons with valid terrain-index cells in EPSG:3857 using spherical ground-area weighting. No center-point classification. Small geometry discrepancies are reported separately.';
const limitations='TPWD EMS 2020 service, original map objects generated at 10 m; not a field inventory or verified present-day vegetation. Polygon reprojection and clipping are approximate. Terrain index is not actual erosion, soil loss, native species presence or ground protection. Edge-influenced terrain may have incomplete upstream area. Independent GIS validation pending.';
function compare(r,data,project,clip,area,source){
 const d=r.summary,e=r.erosion,{width:w,height:h,bbox}=d.grid,n=w*h,step=d.requested_grid_m;
 if(!e?.values||e.values.length!==n||e.codes.length!==n||r.weights.length!==n||!Array.isArray(data?.rows)||!data.retrieved||!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||n>60000||!Number.isFinite(step)||step<=0)throw Error('Valid terrain and mapped habitat polygons required');
 const allocated=new Float64Array(n),rows=[],keys=new Set();let work=0;
 for(const u of data.rows){
  const key=String(u.code)+'|'+u.name,geom=u.geometry?.geometry;
  if(keys.has(key)||!u.name||!Number.isFinite(u.area)||u.area<=0||!geom||!['Polygon','MultiPolygon'].includes(geom.type))throw Error('Invalid mapped community record');keys.add(key);
  const polys=(geom.type==='Polygon'?[geom.coordinates]:geom.coordinates).map(p=>p.map(ring=>ring.map(project)));let valid=0,sum=0,peak=null,edge=0;
  for(const p of polys){
   let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
   for(const ring of p)for(const q of ring)if(!q||!Number.isFinite(q[0])||!Number.isFinite(q[1]))throw Error('Invalid projected habitat coordinate');
   for(const [x,y] of p[0]){xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y)}
   const c0=Math.max(0,Math.min(w,Math.floor((xmin-bbox[0])/step))),c1=Math.max(0,Math.min(w,Math.ceil((xmax-bbox[0])/step))),r0=Math.max(0,Math.min(h,Math.floor((bbox[3]-ymax)/step))),r1=Math.max(0,Math.min(h,Math.ceil((bbox[3]-ymin)/step)));
   work+=Math.max(0,c1-c0)*Math.max(0,r1-r0)*p.reduce((s,q)=>s+q.length,0);if(work>12000000)throw Error('Habitat/terrain intersection too complex; choose smaller site or coarser grid');
   for(let y=r0;y<r1;y++)for(let x=c0;x<c1;x++){const i=y*w+x,v=e.values[i];if(!Number.isFinite(v))continue;const xx=bbox[0]+x*step,yy=bbox[3]-y*step,b=[xx,yy-step,xx+step,yy];const a=clip(p[0],b,area)-p.slice(1).reduce((s,q)=>s+clip(q,b,area),0);if(!Number.isFinite(a)||a<-.01)throw Error('Invalid habitat cell intersection');if(a<=0)continue;allocated[i]+=a;valid+=a;sum+=a*v;peak=peak===null?v:Math.max(peak,v);if(e.codes[i]===4)edge+=a}
  }
  rows.push({code:String(u.code),name:u.name,color:u.color??null,mapped_area_acres:u.area/acre,terrain_intersection_acres:valid/acre,mean_terrain_index_m:valid?sum/valid:null,maximum_terrain_index_m:peak,edge_influenced_intersection_acres:edge/acre});
 }
 let total=0,intersected=0,gap=0,excess=0;
 for(let i=0;i<n;i++){if(!Number.isFinite(e.values[i]))continue;const a=r.weights[i],b=allocated[i];if(!Number.isFinite(a)||a<=0||b>a+Math.max(.05,a*.001))throw Error('Habitat intersections exceed property cell area');total+=a;intersected+=b;gap+=Math.max(0,a-b);excess+=Math.max(0,b-a)}
 const available=e.summary.valid_area_acres,tol=Math.max(.0001,available*.001);
 if(Math.abs(total/acre-available)>Math.max(.00001,available*1e-7)||excess/acre>tol||Math.abs(intersected+gap-excess-total)>Math.max(.001,total*1e-8))throw Error('Habitat terrain area partition failed');
 return {status:intersected===0?'no_data':gap/acre>tol?'partial_coverage':'estimated',source_id:'tpwd_ems',source_url:source,source_service_vintage:'2020',original_map_object_resolution_m:10,spatial_retrieved_at:data.retrieved,method,limitations,evidence_kind:'mapped_estimate_and_modeled_terrain_interpretation',verification_status:'not_field_verified',terrain_valid_area_acres:available,habitat_terrain_intersection_acres:intersected/acre,unmapped_terrain_area_acres:gap/acre,minor_geometry_excess_acres:excess/acre,rows:rows.sort((a,b)=>b.terrain_intersection_acres-a.terrain_intersection_acres)};
}
root.GRGHabitatTerrain=Object.freeze({compare});
})(globalThis);
