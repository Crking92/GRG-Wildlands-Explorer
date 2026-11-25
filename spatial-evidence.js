/* Spatial evidence intersections, not suitability zones. Existing Turf 7.2. */
(function(root){'use strict';
const version='0.60',source_id='grg_spatial_evidence_v1',acre=4046.8564224;
const modes=Object.freeze([{key:'soil',label:'Habitat × soil units',source:'usda_ssurgo_rest'},{key:'wetlands',label:'Habitat × mapped wetlands / surface water',source:'usfws_nwi'},{key:'flood',label:'Habitat × designated SFHA',source:'fema_nfhl'}].map(Object.freeze));
const limitations='Intersections of mapped source polygons only, not verified vegetation, reference ecosystem, wetland delineation, flood safety or restoration suitability. Unmapped areas are unknown. Different views overlap and must not be added. No raster or terrain quantities allocated to polygons.';
function derive(input,t=root.turf){
 if(!t||typeof input.property_id!=='string'||!input.property_id||!Number.isFinite(input.acres)||input.acres<=0||!['Polygon','MultiPolygon'].includes(input.boundary?.geometry?.type))throw Error('Valid property and geometry library required');
 const site=input.boundary,total=t.area(site),tol=Math.max(.1,total*.0001);if(!Number.isFinite(total)||total<=0||Math.abs(total-input.acres*acre)>tol)throw Error('Study area mismatch');
 const valid=d=>d&&Array.isArray(d.rows)&&Number.isFinite(d.total)&&Math.abs(d.total-total)<=tol&&Number.isFinite(d.covered)&&d.covered>=0&&d.covered<=total+tol&&d.rows.every(x=>Number.isFinite(x.area)&&x.area>0&&['Polygon','MultiPolygon'].includes(x.geometry?.geometry?.type));
 const h=input.habitat?.data,results=[];
 for(const m of modes){const r=input[m.key],d=r?.data,meta={key:m.key,label:m.label,source_ids:['tpwd_ems',m.source],source_retrieved_at:{habitat:h?.retrieved??null,other:d?.retrieved??null}};
 const finish=(status,detail,records=[],area=null)=>({...meta,status,detail,records,intersection_acres:area===null?null:area/acre,intersection_percent:area===null?null:area/total*100});
 if(!h||!d){results.push(finish([input.habitat?.status,r?.status].includes('unavailable')?'unavailable':'not_analyzed','Retrieve habitat and '+m.key+' datasets first; source statuses: '+(input.habitat?.status||'not_analyzed')+' / '+(r?.status||'not_analyzed')));continue}
 if(!valid(h)||!valid(d)){results.push(finish('unavailable','Source geometry or area association invalid.'));continue}
 try{
 const hr=h.rows.filter(x=>x.code&&x.name&&x.name!=='Unclassified source polygon'),other=m.key==='flood'?d.rows.filter(x=>x.sfha_flag==='T'):d.rows;
 if(!hr.length||!other.length){results.push(finish('no_data','No classified habitat or applicable mapped features returned; absence not established.'));continue}
 if(hr.length*other.length>1200)throw Error('Pair limit exceeded (1,200); select a smaller area');
 if([...hr,...other].reduce((n,x)=>n+t.coordAll(x.geometry).length,0)>150000)throw Error('Geometry complexity limit exceeded; select a smaller area');
 const records=[],features=[];
 for(const a of hr)for(const b of other){const pair=t.intersect(t.featureCollection([a.geometry,b.geometry]));if(!pair)continue;const part=t.intersect(t.featureCollection([site,pair]));if(!part)continue;const n=t.area(part);if(!Number.isFinite(n)||n<0||n>Math.min(a.area,b.area,total)+tol)throw Error('Invalid intersection area');if(n<=0)continue;
 const name=m.key==='soil'?b.name:m.key==='wetlands'?b.type:'Zone '+(b.zone||'not reported'),code=m.key==='soil'?b.key:m.key==='wetlands'?b.code:b.zone;if(!name||!code)throw Error('Missing source identity');
 records.push({habitat_class_id:String(a.code),habitat_name:a.name,other_id:String(code),other_name:name,other_subtype:m.key==='flood'?b.subtype??null:null,area_acres:n/acre,percent_of_study_area:n/total*100,geometry:part.geometry});features.push(part)}
 if(!records.length){results.push(finish('no_data','No intersecting polygons returned; absence not established.'));continue}
 const union=features.length===1?features[0]:t.union(t.featureCollection(features)),covered=t.area(union),sum=records.reduce((n,x)=>n+x.area_acres*acre,0);if(!Number.isFinite(covered)||covered<=0||covered>total+tol||Math.abs(sum-covered)>tol)throw Error('Overlapping or inconsistent intersection areas; results withheld');
 records.sort((a,b)=>b.area_acres-a.area_acres||a.habitat_name.localeCompare(b.habitat_name)||a.other_name.localeCompare(b.other_name));results.push(finish(covered<total-tol?'partial_coverage':'estimated','Known intersection footprint only. Remainder is not classified by this view.',records,covered));
 }catch(e){results.push(finish('unavailable',String(e.message||e)))}
 }
 const count=results.filter(x=>x.records.length).length;return {source_id,rule_version:version,property_id:input.property_id,study_area_acres:input.acres,status:count?(results.every(x=>x.status==='estimated')?'estimated':'partial_coverage'):results.some(x=>x.status==='unavailable')?'unavailable':results.some(x=>x.status==='no_data')?'no_data':'not_analyzed',method:'Turf 7.2 polygon intersection, clip to property, geodesic area, union and overlap check; full study area denominator.',evidence_kind:'mapped_spatial_intersection',verification_status:'not_field_verified',limitations,records:results};
}
root.GRGSpatialEvidence=Object.freeze({version,modes,derive});
})(globalThis);
