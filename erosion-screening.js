/* Terrain-only erosion screening; not soil loss or hydraulic stream power. */
(function erosionModule(root){
'use strict';
const acre=4046.8564224,R=6378137;
const method='Terrain-only stream power index proxy: conditioned local contributing ground area (m²) divided by approximate ground cell width (m), multiplied by original DEM centered-difference gradient (rise/run). Site-intersection area weights; no risk thresholds.';
const limitations='Relative terrain screening only; not actual stream power, soil loss, probability of erosion, or engineering guidance. No soil erodibility, rainfall, vegetation, ground cover, infiltration or hydraulic structures included. Filled cells, imposed flat routes and outer cells are excluded, not assigned zero. Model edge influence may truncate contributing area. Raster spacing, interpolation and routing affect results; independently unvalidated.';
function analyze(r){
 const d=r.summary,{width:w,height:h,bbox}=d.grid,n=w*h,c=r.conditioned?.model,m=r.model,z=r.elevations,step=d.requested_grid_m;
 if(d.status!=='estimated'||!c||m.validCount!==n)return {values:null,summary:{status:'unavailable',detail:'Complete conditioned terrain required.'}};
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<3||h<3||n>60000||!Number.isFinite(step)||step<=0||!Number.isFinite(bbox[3])||[z,m.valid,r.weights,c.depth,c.kind,c.acc,c.edge].some(a=>a?.length!==n))throw Error('Invalid erosion screening grid');
 const values=new Float64Array(n).fill(NaN),slopes=new Float64Array(n).fill(NaN),codes=new Uint8Array(n),weights=r.weights;
 let total=0,covered=0,excludedFill=0,excludedEdge=0,influenced=0,sum=0,maximum=null,peak=null,zero=0;
 for(let i=0;i<n;i++){
  const a=weights[i],y=Math.floor(i/w),x=i%w;
  if(!Number.isFinite(a)||a<0||!m.valid[i])throw Error('Invalid erosion site weight or terrain mask');
  if(!a)continue;total+=a;
  if(x===0||x===w-1||y===0||y===h-1){codes[i]=2;excludedEdge+=a;continue}
  if(!Number.isFinite(c.depth[i])||c.depth[i]<0||!Number.isFinite(c.acc[i])||c.acc[i]<=0||![1,2,3].includes(c.kind[i])||![0,1].includes(c.edge[i]))throw Error('Invalid conditioned cell');
  if(c.depth[i]>0||c.kind[i]===2){codes[i]=3;excludedFill+=a;continue}
  const spacing=step/Math.cosh((bbox[3]-(y+.5)*step)/R);
  const dx=(z[i+1]-z[i-1])/(2*spacing),dy=(z[i+w]-z[i-w])/(2*spacing),grade=Math.hypot(dx,dy),v=c.acc[i]/spacing*grade;
  if(!Number.isFinite(v)||v<0||!Number.isFinite(grade))throw Error('Invalid terrain index');
  values[i]=v;slopes[i]=grade*100;codes[i]=c.edge[i]?4:1;covered+=a;sum+=v*a;if(c.edge[i])influenced+=a;if(v===0)zero+=a;if(maximum===null||v>maximum){maximum=v;peak=i}
 }
 if(!total||Math.abs(total/acre-d.study_area_acres)>Math.max(.00001,d.study_area_acres*1e-7)||Math.abs(covered+excludedFill+excludedEdge-total)>Math.max(.001,total*1e-8))throw Error('Erosion screening area mismatch');
 const status=covered===0?'no_data':total-covered<=Math.max(.0001,total*1e-9)?'estimated':'partial_coverage';
 return {values,slopes,codes,summary:{status,method,limitations,evidence_kind:'modeled_terrain_interpretation',verification_status:'not_field_verified',index_unit:'m (area/width × gradient)',valid_area_acres:covered/acre,excluded_outer_area_acres:excludedEdge/acre,excluded_filled_or_flat_area_acres:excludedFill/acre,coverage_percent:100*covered/total,edge_influenced_valid_area_acres:influenced/acre,zero_index_area_acres:zero/acre,mean_index_m:covered?sum/covered:null,maximum_index_m:maximum,maximum_cell_index:peak}};
}
function color(v,max){if(!Number.isFinite(v)||v<0||!Number.isFinite(max)||max<0)return null;if(v===0||max===0)return '#426c64';const t=Math.min(1,Math.log1p(v)/Math.log1p(max));return 'rgb('+Math.round(66+189*t)+','+Math.round(108+24*t)+','+Math.round(100-55*t)+')'}
root.GRGErosion=Object.freeze({analyze,color});
})(globalThis);
