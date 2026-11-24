/* Public MRLC WMS display only; never convert styled map pixels into statistics. */
(function(root){
'use strict';
const sources={
 canopy:{label:'Tree canopy',preset:'CONUS_Canopy',url:'https://www.mrlc.gov/geoserver/mrlc_NLCD-Tree-Canopy-Native_conus_year_data/wms',source_id:'mrlc_canopy_wms',attribution:'USDA Forest Service / MRLC'},
 land:{label:'Land cover',preset:'CONUS_Land_Cover',url:'https://www.mrlc.gov/geoserver/mrlc_Land-Cover-Native_conus_year_data/wms',source_id:'mrlc_land_wms',attribution:'USGS / MRLC'},
 impervious:{label:'Impervious surfaces',preset:'CONUS_Impervious',url:'https://www.mrlc.gov/geoserver/mrlc_Fractional-Impervious-Surface-Native_conus_year_data/wms',source_id:'mrlc_impervious_wms',attribution:'USGS / MRLC'}
};
const children=(el,name)=>Array.from(el?.children||[]).filter(c=>c.localName===name);
const one=(el,name)=>children(el,name)[0];
const val=(el,name)=>one(el,name)?.textContent?.trim()||'';
function times(raw){
 const list=new Map();function add(v){v=v.trim();if(/^\d{4}(?:-\d{2}-\d{2}(?:T[\d:.]+Z)?)?$/.test(v)&&Number(v.slice(0,4))>=1900&&Number(v.slice(0,4))<=2100)list.set(v,{value:v,label:v.length===4?v:v.slice(0,10)})}
 for(const part of String(raw||'').split(',')){const p=part.trim(),range=p.split('/');if(range.length===1){add(p);continue}if(range.length!==3||range[2]!=='P1Y')continue;const [a,b]=range;if(!/^\d{4}(?:-\d{2}-\d{2}(?:T[\d:.]+Z)?)?$/.test(a)||!/^\d{4}(?:-\d{2}-\d{2}(?:T[\d:.]+Z)?)?$/.test(b)||a.slice(4)!==b.slice(4))continue;const start=Number(a.slice(0,4)),end=Number(b.slice(0,4));if(start<1900||end>2100||end<start||end-start>120)continue;for(let y=start;y<=end;y++)add(String(y)+a.slice(4))}
 return [...list.values()].sort((a,b)=>b.value.localeCompare(a.value))
}
function capabilities(xml){
 const doc=new DOMParser().parseFromString(xml,'application/xml'),top=doc.documentElement;
 if(!top||doc.querySelector('parsererror')||!['WMT_MS_Capabilities','WMS_Capabilities'].includes(top.localName))throw Error('Invalid WMS capabilities response');
 const version=top.getAttribute('version');if(version!=='1.1.1'&&version!=='1.3.0')throw Error('Unsupported WMS version');
 const cap=one(top,'Capability'),formats=children(one(one(cap,'Request'),'GetMap'),'Format').map(e=>e.textContent.trim());if(!formats.includes('image/png'))throw Error('PNG map format not advertised');
 const layers=[];
 function visit(el,inherited={crs:[],time:null,def:null}){
  const crs=[...new Set([...inherited.crs,...children(el,'CRS').concat(children(el,'SRS')).flatMap(e=>e.textContent.trim().split(/\s+/))])];
  const dim=children(el,'Dimension').find(e=>e.getAttribute('name')?.toLowerCase()==='time'),extent=children(el,'Extent').find(e=>e.getAttribute('name')?.toLowerCase()==='time');
  const te=extent||dim,raw=te?.textContent?.trim()||inherited.time,def=te?.getAttribute('default')||inherited.def;
  const name=val(el,'Name'),title=val(el,'Title'),ts=times(raw);
  if(name&&crs.some(c=>['EPSG:3857','EPSG:4326'].includes(c))){const match=def&&ts.some(t=>t.value===def)?def:ts[0]?.value||null;layers.push({name,title:title||name,crs:crs.includes('EPSG:3857')?'EPSG:3857':'EPSG:4326',times:ts,defaultTime:match,timeAdvertised:!!raw,version})}
  for(const child of children(el,'Layer'))visit(child,{crs,time:raw,def})
 }
 for(const layer of children(cap,'Layer'))visit(layer);
 if(!layers.length||layers.length>150)throw Error('No supported named layers or too many layers');
 return layers;
}
function presetLayer(id,layers){
 const s=sources[id];if(!s)throw Error('Unknown map source');
 const matches=layers.filter(l=>typeof l.name==='string'&&l.name.split(':').pop()===s.preset);
 if(matches.length!==1)throw Error(matches.length?'Ambiguous '+s.preset+' layers':'Expected '+s.preset+' layer not advertised');
 const l=matches[0];return {...l,defaultTime:l.times[0]?.value||null};
}
async function discover(id,signal,request=fetch){
 const s=sources[id];if(!s)throw Error('Unknown map source');const q=new URLSearchParams({service:'WMS',request:'GetCapabilities',version:'1.1.1'});
 const r=await request(s.url+'?'+q,{signal,credentials:'omit'});if(!r.ok)throw Error('WMS HTTP '+r.status);
 const xml=await r.text();if(xml.length>2000000)throw Error('Capabilities response too large');return [presetLayer(id,capabilities(xml))]
}
root.GRGRasterMaps=Object.freeze({sources,times,capabilities,presetLayer,discover});
})(globalThis);
