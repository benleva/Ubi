(function(){
const P=(lat,lng,z)=>{const s=256*Math.pow(2,z);const x=(lng+180)/360*s;const r=lat*Math.PI/180;const y=(1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*s;return [x,y];};
const U=(x,y,z)=>{const s=256*Math.pow(2,z);const lng=x/s*360-180;const n=Math.PI-2*Math.PI*y/s;return [180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))),lng];};
const ll=(a)=>Array.isArray(a)?a:[a.lat,a.lng];
function Layer(){this._h={};}
Layer.prototype.on=function(e,f){(this._h[e]=this._h[e]||[]).push(f);return this;};
Layer.prototype.addTo=function(m){m.addLayer(this);return this;};
Layer.prototype.bindPopup=function(){return this;};
function Map(el){Layer.call(this);this.el=el;el.style.position='relative';el.style.overflow='hidden';el.style.background='url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'420\' height=\'420\'><rect width=\'420\' height=\'420\' fill=\'%23eef1e4\'/><rect x=\'20\' y=\'20\' width=\'150\' height=\'110\' rx=\'6\' fill=\'%23e3e8d6\'/><rect x=\'250\' y=\'260\' width=\'150\' height=\'140\' rx=\'6\' fill=\'%23dfe8d2\'/><rect x=\'240\' y=\'40\' width=\'70\' height=\'50\' fill=\'%23ddd3c4\'/><rect x=\'40\' y=\'200\' width=\'60\' height=\'70\' fill=\'%23ddd3c4\'/><rect x=\'320\' y=\'140\' width=\'70\' height=\'45\' fill=\'%23ddd3c4\'/><rect x=\'150\' y=\'300\' width=\'50\' height=\'60\' fill=\'%23ddd3c4\'/><path d=\'M-10 330 L430 250\' stroke=\'white\' stroke-width=\'22\'/><path d=\'M-10 330 L430 250\' stroke=\'%23f6d38a\' stroke-width=\'4\'/><path d=\'M120 -10 L170 430\' stroke=\'white\' stroke-width=\'16\'/><path d=\'M-10 150 L430 175\' stroke=\'white\' stroke-width=\'10\'/><path d=\'M300 -10 L280 430\' stroke=\'white\' stroke-width=\'9\'/><path d=\'M355 205 Q 380 230 410 228\' stroke=\'%23a8d0e6\' stroke-width=\'10\' fill=\'none\'/></svg>") repeat #eef1e4';el.style.backgroundSize='420px 420px';
 this.layers=[];this.c=[0,0];this.z=5;this.svg=document.createElementNS('http://www.w3.org/2000/svg','svg');this.svg.setAttribute('style','position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2');el.appendChild(this.svg);
 el.addEventListener('click',(ev)=>{if(ev.target.closest('.mlm'))return;const r=el.getBoundingClientRect();const [w,h]=this.size();const c=P(this.c[0],this.c[1],this.z);const q=U(c[0]+ev.clientX-r.left-w/2,c[1]+ev.clientY-r.top-h/2,this.z);(this._h.click||[]).forEach(f=>f({latlng:{lat:q[0],lng:q[1]}}));});}
Map.prototype=Object.create(Layer.prototype);
Map.prototype.size=function(){return [this.el.clientWidth||360,this.el.clientHeight||300];};
Map.prototype.setView=function(c,z){this.c=ll(c);if(z!=null)this.z=z;this.render();setTimeout(()=>(this._h.moveend||[]).forEach(f=>f()),0);return this;};
Map.prototype.fitBounds=function(b,o={}){b=b.map(ll);const pad=(o.padding||[0,0])[0];const [w,h]=this.size();let z=o.maxZoom||18;
 for(;z>1;z--){const ps=b.map(p=>P(p[0],p[1],z));const xs=ps.map(p=>p[0]),ys=ps.map(p=>p[1]);if(Math.max(...xs)-Math.min(...xs)<=w-2*pad&&Math.max(...ys)-Math.min(...ys)<=h-2*pad)break;}
 const ps=b.map(p=>P(p[0],p[1],z));const cx=(Math.min(...ps.map(p=>p[0]))+Math.max(...ps.map(p=>p[0])))/2,cy=(Math.min(...ps.map(p=>p[1]))+Math.max(...ps.map(p=>p[1])))/2;
 return this.setView(U(cx,cy,z),z);};
Map.prototype.getZoom=function(){return this.z;};
Map.prototype.getCenter=function(){return {lat:this.c[0],lng:this.c[1]};};
Map.prototype.getBounds=function(){const [w,h]=this.size();const c=P(this.c[0],this.c[1],this.z);const sw=U(c[0]-w/2,c[1]+h/2,this.z),ne=U(c[0]+w/2,c[1]-h/2,this.z);
 const B={s:sw[0],w:sw[1],n:ne[0],e:ne[1]};const mk=(B)=>({getSouth:()=>B.s,getWest:()=>B.w,getNorth:()=>B.n,getEast:()=>B.e,pad:(k)=>{const dy=(B.n-B.s)*k,dx=(B.e-B.w)*k;return mk({s:B.s-dy,n:B.n+dy,w:B.w-dx,e:B.e+dx});}});return mk(B);};
Map.prototype.addLayer=function(l){if(!this.layers.includes(l))this.layers.push(l);l._map=this;this.render();return this;};
Map.prototype.removeLayer=function(l){this.layers=this.layers.filter(x=>x!==l);if(l._el)l._el.remove();this.render();};
Map.prototype.px=function(p){const [w,h]=this.size();const c=P(this.c[0],this.c[1],this.z);const q=P(p[0],p[1],this.z);return [q[0]-c[0]+w/2,q[1]-c[1]+h/2];};
Map.prototype.render=function(){this.svg.innerHTML='';const cc=P(this.c[0],this.c[1],this.z);this.el.style.backgroundPosition=`${-(cc[0]%420)}px ${-(cc[1]%420)}px`;const all=[];const walk=(l)=>{if(l.children)l.children.forEach(walk);else all.push(l);};this.layers.forEach(walk);
 [...this.el.querySelectorAll('.mlm')].forEach(e=>{if(!all.some(l=>l._el===e))e.remove();});all.forEach(l=>l.draw&&l.draw(this));};
function Marker(p,o){Layer.call(this);this.p=ll(p);this.o=o||{};}
Marker.prototype=Object.create(Layer.prototype);
Marker.prototype.setLatLng=function(p){this.p=ll(p);this._map&&this._map.render();return this;};
Marker.prototype.draw=function(m){if(!this._el){this._el=document.createElement('div');this._el.className='mlm';const ic=this.o.icon||{html:'<span style="display:block;width:20px;height:30px;background:#2a81cb;border-radius:50% 50% 0 0"></span>',iconSize:[20,30],iconAnchor:[10,30]};
 this._el.innerHTML=ic.html;this._el.style.cssText=`position:absolute;z-index:${3+(this.o.zIndexOffset?1:0)};width:${ic.iconSize[0]}px;height:${ic.iconSize[1]}px`;this._ia=ic.iconAnchor;
 if(this.o.title)this._el.title=this.o.title;this._el.onclick=()=>(this._h.click||[]).forEach(f=>f());m.el.appendChild(this._el);}
 const q=m.px(this.p);this._el.style.left=(q[0]-this._ia[0])+'px';this._el.style.top=(q[1]-this._ia[1])+'px';};
function CM(p,o){Marker.call(this,p,{icon:{html:`<span style="display:block;width:16px;height:16px;border-radius:50%;background:${(o||{}).color||'#1f3a5f'};border:3px solid #fff;box-shadow:0 0 0 2px ${(o||{}).color||'#1f3a5f'}"></span>`,iconSize:[16,16],iconAnchor:[8,8]}});}
CM.prototype=Object.create(Marker.prototype);
function Line(ps,o){Layer.call(this);this.ps=ps.map(ll);this.o=o||{};}
Line.prototype=Object.create(Layer.prototype);
Line.prototype.setLatLngs=function(ps){this.ps=ps.map(ll);this._map&&this._map.render();return this;};
Line.prototype.draw=function(m){const pl=document.createElementNS('http://www.w3.org/2000/svg','polyline');pl.setAttribute('points',this.ps.map(p=>m.px(p).join(',')).join(' '));
 pl.setAttribute('style',`fill:none;stroke:${this.o.color};stroke-width:${this.o.weight||3};stroke-dasharray:${this.o.dashArray||''};opacity:${this.o.opacity||1}`);m.svg.appendChild(pl);};
function Circ(p,o){Layer.call(this);this.p=ll(p);this.o=o||{};}
Circ.prototype=Object.create(Layer.prototype);
Circ.prototype.setLatLng=function(p){this.p=ll(p);this._map&&this._map.render();return this;};
Circ.prototype.setRadius=function(r){this.o.radius=r;this._map&&this._map.render();return this;};
Circ.prototype.getBounds=function(){const r=(this.o.radius||50)/111320;return [[this.p[0]-r,this.p[1]-r],[this.p[0]+r,this.p[1]+r]];};
Circ.prototype.draw=function(m){const q=m.px(this.p);const mpp=156543.03*Math.cos(this.p[0]*Math.PI/180)/Math.pow(2,m.z);const r=(this.o.radius||50)/mpp;
 const c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('cx',q[0]);c.setAttribute('cy',q[1]);c.setAttribute('r',r);
 c.setAttribute('style',`fill:${this.o.color||'#e8743b'};fill-opacity:${this.o.fillOpacity??0.12};stroke:${this.o.color||'#e8743b'};stroke-width:${this.o.weight||2};stroke-dasharray:${this.o.dashArray||''}`);m.svg.appendChild(c);};
function Group(){Layer.call(this);this.children=[];}
Group.prototype=Object.create(Layer.prototype);
Group.prototype.clearLayers=function(){this.children.forEach(c=>c._el&&c._el.remove());this.children.forEach(c=>c._el=null);this.children=[];this._map&&this._map.render();};
Group.prototype.addLayer=function(l){this.children.push(l);this._map&&this._map.render();};
Group.prototype.addLayers=function(ls){this.children.push(...ls);this._map&&this._map.render();};
const noop=()=>{const x=new Layer();x.draw=()=>{};return x;};
window.L={map:(el)=>new Map(el),tileLayer:noop,marker:(p,o)=>new Marker(p,o),circleMarker:(p,o)=>new CM(p,o),circle:(p,o)=>new Circ(p,o),polyline:(p,o)=>new Line(p,o),
 layerGroup:()=>new Group(),divIcon:(o)=>o,control:{}};
})();
