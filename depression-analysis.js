/* Priority-Flood depression depth. Complete local DEM only; no hydraulic prediction. */
(function(root){
'use strict';
const acre=4046.8564224,classes=[['>0–<0.15 m',.15,'#86c8e0'],['0.15–<0.3 m',.3,'#4da6e2'],['0.3–<0.6 m',.6,'#3676d5'],['0.6–<1 m',1,'#7156cf'],['1 m+',Infinity,'#b56cdb']];
const dirs=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
function fill(w,h,z,valid){
 const n=w*h;if(!Number.isInteger(w)||!Number.isInteger(h)||w<3||h<3||n>60000||z.length!==n||valid.length!==n)throw Error('Invalid depression grid');
 if(valid.some(v=>v!==1))throw Error('Missing context elevations; depression fill withheld');
 if(z.some(v=>!Number.isFinite(v)||v< -500||v>9000))throw Error('Invalid elevation');
 const filled=Float64Array.from(z),seen=new Uint8Array(n),heap=[];
 const less=(a,b)=>filled[a]<filled[b]||filled[a]===filled[b]&&a<b;
 function push(v){let i=heap.length;heap.push(v);while(i>0){const p=(i-1)>>1;if(!less(v,heap[p]))break;heap[i]=heap[p];i=p}heap[i]=v}
 function pop(){const v=heap[0],last=heap.pop();if(heap.length){let i=0;while(2*i+1<heap.length){let c=2*i+1;if(c+1<heap.length&&less(heap[c+1],heap[c]))c++;if(!less(heap[c],last))break;heap[i]=heap[c];i=c}heap[i]=last}return v}
 for(let r=0;r<h;r++)for(let c=0;c<w;c++)if(r===0||c===0||r===h-1||c===w-1){const i=r*w+c;seen[i]=1;push(i)}
 while(heap.length){const i=pop(),r=Math.floor(i/w),c=i%w;for(const [dr,dc] of dirs){const rr=r+dr,cc=c+dc;if(rr<0||rr>=h||cc<0||cc>=w)continue;const j=rr*w+cc;if(seen[j])continue;seen[j]=1;filled[j]=Math.max(z[j],filled[i]);push(j)}}
 if(seen.some(v=>!v))throw Error('Incomplete fill');
 const depth=Float64Array.from(filled,(v,i)=>v-z[i]);return {filled,depth};
}
function analyze(r){
 const d=r.summary,{width:w,height:h}=d.grid,n=w*h,base={method:'Priority-Flood, eight-neighbor connectivity, open rectangular outer boundary; fill minus original DEM; depth times property-intersection ground area',evidence_kind:'modeled_terrain_interpretation',verification_status:'not_field_verified',status:'unavailable',detail:null,site_depression_area_acres:null,site_fill_volume_m3:null,maximum_site_depth_m:null,depth_classes:[],limitations:'Geometric fill to local model outlets only. Not actual ponding, stormwater storage design, flood depth or water volume after rainfall. No culverts, drains, infiltration, rainfall, breaching or nested basin delineation. Terrain noise, source age and grid resolution may create or erase depressions. Open context boundary may truncate depressions. No minimum depth threshold; tiny positive values may be artifacts. Existing unconditioned flow model is unchanged.'};
 if(r.model.validCount!==n||d.status!=='estimated')return {summary:{...base,detail:'Complete valid elevation coverage of the entire context is required; no depression values inferred.'},depth:null};
 const {depth}=fill(w,h,r.elevations,r.model.valid),weights=r.weights;if(weights.length!==n)throw Error('Invalid property weights');let area=0,volume=0,max=0,total=0;const bins=classes.map(()=>0);
 for(let i=0;i<n;i++){const a=weights[i],v=depth[i];if(!Number.isFinite(a)||a<0||!Number.isFinite(v)||v<0)throw Error('Invalid depth or area');total+=a;if(a<=0||v<=0)continue;area+=a;volume+=a*v;max=Math.max(max,v);bins[classes.findIndex(c=>v<c[1])]+=a}
 if(Math.abs(total/acre-d.study_area_acres)>Math.max(.00001,d.study_area_acres*1e-7)||Math.abs(bins.reduce((a,b)=>a+b,0)-area)>Math.max(.001,total*1e-9)||!Number.isFinite(volume))throw Error('Depression area or volume inconsistent');
 return {depth,summary:{...base,status:'estimated',detail:'Local geometric fill complete.',site_depression_area_acres:area/acre,site_fill_volume_m3:volume,maximum_site_depth_m:max,depth_classes:classes.map((c,i)=>({label:c[0],color:c[2],area_acres:bins[i]/acre,percent_of_study_area:100*bins[i]/total}))}};
}
root.GRGDepressions=Object.freeze({classes,fill,analyze});
})(globalThis);
