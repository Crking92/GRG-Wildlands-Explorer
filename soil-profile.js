/* On-demand USDA soil survey attributes. Only the public MUKEY is transmitted. */
(function(root){
'use strict';
const source='https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest';
const componentFields={comppct_r:['Representative component share','%',0,100],slope_r:['Representative slope','%',0,1000]};
const horizonFields={hzdept_r:['Top depth','cm',0,10000],hzdepb_r:['Bottom depth','cm',0,10000],ph1to1h2o_r:['pH (1:1 water)','',0,14],om_r:['Organic matter','%',0,100],sandtotal_r:['Sand','%',0,100],silttotal_r:['Silt','%',0,100],claytotal_r:['Clay','%',0,100],awc_r:['Available water capacity','cm/cm',0,1],ksat_r:['Saturated hydraulic conductivity','µm/s',0,100000],dbthirdbar_r:['Bulk density at 1/3 bar','g/cm³',0,10],ec_r:['Electrical conductivity','dS/m',0,1000],caco3_r:['Calcium carbonate equivalent','%',0,100],kwfact:['Whole-soil water erodibility (Kw)','',0,1],kffact:['Fine-earth water erodibility (Kf)','',0,1]};
const fields=['mukey','musym','muname','areasymbol','cokey','compname','compkind','majcompflag','comppct_r','slope_r','drainagecl','hydgrp','hydricrating','chkey','hzname',...Object.keys(horizonFields)];
const sqlFields=['m.mukey','m.musym','m.muname','l.areasymbol','c.cokey','c.compname','c.compkind','c.majcompflag','c.comppct_r','c.slope_r','c.drainagecl','c.hydgrp','c.hydricrating','h.chkey','h.hzname',...Object.keys(horizonFields).map(k=>'h.'+k)];
const key=v=>typeof v==='string'||typeof v==='number'?(/^\d+$/.test(String(v))?String(v):null):null;
const txt=v=>typeof v==='string'&&v.trim()&&!['NULL','<NULL>'].includes(v.trim().toUpperCase())?v.trim():null;
function num(v,spec){if(v===null||v===undefined||v===''||typeof v==='string'&&['NULL','<NULL>'].includes(v.trim().toUpperCase()))return null;if(typeof v!=='number'&&typeof v!=='string'||typeof v==='string'&&!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(v.trim()))throw Error('Invalid numeric soil attribute');const n=Number(v);if(!Number.isFinite(n)||n<spec[2]||n>spec[3])throw Error('Soil attribute outside validation range');return n}
function parse(payload,unit){
 if(!payload||payload.error||payload.Error||!Array.isArray(payload.Table)||!payload.Table.length)throw Error('Invalid SDA response');
 const [head,...rows]=payload.Table;if(!Array.isArray(head)||head.length!==fields.length||head.map(x=>String(x).toLowerCase()).join('|')!==fields.join('|'))throw Error('Unexpected SDA columns');
 if(rows.length>2000)throw Error('Soil profile exceeds row limit');
 const result={status:'no_data',source_id:'usda_sda_tabular',map_unit_key:String(unit.key),retrieved_at:new Date().toISOString(),verification_status:'not_field_verified',evidence_kind:'mapped_estimate',components:[],component_share_sum_percent:null,component_share_complete:false,method:'SSURGO representative component and horizon records, no aggregation; component shares are map-unit estimates, not measured site cover',limitations:'Tabular and polygon dataset vintages may differ; name, symbol and survey area checked, exact vintage equivalence unverified.'};
 const comps=new Map(),hkeys=new Set();
 for(const row of rows){
  if(!Array.isArray(row)||row.length!==head.length)throw Error('Incomplete SDA row');
  const r=Object.fromEntries(fields.map((f,i)=>[f,row[i]]));
  if(key(r.mukey)!==String(unit.key)||txt(r.musym)!==unit.symbol||txt(r.muname)!==unit.name||txt(r.areasymbol)!==unit.survey)throw Error('SDA map-unit identity differs from spatial data; profile withheld');
  if(r.cokey===null||r.cokey===''){continue}
  const ck=key(r.cokey);if(!ck||!txt(r.compname))throw Error('Invalid component record');
  const base={cokey:ck,compname:txt(r.compname),compkind:txt(r.compkind),majcompflag:txt(r.majcompflag),comppct_r:num(r.comppct_r,componentFields.comppct_r),slope_r:num(r.slope_r,componentFields.slope_r),drainagecl:txt(r.drainagecl),hydgrp:txt(r.hydgrp),hydricrating:txt(r.hydricrating)};
  if(!comps.has(ck))comps.set(ck,{...base,horizons:[]});const comp=comps.get(ck);if(Object.keys(base).some(k=>base[k]!==comp[k]))throw Error('Conflicting component attributes');
  if(r.chkey===null||r.chkey==='')continue;
  const hk=key(r.chkey);if(!hk||hkeys.has(hk))throw Error('Invalid or duplicate horizon key');hkeys.add(hk);
  const hz={chkey:hk,hzname:txt(r.hzname)};for(const [k,spec] of Object.entries(horizonFields))hz[k]=num(r[k],spec);
  if(hz.hzdept_r!==null&&hz.hzdepb_r!==null&&hz.hzdepb_r<hz.hzdept_r)throw Error('Reversed horizon depth');comp.horizons.push(hz);
 }
 result.components=[...comps.values()].sort((a,b)=>(b.comppct_r??-1)-(a.comppct_r??-1));for(const c of result.components)c.horizons.sort((a,b)=>(a.hzdept_r??Infinity)-(b.hzdept_r??Infinity));
 const known=result.components.filter(c=>c.comppct_r!==null);
 result.component_share_sum_percent=known.length?known.reduce((a,c)=>a+c.comppct_r,0):null;
 result.component_share_complete=!!result.components.length&&known.length===result.components.length&&Math.abs(result.component_share_sum_percent-100)<=.01;
 result.status=result.components.length?'retrieved':'no_data';return result;
}
async function load(unit,signal,request=fetch){
 const k=key(unit.key);if(!k)throw Error('Invalid public map unit key');
 const query='SELECT TOP 2001 '+sqlFields.join(', ')+' FROM mapunit m INNER JOIN legend l ON m.lkey=l.lkey LEFT JOIN component c ON m.mukey=c.mukey LEFT JOIN chorizon h ON c.cokey=h.cokey WHERE m.mukey = '+ "'"+k+"'" +' ORDER BY c.comppct_r DESC,c.cokey,h.hzdept_r,h.chkey';
 const res=await request(source,{method:'POST',body:new URLSearchParams({query,format:'JSON+COLUMNNAME'}),signal,credentials:'omit'});if(!res.ok)throw Error('SDA HTTP '+res.status);return parse(await res.json(),unit);
}
root.GRGSoilProfile=Object.freeze({source,fields,componentFields,horizonFields,parse,load});
})(globalThis);
