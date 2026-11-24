/* Local union of conditioned upstream cells reaching a selected depression group. */
(function(root){
'use strict';
const acre=4046.8564224;
function analyze(r,id){
 const g=r.groups?.summary.groups.find(x=>x.group_number===id),labels=r.groups?.labels,m=r.conditioned?.model,d=r.summary,{width:w,height:h}=d.grid,n=w*h;
 if(!g||!labels||!m||d.status!=='estimated'||r.model.validCount!==n||labels.length!==n||m.down.length!==n||r.weights.length!==n||r.model.cellArea.length!==h||n>60000)throw Error('Complete conditioned depression grid required');
 const mask=new Uint8Array(n),queue=new Int32Array(n);let tail=0,groupCells=0;
 for(let i=0;i<n;i++)if(labels[i]===id){mask[i]=1;queue[tail++]=i;groupCells++}
 if(groupCells!==g.context_cells)throw Error('Group cell count mismatch');
 // Reverse-traverse eight adjacent receivers, seed all group cells; visit each cell once.
 for(let head=0;head<tail;head++){const i=queue[head],y=Math.floor(i/w),x=i%w;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dy&&!dx)continue;const yy=y+dy,xx=x+dx;if(yy<0||yy>=h||xx<0||xx>=w)continue;const j=yy*w+xx;if(!mask[j]&&m.down[j]===i){mask[j]=2;queue[tail++]=j}}}
 let total=0,site=0,groupArea=0,groupSite=0,edgeCells=0,upCells=0;
 for(let k=0;k<tail;k++){const i=queue[k],y=Math.floor(i/w),x=i%w,a=r.model.cellArea[y],s=r.weights[i];if(!Number.isFinite(a)||a<=0||!Number.isFinite(s)||s<0||s>a+Math.max(.001,a*1e-7))throw Error('Invalid upstream area weight');total+=a;site+=s;if(mask[i]===1){groupArea+=a;groupSite+=s}else upCells++;if(y===0||x===0||y===h-1||x===w-1)edgeCells++}
 const close=(a,b)=>Math.abs(a-b)<=Math.max(.001,Math.abs(b)*1e-7);
 if(!close(groupArea/acre,g.context_area_acres)||!close(groupSite/acre,g.site_area_acres)||total/acre>d.context_valid_area_acres+.00001||site/acre>d.valid_area_acres+.00001)throw Error('Upstream area inconsistent');
 const outside=total-site,upstream=total-groupArea,upSite=site-groupSite;
 if(outside<-.001||upstream<-.001||upSite<-.001||upSite>upstream+.001)throw Error('Invalid upstream partition');
 return {mask,summary:{status:'estimated',group_id:g.id,group_number:id,evidence_kind:'modeled_terrain_interpretation',verification_status:'not_field_verified',method:'Reverse traversal of conditioned single-receiver graph from all selected positive-fill cells; union includes group footprint; area-weighted property intersections.',limitations:'Local modeled catchment only, not a complete watershed or runoff volume. Edge contact indicates potentially truncated contributions; absence of edge contact does not verify completeness. Depressions assumed able to fill and spill; no culverts, storm drains, rainfall or infiltration. Groups can have overlapping upstream areas; do not sum catchment totals. Raster and routing uncertainty remain.',context_cells:tail,upstream_only_cells:upCells,edge_contact_cells:edgeCells,edge_contact:edgeCells>0,local_area_acres:total/acre,site_area_acres:site/acre,outside_site_area_acres:Math.max(0,outside)/acre,site_share_percent:100*site/total,outside_share_percent:100*Math.max(0,outside)/total,group_area_acres:groupArea/acre,group_site_area_acres:groupSite/acre,upstream_only_area_acres:Math.max(0,upstream)/acre,upstream_only_site_area_acres:Math.max(0,upSite)/acre,upstream_only_outside_site_area_acres:Math.max(0,upstream-upSite)/acre}};
}
root.GRGLocalCatchment=Object.freeze({analyze});
})(globalThis);
