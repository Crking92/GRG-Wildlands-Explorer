/* Raw DEM 3D visualization; no terrain or vegetation measurements inferred. */
(function terrain3dModule(root){
'use strict';
const R=6378137;
function mesh(r,geometry,project){
 const d=r?.summary,g=d?.grid,w=g?.width,h=g?.height,b=g?.bbox,t=d?.requested_grid_m,n=w*h,z=r?.elevations,valid=r?.model?.valid;
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<2||h<2||n>60000||!Array.isArray(b)||b.length!==4||!b.every(Number.isFinite)||!Number.isFinite(t)||t<=0||Math.abs(b[2]-b[0]-w*t)>.001||Math.abs(b[3]-b[1]-h*t)>.001||z?.length!==n||valid?.length!==n||r.weights?.length!==n)throw Error('Valid raw elevation grid required');
 const cx=(b[0]+b[2])/2,cy=(b[1]+b[3])/2,ground=1/Math.cosh(cy/R);
 let min=Infinity,max=-Infinity,pmin=Infinity,pmax=-Infinity,validCount=0;
 for(let i=0;i<n;i++){if(!valid[i])continue;if(!Number.isFinite(z[i])||z[i]<-500||z[i]>9000)throw Error('Invalid unmasked elevation');min=Math.min(min,z[i]);max=Math.max(max,z[i]);validCount++;if(r.weights[i]>0){pmin=Math.min(pmin,z[i]);pmax=Math.max(pmax,z[i])}}
 if(!validCount||!Number.isFinite(pmin))throw Error('No valid study elevation');
 const centerZ=(min+max)/2,unit=Math.max(w*t*ground,h*t*ground,max-min,1),positions=new Float32Array(n*3),colors=new Float32Array(n*3),indices=[];
 const low=[.16,.34,.23],high=[.84,.79,.54];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,j=i*3;positions[j]=(b[0]+(x+.5)*t-cx)*ground/unit;positions[j+1]=(b[3]-(y+.5)*t-cy)*ground/unit;positions[j+2]=valid[i]?(z[i]-centerZ)/unit:0;const f=valid[i]&&max>min?(z[i]-min)/(max-min):.5;for(let k=0;k<3;k++)colors[j+k]=low[k]+f*(high[k]-low[k]);if(x<w-1&&y<h-1){const a=i,c=i+w,e=i+w+1;if(valid[a]&&valid[a+1]&&valid[e])indices.push(a,a+1,e);if(valid[a]&&valid[e]&&valid[c])indices.push(a,e,c)}}
 if(!indices.length)throw Error('No valid adjacent terrain triangles');
 function sample(x,y){const gx=(x-b[0])/t-.5,gy=(b[3]-y)/t-.5;let ix=Math.floor(gx),iy=Math.floor(gy);if(ix===w-1&&Math.abs(gx-ix)<1e-8)ix--;if(iy===h-1&&Math.abs(gy-iy)<1e-8)iy--;if(ix<0||iy<0||ix>=w-1||iy>=h-1)return null;const u=gx-ix,v=gy-iy,a=iy*w+ix,e=a+w+1;if(!valid[a]||!valid[e])return null;if(u>=v){if(!valid[a+1])return null;return (1-u)*z[a]+(u-v)*z[a+1]+v*z[e]}if(!valid[a+w])return null;return (1-v)*z[a]+(v-u)*z[a+w]+u*z[e]}
 const polys=geometry?.type==='Polygon'?[geometry.coordinates]:geometry?.type==='MultiPolygon'?geometry.coordinates:null;if(!polys)throw Error('Study polygon required');
 const lines=[];let omitted=0,segments=0,xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
 function point(x,y,v){return [(x-cx)*ground/unit,(y-cy)*ground/unit,(v-centerZ)/unit]}
 for(const p of polys)for(const ring of p){const pts=ring.map(project);if(pts.length<4||pts.some(p=>!p?.every(Number.isFinite)))throw Error('Invalid projected boundary');for(const [x,y] of pts){xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y)}
 for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/(t*.25)));segments+=steps;if(segments>100000)throw Error('3D boundary too complex');for(let k=0;k<steps;k++){const f=k/steps,l=(k+1)/steps,x=a[0]+(b[0]-a[0])*f,y=a[1]+(b[1]-a[1])*f,X=a[0]+(b[0]-a[0])*l,Y=a[1]+(b[1]-a[1])*l,s=sample(x,y),e=sample(X,Y),m=sample((x+X)/2,(y+Y)/2);if(s===null||e===null||m===null){omitted++;continue}lines.push(...point(x,y,s),...point(X,Y,e))}}}
 const context={center:[0,0,0],radius:Math.max(.001,Math.hypot(w*t*ground,h*t*ground)/2/unit),relief:(max-min)/unit};
 const property={center:point((xmin+xmax)/2,(ymin+ymax)/2,(pmin+pmax)/2),radius:Math.max(.001,Math.hypot(xmax-xmin,ymax-ymin)*ground/2/unit),relief:(pmax-pmin)/unit};
 return {positions,colors,indices:new Uint16Array(indices),lines:new Float32Array(lines),min,max,validCount,omitted,segments,context,property,sample,groundStep:t*ground};
}
function renderer(canvas,m){
 const gl=canvas.getContext('webgl',{antialias:true,alpha:false});if(!gl)throw Error('WebGL is not available in this browser');
 let program=null;const buffers=[],shaders=[];
 function shader(type,src){const sh=gl.createShader(type);if(!sh)throw Error('Could not allocate shader');shaders.push(sh);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error('3D shader failed: '+gl.getShaderInfoLog(sh));return sh}
 function dispose(){for(const b of buffers)gl.deleteBuffer(b);for(const s of shaders)gl.deleteShader(s);if(program)gl.deleteProgram(program)}
 try{
 const vs=shader(gl.VERTEX_SHADER,'attribute vec3 aPosition; attribute vec3 aColor; uniform vec3 uCenter; uniform vec2 uYaw; uniform vec2 uPitch; uniform vec2 uFit; uniform float uExaggeration; uniform float uDepth; uniform float uBias; uniform bool uLine; varying vec3 vColor; void main(){vec3 p=aPosition-uCenter; p.z*=uExaggeration; float x=p.x*uYaw.x+p.y*uYaw.y; float y=-p.x*uYaw.y+p.y*uYaw.x; float sy=y*uPitch.x+p.z*uPitch.y; float depth=y*uPitch.y-p.z*uPitch.x; gl_Position=vec4(x*uFit.x,sy*uFit.y,depth/uDepth-uBias,1.0);vColor=uLine?vec3(1.0,0.83,0.36):aColor;}');
 const fs=shader(gl.FRAGMENT_SHADER,'precision mediump float; varying vec3 vColor; void main(){gl_FragColor=vec4(vColor,1.0);}');
 program=gl.createProgram();if(!program)throw Error('Could not allocate 3D program');gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('3D program failed: '+gl.getProgramInfoLog(program));gl.useProgram(program);
 function buffer(target,data){const b=gl.createBuffer();if(!b)throw Error('Could not allocate terrain buffer');buffers.push(b);gl.bindBuffer(target,b);gl.bufferData(target,data,gl.STATIC_DRAW);return b}
 const p=buffer(gl.ARRAY_BUFFER,m.positions),c=buffer(gl.ARRAY_BUFFER,m.colors),ix=buffer(gl.ELEMENT_ARRAY_BUFFER,m.indices),l=buffer(gl.ARRAY_BUFFER,m.lines);
 const a=gl.getAttribLocation(program,'aPosition'),color=gl.getAttribLocation(program,'aColor'),u=k=>gl.getUniformLocation(program,k),uniforms=Object.fromEntries(['uCenter','uYaw','uPitch','uFit','uExaggeration','uDepth','uBias','uLine'].map(k=>[k,u(k)]));
 const attr=(b,i)=>{gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,3,gl.FLOAT,false,0,0)};
 function draw(state){if(gl.isContextLost())throw Error('3D graphics context lost; reopen viewer');const width=Math.max(1,Math.min(2400,Math.round(canvas.clientWidth*Math.min(root.devicePixelRatio||1,2)))),height=Math.max(1,Math.min(1800,Math.round(canvas.clientHeight*Math.min(root.devicePixelRatio||1,2))));if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}gl.viewport(0,0,width,height);gl.clearColor(.065,.115,.09,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.useProgram(program);
 const f=state.focus==='property'?m.property:m.context,yaw=state.yaw*Math.PI/180,pitch=state.pitch*Math.PI/180,ex=state.exaggeration,scale=.87*state.zoom/Math.max(.001,Math.hypot(f.radius,f.relief*ex/2)),aspect=width/height;gl.uniform3fv(uniforms.uCenter,f.center);gl.uniform2f(uniforms.uYaw,Math.cos(yaw),Math.sin(yaw));gl.uniform2f(uniforms.uPitch,Math.sin(pitch),Math.cos(pitch));gl.uniform2f(uniforms.uFit,scale/Math.max(1,aspect),scale*Math.min(1,aspect));gl.uniform1f(uniforms.uExaggeration,ex);gl.uniform1f(uniforms.uDepth,4+4*ex);gl.uniform1f(uniforms.uBias,0);gl.uniform1i(uniforms.uLine,0);
 attr(p,a);attr(c,color);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ix);gl.drawElements(gl.TRIANGLES,m.indices.length,gl.UNSIGNED_SHORT,0);
 if(state.boundary&&m.lines.length){gl.uniform1i(uniforms.uLine,1);gl.uniform1f(uniforms.uBias,.00015);attr(l,a);gl.disableVertexAttribArray(color);gl.vertexAttrib3f(color,1,.83,.36);gl.lineWidth(2);gl.drawArrays(gl.LINES,0,m.lines.length/3)}
 }
 return {draw,dispose};
 }catch(e){dispose();throw e}
}
root.GRG3DTerrain=Object.freeze({mesh,renderer});
})(globalThis);
