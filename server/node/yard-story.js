'use strict';
const D=require('../../site/js/yard-story-data');
const SWITCH_MS=30*60e3;
const fresh=t=>({version:1,stage:'promise',startedAt:t,updatedAt:t,choices:{},bonds:{timur:0,leysan:0,artur:0,ruslan:0},log:[{step:'invite',choice:'accept',at:t}],visits:{}});
function near(place,pose,meta,loc){const p=D.places[place],q=D.point(place,meta);return !!(p&&q&&loc&&loc.id===p.district&&pose&&Math.hypot(pose.x-q.x,pose.y-q.y)<=120);}
// Mutates only the server-owned territory snapshot; caller commits it with revision/request guards.
function apply(state,body,pose,meta,loc,t){
  const s=state.story;
  if(body.step==='invite'){
    if(s)return 'story_stage';if(body.choice!=='accept')return 'choice';if(state.active)return 'active';
    state.story=fresh(t);return null;
  }
  if(!s)return 'story_stage';
  if(body.step==='reunion'){
    const r=D.reunion(s);if(!r||s.reunion)return 'story_stage';
    if(state.active)return 'active';
    if(!near(r.place,pose,meta,loc))return 'story_place';
    if(!r.choices.some(c=>c.id===body.choice))return 'choice';
    s.reunion={choice:body.choice,at:t};s.updatedAt=t;return null;
  }
  if(body.step==='visit'){
    if(s.stage!=='done'||!Object.hasOwn(D.people,body.person))return 'story_stage';
    if(!near(D.people[body.person].place,pose,meta,loc))return 'story_place';
    // One recorded return per person. Later conversations are free and don't manufacture progress.
    if(s.visits[body.person])return 'story_visited';
    s.visits[body.person]=t;s.updatedAt=t;return null;
  }
  if(body.step!==s.stage||s.stage==='done')return 'story_stage';
  if(state.active)return 'active';
  const page=D.step(s),choice=page.choices.find(c=>c.id===body.choice);
  if(!choice)return 'choice';if(!near(page.place,pose,meta,loc))return 'story_place';
  if(s.stage==='finale'){
    if(body.choice==='join'){
      const faction=D.endings[s.ending].district;
      if(state.member&&state.member!==faction)return 'story_membership';
      if(!state.member&&t<state.switchAt)return 'switch_cooldown';
      if(!state.member){state.member=faction;state.standing=0;state.switchAt=t+SWITCH_MS;}
    }else if(body.choice==='independent'&&state.member){
      state.member=null;state.standing=0;state.switchAt=Math.max(state.switchAt,t+SWITCH_MS);
    }
    s.completedAt=t;s.membershipChoice=body.choice;
  }
  if(s.stage==='call')s.ending=body.choice;
  for(const [id,n] of Object.entries(choice.delta))s.bonds[id]=Math.max(-3,Math.min(8,s.bonds[id]+n));
  s.choices[s.stage]=body.choice;s.log.push({step:s.stage,choice:body.choice,at:t});
  s.stage=choice.next;s.updatedAt=t;return null;
}
module.exports={apply,near};
