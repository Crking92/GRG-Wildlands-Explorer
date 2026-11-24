/* Local catchment mapped impervious context; no runoff estimate. */
(function upstreamModule(root){
'use strict';
const A=4046.8564224,method='Sample the raw NLCD fractional impervious 30 m service pixel containing each selected catchment cell center. Weight by ground cell area, splitting inside/outside using existing clipped property weights. Include depression footprint and report upstream-only partition separately.';
const limitations='Local conditioned catchment only; not a complete watershed or runoff prediction. A center pixel is assumed representative of the entire terrain cell, including both sides of property boundary; mixed pixels and grid mismatch remain. Impervious fraction does not establish hydraulic connectivity, drainage infrastructure, infiltration or runoff volume. Edge contact may truncate catchment; absence of contact does not verify completeness. Independent GIS validation pending.';
function bounds(r,c){
 const {width:w,height:h,bbox}=r.summary.grid,t=r.summary.requested_grid_m,n=w*h;
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||n>60000||!Number.isFinite(t)||t<=0||!Array.isArray(bbox)||bbox.length!==4||!bbox.every(Number.isFinite)||c?.summary?.status!=='estimated'||c.mask?.length!==n)throw Error('Valid local catchment required');
 let x0=w,y0=h,x1=-1,y1=-1;for(let i=0;i<n;i++){if(![0,1,2].includes(c.mask[i]))throw Error('Invalid catchment mask');if(!c.mask[i])continue;const x=i%w,y=Math.floor(i/w);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}
 if(x1<0)throw Error('Empty local catchment');
 return [bbox[0]+x0*t,bbox[3]-(y1+1)*t,bbox[0]+(x1+1)*t,bbox[3]-y0*t];
}
function compare(r,c,raw,meta,project){
 bounds(r,c);const {width:w,height:h,bbox}=r.summary.grid,t=r.summary.requested_grid_m,n=w*h,{grid:g,decoded:d}=raw,p=d.pixels?.[0],mask=d.mask;
 if(r.weights.length!==n||r.model.cellArea.length!==h||!Number.isInteger(g.width)||!Number.isInteger(g.height)||g.width*g.height>12000||d.width!==g.width||d.height!==g.height||p?.length!==g.width*g.height||mask&&mask.length!==p.length)throw Error('Invalid raster or terrain grid');
 const keys=['total','inside','outside','upstream_only','upstream_inside','upstream_outside','depression'],acc=Object.fromEntries(keys.map(k=>[k,{area:0,valid:0,impervious:0}])),samples=new Int16Array(n).fill(-1);let boundary=0;
 for(let i=0;i<n;i++){
  const code=c.mask[i];if(!code)continue;const y=Math.floor(i/w),x=i%w,a=r.model.cellArea[y],s=r.weights[i];if(!Number.isFinite(a)||a<=0||!Number.isFinite(s)||s<0||s>a+Math.max(.001,a*1e-7))throw Error('Invalid catchment area weights');const inside=Math.min(s,a),outside=a-inside;if(inside>0&&outside>0)boundary+=a;
  const q=project(g,[bbox[0]+(x+.5)*t,bbox[3]-(y+.5)*t]);if(!q?.every(Number.isFinite))throw Error('Raster projection failed');const col=Math.floor((q[0]-g.bbox[0])/30),row=Math.floor((g.bbox[3]-q[1])/30);let k=null;
  if(col>=0&&col<g.width&&row>=0&&row<g.height){const j=row*g.width+col,v=p[j];if(!(mask&&mask[j]===0)&&v!==250){if(!Number.isInteger(v)||v<0||v>100)throw Error('Unrecognized impervious raster value '+v);k=v;samples[i]=v}}
  const add=(key,area)=>{const z=acc[key];z.area+=area;if(k!==null){z.valid+=area;z.impervious+=area*k/100}};
  add('total',a);add('inside',inside);add('outside',outside);if(code===2){add('upstream_only',a);add('upstream_inside',inside);add('upstream_outside',outside)}else add('depression',a);
 }
 const expected={total:c.summary.local_area_acres,inside:c.summary.site_area_acres,outside:c.summary.outside_site_area_acres,upstream_only:c.summary.upstream_only_area_acres,upstream_inside:c.summary.upstream_only_site_area_acres,upstream_outside:c.summary.upstream_only_outside_site_area_acres,depression:c.summary.group_area_acres};
 const partitions={};for(const key of keys){const z=acc[key],missing=Math.max(0,z.area-z.valid);if(!Number.isFinite(expected[key])||Math.abs(z.area/A-expected[key])>Math.max(.00001,expected[key]*1e-7))throw Error('Catchment area partition mismatch: '+key);const complete=missing<=Math.max(.0001,z.area*1e-9);partitions[key]={area_acres:z.area/A,valid_area_acres:z.valid/A,missing_area_acres:missing/A,coverage_percent:z.area?100*z.valid/z.area:null,known_impervious_acres:z.valid?z.impervious/A:null,estimated_impervious_acres:z.area&&z.valid&&complete?z.impervious/A:null,mean_percent_of_valid_area:z.valid?100*z.impervious/z.valid:null}}
 const z=acc.total,status=!z.valid?'no_data':partitions.total.estimated_impervious_acres===null?'partial_coverage':'estimated';
 return {samples,summary:{status,group_id:c.summary.group_id,group_number:c.summary.group_number,edge_contact:c.summary.edge_contact,source_id:meta.source_id,source_url:meta.source_url,year:meta.year,source_raster_ids:meta.source_raster_ids,retrieved_at:meta.retrieved_at,service_grid_crs:meta.service_grid_crs,service_grid_projection:meta.service_grid_projection,service_grid_resolution_m:30,method,limitations,evidence_kind:'mapped_estimate_and_modeled_terrain_interpretation',verification_status:'not_field_verified',boundary_straddling_cell_area_acres:boundary/A,partitions}};
}
root.GRGUpstreamImpervious=Object.freeze({bounds,compare});
})(globalThis);
