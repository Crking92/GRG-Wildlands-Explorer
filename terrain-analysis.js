/* USGS 3DEP dynamic bare-earth terrain. Grid spacing is requested, not native source resolution. */
(function(root){
'use strict';
const source='https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer',acre=4046.8564224;
const views=[['Hillshade Multidirectional','Multidirectional hillshade'],['Hillshade Gray','Hillshade'],['Hillshade Elevation Tinted','Elevation tint'],['Slope Map','Slope'],['Aspect Map','Aspect'],['Preset 2ft Contour Interval','2 ft contours'],['Preset 5ft Contour Interval','5 ft contours'],['Preset 10ft Contour Interval','10 ft contours']];
function metadata(m){if(m?.name!=='3DEPElevation'||m.bandCount!==1||m.pixelType!=='F32'||m.serviceDataType!=='esriImageServiceDataTypeElevation'||![3857,102100].includes(m.extent?.spatialReference?.latestWkid??m.extent?.spatialReference?.wkid))throw Error('Unexpected 3DEP elevation service metadata');return {views:views.filter(v=>m.rasterFunctionInfos?.some(x=>x.name===v[0])),raw:m.rasterFunctionInfos?.some(x=>x.name==='None')===true,description:m.serviceDescription??null,copyright:m.copyrightText??null}}
function imageUrl(view,bbox,width,height){if(!views.some(v=>v[0]===view)||bbox.length!==4||!bbox.every(Number.isFinite)||bbox[0]>=bbox[2]||bbox[1]>=bbox[3]||![width,height].every(x=>Number.isInteger(x)&&x>0&&x<=1200))throw Error('Invalid terrain map request');return source+'/exportImage?'+new URLSearchParams({bbox:bbox.join(','),bboxSR:'3857',imageSR:'3857',size:width+','+height,format:'png32',f:'image',adjustAspectRatio:'false',renderingRule:JSON.stringify({rasterFunction:view})})}
function grid(site,project,area){
 if(!['Polygon','MultiPolygon'].includes(site?.geometry?.type))throw Error('Study polygon required');
 const raw=site.geometry.type==='Polygon'?[site.geometry.coordinates]:site.geometry.coordinates;let vertices=0;
 const polys=raw.map(p=>p.map(r=>{if(r.length<4||r[0][0]!==r.at(-1)[0]||r[0][1]!==r.at(-1)[1])throw Error('Invalid boundary');const a=[];for(let i=1;i<r.length;i++){const p=r[i-1],q=r[i],n=Math.max(1,Math.ceil(Math.max(Math.abs(q[0]-p[0]),Math.abs(q[1]-p[1]))/.0002));vertices+=n;if(vertices>20000)throw Error('Boundary too complex');for(let j=0;j<n;j++){const t=j/n,v=project([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);if(!v.every(Number.isFinite))throw Error('Invalid projection');a.push(v)}}return a}));
 let xmin=Infinity,ymin=Infinity,xmax=-Infinity,ymax=-Infinity;for(const p of polys)for(const r of p)for(const [x,y] of r){xmin=Math.min(xmin,x);ymin=Math.min(ymin,y);xmax=Math.max(xmax,x);ymax=Math.max(ymax,y)}
 const total=polys.reduce((a,p)=>a+area(p[0])-p.slice(1).reduce((s,r)=>s+area(r),0),0);
 if(!Number.isFinite(total)||total<=0||total/acre>1000)throw Error('Terrain analysis requires a study area up to 1,000 acres');
 for(const step of [1,2,5,10,20,30]){const bbox=[Math.floor(xmin/step)*step,Math.floor(ymin/step)*step,Math.ceil(xmax/step)*step,Math.ceil(ymax/step)*step],width=Math.round((bbox[2]-bbox[0])/step),height=Math.round((bbox[3]-bbox[1])/step);if(width>0&&height>0&&width*height<=60000&&width*height*vertices<=12000000)return {polys,bbox,width,height,step,total}}
 throw Error('Terrain grid too large or complex; subdivide study area');
}
function summarize(g,d,clip,area){
 const {width,height,bbox,step,polys,total}=g;
 if(d.width!==width||d.height!==height||d.pixels?.length!==1||d.pixels[0].length!==width*height||d.mask&&d.mask.length!==width*height)throw Error('Unexpected elevation raster dimensions or bands');
 let valid=0,missing=0,weighted=0,min=Infinity,max=-Infinity,count=0;
 for(let row=0;row<height;row++)for(let col=0;col<width;col++){
 const x=bbox[0]+col*step,y=bbox[3]-row*step,b=[x,y-step,x+step,y],a=polys.reduce((s,p)=>s+clip(p[0],b,area)-p.slice(1).reduce((v,r)=>v+clip(r,b,area),0),0);
 if(a<-.001||a>step*step+.001)throw Error('Invalid cell intersection');if(a<=0)continue;count++;
 const i=row*width+col,z=d.pixels[0][i];if(d.mask&&d.mask[i]===0){missing+=a;continue}if(!Number.isFinite(z)||z< -500||z>9000)throw Error('Unrecognized elevation value or unmasked NoData');
 valid+=a;weighted+=z*a;min=Math.min(min,z);max=Math.max(max,z);
 }
 if(Math.abs(valid+missing-total)>Math.max(.02,total*1e-7))throw Error('Terrain area conservation failed');
 const complete=valid>0&&missing<=Math.max(.0001,total*1e-9);
 return {status:!valid?'no_data':complete?'estimated':'partial_coverage',study_area_acres:total/acre,valid_area_acres:valid/acre,missing_area_acres:missing/acre,coverage_percent:100*valid/total,intersected_cells:count,requested_grid_m:step,min_m:complete?min:null,max_m:complete?max:null,mean_m:complete?weighted/valid:null,relief_m:complete?max-min:null,valid_only_min_m:valid?min:null,valid_only_max_m:valid?max:null,valid_only_mean_m:valid?weighted/valid:null};
}
async function analyze(site,signal,progress=()=>{}){
 if(!root.proj4||!root.Lerc||!root.GRGRasterAnalysis)throw Error('Terrain libraries unavailable');
 const get=async url=>{const r=await fetch(url,{signal,credentials:'omit'});if(!r.ok)throw Error('HTTP '+r.status);return r},json=async url=>{const j=await(await get(url)).json();if(j.error)throw Error(j.error.message||'Service error');return j};
 const m=metadata(await json(source+'?f=pjson'));if(!m.raw)throw Error('Raw elevation function unavailable');
 const a=root.GRGRasterAnalysis,g=grid(site,p=>root.proj4('EPSG:4326','EPSG:3857',p),a.mercArea);
 progress('Requesting '+g.step+' m service-grid elevation values…');
 const q=new URLSearchParams({bbox:g.bbox.join(','),bboxSR:'3857',imageSR:'3857',size:g.width+','+g.height,format:'lerc',f:'json',compressionTolerance:'0',interpolation:'RSP_NearestNeighbor',adjustAspectRatio:'false',renderingRule:JSON.stringify({rasterFunction:'None'})});
 const j=await json(source+'/exportImage?'+q);if(j.width!==g.width||j.height!==g.height||!a.mercator(j.extent?.spatialReference)||!['xmin','ymin','xmax','ymax'].every((k,i)=>Number.isFinite(j.extent[k])&&Math.abs(j.extent[k]-g.bbox[i])<.001))throw Error('Returned elevation grid differs from request');
 const href=new URL(j.href,source);if(href.protocol!=='https:'||href.origin!==new URL(source).origin)throw Error('Unexpected elevation download host');
 const bytes=await(await get(href.href)).arrayBuffer();if(bytes.byteLength<10||bytes.byteLength>5000000)throw Error('Invalid elevation response size');
 await root.Lerc.load({locateFile:n=>'https://cdn.jsdelivr.net/npm/lerc@4.2.0/'+n});if(signal.aborted)throw Error('Canceled');
 progress('Calculating boundary-weighted elevation…');const d=summarize(g,root.Lerc.decode(bytes),a.clip,a.mercArea);
 return {...d,source_id:'usgs_3dep_dem',source_url:source,retrieved_at:new Date().toISOString(),service_description:m.description,service_copyright:m.copyright,source_resolution_m:null,acquisition_date:null,vertical_datum:null,service_grid_crs:'EPSG:3857',method:'Raw 3DEP dynamic mosaic LERC; nearest-neighbor requested grid; spherical ground-area weighted cells clipped to boundary; minimum and maximum of intersected valid cells',limitations:'Experimental mosaic estimates. Actual source DEM resolution, acquisition date and local vertical datum not established. Requested Web Mercator grid spacing is not ground resolution. No field survey or independent GIS validation.',verification_status:'not_field_verified',evidence_kind:'mapped_estimate'};
}
root.GRGTerrain=Object.freeze({source,views,metadata,imageUrl,grid,summarize,analyze});
})(globalThis);
