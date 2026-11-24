/* Experimental filled-surface single-direction routing with outlet-distance flat resolution. */
(function(root){
'use strict';
const acre=4046.8564224,dirs=[[-1,0],[-1,1],[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1]];
const method='Priority-Flood filled surface; steepest lower neighbor, deterministic ties; equal-elevation flats route toward nearest outlet in eight-neighbor steps. No artificial elevation increment.';
const limitations='Open rectangular context, no complete upstream watershed. Flat directions are imposed, not observed gradients; deterministic ties may introduce directional bias. No stream burning, breaching, culverts, storm drains, rainfall, infiltration or hydraulic prediction. Filling assumes depressions can spill, not that they actually overflow. Not the full Barnes flat-resolution algorithm. Independent GIS validation pending.';
function route(w,h,z,valid,cellArea){
 const n=w*h;if(!Number.isInteger(w)||!Number.isInteger(h)||w<3||h<3||n>60000||z.length!==n||valid.length!==n||cellArea.length!==h||Array.from(cellArea).some(a=>!Number.isFinite(a)||a<=0))throw Error('Invalid conditioned grid');
 const {filled,depth}=root.GRGDepressions.fill(w,h,z,valid);
 const down=new Int32Array(n).fill(-1),direction=new Int8Array(n).fill(-1),distance=new Int32Array(n).fill(-1),queue=new Int32Array(n),kind=new Uint8Array(n),edge=new Uint8Array(n),acc=new Float64Array(n),degree=new Uint8Array(n);let tail=0;
 const boundary=i=>i%w===0||i%w===w-1||i<w||i>=n-w;
 function neighbor(i,k){const r=Math.floor(i/w)+dirs[k][0],c=i%w+dirs[k][1];return r<0||r>=h||c<0||c>=w?-1:r*w+c}
 for(let i=0;i<n;i++){
  acc[i]=cellArea[Math.floor(i/w)];edge[i]=boundary(i)?1:0;
  let best=0;for(let k=0;k<8;k++){const j=neighbor(i,k);if(j<0)continue;const grade=(filled[i]-filled[j])/Math.hypot(...dirs[k]);if(grade>best){best=grade;down[i]=j;direction[i]=k}}
  if(down[i]>=0||boundary(i)){distance[i]=0;queue[tail++]=i;kind[i]=down[i]>=0?1:3}
 }
 // Multi-source BFS over equal-height cells; every non-seed points one step toward a seed.
 for(let head=0;head<tail;head++){const i=queue[head];for(let k=0;k<8;k++){const j=neighbor(i,k);if(j<0||distance[j]>=0||filled[j]!==filled[i])continue;distance[j]=distance[i]+1;down[j]=i;direction[j]=(k+4)%8;kind[j]=2;queue[tail++]=j}}
 if(tail!==n)throw Error('Unresolved conditioned flat');
 for(let i=0;i<n;i++){const j=down[i];if(j<0){if(!boundary(i)||kind[i]!==3)throw Error('Interior terminal')}else{if(!(filled[j]<filled[i]||filled[j]===filled[i]&&distance[j]<distance[i]))throw Error('Invalid conditioned direction');degree[j]++}}
 tail=0;for(let i=0;i<n;i++)if(!degree[i])queue[tail++]=i;
 let terminalArea=0,outlets=0;for(let head=0;head<tail;head++){const i=queue[head],j=down[i];if(j<0){terminalArea+=acc[i];outlets++}else{acc[j]+=acc[i];if(edge[i])edge[j]=1;if(--degree[j]===0)queue[tail++]=j}}
 const total=Array.from(cellArea).reduce((s,a)=>s+a*w,0);if(tail!==n||Math.abs(total-terminalArea)>Math.max(.01,total*1e-9))throw Error('Conditioned routing cycle or area mismatch');
 return {filled,depth,down,direction,distance,kind,edge,acc,outlets,total,terminalArea};
}
function analyze(r){
 const d=r.summary,{width:w,height:h}=d.grid,n=w*h,base={method,limitations,evidence_kind:'modeled_terrain_interpretation',verification_status:'not_field_verified'};
 if(d.status!=='estimated'||r.model.validCount!==n)return {model:null,summary:{...base,status:'unavailable',detail:'Complete context elevation required.',maximum_local_contributing_area_acres:null,accumulation_classes:[]}};
 const m=route(w,h,r.elevations,r.model.valid,r.model.cellArea),bins=Array(5).fill(0),routing=[0,0,0],classes=root.GRGDrainage.classes;let total=0,edge=0,changed=0,peak=null,peakIndex=null,filledArea=0;
 if(r.weights.length!==n||r.model.down.length!==n)throw Error('Invalid site weights or original routing');
 for(let i=0;i<n;i++){const a=r.weights[i];if(!Number.isFinite(a)||a<0)throw Error('Invalid site weight');if(!a)continue;total+=a;const v=m.acc[i]/acre;bins[classes.findIndex(c=>v<c[1])]+=a;routing[m.kind[i]-1]+=a;if(m.edge[i])edge+=a;if(m.depth[i]>0)filledArea+=a;if(m.down[i]!==r.model.down[i])changed+=a;if(peak===null||v>peak){peak=v;peakIndex=i}}
 if(!total||Math.abs(total/acre-d.valid_area_acres)>Math.max(.00001,d.study_area_acres*1e-7)||Math.abs(m.total/acre-d.context_valid_area_acres)>Math.max(.00001,d.context_valid_area_acres*1e-7))throw Error('Conditioned coverage mismatch');
 const rec=a=>({area_acres:a/acre,percent_of_study_area:100*a/(d.study_area_acres*acre),percent_of_valid_area:100*a/total});
 return {model:m,summary:{...base,status:'estimated',maximum_local_contributing_area_acres:peak,maximum_cell_index:peakIndex,context_outlet_cells:m.outlets,context_outlet_contributing_area_acres:m.terminalArea/acre,accumulation_classes:classes.map((c,i)=>({label:c[0],color:c[2],...rec(bins[i])})),routing_classes:['Lower filled-surface neighbor','Imposed flat direction','Open context edge outlet'].map((label,i)=>({label,...rec(routing[i])})),filled_site_area:rec(filledArea),changed_receiver_area:rec(changed),edge_influenced_area:rec(edge)}};
}
root.GRGConditioned=Object.freeze({route,analyze});
})(globalThis);
