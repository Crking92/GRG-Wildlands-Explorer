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
function requestParams(g){
 return {bbox:g.bbox.join(','),bboxSR:'3857',imageSR:'3857',size:g.width+','+g.height,format:'tiff',pixelType:'F32',f:'image',interpolation:'RSP_NearestNeighbor',adjustAspectRatio:'false',noData:'-9999'};
}
async function decodeTiff(bytes,g,decoder){
 const t=await decoder.fromArrayBuffer(bytes),im=await t.getImage(),fd=im.getFileDirectory(),keys=im.getGeoKeys()||{};
 if(im.getWidth()!==g.width||im.getHeight()!==g.height||im.getSamplesPerPixel()!==1||Number(fd.SampleFormat?.[0]??fd.SampleFormat)!==3||Number(fd.BitsPerSample?.[0]??fd.BitsPerSample)!==32)throw Error('GeoTIFF is not the requested single-band float32 grid');
 if(![3857,102100,102113].includes(Number(keys.ProjectedCSTypeGeoKey)))throw Error('GeoTIFF projected CRS not verified');
 const box=im.getBoundingBox(),res=im.getResolution();
 if(!Array.isArray(box)||box.length!==4||!box.every((x,i)=>Number.isFinite(x)&&Math.abs(x-g.bbox[i])<.01)||!Array.isArray(res)||Math.abs(res[0]-g.step)>.0001||Math.abs(res[1]+g.step)>.0001||fd.ModelTransformation)throw Error('GeoTIFF extent or grid spacing differs from request');
 if(keys.GTRasterTypeGeoKey===2)throw Error('Unexpected pixel-is-point GeoTIFF registration');
 const pixels=await im.readRasters({samples:[0],interleave:false}),p=pixels[0];if(pixels.length!==1||!(p instanceof Float32Array)||p.length!==g.width*g.height)throw Error('Unexpected elevation pixel type or count');
 const nodata=im.getGDALNoData(),mask=new Uint8Array(p.length);if(nodata!==null&&nodata!==undefined&&typeof nodata!=='number')throw Error('Invalid GeoTIFF NoData metadata');
 for(let i=0;i<p.length;i++){const v=p[i];mask[i]=(v===-9999||nodata!==null&&nodata!==undefined&&(v===Math.fround(nodata)||Number.isNaN(nodata)&&Number.isNaN(v)))?0:1}
 return {width:g.width,height:g.height,pixels:[p],mask,source_nodata:nodata===null||nodata===undefined?null:Number.isNaN(nodata)?'NaN':nodata};
}
async function analyze(site,signal,progress=()=>{}){
 if(!root.proj4||!root.GRGRasterAnalysis||!root.GeoTIFF?.fromArrayBuffer)throw Error('Terrain GeoTIFF or projection library unavailable; reload the page');
 const get=async(url,stage)=>{const r=await fetch(url,{signal,credentials:'omit'});if(!r.ok){let detail='';try{const j=await r.json();if(typeof j?.error?.message==='string')detail=' — '+j.error.message.slice(0,180)}catch{}throw Error(stage+': HTTP '+r.status+detail)}return r};
 const raw=await(await get(source+'?f=pjson','Service metadata')).json();if(raw.error)throw Error('Service metadata: '+String(raw.error.message||'USGS error').slice(0,180));
 const m=metadata(raw);
 // The service has no default rendering rule; explicitly reject a changed default.
 if(raw.renderingRule&&Object.keys(raw.renderingRule).length)throw Error('Default elevation rendering rule is no longer raw');
 const a=root.GRGRasterAnalysis,g=grid(site,p=>root.proj4('EPSG:4326','EPSG:3857',p),a.mercArea);
 progress('Requesting '+g.step+' m floating-point GeoTIFF elevation grid…');
 const response=await get(source+'/exportImage?'+new URLSearchParams(requestParams(g)),'GeoTIFF export');
 const bytes=await response.arrayBuffer();if(bytes.byteLength<10||bytes.byteLength>5000000)throw Error('Invalid elevation GeoTIFF size');
 const sig=new Uint8Array(bytes,0,4);if(!((sig[0]===73&&sig[1]===73&&[42,43].includes(sig[2])&&sig[3]===0)||(sig[0]===77&&sig[1]===77&&sig[2]===0&&[42,43].includes(sig[3]))))throw Error('GeoTIFF export returned a non-TIFF response');
 if(signal.aborted)throw Error('Canceled');progress('Validating GeoTIFF coordinates and elevation values…');
 const decoded=await decodeTiff(bytes,g,root.GeoTIFF);if(signal.aborted)throw Error('Canceled');
 const d=summarize(g,decoded,a.clip,a.mercArea);
 return {...d,source_id:'usgs_3dep_dem',source_url:source,retrieved_at:new Date().toISOString(),service_description:m.description,service_copyright:m.copyright,source_resolution_m:null,acquisition_date:null,vertical_datum:null,service_grid_crs:'EPSG:3857',raster_format:'GeoTIFF F32',requested_nodata:-9999,source_nodata:decoded.source_nodata,method:'Raw 3DEP dynamic mosaic float32 GeoTIFF; nearest-neighbor requested grid; spherical ground-area weighted cells clipped to boundary; minimum and maximum of intersected valid cells',limitations:'Experimental mosaic estimates. Actual source DEM resolution, acquisition date and local vertical datum not established. Requested Web Mercator grid spacing is not ground resolution. No field survey or independent GIS validation.',verification_status:'not_field_verified',evidence_kind:'mapped_estimate'};
}
root.GRGTerrain=Object.freeze({source,views,metadata,imageUrl,grid,summarize,requestParams,decodeTiff,analyze});
})(globalThis);
