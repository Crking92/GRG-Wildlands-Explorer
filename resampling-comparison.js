/* Paired resampling diagnostics; identical requested grids and masks required. */
(function(root){
'use strict';
function compare(a,b){
 const x=a.summary,y=b.summary,g=x.grid,h=y.grid,n=g.width*g.height,acre=4046.8564224;
 if(x.requested_interpolation!=='RSP_NearestNeighbor'||y.requested_interpolation!=='RSP_BilinearInterpolation'||g.crs!==h.crs||g.width!==h.width||g.height!==h.height||g.bbox.some((v,i)=>v!==h.bbox[i])||x.requested_grid_m!==y.requested_grid_m||x.requested_context_buffer_projected_m!==y.requested_context_buffer_projected_m)throw Error('Comparison grids or request methods differ');
 if(x.status!==y.status||a.model.valid.length!==n||b.model.valid.length!==n||a.weights.length!==n||b.weights.length!==n||a.elevations.length!==n||b.elevations.length!==n||!a.mfd?.model||!b.mfd?.model)throw Error('Comparison inputs incomplete');
 let count=0,changed=0,sum=0,sq=0,max=0,site=0,d8=0,mfd=0;
 const bin=v=>root.GRGDrainage.classes.findIndex(c=>v/acre<c[1]);
 for(let i=0;i<n;i++){
 if(a.model.valid[i]!==b.model.valid[i])throw Error('Different valid-cell masks; paired comparison withheld');
 if(Math.abs(a.weights[i]-b.weights[i])>.00001)throw Error('Property weights differ');
 if(!a.model.valid[i])continue;
 const delta=b.elevations[i]-a.elevations[i];if(!Number.isFinite(delta))throw Error('Invalid paired elevation');
 count++;if(delta!==0)changed++;sum+=delta;sq+=delta*delta;max=Math.max(max,Math.abs(delta));const w=a.weights[i];site+=w;
 if(bin(a.model.acc[i])===bin(b.model.acc[i]))d8+=w;if(bin(a.mfd.model.acc[i])===bin(b.mfd.model.acc[i]))mfd+=w;
 }
 if(!count||!site)throw Error('No paired valid site elevations');
 if(Math.abs(site/acre-x.valid_area_acres)>Math.max(.00001,x.study_area_acres*1e-7))throw Error('Paired site coverage mismatch');
 const q=a.mfd.summary,r=b.mfd.summary;
 return {status:'compared',verification_status:'not_field_verified',evidence_kind:'modeled_terrain_interpretation',baseline_requested_interpolation:x.requested_interpolation,alternate_requested_interpolation:y.requested_interpolation,baseline_retrieved_at:x.retrieved_at,alternate_retrieved_at:y.retrieved_at,grid:{...g,bbox:[...g.bbox]},paired_valid_context_cells:count,changed_context_cells:changed,changed_context_percent:100*changed/count,mean_signed_difference_m:sum/count,rmse_difference_m:Math.sqrt(sq/count),maximum_absolute_difference_m:max,paired_valid_site_acres:site/acre,d8_same_class_percent:100*d8/site,mfd_same_class_percent:100*mfd/site,baseline_horizontal_equal_percent:q.horizontal_equal_neighbor_percent,baseline_vertical_equal_percent:q.vertical_equal_neighbor_percent,alternate_horizontal_equal_percent:r.horizontal_equal_neighbor_percent,alternate_vertical_equal_percent:r.vertical_equal_neighbor_percent,limitations:'Requested interpolation only; actual server processing and source mosaic lineage not verified. Identical output grid and valid mask required. Separate retrievals may differ for reasons besides interpolation. Differences are sensitivity measures, not errors against ground truth. Bilinear interpolation may smooth real terrain.'};
}
root.GRGResampling=Object.freeze({compare});
})(globalThis);
