/* Native-grid, lossless raster analysis. No inference from map colors. */
(function(root){
'use strict';
const acre=4046.8564224, step=30, maxCells=12000;
const classes={11:['Open water','#466b9f'],12:['Perennial ice/snow','#d1def8'],21:['Developed, open space','#dec5c5'],22:['Developed, low intensity','#d99282'],23:['Developed, medium intensity','#eb0000'],24:['Developed, high intensity','#ab0000'],31:['Barren land','#b3aea3'],41:['Deciduous forest','#68ab5f'],42:['Evergreen forest','#1c6330'],43:['Mixed forest','#b5c58f'],52:['Shrub/scrub','#ccb879'],71:['Grassland/herbaceous','#dfdfc2'],81:['Pasture/hay','#dcd939'],82:['Cultivated crops','#ab6c28'],90:['Woody wetlands','#b8d9eb'],95:['Emergent herbaceous wetlands','#6c9fb8']};
function area(ring){if(ring.length<3)return 0;const [x,y]=ring[0];let a=0;for(let i=0;i<ring.length;i++){const p=ring[i],q=ring[(i+1)%ring.length];a+=(p[0]-x)*(q[1]-y)-(q[0]-x)*(p[1]-y)}return Math.abs(a)/2}
// Spherical equal-area integral of Web Mercator edges (Simpson quadrature on short segments).
function mercArea(ring){if(ring.length<3)return 0;const R=6378137,origin=R*Math.tanh(ring[0][1]/R);const y=v=>R*Math.tanh(v/R)-origin;let sum=0;for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],n=Math.max(1,Math.ceil(Math.abs(b[1]-a[1])/100));for(let j=0;j<n;j++){const lo=a[1]+(b[1]-a[1])*j/n,hi=a[1]+(b[1]-a[1])*(j+1)/n;sum-=(b[0]-a[0])/n*(y(lo)+4*y((lo+hi)/2)+y(hi))/6}}return Math.abs(sum)}
function clip(ring,b,measure=area){let p=ring;for(const [axis,edge,sign] of [[0,b[0],1],[0,b[2],-1],[1,b[1],1],[1,b[3],-1]]){if(!p.length)break;const out=[];let a=p.at(-1),inside=(a[axis]-edge)*sign>=0;for(const z of p){const ok=(z[axis]-edge)*sign>=0;if(ok!==inside){const t=(edge-a[axis])/(z[axis]-a[axis]);const v=[a[0]+t*(z[0]-a[0]),a[1]+t*(z[1]-a[1])];v[axis]=edge;out.push(v)}if(ok)out.push(z);a=z;inside=ok}p=out}return measure(p)}
function polyArea(p,b,measure=area){const a=b?clip(p[0],b,measure):measure(p[0]);return a-p.slice(1).reduce((s,r)=>s+(b?clip(r,b,measure):measure(r)),0)}
function mercator(sr){return [3857,102100,102113].includes(sr?.latestWkid)||[3857,102100,102113].includes(sr?.wkid)}
function grid(site,m,project,options={}){
 if(!['Polygon','MultiPolygon'].includes(site?.geometry?.type))throw Error('Study polygon required');
 const e=m.extent,sr=e?.spatialReference;if(!e||!sr||!['xmin','ymin','xmax','ymax'].every(k=>Number.isFinite(e[k]))||m.pixelSizeX!==30||m.pixelSizeY!==30||m.bandCount!==1||m.pixelType!==(options.pixelType||'U8')||!m.rasterFunctionInfos?.some(f=>f.name==='None'))throw Error('Native 30 m single-band raw grid not established');
 const isMerc=mercator(sr),is5070=options.allow5070===true&&(sr.latestWkid??sr.wkid)===5070,wkt=isMerc?'EPSG:3857':is5070?'EPSG:5070':sr.wkt;if(!isMerc&&!is5070&&(typeof wkt!=='string'||!(/PROJECTION\s*\[\s*"Albers"/i.test(wkt))||!(/UNIT\s*\[\s*"Met(?:er|re)"\s*,\s*1(?:\.0+)?\s*\]/i.test(wkt))))throw Error('Supported service grid projection not established');const measure=isMerc?mercArea:area;
 const raw=site.geometry.type==='Polygon'?[site.geometry.coordinates]:site.geometry.coordinates;
 const polys=raw.map(p=>p.map(r=>{if(r.length<4||r[0][0]!==r.at(-1)[0]||r[0][1]!==r.at(-1)[1])throw Error('Unclosed boundary');const out=[];for(let i=0;i<r.length-1;i++){const a=r[i],b=r[i+1],n=Math.max(1,Math.ceil(Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]))/.0002));if(n>10000||out.length+n>20000)throw Error('Boundary too complex');for(let j=0;j<n;j++){const t=j/n,v=project(wkt,[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);if(!Array.isArray(v)||!v.every(Number.isFinite))throw Error('Projection failed');out.push(v)}}return out}));
 const pts=polys.flat(1).flat(1);let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const [x,y] of pts){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}
 const x0=e.xmin+Math.floor((minX-e.xmin)/step)*step,x1=e.xmin+Math.ceil((maxX-e.xmin)/step)*step,y0=e.ymax+Math.floor((minY-e.ymax)/step)*step,y1=e.ymax+Math.ceil((maxY-e.ymax)/step)*step;
 const width=Math.round((x1-x0)/step),height=Math.round((y1-y0)/step),total=polys.reduce((s,p)=>s+polyArea(p,null,measure),0);
 if(!Number.isFinite(total)||total<=0||total/acre>1000||width<=0||height<=0||width*height>maxCells)throw Error('Study exceeds raster limit (1,000 acres or 12,000 bounding cells); subdivide site');
 if(x0<e.xmin||x1>e.xmax||y0<e.ymin||y1>e.ymax)throw Error('Boundary extends outside native raster extent');
 return {polys,bbox:[x0,y0,x1,y1],width,height,total,wkt,isMerc,sr:isMerc?{wkid:3857}:is5070?{wkid:5070}:{wkt},nativeOrigin:[e.xmin,e.ymax]}
}
function summarize(id,g,decoded){
 const {width,height,bbox,polys,total}=g,measure=g.isMerc?mercArea:area;if(decoded.width!==width||decoded.height!==height||decoded.pixels?.length!==1||decoded.pixels[0].length!==width*height||decoded.mask&&decoded.mask.length!==width*height)throw Error('Unexpected raster dimensions or bands');
 const pixels=decoded.pixels[0],mask=decoded.mask,areas=new Map();let valid=0,missing=0,covered=0,count=0;
 for(let row=0;row<height;row++)for(let col=0;col<width;col++){
  const x=bbox[0]+col*step,y=bbox[3]-row*step,b=[x,y-step,x+step,y],a=polys.reduce((s,p)=>s+polyArea(p,b,measure),0);if(a<-.001||a>900.001)throw Error('Invalid intersection area');if(a<=0)continue;count++;
  const i=row*width+col,v=pixels[i];if(mask&&mask[i]===0||id==='canopy'&&(v===254||v===255)||id!=='canopy'&&v===250){missing+=a;continue}
  if(!Number.isInteger(v)||id==='land'&&!classes[v]||id!=='land'&&(v<0||v>100))throw Error('Unrecognized raw raster value '+v);
  valid+=a;if(id==='land')areas.set(v,(areas.get(v)||0)+a);else covered+=a*v/100;
 }
 if(Math.abs(valid+missing-total)>Math.max(.02,total*1e-7))throw Error('Raster intersection area check failed');
 const complete=missing<=Math.max(.0001,total*1e-9),pct=v=>100*v/total;
 return {status:!valid?'no_data':complete?'estimated':'partial_coverage',study_area_acres:total/acre,valid_area_acres:valid/acre,missing_area_acres:missing/acre,coverage_percent:pct(valid),intersected_cells:count,native_resolution_m:30,records:id==='land'?[...areas].map(([code,a])=>({code,name:classes[code][0],color:classes[code][1],acres:a/acre,percent_of_study_area:complete?pct(a):null,percent_of_valid_area:a/valid*100})).sort((a,b)=>b.acres-a.acres):[],estimated_covered_acres:id==='land'||!complete||!valid?null:covered/acre,percent_of_study_area:id==='land'||!complete||!valid?null:pct(covered),known_covered_acres:id==='land'||!valid?null:covered/acre,percent_of_valid_area:id==='land'||!valid?null:100*covered/valid};
}
async function analyze(id,site,year,signal,progress=()=>{},capture=null){
 const s=root.GRGRasterMaps?.sources[id];if(!s||!root.proj4||!root.Lerc)throw Error('Raster analysis libraries unavailable');
 const get=async(url)=>{const r=await fetch(url,{signal,credentials:'omit'});if(!r.ok)throw Error('HTTP '+r.status);return r};
 const json=async(url)=>{const j=await(await get(url)).json();if(j.error)throw Error(j.error.message||'Image service error');return j};
 const m=await json(s.url+'?f=pjson'),l=root.GRGRasterMaps.metadata(id,m)[0];year=year||l.defaultTime;if(!l.times.some(t=>t.value===year))throw Error('Year not in published time extent');
 const g=grid(site,m,(wkt,p)=>root.proj4('EPSG:4326',wkt,p));const where=s.yearField+' = '+year;
 progress('Verifying requested year and native raster…');
 const catalog=await json(s.url+'/query?'+new URLSearchParams({where,returnIdsOnly:'true',f:'json'}));
 if(catalog.exceededTransferLimit||!Array.isArray(catalog.objectIds)||!catalog.objectIds.length||catalog.objectIds.length>20||catalog.objectIds.some(v=>!Number.isInteger(v)))throw Error('Requested year could not be verified in raster catalog');
 const params={bbox:g.bbox.join(','),bboxSR:JSON.stringify(g.sr),imageSR:JSON.stringify(g.sr),size:g.width+','+g.height,format:'lerc',f:'json',compressionTolerance:'0',interpolation:'RSP_NearestNeighbor',adjustAspectRatio:'false',mosaicRule:JSON.stringify({mosaicMethod:'esriMosaicLockRaster',lockRasterIds:catalog.objectIds,mosaicOperation:'MT_FIRST'}),renderingRule:JSON.stringify({rasterFunction:'None'})};
 progress('Requesting lossless raw raster values…');const j=await json(s.url+'/exportImage?'+new URLSearchParams(params));
 if(j.width!==g.width||j.height!==g.height||!j.extent||!['xmin','ymin','xmax','ymax'].every((k,i)=>Number.isFinite(j.extent[k])&&Math.abs(j.extent[k]-g.bbox[i])<.001))throw Error('Service did not return requested native-grid extent');
 const ref=j.extent.spatialReference;if(g.isMerc?!mercator(ref):(!ref?.wkt||![[-97,30],[-100,35]].every(p=>{const a=root.proj4('EPSG:4326',g.wkt,p),b=root.proj4('EPSG:4326',ref.wkt,p);return Math.hypot(a[0]-b[0],a[1]-b[1])<.01})))throw Error('Returned service-grid CRS could not be verified');
 const href=new URL(j.href,s.url);if(href.protocol!=='https:'||href.origin!==new URL(s.url).origin)throw Error('Unexpected raw raster download host');
 const res=await get(href.href),bytes=await res.arrayBuffer();if(bytes.byteLength<10||bytes.byteLength>5000000)throw Error('Invalid raw raster response size');
 await root.Lerc.load({locateFile:n=>'https://cdn.jsdelivr.net/npm/lerc@4.2.0/'+n});if(signal.aborted)throw Error('Canceled');
 const decoded=root.Lerc.decode(bytes);progress('Weighting raster cells by boundary intersection…');const result=summarize(id,g,decoded);if(typeof capture==='function')capture({grid:g,decoded});
 return {...result,source_id:s.source_id,source_url:s.url,year,source_raster_ids:catalog.objectIds,retrieved_at:new Date().toISOString(),method:(g.isMerc?'30 m Web Mercator service grid; spherical ground-area correction of intersected cells; service may resample original data. ':'Native 30 m equal-area service grid; ')+'Raw lossless LERC, no renderer; intersected cell area weighting, no extrapolation across missing cells',verification_status:'not_field_verified',evidence_kind:'mapped_estimate',native_crs_wkt:g.isMerc?null:g.wkt,service_grid_crs:g.isMerc?'EPSG:3857':g.wkt,service_grid_projection:g.isMerc?'web_mercator':'albers_equal_area',native_grid_origin:g.nativeOrigin,limitations:'Experimental; independent GIS validation pending. 30 m cell values do not resolve individual trees or structures; assumed uniform within each cell. Dataset revision unknown. '+(g.isMerc?'Web Mercator 30 m service cells are not 30 m ground cells; original raster grid equivalence unverified.':'')};
}
root.GRGRasterAnalysis=Object.freeze({grid,summarize,analyze,area,clip,mercArea,mercator,classes});
})(globalThis);
