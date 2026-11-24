/* Mapped land cover and fractional cover context for valid erosion cells. */
(function module(root){
'use strict';
const acre=4046.8564224,step=30;
const method='Sample the raw 30 m service pixel containing each valid terrain cell center in its service CRS; weight by the existing terrain cell property-intersection area. Not an exact cross-grid intersection. Partial boundary cells may sample outside the property; mixed native pixels and grid mismatch remain.';
const limitations='Mapped context, not measured ground cover, soil protection, runoff or erosion risk. Canopy is overhead cover, not litter or understory; impervious fraction is not measured runoff. Data years may differ. No resampling creates finer source resolution. Excluded terrain remains excluded, missing pixels remain unknown; no prediction of erosion rates.';
const bins=[['0%',0,0],['>0–25%',0,25],['>25–50%',25,50],['>50–75%',50,75],['>75–100%',75,100]];
function compare(id,r,raw,meta,project,classes=root.GRGRasterAnalysis?.classes){
 if(!['land','canopy','impervious'].includes(id)||!r.erosion?.values||!raw?.grid||!raw?.decoded)throw Error('Terrain and raw mapped raster required');
 const {grid:g,decoded:d}=raw,{width:w,height:h,bbox}=r.summary.grid,n=w*h,t=r.summary.requested_grid_m,e=r.erosion,p=d.pixels?.[0],mask=d.mask;
 if(!Number.isInteger(w)||!Number.isInteger(h)||n>60000||!Number.isFinite(t)||t<=0||e.values.length!==n||r.weights.length!==n||e.codes.length!==n||!Number.isInteger(g.width)||!Number.isInteger(g.height)||g.width*g.height>12000||d.width!==g.width||d.height!==g.height||p?.length!==g.width*g.height||mask&&mask.length!==p.length)throw Error('Invalid comparison grid');
 const rows=new Map(),samples=new Int16Array(n).fill(-1);let total=0,valid=0,missing=0,boundary=0,weighted=0,edge=0;
 for(let i=0;i<n;i++){
  const v=e.values[i];if(!Number.isFinite(v))continue;
  const a=r.weights[i],y=Math.floor(i/w),x=i%w;if(!Number.isFinite(a)||a<=0||v<0)throw Error('Invalid terrain cell weight');
  total+=a;const full=r.model.cellArea[y];if(!Number.isFinite(full)||full<=0)throw Error('Invalid cell ground area');if(a<full-Math.max(.001,full*1e-7))boundary+=a;
  const q=project(g,[bbox[0]+(x+.5)*t,bbox[3]-(y+.5)*t]);if(!q?.every(Number.isFinite))throw Error('Raster projection failed');
  const col=Math.floor((q[0]-g.bbox[0])/step),row=Math.floor((g.bbox[3]-q[1])/step);
  if(col<0||col>=g.width||row<0||row>=g.height){missing+=a;continue}
  const j=row*g.width+col,k=p[j];if(mask&&mask[j]===0||id==='canopy'&&(k===254||k===255)||id!=='canopy'&&k===250){missing+=a;continue}
  if(!Number.isInteger(k)||id==='land'&&!classes?.[k]||id!=='land'&&(k<0||k>100))throw Error('Unrecognized sampled raster value '+k);
  samples[i]=k;valid+=a;const b=id==='land'?k:k===0?0:Math.ceil(k/25);if(id!=='land')weighted+=k*a;
  if(!rows.has(b))rows.set(b,{code:b,name:id==='land'?classes[b][0]:bins[b][0],color:id==='land'?classes[b][1]:null,area:0,sum:0,peak:null,edge:0});
  const z=rows.get(b);z.area+=a;z.sum+=a*v;z.peak=z.peak===null?v:Math.max(z.peak,v);if(e.codes[i]===4){z.edge+=a;edge+=a}
 }
 const target=e.summary.valid_area_acres*acre;if(Math.abs(total-target)>Math.max(.001,target*1e-7)||Math.abs(valid+missing-total)>Math.max(.001,total*1e-8))throw Error('Terrain sample area partition failed');
 const status=!valid?'no_data':missing<=Math.max(.0001,total*1e-9)?'estimated':'partial_coverage';
 return {samples,summary:{status,dataset:id,source_id:meta.source_id,source_url:meta.source_url,source_raster_ids:meta.source_raster_ids,year:meta.year,retrieved_at:meta.retrieved_at,service_grid_crs:meta.service_grid_crs,service_grid_projection:meta.service_grid_projection,service_grid_resolution_m:30,method,limitations,evidence_kind:'mapped_estimate_and_modeled_terrain_interpretation',verification_status:'not_field_verified',terrain_valid_area_acres:total/acre,sampled_area_acres:valid/acre,missing_sample_area_acres:missing/acre,partial_boundary_cell_area_acres:boundary/acre,edge_influenced_sample_area_acres:edge/acre,coverage_percent:total?100*valid/total:null,mean_mapped_percent_of_sampled_area:id==='land'||!valid?null:weighted/valid,rows:[...rows.values()].sort((a,b)=>a.code-b.code).map(z=>({code:z.code,name:z.name,color:z.color,area_acres:z.area/acre,percent_of_sampled_area:100*z.area/valid,mean_terrain_index_m:z.sum/z.area,maximum_terrain_index_m:z.peak,edge_influenced_area_acres:z.edge/acre}))}};
}
root.GRGCoverTerrain=Object.freeze({compare});
})(globalThis);
