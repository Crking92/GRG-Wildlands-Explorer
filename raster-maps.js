/* Direct imagery services. Display only; no statistics from styled images. */
(function(root){
'use strict';
const sources={
 canopy:{label:'Tree canopy',url:'https://imagery.geoplatform.gov/iipp/rest/services/Vegetation/USFS_EDW_NLCD_TCC_CONUS/ImageServer',source_id:'usfs_canopy_image',attribution:'USDA Forest Service / GeoPlatform',renderer:'NLCDTCC_noBkgrd',yearField:'beginyear'},
 land:{label:'Land cover',url:'https://di-nlcd.img.arcgis.com/arcgis/rest/services/USA_NLCD_Annual_LandCover/ImageServer',source_id:'nlcd_land_image',attribution:'USGS Annual NLCD / Esri hosted imagery',renderer:'MRLC Cartographic Renderer for Visualization and Analysis',yearField:'Year'},
 impervious:{label:'Impervious surfaces',url:'https://di-nlcd.img.arcgis.com/arcgis/rest/services/USA_NLCD_Annual_LandCover_Fractional_Impervious_Surface/ImageServer',source_id:'nlcd_impervious_image',attribution:'USGS Annual NLCD / Esri hosted imagery',renderer:'Impervious Surface USGS Default Renderer',yearField:'Year'}
};
function metadata(id,m){
 const s=sources[id];if(!s||!m||m.error||m.bandCount!==1||m.pixelSizeX!==30||m.pixelSizeY!==30||m.pixelType!=='U8')throw Error('Unexpected image service metadata');
 const extent=m.timeInfo?.timeExtent;if(!Array.isArray(extent)||extent.length!==2||!extent.every(Number.isFinite))throw Error('Published date range unavailable');
 const first=new Date(extent[0]).getUTCFullYear(),last=new Date(extent[1]).getUTCFullYear();if(first<1900||last>2100||last<first||last-first>120)throw Error('Invalid annual date range');
 if(!m.fields?.some(f=>f.name===s.yearField)||!m.rasterFunctionInfos?.some(f=>f.name===s.renderer))throw Error('Expected year field or renderer not advertised');
 const times=Array.from({length:last-first+1},(_,i)=>({value:String(last-i),label:String(last-i)}));
 return [{name:m.name||s.source_id,title:s.label,times,defaultTime:times[0].value,sourceResolution:30,metadataTimeExtent:extent}];
}
async function discover(id,signal,request=fetch){const s=sources[id];if(!s)throw Error('Unknown source');const r=await request(s.url+'?f=pjson',{signal,credentials:'omit'});if(!r.ok)throw Error('Image service HTTP '+r.status);return metadata(id,await r.json())}
function imageUrl(id,year,bbox,width,height){const s=sources[id];if(!s||!/^\d{4}$/.test(year)||Number(year)<1900||Number(year)>2100||bbox.length!==4||!bbox.every(Number.isFinite)||bbox[0]>=bbox[2]||bbox[1]>=bbox[3]||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>1200||height>1200)throw Error('Invalid image request');
 const q={bbox:bbox.join(','),bboxSR:'3857',imageSR:'3857',size:width+','+height,format:'png32',f:'image',interpolation:'RSP_NearestNeighbor',adjustAspectRatio:'false',mosaicRule:JSON.stringify({mosaicMethod:'esriMosaicNorthwest',where:s.yearField+' = '+year,mosaicOperation:'MT_FIRST'}),renderingRule:JSON.stringify({rasterFunction:s.renderer})};
 return s.url+'/exportImage?'+Object.entries(q).map(([k,v])=>encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&');
}
root.GRGRasterMaps=Object.freeze({sources,metadata,discover,imageUrl});
})(globalThis);
