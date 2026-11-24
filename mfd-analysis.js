/* Same-grid unconditioned FD8-style comparison; slope^1.1 fractions. */
(function(root){
'use strict';
const acre=4046.8564224,exponent=1.1;
const dirs=[[-1,0],[-1,1],[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1]];
const limits=[.1,.5,2,10,Infinity];
function route(w,h,z,valid,cellArea){
 const n=w*h;if(!Number.isInteger(w)||!Number.isInteger(h)||w<3||h<3||n>60000||z.length!==n||valid.length!==n||cellArea.length!==h||Array.from(cellArea).some(a=>!Number.isFinite(a)||a<=0))throw Error('Invalid MFD grid');
 const order=[],acc=new Float64Array(n),edge=new Uint8Array(n),receivers=new Uint8Array(n),fractions=new Float64Array(n*8);let total=0;
 for(let i=0;i<n;i++){if(!valid[i])continue;if(!Number.isFinite(z[i])||z[i]<-500||z[i]>9000)throw Error('Invalid MFD elevation');order.push(i);acc[i]=cellArea[Math.floor(i/w)];total+=acc[i]}
 function neighbor(i,k){const r=Math.floor(i/w)+dirs[k][0],c=i%w+dirs[k][1];return r<0||r>=h||c<0||c>=w?-1:r*w+c}
 for(const i of order){let sum=0;for(let k=0;k<8;k++){const j=neighbor(i,k);if(j<0||!valid[j]){edge[i]=1;continue}const drop=z[i]-z[j];if(drop<=0)continue;const q=Math.pow(drop/Math.hypot(...dirs[k]),exponent);fractions[i*8+k]=q;sum+=q;receivers[i]++}
 // Common local ground spacing cancels when normalizing slopes at one cell.
 if(sum>0)for(let k=0;k<8;k++)fractions[i*8+k]/=sum;
 }
 order.sort((a,b)=>z[b]-z[a]||a-b);let terminalArea=0;
 for(const i of order){if(!receivers[i]){terminalArea+=acc[i];continue}for(let k=0;k<8;k++){const f=fractions[i*8+k];if(!f)continue;const j=neighbor(i,k);if(!(z[j]<z[i]))throw Error('Invalid MFD route');acc[j]+=acc[i]*f;if(edge[i])edge[j]=1}}
 if(Math.abs(total-terminalArea)>Math.max(.01,total*1e-9))throw Error('MFD area conservation failed');
 return {acc,edge,receivers,fractions,total,terminalArea};
}
function analyze(r){
 const d=r.summary,{width:w,height:h}=d.grid,n=w*h,m=r.model,weights=r.weights,z=r.elevations;
 if(weights.length!==n||m.acc.length!==n)throw Error('Invalid comparison grid');
 const x=route(w,h,z,m.valid,m.cellArea),bins=Array(5).fill(0);let same=0,split=0,edge=0,v=0,peak=null,peakIndex=null,lo=null,hi=null,hor=0,ver=0,hpairs=0,vpairs=0;
 const bin=a=>limits.findIndex(t=>a/acre<t);
 for(let i=0;i<n;i++){if(!m.valid[i])continue;lo=lo===null?z[i]:Math.min(lo,z[i]);hi=hi===null?z[i]:Math.max(hi,z[i]);if(i%w<w-1&&m.valid[i+1]){hpairs++;if(z[i]===z[i+1])hor++}if(i+w<n&&m.valid[i+w]){vpairs++;if(z[i]===z[i+w])ver++}
 const a=weights[i];if(!Number.isFinite(a)||a<0)throw Error('Invalid comparison weight');if(!a)continue;v+=a;const k=bin(x.acc[i]);bins[k]+=a;if(k===bin(m.acc[i]))same+=a;if(x.receivers[i]>1)split+=a;if(x.edge[i])edge+=a;if(peak===null||x.acc[i]/acre>peak){peak=x.acc[i]/acre;peakIndex=i}}
 if(Math.abs(v/acre-d.valid_area_acres)>Math.max(.00001,d.study_area_acres*1e-7))throw Error('Comparison coverage mismatch');
 const rec=a=>({area_acres:a/acre,percent_of_study_area:d.status==='estimated'?100*a/(d.study_area_acres*acre):null,percent_of_valid_area:v?100*a/v:null});
 return {model:x,summary:{status:d.status,method:'Unconditioned FD8-style slope^1.1 fractions to all strictly lower valid neighbors; same DEM, extent, mask and weights as D8',exponent,verification_status:'not_field_verified',evidence_kind:'modeled_terrain_interpretation',maximum_local_contributing_area_acres:peak,maximum_cell_index:peakIndex,accumulation_classes:root.GRGDrainage.classes.map((c,i)=>({label:c[0],color:c[2],...rec(bins[i])})),same_accumulation_class_area:rec(same),multiple_receivers_area:rec(split),edge_or_nodata_influenced_area:rec(edge),context_elevation_min_m:lo,context_elevation_max_m:hi,horizontal_equal_neighbor_percent:hpairs?100*hor/hpairs:null,vertical_equal_neighbor_percent:vpairs?100*ver/vpairs:null,limitations:'Same resampled DEM as D8; agreement is not validation. MFD can overdisperse flow; flats and pits remain unresolved. Unknown outside-grid area, no hydraulic prediction. Equal-neighbor diagnostics describe exact repeated elevations, not proof of artifacts.'}};
}
root.GRGMFD=Object.freeze({route,analyze});
})(globalThis);
