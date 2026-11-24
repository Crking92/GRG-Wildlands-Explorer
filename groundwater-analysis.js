/* Mapped aquifer and provisional Edwards zone intersections. */
(function mod(root){
'use strict';
const twdb='https://services.twdb.texas.gov/arcgis/rest/services/Base/BaseLayerQueryService/MapServer/',acre=4046.8564224;
const configs={
 major:{label:'Major aquifers',source_id:'twdb_major_aquifers',url:twdb+'1',id:'MajorAquiferId',name:'AquiferName',code:'AquiferNumName',vintage:null,limits:'Regional TWDB mapped aquifer extent; source vintage and scale not established for this service. Does not establish water depth, yield, quality, access or recharge.'},
 minor:{label:'Minor aquifers',source_id:'twdb_minor_aquifers',url:twdb+'2',id:'MinorAquiferId',name:'AquiferName',code:'AquiferNumName',vintage:null,limits:'Regional TWDB mapped aquifer extent; source vintage and scale not established for this service. Does not establish water depth, yield, quality, access or recharge.'},
 zones:{label:'Edwards zones · screening copy',source_id:'edwards_zone_screening_copy',url:'https://services5.arcgis.com/bVphnK8rPe5MHUSr/arcgis/rest/services/Edwards_Aquifer/FeatureServer/0',id:'OBJECTID',name:'TYPE',code:null,vintage:'Service last data edit 2022-03-30; original map vintage and current equivalence unknown',limits:'Public copy of Chapter 213 zone mapping; publisher and completeness not independently established. Not a current regulatory determination. No intersection does not establish that a site is unregulated. Confirm with official TCEQ viewer.'}
};
const colors=['#70b9d3','#c7a5e5','#8dc49b','#e3b66e','#d98fa3','#92b6a6'];
const method='Complete candidate object-ID query, WGS84 polygon clipping to study area and dissolve by exact source name/code; Turf geodesic area. Union area avoids double counting overlapping mapped extents.';
function partition(total,covered,sum){
 const tol=Math.max(.1,total*.0001);if(![total,covered,sum].every(Number.isFinite)||total<=0||covered<0||sum<0||covered>total+tol||sum+tol<covered)throw Error('Invalid area partition');
 return {study_area_acres:total/acre,intersected_area_acres:Math.min(total,covered)/acre,area_without_returned_intersection_acres:Math.max(0,total-covered)/acre,overlap_excess_acres:Math.max(0,sum-covered)/acre,intersection_percent:100*Math.min(total,covered)/total};
}
function compose(site,features,c,t){
 const total=t.area(site),groups=new Map();let vertices=0;
 for(const f of features){if(!['Polygon','MultiPolygon'].includes(f.geometry?.type))throw Error('Unexpected geometry');const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
 for(const p of polys)for(const ring of p){vertices+=ring.length;if(vertices>600000)throw Error('Polygon complexity limit exceeded');for(const q of ring)if(!Number.isFinite(q[0])||!Number.isFinite(q[1])||Math.abs(q[0])>180||Math.abs(q[1])>90)throw Error('Invalid geographic coordinates')}
 const a=f.properties??{},name=typeof a[c.name]==='string'&&a[c.name].trim()?a[c.name]:null,code=c.code&&typeof a[c.code]==='string'?a[c.code]:null;
 if(!name)throw Error('Source name missing');const part=t.intersect(t.featureCollection([site,f]));if(!part||t.area(part)<=0)continue;const key=JSON.stringify([name,code]),g=groups.get(key)??{name,code,ids:[],parts:[]};g.parts.push(part);g.ids.push(a[c.id]);groups.set(key,g)}
 const union=p=>p.length===1?p[0]:t.union(t.featureCollection(p)),rows=[...groups.values()].map(g=>{const geometry=union(g.parts);if(!geometry)throw Error('Dissolve failed');const a=t.area(geometry);if(!Number.isFinite(a)||a<=0||a>total+Math.max(.1,total*.0001))throw Error('Invalid unit area');return {name:g.name,code:g.code,source_object_ids:g.ids,geometry,area_acres:a/acre,percent_of_study_area:100*a/total}}).sort((a,b)=>b.area_acres-a.area_acres).map((r,i)=>({...r,color:colors[i%colors.length]}));
 const covered=rows.length?t.area(union(rows.map(r=>r.geometry))):0;
 return {rows,summary:{...partition(total,covered,rows.reduce((s,r)=>s+r.area_acres*acre,0)),status:'estimated',source_id:c.source_id,source_url:c.url,source_vintage:c.vintage,map_scale:null,retrieved_at:new Date().toISOString(),method,limitations:c.limits+' Different aquifers or zone classes may overlap; individual percentages are not additive. Absence of a returned polygon is not proof of absence of groundwater or regulatory obligations.',evidence_kind:'mapped_estimate',verification_status:'not_field_verified',rows:rows.map(({geometry,color,...r})=>r)}};
}
async function analyze(key,site,t,json,signal,progress=()=>{}){
 const c=configs[key];if(!c)throw Error('Unknown groundwater dataset');const b=t.bbox(site),a=t.area(site);
 if(!Number.isFinite(a)||a<=0||a/acre>1000||t.area(t.bboxPolygon(b))/acre>5000)throw Error('Choose a study area up to 1,000 acres with envelope up to 5,000 acres');
 if(b[0]<-107||b[2]>-93||b[1]<25||b[3]>37)throw Error('Texas datasets only');
 const get=p=>json(c.url+'/query',p,signal);
 progress('Checking candidate polygon IDs…');const j=await get({f:'json',where:'1=1',geometry:b.join(','),geometryType:'esriGeometryEnvelope',inSR:'4326',spatialRel:'esriSpatialRelIntersects',returnIdsOnly:'true'});
 if(j.exceededTransferLimit||!Array.isArray(j.objectIds)&&j.objectIds!==null)throw Error('Incomplete polygon index');const ids=[...new Set(j.objectIds||[])];if(ids.length>100||ids.some(v=>!Number.isInteger(v)))throw Error('Too many or invalid candidate IDs');
 const features=[];for(let i=0;i<ids.length;i+=5){if(signal.aborted)throw Error('Canceled');const batch=ids.slice(i,i+5);progress('Retrieving polygons '+(i+1)+'–'+(i+batch.length)+' of '+ids.length+'…');const q=await get({f:'geojson',objectIds:batch.join(','),outFields:[c.id,c.name,c.code].filter(Boolean).join(','),returnGeometry:'true',outSR:'4326'});if(q.exceededTransferLimit||!Array.isArray(q.features)||q.features.length!==batch.length||new Set(q.features.map(f=>f.properties?.[c.id])).size!==batch.length||q.features.some(f=>!batch.includes(f.properties?.[c.id])))throw Error('Incomplete polygon response');features.push(...q.features)}
 if(signal.aborted)throw Error('Canceled');progress('Clipping and dissolving mapped extents…');return compose(site,features,c,t)
}
root.GRGGroundwater=Object.freeze({configs,partition,compose,analyze});
})(globalThis);
