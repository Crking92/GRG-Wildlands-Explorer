/* Connected positive-fill cell groups, not surveyed basins or unique spillways. */
(function(root){
'use strict';
const acre=4046.8564224;
const method='Eight-neighbor connected components of positive Priority-Flood fill depth; conditioned receiver transitions from each group to a non-group cell are candidate exits.';
const limitations='Groups may merge adjacent or nested depressions; no minimum depth filter, physical spillway delineation or true catchment area. Cell footprints depend on grid and interpolation. Exit transitions are algorithm-dependent; peak exit contributing area is not total group catchment. Context edges, culverts, DEM error and actual overflow remain unverified. Group IDs are local to one model run.';
function analyze(r){
 const d=r.summary,m=r.conditioned?.model,{width:w,height:h}=d.grid,n=w*h,base={method,limitations,evidence_kind:'modeled_terrain_interpretation',verification_status:'not_field_verified'};
 if(!m||d.status!=='estimated'||r.model.validCount!==n||r.depression?.summary?.status!=='estimated')return {labels:null,summary:{...base,status:'unavailable',detail:'Complete depression and conditioned routing models required.',groups:[],context_group_count:null}};
 if(m.depth.length!==n||m.down.length!==n||m.acc.length!==n||r.weights.length!==n||r.model.cellArea.length!==h)throw Error('Invalid depression group grid');
 const labels=new Int32Array(n),queue=new Int32Array(n),groups=[];let count=0,siteArea=0,siteVolume=0,siteMax=0;
 for(let i=0;i<n;i++){
  if(!Number.isFinite(m.depth[i])||m.depth[i]<0||!Number.isFinite(r.weights[i])||r.weights[i]<0||!Number.isFinite(r.model.cellArea[Math.floor(i/w)])||r.model.cellArea[Math.floor(i/w)]<=0)throw Error('Invalid depression cell');
  if(m.depth[i]===0||labels[i])continue;
  const id=++count;let tail=1,area=0,volume=0,max=0,sa=0,sv=0,sm=0,low=i,edge=false;queue[0]=i;labels[i]=id;
  for(let head=0;head<tail;head++){const k=queue[head],y=Math.floor(k/w),x=k%w,a=r.model.cellArea[y],s=r.weights[k],z=m.depth[k];area+=a;volume+=a*z;max=Math.max(max,z);sa+=s;sv+=s*z;if(s>0)sm=Math.max(sm,z);if(r.elevations[k]<r.elevations[low])low=k;if(m.edge[k])edge=true;
   for(const [dy,dx] of root.GRGDrainage.dirs){const yy=y+dy,xx=x+dx;if(yy<0||yy>=h||xx<0||xx>=w)continue;const j=yy*w+xx;if(m.depth[j]>0&&!labels[j]){labels[j]=id;queue[tail++]=j}}
  }
  if(!sa)continue;
  const exits=[];for(let k=0;k<tail;k++){const i=queue[k],j=m.down[i];if(j<0||j>=n)throw Error('Positive-fill cell without receiver');if(labels[j]===id)continue;if(m.depth[j]>0)throw Error('Adjacent positive cell outside group');exits.push({from_cell:i,to_cell:j,filled_elevation_m:m.filled[i],local_contributing_area_acres:m.acc[i]/acre,edge_influenced:!!m.edge[i]})}
  if(!exits.length)throw Error('Depression group has no modeled exit');exits.sort((a,b)=>b.local_contributing_area_acres-a.local_contributing_area_acres||a.from_cell-b.from_cell);
  groups.push({id:'D'+id,group_number:id,context_cells:tail,context_area_acres:area/acre,site_area_acres:sa/acre,percent_of_site:100*sa/(d.study_area_acres*acre),percent_of_group_in_site:100*sa/area,context_fill_volume_m3:volume,site_fill_volume_m3:sv,context_max_depth_m:max,site_max_depth_m:sm,context_mean_depth_m:volume/area,site_mean_depth_m:sv/sa,lowest_original_cell:low,edge_influenced:edge,peak_exit_local_contributing_area_acres:exits[0].local_contributing_area_acres,exits});
  siteArea+=sa;siteVolume+=sv;siteMax=Math.max(siteMax,sm);
 }
 const p=r.depression.summary;if(Math.abs(siteArea/acre-p.site_depression_area_acres)>Math.max(.00001,d.study_area_acres*1e-7)||Math.abs(siteVolume-p.site_fill_volume_m3)>Math.max(.001,siteVolume*1e-8)||Math.abs(siteMax-p.maximum_site_depth_m)>1e-8)throw Error('Group totals disagree with depression analysis');
 groups.sort((a,b)=>b.site_area_acres-a.site_area_acres||a.group_number-b.group_number);
 const keep=new Set(groups.map(g=>g.group_number));for(let i=0;i<n;i++)if(labels[i]&&!keep.has(labels[i]))labels[i]=0;
 return {labels,summary:{...base,status:'estimated',groups,context_group_count:count}};
}
root.GRGDepressionGroups=Object.freeze({analyze});
})(globalThis);
