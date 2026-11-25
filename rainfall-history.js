/* NOAA historical daily precipitation; strict daily completeness. */
(function historyModule(root){
'use strict';
const source='https://www.ncei.noaa.gov/access/services/data/v1',dataset='daily-summaries',doc='https://www.ncei.noaa.gov/pub/data/ghcn/daily/readme.txt';
const method='Sum accepted NOAA GHCN-Daily PRCP values requested in metric units (mm), convert to inches using 25.4 mm/in. Require every calendar day in a month/year to have an accepted daily total. Blank quality flag, nonblank source flag, and measurement flag blank, B, D, G or T (trace recorded as zero only when reported zero) accepted. Other flags withheld conservatively; no multiday allocation or gap filling.';
const limitations='Station observations, not property rainfall. Strict screening may exclude otherwise usable periods; incomplete months/years have no total or anomaly. Trace amounts are not quantified. Station history and normals may use different quality/rounding procedures. Recent data may be revised; not a trend analysis or current drought classification.';
const day=86400000,validID=s=>typeof s==='string'&&/^[A-Z0-9]{11}$/.test(s);
function interval(start,end){if(!Number.isInteger(start)||!Number.isInteger(end)||start<1900||end>new Date().getUTCFullYear()-1||end<start||end-start>=35)throw Error('Choose up to 35 completed calendar years');return [Date.UTC(start,0,1),Date.UTC(end+1,0,1)]}
function dayStatus(mm,flags){
 if(mm===null)return 'missing';
 if(typeof flags!=='string')return 'flags_unavailable';
 const a=flags.split(',').map(x=>x.trim());if(a.length<3||a.length>4||a.slice(0,3).some(x=>x.length>1)||!a[2])return 'flags_unavailable';
 if(a[1])return 'quality_rejected';
 if(!['','B','D','G','T'].includes(a[0])||(a[0]==='T'&&mm!==0))return 'measurement_excluded';
 return a[0]==='T'?'trace':'accepted';
}
function parse(raw,station,start,end){
 const [lo,hi]=interval(start,end);if(!Array.isArray(raw)||raw.length>(hi-lo)/day)throw Error('Unexpected daily response size');const seen=new Set(),rows=[];
 for(const r of raw){
  if(r.STATION!==station||typeof r.DATE!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(r.DATE))throw Error('Unexpected station or daily date');
  const t=Date.parse(r.DATE+'T00:00:00Z');if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==r.DATE||t<lo||t>=hi||seen.has(r.DATE))throw Error('Invalid or duplicate daily record');seen.add(r.DATE);
  const v=r.PRCP,s=v===undefined||v===null?'':String(v).trim();let mm=null;if(s&&!['-9999','-9999.0','M','NA','N/A'].includes(s.toUpperCase())){if(!/^\d+(?:\.\d+)?$/.test(s)||!Number.isFinite(Number(s))||Number(s)>3000)throw Error('Unexpected daily precipitation value');mm=Number(s)}
  const flags=typeof r.PRCP_ATTRIBUTES==='string'?r.PRCP_ATTRIBUTES:null;rows.push({date:r.DATE,precipitation_mm:mm,source_attributes:flags,status:dayStatus(mm,flags)})
 }
 return rows.sort((a,b)=>a.date.localeCompare(b.date))
}
function summarize(rows,start,end,normal){
 const [lo,hi]=interval(start,end);if(!Array.isArray(rows)||rows.length>(hi-lo)/day||!(normal===null||Number.isFinite(normal)&&normal>=0))throw Error('Invalid historical input');
 const byDate=new Map();for(const r of rows){const t=Date.parse(r.date+'T00:00:00Z');if(typeof r.date!=='string'||!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==r.date||t<lo||t>=hi||byDate.has(r.date)||!(r.precipitation_mm===null||Number.isFinite(r.precipitation_mm)&&r.precipitation_mm>=0&&r.precipitation_mm<=3000)||!(r.source_attributes===null||typeof r.source_attributes==='string')||r.status!==dayStatus(r.precipitation_mm,r.source_attributes))throw Error('Invalid stored daily record');byDate.set(r.date,r)}
 const years=[];for(let y=start;y<=end;y++){
 const months=[];for(let m=1;m<=12;m++){const n=new Date(Date.UTC(y,m,0)).getUTCDate(),counts={accepted:0,trace:0,missing:0,quality_rejected:0,measurement_excluded:0,flags_unavailable:0};let mm=0;
 for(let d=1;d<=n;d++){const key=y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0'),r=byDate.get(key),s=r?.status??'missing';counts[s]++;if(s==='accepted'||s==='trace')mm+=r.precipitation_mm}
 const valid=counts.accepted+counts.trace;months.push({month:m,expected_days:n,accepted_days:valid,counts,precipitation_in:valid===n?mm/25.4:null})}
 const expected=months.reduce((s,m)=>s+m.expected_days,0),accepted=months.reduce((s,m)=>s+m.accepted_days,0),total=accepted===expected?months.reduce((s,m)=>s+m.precipitation_in,0):null;
 years.push({year:y,expected_days:expected,accepted_days:accepted,complete_months:months.filter(m=>m.precipitation_in!==null).length,precipitation_in:total,departure_in:total===null||normal===null?null:total-normal,months})
 }
 const complete=years.filter(y=>y.precipitation_in!==null),extreme=(dir)=>{if(!complete.length)return null;const v=dir*Math.max(...complete.map(y=>dir*y.precipitation_in));return {precipitation_in:v,years:complete.filter(y=>Math.abs(y.precipitation_in-v)<1e-9).map(y=>y.year)}};
 return {status:!years.some(y=>y.accepted_days)?'no_data':complete.length===years.length?'historical':'partial_coverage',complete_years:complete.length,wettest:extreme(1),driest:extreme(-1),years}
}
async function analyze(climate,start,end,signal,progress=()=>{}){
 interval(start,end);if(!validID(climate?.station_id)||climate.baseline_start!==1991||climate.baseline_end!==2020)throw Error('Select a valid NOAA reference station first');
 let rows=[];for(let y=start;y<=end;y+=5){const z=Math.min(end,y+4);progress('Requesting NOAA daily precipitation '+y+'–'+z+'…');const p=new URLSearchParams({dataset,stations:climate.station_id,startDate:y+'-01-01',endDate:z+'-12-31',dataTypes:'PRCP',units:'metric',format:'json',includeAttributes:'true'});
 const r=await fetch(source+'?'+p,{signal,credentials:'omit'}),body=await r.text();if(!r.ok)throw Error(root.GRGClimate.requestError(r.status,body));if(body.length>4000000)throw Error('Daily response too large');rows.push(...parse(JSON.parse(body),climate.station_id,y,z));if(signal.aborted)throw Error('Canceled')}
 const normal=climate.annual_precipitation_in;return {...summarize(rows,start,end,normal),source_id:'noaa_ghcn_daily_prcp',source_url:source,documentation_url:doc,dataset,station_id:climate.station_id,station_name:climate.station_name,start_year:start,end_year:end,normal_precipitation_in:normal,normal_source_url:climate.source_url,baseline_start:1991,baseline_end:2020,retrieved_at:new Date().toISOString(),evidence_kind:'station_observation_summary',verification_status:'not_field_verified',method,limitations,daily_records:rows}
}
root.GRGHistory=Object.freeze({parse,summarize,dayStatus,interval,analyze});
})(globalThis);
