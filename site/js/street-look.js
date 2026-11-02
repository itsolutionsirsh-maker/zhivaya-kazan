// Кадры уличных случаев: человеку плохо, подходит человек без дома, парк.
const SICK_SHOTS=[
  {src:'img/scenes/sick-curb.jpg',title:'Человеку плохо',text:'Сел на бордюр у кремлёвской стены, рука на лбу. Рядом уже присели и дают воду. Крови нет, встать сам не может.'},
  {src:'img/scenes/sick-amb.jpg',title:'Ждут скорую',text:'Сидит под пледом, врачи в оранжевом рядом. Белая скорая с красным крестом, двери открыты. Дышит, но слабо.'},
  {src:'img/scenes/sick.gif',title:'Присел и поплыл',text:'Только что шёл и сел. Голова кружится. Прохожий держит за плечо, пока не подоспела помощь.'}
];
const ASK_M=[
  {src:'img/scenes/ask-man.jpg',title:'Подошёл поговорить',text:'Старец в вязаной шапке, стакан чая в руке. Просит спокойно, без крика: поесть или мелочь на дорогу. Держится прямо.'},
  {src:'img/scenes/ask.gif',title:'Подошёл сам',text:'Идёт вдоль дома и останавливается. Бумажный стакан, тихий голос. Не хватает, не торгуется.'}
];
const ASK_F=[
  {src:'img/scenes/ask-woman.jpg',title:'Подошла у двора',text:'Платок, сумка, осенний двор. Просит по-человечески, смотрит в глаза. Можно угостить, можно пройти.'}
];
const QUAD_SHOTS={
  cat:[
    {src:'img/scenes/quad-cat.jpg',title:'Квадробер · кот',text:'Худи с ушами и оранжевый хвост на резинке. Ползёт по дорожке парка. На скамейке смеются, это костюм, не зверь.'},
    {src:'img/scenes/quad.gif',title:'Кот по тропе',text:'Прополз пару шагов и сел. Хвост тканевый, уши на капюшоне. Парк, день, никого не царапает.'}
  ],
  fox:[
    {src:'img/scenes/quad-fox.jpg',title:'Квадробер · лис',text:'Уши и рыжий хвост, сидит в траве у дорожки. Берёзы, фонарь. Паспорт, говорит, в хвосте. Хвост на резинке.'}
  ],
  dog:[
    {src:'img/scenes/quad-dog.jpg',title:'Квадробер · пёс',text:'Сел у скамейки в ушах и коротком хвосте. Настоящий пёс рядом делает вид, что они не знакомы.'}
  ]
};
const DOG_SHOTS=[
  {src:'img/scenes/park-dogs.jpg',title:'Собаки в парке',text:'Рыжий и светлый идут по листве. Хвосты вверх, людей не боятся. Можно погладить, если подойти ближе.'},
  {src:'img/scenes/dogs.gif',title:'Двое по тропе',text:'Бегут по осенней дорожке, нюхают листья и виляют. Это парковые, не потеряшка с объявления.'}
];
function streetPick(list){return list[Math.floor(Math.random()*list.length)];}
function streetLookNow(){if(typeof player==='undefined'||scene!=='city'||player.inside)return null;
  const sick=typeof sitActive==='function'?sitActive('sick'):null;
  if(sick&&sick.w&&dist(sick.w.x,sick.w.y,player.x,player.y)<14){if(!sick.shot)sick.shot=streetPick(SICK_SHOTS);const who=sick.w.p?` ${sick.w.p.name}, ${sick.w.p.age}.`:'';return {src:sick.shot.src,title:sick.shot.title,text:sick.shot.text+who};}
  const fa=typeof sitActive==='function'?sitActive('folkAct'):null;
  if(fa&&fa.f&&fa.f.type==='homeless'&&fa.w&&dist(fa.w.x,fa.w.y,player.x,player.y)<8){if(!fa.shot)fa.shot=streetPick(fa.f.female?ASK_F:ASK_M);const nm=fa.w.p?fa.w.p.name:'';return {src:fa.shot.src,title:fa.shot.title+(nm?' · '+nm:''),text:fa.shot.text};}
  if(typeof parkNear!=='function')return null;const n=parkNear(7);if(!n)return null;
  if(n.kind==='dog'){if(!n.o.shot)n.o.shot=streetPick(DOG_SHOTS);return {src:n.o.shot.src,title:n.o.shot.title+' · '+n.o.name,text:n.o.shot.text};}
  if(!n.o.shot){const pool=QUAD_SHOTS[n.o.talk]||QUAD_SHOTS.cat;n.o.shot=streetPick(pool);}return n.o.shot;}
