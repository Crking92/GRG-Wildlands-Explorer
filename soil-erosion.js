/* Separate USDA erodibility and terrain evidence; no combined score. */
(function module(root){
'use strict';
const acre=4046.8564224;
const method='Representative component-weighted Kw and Kf for unique positive-thickness horizons beginning at 0 cm; means of known component shares only, full-map-unit mean only with complete 100% coverage. Terrain comparison uses projected clipped soil polygons intersected with the existing valid erosion cells, area-weighted.';
const limitations='Mapped survey components are not spatially located within map units. Missing surface factors, organic horizons, ambiguous horizons and unreported shares are not imputed. No soil loss estimate or combined erosion risk score. Polygon and tabular vintages may differ. Terrain index remains experimental; projected geometry and soil mapping uncertainty remain.';
function factors(p){
 const comps=p?.status==='retrieved'?p.components:[],rows=[];
 let share=0,allShares=!!comps.length;
 for(const c of comps){
  const pct=c.comppct_r;if(!Number.isFinite(pct)||pct<0||pct>100){allShares=false}
  else share+=pct;
  const candidates=c.horizons.filter(h=>h.hzdept_r===0);
  const h=candidates.length===1&&Number.isFinite(candidates[0].hzdepb_r)&&candidates[0].hzdepb_r>0?candidates[0]:null;
  const value=k=>Number.isFinite(h?.[k])&&h[k]>=0&&h[k]<=1?h[k]:null;
  rows.push({cokey:c.cokey,component:c.compname,share_percent:Number.isFinite(pct)&&pct>=0&&pct<=100?pct:null,horizon_key:h?.chkey??null,horizon_name:h?.hzname??null,top_cm:h?.hzdept_r??null,bottom_cm:h?.hzdepb_r??null,kw:value('kwfact'),kf:value('kffact')});
 }
 if(share>100.01)allShares=false;
 const calc=k=>{
  let known=0,sum=0;for(const c of rows)if(c.share_percent!==null&&c[k]!==null){known+=c.share_percent;sum+=c.share_percent*c[k]}
  if(!rows.length||!rows.some(c=>c.share_percent!==null)||known>100.01)return {known_component_share_percent:null,known_share_mean:null,full_unit_mean:null};
  const mean=known>0?sum/known:null;
  return {known_component_share_percent:known,known_share_mean:mean,full_unit_mean:allShares&&Math.abs(share-100)<=.01&&Math.abs(known-100)<=.01?mean:null}
 };
 return {status:p?.status??'not_analyzed',retrieved_at:p?.retrieved_at??null,detail:p?.detail??null,component_share_sum_percent:comps.length&&rows.some(c=>c.share_percent!==null)?share:null,component_share_complete:allShares&&Math.abs(share-100)<=.01,kw:calc('kw'),kf:calc('kf'),components:rows};
}
function compare(r,units,project,clip,area){
 const d=r.summary,e=r.erosion,{width:w,height:h,bbox}=d.grid,n=w*h,step=d.requested_grid_m;
 if(!e?.values||e.values.length!==n||r.weights.length!==n||!units.length)throw Error('Terrain screening and mapped soil units required');
 const allocated=new Float64Array(n);let work=0;const rows=[];
 for(const u of units){
  const geom=u.geometry?.geometry;if(!geom||!['Polygon','MultiPolygon'].includes(geom.type))throw Error('Invalid soil polygon');
  const polys=(geom.type==='Polygon'?[geom.coordinates]:geom.coordinates).map(p=>p.map(ring=>ring.map(project)));
  let valid=0,sum=0,peak=null,edge=0;
  for(const p of polys){
   const xs=p[0].map(q=>q[0]),ys=p[0].map(q=>q[1]);let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;for(let j=0;j<xs.length;j++){if(!Number.isFinite(xs[j])||!Number.isFinite(ys[j]))throw Error('Invalid projected soil coordinate');xmin=Math.min(xmin,xs[j]);xmax=Math.max(xmax,xs[j]);ymin=Math.min(ymin,ys[j]);ymax=Math.max(ymax,ys[j])}
   const c0=Math.max(0,Math.floor((xmin-bbox[0])/step)),c1=Math.min(w,Math.ceil((xmax-bbox[0])/step)),r0=Math.max(0,Math.floor((bbox[3]-ymax)/step)),r1=Math.min(h,Math.ceil((bbox[3]-ymin)/step));
   work+=(c1-c0)*(r1-r0)*p.reduce((s,q)=>s+q.length,0);if(work>12000000)throw Error('Soil/terrain intersection too complex; use smaller site or coarser grid');
   for(let y=r0;y<r1;y++)for(let x=c0;x<c1;x++){const i=y*w+x;if(!Number.isFinite(e.values[i]))continue;const xx=bbox[0]+x*step,yy=bbox[3]-y*step,b=[xx,yy-step,xx+step,yy];const a=clip(p[0],b,area)-p.slice(1).reduce((s,q)=>s+clip(q,b,area),0);if(!Number.isFinite(a)||a<-.01)throw Error('Invalid soil cell intersection');if(a<=0)continue;allocated[i]+=a;valid+=a;sum+=a*e.values[i];peak=peak===null?e.values[i]:Math.max(peak,e.values[i]);if(e.codes[i]===4)edge+=a}
  }
  rows.push({mukey:u.key,symbol:u.symbol,name:u.name,survey:u.survey,mapped_area_acres:u.area/acre,terrain_intersection_acres:valid/acre,mean_terrain_index_m:valid?sum/valid:null,maximum_terrain_index_m:peak,edge_influenced_intersection_acres:edge/acre,erodibility:factors(u.kProfile)});
 }
 let intersected=0;for(let i=0;i<n;i++){if(allocated[i]>r.weights[i]+Math.max(.05,r.weights[i]*.001))throw Error('Soil intersections exceed terrain cell property area');intersected+=allocated[i]}
 const available=e.summary.valid_area_acres;if(intersected/acre>available+Math.max(.0001,available*.001))throw Error('Soil terrain overlap exceeds valid terrain area');
 return {status:intersected>0?'estimated':'no_data',method,limitations,source_id:'usda_sda_tabular',source_url:'https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest',spatial_source_id:'usda_ssurgo_rest',evidence_kind:'mapped_estimate_and_modeled_terrain_interpretation',verification_status:'not_field_verified',terrain_valid_area_acres:available,soil_terrain_intersection_acres:intersected/acre,rows};
}
root.GRGSoilErosion=Object.freeze({factors,compare});
})(globalThis);
