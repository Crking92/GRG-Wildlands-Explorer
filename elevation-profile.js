/* Straight, two-point USGS 3DEP elevation transect; no extrapolation across missing samples. */
(function(root){
'use strict';
const source='https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer';
const validCoord=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<85;
function plan(t,points,project){
 if(!Array.isArray(points)||points.length!==2||!points.every(validCoord))throw Error('Choose two valid endpoints');
 const line=t.lineString(points),length=t.length(line,{units:'meters'});if(!Number.isFinite(length)||length<1||length>5000)throw Error('Profile length must be 1–5,000 metres (about 3–16,404 ft)');
 const n=Math.min(400,Math.max(1,Math.ceil(length/2))),samples=Array.from({length:n+1},(_,i)=>{const distance_m=length*i/n,coordinates=i===0?points[0]:i===n?points[1]:t.along(line,distance_m,{units:'meters'}).geometry.coordinates;const xy=project(coordinates);if(!validCoord(coordinates)||!Array.isArray(xy)||xy.length!==2||!xy.every(Number.isFinite))throw Error('Invalid transect projection');return {distance_m,coordinates,xy}});
 const xs=samples.map(p=>p.xy[0]),ys=samples.map(p=>p.xy[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 for(const step of [1,2,5,10,20,30]){const bbox=[Math.floor(minX/step)*step-step,Math.floor(minY/step)*step-step,Math.ceil(maxX/step)*step+step,Math.ceil(maxY/step)*step+step],width=Math.round((bbox[2]-bbox[0])/step),height=Math.round((bbox[3]-bbox[1])/step);if(width>0&&height>0&&width<=1000&&height<=1000&&width*height<=60000)return {bbox,width,height,step,length,samples,geometry:{type:'LineString',coordinates:samples.map(p=>p.coordinates)}}}
 throw Error('Transect grid too large; choose a shorter line');
}
function summarize(g,d){
 if(d.width!==g.width||d.height!==g.height||d.pixels?.length!==1||d.pixels[0].length!==g.width*g.height||d.mask&&d.mask.length!==g.width*g.height)throw Error('Invalid profile raster');
 const samples=g.samples.map(p=>{const col=Math.floor((p.xy[0]-g.bbox[0])/g.step),row=Math.floor((g.bbox[3]-p.xy[1])/g.step);if(col<0||col>=g.width||row<0||row>=g.height)throw Error('Profile point outside requested raster');const i=row*g.width+col,z=d.pixels[0][i];if(d.mask&&d.mask[i]===0)return {distance_m:p.distance_m,coordinates:p.coordinates,elevation_m:null};if(!Number.isFinite(z)||z< -500||z>9000)throw Error('Invalid elevation value or unmasked NoData');return {distance_m:p.distance_m,coordinates:p.coordinates,elevation_m:z}});
 const valid=samples.filter(p=>p.elevation_m!==null),complete=valid.length===samples.length,min=valid.length?valid.reduce((a,b)=>a.elevation_m<=b.elevation_m?a:b):null,max=valid.length?valid.reduce((a,b)=>a.elevation_m>=b.elevation_m?a:b):null;
 return {status:!valid.length?'no_data':complete?'estimated':'partial_coverage',geometry:g.geometry,length_m:g.length,requested_grid_m:g.step,sample_interval_m:g.length/(samples.length-1),sample_count:samples.length,valid_sample_count:valid.length,missing_sample_count:samples.length-valid.length,valid_sample_percent:100*valid.length/samples.length,samples,min_m:complete?min.elevation_m:null,max_m:complete?max.elevation_m:null,relief_m:complete?max.elevation_m-min.elevation_m:null,lowest_sample:complete?min:null,highest_sample:complete?max:null,valid_only_min_m:min?.elevation_m??null,valid_only_max_m:max?.elevation_m??null};
}
async function analyze(t,points,signal,progress=()=>{}){
 const dem=root.GRGTerrain;if(!dem||!root.proj4||!root.GeoTIFF?.fromArrayBuffer)throw Error('Elevation libraries unavailable; refresh the page');
 const get=async(url,stage)=>{const r=await fetch(url,{signal,credentials:'omit'});if(!r.ok){let detail='';try{const j=await r.json();if(typeof j?.error?.message==='string')detail=' — '+j.error.message.slice(0,180)}catch{}throw Error(stage+': HTTP '+r.status+detail)}return r};
 const m=await(await get(source+'?f=pjson','Elevation metadata')).json();if(m.error)throw Error('Elevation metadata unavailable');dem.metadata(m);if(m.renderingRule&&Object.keys(m.renderingRule).length)throw Error('Default elevation renderer is no longer raw');
 const g=plan(t,points,p=>root.proj4('EPSG:4326','EPSG:3857',p));progress('Requesting '+g.step+' m projected elevation grid…');
 const r=await get(source+'/exportImage?'+new URLSearchParams(dem.requestParams(g)),'Profile GeoTIFF');const bytes=await r.arrayBuffer();if(bytes.byteLength<10||bytes.byteLength>5000000)throw Error('Invalid elevation file size');
 const sig=new Uint8Array(bytes,0,4);if(!((sig[0]===73&&sig[1]===73&&[42,43].includes(sig[2])&&sig[3]===0)||(sig[0]===77&&sig[1]===77&&sig[2]===0&&[42,43].includes(sig[3]))))throw Error('Profile response is not TIFF');
 if(signal.aborted)throw Error('Canceled');const decoded=await dem.decodeTiff(bytes,g,root.GeoTIFF);if(signal.aborted)throw Error('Canceled');progress('Sampling elevation along the transect…');
 return {...summarize(g,decoded),source_id:'usgs_3dep_dem',source_url:source,retrieved_at:new Date().toISOString(),source_resolution_m:null,acquisition_date:null,vertical_datum:null,method:'Equal-distance geodesic transect samples; nearest cell from validated raw float32 USGS 3DEP Web Mercator GeoTIFF; no gap interpolation',limitations:'Sample spacing and projected grid spacing are not source DEM resolution. Repeated samples can share cells. Sample extrema may miss terrain between points. Source acquisition date and local vertical datum unknown. Experimental, not a survey.',verification_status:'not_field_verified',evidence_kind:'mapped_estimate'};
}
root.GRGProfile=Object.freeze({plan,summarize,analyze});
})(globalThis);
