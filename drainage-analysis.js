/* Local, unconditioned D8-style drainage screening. Not a hydraulic model. */
(function(root){
'use strict';
const acre=4046.8564224,R=6378137,source='https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer';
const dirs=[[-1,0,'N'],[-1,1,'NE'],[0,1,'E'],[1,1,'SE'],[1,0,'S'],[1,-1,'SW'],[0,-1,'W'],[-1,-1,'NW']];
const classes=[['Under 0.1 ac',.1,'#456b76'],['0.1–<0.5 ac',.5,'#67b2bf'],['0.5–<2 ac',2,'#39c9f5'],['2–<10 ac',10,'#326ee7'],['10+ ac',Infinity,'#7c4be4']];
function plan(site,project,area,buffer,dem){
 if(![100,250,500].includes(buffer))throw Error('Unsupported context buffer');
 const g=dem.grid(site,project,area),base=g.bbox;
 const vertices=g.polys.reduce((n,p)=>n+p.reduce((s,r)=>s+r.length,0),0);
 for(const step of [1,2,5,10,20,30]){
  const bbox=[Math.floor((base[0]-buffer)/step)*step,Math.floor((base[1]-buffer)/step)*step,Math.ceil((base[2]+buffer)/step)*step,Math.ceil((base[3]+buffer)/step)*step],width=Math.round((bbox[2]-bbox[0])/step),height=Math.round((bbox[3]-bbox[1])/step);
  const siteBox=[Math.floor(base[0]/step)*step,Math.floor(base[1]/step)*step,Math.ceil(base[2]/step)*step,Math.ceil(base[3]/step)*step];
  const work=Math.ceil((siteBox[2]-siteBox[0])/step)*Math.ceil((siteBox[3]-siteBox[1])/step)*vertices;
  if(width>=3&&height>=3&&width<=1000&&height<=1000&&width*height<=60000&&work<=12000000)return {bbox,width,height,step,buffer,siteBox,polys:g.polys,total:g.total};
 }
 throw Error('Buffered grid too large or complex; choose a smaller buffer or study area');
}
function route(g,d,area){
 const {width:w,height:h,step,bbox}=g,n=w*h,z=d.pixels?.[0];if(d.width!==w||d.height!==h||d.pixels?.length!==1||z?.length!==n||d.mask&&d.mask.length!==n)throw Error('Invalid drainage raster');
 const valid=new Uint8Array(n),down=new Int32Array(n).fill(-1),direction=new Int8Array(n).fill(-1),terminal=new Uint8Array(n),edgeInfluence=new Uint8Array(n),acc=new Float64Array(n),cellArea=new Float64Array(h),order=[];
 for(let r=0;r<h;r++){const y=bbox[3]-r*step;cellArea[r]=area([[bbox[0],y-step],[bbox[0]+step,y-step],[bbox[0]+step,y],[bbox[0],y]]);if(!(cellArea[r]>0))throw Error('Invalid ground cell area')}
 for(let i=0;i<n;i++){if(d.mask&&!d.mask[i])continue;if(!Number.isFinite(z[i])||z[i]<-500||z[i]>9000)throw Error('Invalid elevation value or unmasked NoData');valid[i]=1;acc[i]=cellArea[Math.floor(i/w)];order.push(i)}
 for(const i of order){const r=Math.floor(i/w),c=i%w;let best=0,bestId=-1,bestDir=-1,tie=false,flat=false,uncertain=false;const spacing=step/Math.cosh((bbox[3]-(r+.5)*step)/R);
  for(let k=0;k<8;k++){const [dr,dc]=dirs[k],rr=r+dr,cc=c+dc;if(rr<0||rr>=h||cc<0||cc>=w){uncertain=true;continue}const j=rr*w+cc;if(!valid[j]){uncertain=true;continue}const drop=z[i]-z[j];if(drop===0)flat=true;if(drop<=0)continue;const grade=drop/(spacing*Math.hypot(dr,dc));if(grade>best+1e-12){best=grade;bestId=j;bestDir=k;tie=false}else if(Math.abs(grade-best)<=1e-12){tie=true}}
  if(uncertain)edgeInfluence[i]=1;
  if(bestId>=0&&!tie){down[i]=bestId;direction[i]=bestDir}
  else terminal[i]=uncertain?3:tie?4:flat?2:1; // 1 strict local low; 2 flat; 3 edge/NoData; 4 equal steepest descent
 }
 order.sort((a,b)=>z[b]-z[a]||a-b);
 for(const i of order){const j=down[i];if(j>=0){if(!(z[j]<z[i]))throw Error('Non-descending route');acc[j]+=acc[i];if(edgeInfluence[i])edgeInfluence[j]=1}}
 const total=cellArea.reduce((s,a,r)=>s+a*valid.subarray(r*w,(r+1)*w).reduce((a,b)=>a+b,0),0),terminalTotal=order.reduce((s,i)=>s+(down[i]<0?acc[i]:0),0);
 if(Math.abs(total-terminalTotal)>Math.max(.01,total*1e-9))throw Error('Flow accumulation area conservation failed');
 return {valid,down,direction,terminal,edgeInfluence,acc,cellArea,validCount:order.length,contextValidArea:total};
}
function summarize(g,m,clip,area){
 const sums=Array(classes.length).fill(0),stops=[0,0,0,0,0];let valid=0,missing=0,edge=0,peak=null,peakIndex=null,siteCells=0;const weights=new Float64Array(g.width*g.height);
 const [xmin,ymin,xmax,ymax]=g.bbox,step=g.step,w=g.width,h=g.height;
 const c0=Math.max(0,Math.floor((g.siteBox[0]-xmin)/step)),c1=Math.min(w,Math.ceil((g.siteBox[2]-xmin)/step)),r0=Math.max(0,Math.floor((ymax-g.siteBox[3])/step)),r1=Math.min(h,Math.ceil((ymax-g.siteBox[1])/step));
 for(let r=r0;r<r1;r++)for(let c=c0;c<c1;c++){const x=xmin+c*step,y=ymax-r*step,b=[x,y-step,x+step,y],a=g.polys.reduce((s,p)=>s+clip(p[0],b,area)-p.slice(1).reduce((v,q)=>v+clip(q,b,area),0),0),i=r*w+c;if(a<-.001||a>m.cellArea[r]+.001)throw Error('Invalid cell overlap');if(a<=0)continue;weights[i]=a;siteCells++;if(!m.valid[i]){missing+=a;continue}valid+=a;const v=m.acc[i]/acre;const k=classes.findIndex(x=>v<x[1]);sums[k]+=a;stops[m.terminal[i]]+=a;if(m.edgeInfluence[i])edge+=a;if(peak===null||v>peak){peak=v;peakIndex=i}}
 const tol=Math.max(.02,g.total*1e-7);if(Math.abs(valid+missing-g.total)>tol||Math.abs(sums.reduce((a,b)=>a+b,0)-valid)>tol||Math.abs(stops.reduce((a,b)=>a+b,0)-valid)>tol)throw Error('Study area conservation failed');
 const complete=valid>0&&missing<=Math.max(.0001,g.total*1e-9),status=!valid?'no_data':complete?'estimated':'partial_coverage';
 const rec=(a)=>({area_acres:a/acre,percent_of_study_area:complete?100*a/g.total:null,percent_of_valid_area:valid?100*a/valid:null});
 const out={status,study_area_acres:g.total/acre,valid_area_acres:valid/acre,missing_area_acres:missing/acre,coverage_percent:100*valid/g.total,site_cells:siteCells,requested_grid_m:g.step,requested_context_buffer_projected_m:g.buffer,grid:{bbox:g.bbox,width:w,height:h,crs:'EPSG:3857'},context_valid_cells:m.validCount,context_total_cells:w*h,context_valid_area_acres:m.contextValidArea/acre,context_valid_cell_percent:100*m.validCount/(w*h),maximum_local_contributing_area_acres:peak,maximum_cell_index:peakIndex,edge_or_nodata_influenced_area:rec(edge),accumulation_classes:classes.map((c,i)=>({label:c[0],color:c[2],...rec(sums[i])})),routing_classes:['Routed downslope','Strict local low cell','Flat / unresolved cell','Edge / NoData stop','Equal steepest drop / unresolved'].map((label,i)=>({label,...rec(stops[i])}))};
 return {summary:out,weights};
}
async function analyze(site,buffer,signal,progress=()=>{}){
 const dem=root.GRGTerrain,a=root.GRGRasterAnalysis;if(!dem||!a||!root.proj4||!root.GeoTIFF?.fromArrayBuffer)throw Error('Drainage libraries unavailable');
 const g=plan(site,p=>root.proj4('EPSG:4326','EPSG:3857',p),a.mercArea,buffer,dem);
 const get=async(url,stage)=>{const r=await fetch(url,{signal,credentials:'omit'});if(!r.ok){let detail='';try{const j=await r.json();if(typeof j?.error?.message==='string')detail=' — '+j.error.message.slice(0,180)}catch{}throw Error(stage+': HTTP '+r.status+detail)}return r};
 const raw=await(await get(source+'?f=pjson','Elevation metadata')).json();if(raw.error)throw Error('Elevation metadata unavailable');dem.metadata(raw);if(raw.renderingRule&&Object.keys(raw.renderingRule).length)throw Error('Default elevation rendering rule no longer raw');
 progress('Requesting buffered '+g.step+' m projected elevation grid…');const r=await get(source+'/exportImage?'+new URLSearchParams(dem.requestParams(g)),'Drainage GeoTIFF'),bytes=await r.arrayBuffer();if(bytes.byteLength<10||bytes.byteLength>5000000)throw Error('Invalid drainage raster size');
 const sig=new Uint8Array(bytes,0,4);if(!((sig[0]===73&&sig[1]===73&&[42,43].includes(sig[2])&&sig[3]===0)||(sig[0]===77&&sig[1]===77&&sig[2]===0&&[42,43].includes(sig[3]))))throw Error('Drainage response not TIFF');
 if(signal.aborted)throw Error('Canceled');const d=await dem.decodeTiff(bytes,g,root.GeoTIFF);if(signal.aborted)throw Error('Canceled');progress('Routing local downhill flow and calculating contributing area…');
 const model=route(g,d,a.mercArea),result=summarize(g,model,a.clip,a.mercArea);
 Object.assign(result.summary,{source_id:'usgs_3dep_dem',source_url:source,retrieved_at:new Date().toISOString(),source_resolution_m:null,acquisition_date:null,vertical_datum:null,evidence_kind:'modeled_terrain_interpretation',verification_status:'not_field_verified',method:'Unconditioned strict-descent single-neighbor D8-style routing, ground cell area accumulation including receiving cell, local buffered rectangle only; exact property cell intersection weights',limitations:'Not hydrologically conditioned: no sink filling, flat routing, culverts, storm drains, infiltration, rainfall or hydraulic modeling. Flat/tied/low cells may terminate routes. Outside-grid upstream area is unknown; even unflagged cells may be incomplete. Requested projected grid is not native DEM resolution. Local contributing area is not discharge, flood depth, drainage catchment or guaranteed ponding. Independent GIS validation pending.'});
 return {...result,model,elevations:d.pixels[0]};
}
root.GRGDrainage=Object.freeze({source,dirs,classes,plan,route,summarize,analyze});
})(globalThis);
