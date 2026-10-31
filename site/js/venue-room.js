// Versioned public-room identity and bounds, shared by the browser and Node server.
// Homes and transport deliberately have no shared room in this protocol.
(function(root){
  'use strict';
  const sizes={cafe:[16,11],bar:[14,10],shop:[15,10],market:[18,12],pharmacy:[11,8],library:[16,11],museum:[18,12],theatre:[20,14],hotel:[14,10],bank:[14,9],office:[18,12],hospital:[14,10],university:[16,11],school:[16,11],worship:[16,12],police:[12,9]};
  const caps={cafe:40,bar:30,shop:25,market:50,pharmacy:15,library:40,museum:50,theatre:60,hotel:30,bank:20,office:30,hospital:25,university:40,school:40,worship:40,police:15};
  function key(kind,at,name){
    if(!Object.hasOwn(sizes,kind)||!at||!Number.isFinite(at.x)||!Number.isFinite(at.y)||Math.abs(at.x)>100000||Math.abs(at.y)>100000)return null;
    let h=2166136261;for(const c of String(name||'').normalize('NFC').trim().toLowerCase())h=Math.imul(h^c.charCodeAt(0),16777619);
    return `v1:${kind}:${Math.round(at.x*10)}:${Math.round(at.y*10)}:${(h>>>0).toString(16).padStart(8,'0')}`;
  }
  function bounds(id){
    if(typeof id!=='string'||id.length>80)return null;
    const m=/^v1:([a-z]+):(-?\d{1,7}):(-?\d{1,7}):([a-f0-9]{8})$/.exec(id);
    return m&&Object.hasOwn(sizes,m[1])&&Math.abs(+m[2])<=1000000&&Math.abs(+m[3])<=1000000?sizes[m[1]]:null;
  }
  function read(d){
    if(!d||!d.b)return null;const b=bounds(d.room);if(!b||![d.ix,d.iy,d.ihx,d.ihy].every(Number.isFinite))return null;
    if(d.ix<0||d.ix>b[0]||d.iy<0||d.iy>b[1]+1)return null;
    return {room:d.room,ix:d.ix,iy:d.iy,ihx:Math.max(-1,Math.min(1,d.ihx)),ihy:Math.max(-1,Math.min(1,d.ihy))};
  }
  function capacity(idOrKind){
    if(typeof idOrKind!=='string')return 0;
    const kind=idOrKind.startsWith('v1:')?idOrKind.split(':')[1]:idOrKind;
    return Object.hasOwn(caps,kind)?caps[kind]:0;
  }
  const api={key,bounds,read,capacity};if(typeof module==='object'&&module.exports)module.exports=api;else root.VenueRoom=api;
})(typeof globalThis!=='undefined'?globalThis:this);
