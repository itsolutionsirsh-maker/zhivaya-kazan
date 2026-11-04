// Федеральные автосалоны. Уже стоящие на карте получают свой зал и свои машины.
// Марок, которых в данных нет, — три точки на реальных дилерских улицах.
const DEAL_STILL={mass:'img/dealers/mass.jpg',prem:'img/dealers/prem.jpg',asia:'img/dealers/asia.jpg',china:'img/dealers/china.jpg'};
const DEAL_LOOK={
  lada:'mass',uaz:'mass',gaz:'mass',moskvich:'mass',xcite:'mass',ford:'mass',renault:'mass',subaru:'mass',daewoo:'mass',multi:'mass',used:'mass',
  bmw:'prem',mb:'prem',audi:'prem',lexus:'prem',vw:'prem',skoda:'prem',porsche:'prem',voyah:'prem',
  toyota:'asia',hyundai:'asia',kia:'asia',solaris:'asia',mitsubishi:'asia',
  haval:'china',chery:'china',geely:'china',belgee:'china',exeed:'china',omoda:'china',jaecoo:'china',changan:'china',tank:'china',jetour:'china',kaiyi:'china',gac:'china'
};
const DEAL_TITLE={
  lada:'Lada',uaz:'УАЗ',gaz:'ГАЗ',moskvich:'Москвич',xcite:'Xcite',ford:'Ford',renault:'Renault',subaru:'Subaru',daewoo:'Daewoo',
  multi:'Мультибренд',used:'Автомир',bmw:'BMW',mb:'Mercedes-Benz',audi:'Audi',lexus:'Lexus',vw:'Volkswagen',skoda:'Škoda',porsche:'Porsche',voyah:'Voyah',
  toyota:'Toyota',hyundai:'Hyundai',kia:'Kia',solaris:'Solaris',mitsubishi:'Mitsubishi',
  haval:'Haval',chery:'Chery',geely:'Geely',belgee:'Belgee',exeed:'Exeed',omoda:'Omoda',jaecoo:'Jaecoo',changan:'Changan',tank:'Tank',jetour:'Jetour',kaiyi:'Kaiyi',gac:'GAC'
};
const DEAL_PINS=[
  {n:'Skoda',ll:[55.8221,49.0912],note:'Декабристов, ряд дилеров. Škoda: Rapid, Octavia, Karoq и Kodiaq.'},
  {n:'Omoda',ll:[55.83595,49.14325],note:'Чуйкова, китайский ряд. Omoda: C5, S5 и C7.'},
  {n:'ГАЗ автосалон',ll:[55.83915,49.19855],note:'Сибирский тракт. ГАЗ: Газель Next, Соболь и Газель NN.'}
];
const dealerImg={};
let dealerPending=null;
function dealerNorm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[«»"'’]/g,' ').replace(/\s+/g,' ').trim();}
function dealerSkip(n){
  if(!n)return true;
  if(/дета|detal|dетал|запчаст|zap/.test(n))return true;
  if(/шиномонтаж|мойк|грузов/.test(n))return true;
  if(/сервисн/.test(n))return true;
  if(/сервис/.test(n)&&!/центр/.test(n)&&!/транстех/.test(n))return true;
  if(/audiowave|аудиомастер|аудит|automoda/.test(n))return true;
  if(/газпром|горгаз|маркетгаз|согаз|газ быт|твой газ|свой газ|газел/.test(n))return true;
  if(/услада|эль-влада|эль влада/.test(n))return true;
  if(/хенд/.test(n)&&!/hyundai|хендай|хендэ/.test(n))return true;
  if(/аптека|склад/.test(n))return true;
  if(/вояж/.test(n)&&!/voyah/.test(n))return true;
  return false;
}
const DEAL_RE=[
  ['bmw',/(^|[^a-z])bmw([^a-z]|$)|(^|[^а-я])бмв([^а-я]|$)/],
  ['mb',/mercedes|мерседес|(^|[^a-z])amg([^a-z]|$)/],
  ['audi',/(^|[^a-z])audi([^a-z]|$)|(^|[^а-я])ауди([^а-я]|$)/],
  ['lexus',/(^|[^a-z])lexus([^a-z]|$)|лексус/],
  ['porsche',/(^|[^a-z])porsche([^a-z]|$)|порше/],
  ['vw',/volkswagen|фольксваген|(^|[^a-z])vw([^a-z]|$)/],
  ['skoda',/(^|[^a-z])skoda([^a-z]|$)|шкода/],
  ['toyota',/(^|[^a-z])toyota([^a-z]|$)|тойот/],
  ['hyundai',/(^|[^a-z])hyundai([^a-z]|$)|хендай|хендэ/],
  ['kia',/(^|[^a-z])kia([^a-z]|$)|(^|[^а-я])киа([^а-я]|$)/],
  ['mitsubishi',/mitsubishi|мицубиси|митсубиси/],
  ['solaris',/(^|[^a-z])solaris([^a-z]|$)|солярис|соларис/],
  ['haval',/(^|[^a-z])haval([^a-z]|$)|хавал|хавейл/],
  ['chery',/(^|[^a-z])chery([^a-z]|$)|(^|[^а-я])чери([^а-я]|$)/],
  ['geely',/(^|[^a-z])geely([^a-z]|$)|джили/],
  ['belgee',/(^|[^a-z])belgee([^a-z]|$)|белджи/],
  ['exeed',/(^|[^a-z])exeed([^a-z]|$)|эксид/],
  ['omoda',/(^|[^a-z])omoda([^a-z]|$)|(^|[^а-я])омода([^а-я]|$)/],
  ['jaecoo',/(^|[^a-z])jaecoo([^a-z]|$)|джаку|джеку/],
  ['changan',/(^|[^a-z])changan([^a-z]|$)|чанган/],
  ['tank',/(^|[^a-z])tank([^a-z]|$)|(^|[^а-я])танк([^а-я]|$)/],
  ['jetour',/(^|[^a-z])jetour([^a-z]|$)|джетур/],
  ['kaiyi',/(^|[^a-z])kaiyi([^a-z]|$)|кайи/],
  ['gac',/(^|[^a-z])gac([^a-z]|$)/],
  ['voyah',/(^|[^a-z])voyah([^a-z]|$)/],
  ['xcite',/(^|[^a-z])xcite([^a-z]|$)|иксайт/],
  ['subaru',/(^|[^a-z])subaru([^a-z]|$)|субару/],
  ['ford',/(^|[^a-z])ford([^a-z]|$)|(^|[^а-я])форд([^а-я]|$)/],
  ['renault',/(^|[^a-z])renault([^a-z]|$)|(^|[^а-я])рено([^а-я]|$)/],
  ['daewoo',/(^|[^a-z])daewoo([^a-z]|$)|дэу|даеву/],
  ['lada',/(^|[^a-z])lada([^a-z]|$)|(^|[^а-я])лада([^а-я]|$)|(^|[^а-я])ваз([^а-я]|$)/],
  ['uaz',/(^|[^a-z])uaz([^a-z]|$)|(^|[^а-я])уаз([^а-я]|$)/],
  ['moskvich',/москвич|moskvich/]
];
function dealerOf(name){
  const n=dealerNorm(name);if(!n||dealerSkip(n))return null;
  const hits=[];
  for(const pair of DEAL_RE)if(pair[1].test(n))hits.push(pair[0]);
  if(/газ автосалон/.test(n)&&hits.indexOf('gaz')<0)hits.push('gaz');
  if(hits.length>1)return 'multi';
  if(hits.length===1)return hits[0];
  if(/автомир/.test(n))return 'used';
  if(/транстех|(^|[^а-яa-z])ттс([^а-яa-z]|$)|кан авто|канавто/.test(n))return 'multi';
  return null;
}
function dcar(brand,id,title,short,price,color,len,wid,keys,def){
  return {id,title,short,price,color,len,wid,keys,def:!!def,kind:'car',brand,model:title};
}
const DEAL_CARS={
  lada:[
    dcar('lada','granta','Lada Granta','Granta',22000,'#C62828',4.6,1.85,['гранта','granta'],true),
    dcar('lada','vesta','Lada Vesta','Vesta',34000,'#1A1A1A',4.6,1.85,['веста','vesta']),
    dcar('lada','niva','Niva Travel','Niva Travel',38000,'#2E7D32',4.4,1.95,['нива','niva']),
    dcar('lada','largus','Lada Largus','Largus',36000,'#1565C0',5.1,2.0,['ларгус','largus'])
  ],
  uaz:[
    dcar('uaz','patriot','UAZ Patriot','Patriot',42000,'#1B5E20',4.8,2.05,['патриот','patriot'],true),
    dcar('uaz','pickup','UAZ Pickup','Pickup',44000,'#37474F',5.2,2.05,['пикап','pickup']),
    dcar('uaz','hunter','UAZ Hunter','Hunter',32000,'#4E342E',4.2,1.9,['хантер','hunter']),
    dcar('uaz','profi','UAZ Profi','Profi',40000,'#455A64',5.4,2.1,['профи','profi'])
  ],
  gaz:[
    dcar('gaz','next','ГАЗель Next','Газель Next',48000,'#F5F5F5',5.6,2.1,['next','некст','газель next'],true),
    dcar('gaz','sobol','Соболь','Соболь',42000,'#1565C0',5.0,2.0,['соболь']),
    dcar('gaz','nn','ГАЗель NN','Газель NN',52000,'#212121',5.6,2.1,['газель nn','газель нн']),
    dcar('gaz','s4','Соболь 4x4','Соболь 4x4',46000,'#2E7D32',4.8,2.0,['соболь 4','4x4'])
  ],
  moskvich:[
    dcar('moskvich','m3','Москвич 3','Москвич 3',52000,'#C62828',4.4,1.9,['москвич 3'],true),
    dcar('moskvich','m3e','Москвич 3е','Москвич 3е',64000,'#1565C0',4.4,1.9,['москвич 3е','москвич 3e']),
    dcar('moskvich','m6','Москвич 6','Москвич 6',68000,'#37474F',4.8,1.95,['москвич 6']),
    dcar('moskvich','m8','Москвич 8','Москвич 8',86000,'#1A1A1A',4.9,2.0,['москвич 8'])
  ],
  xcite:[
    dcar('xcite','x7','Xcite X-Cross 7','X-Cross 7',46000,'#1565C0',4.5,1.9,['x-cross 7','кросс 7'],true),
    dcar('xcite','x7p','Xcite X-Cross 7 Pro','X-Cross 7 Pro',52000,'#1A1A1A',4.5,1.9,['x-cross 7 pro','кросс 7 pro']),
    dcar('xcite','x8','Xcite X-Cross 8','X-Cross 8',62000,'#37474F',4.8,1.95,['x-cross 8','кросс 8']),
    dcar('xcite','x8p','Xcite X-Cross 8 Pro','X-Cross 8 Pro',70000,'#212121',4.8,1.95,['x-cross 8 pro','кросс 8 pro'])
  ],
  kia:[
    dcar('kia','rio','Kia Rio','Rio',48000,'#C62828',4.4,1.8,['рио','rio'],true),
    dcar('kia','cerato','Kia Cerato','Cerato',56000,'#1A1A1A',4.6,1.85,['церато','cerato']),
    dcar('kia','seltos','Kia Seltos','Seltos',64000,'#2E7D32',4.4,1.85,['селтос','seltos']),
    dcar('kia','sportage','Kia Sportage','Sportage',70000,'#37474F',4.5,1.9,['спортейдж','sportage'])
  ],
  hyundai:[
    dcar('hyundai','elantra','Hyundai Elantra','Elantra',54000,'#1565C0',4.6,1.85,['элантра','elantra'],true),
    dcar('hyundai','creta','Hyundai Creta','Creta',62000,'#E8E8E8',4.3,1.85,['крета','creta']),
    dcar('hyundai','tucson','Hyundai Tucson','Tucson',72000,'#1A1A1A',4.5,1.9,['туссан','tucson','туксон']),
    dcar('hyundai','santa','Hyundai Santa Fe','Santa Fe',98000,'#37474F',4.8,1.95,['санта','santa'])
  ],
  solaris:[
    dcar('solaris','hs','Solaris HS','Solaris HS',46000,'#C62828',4.4,1.8,['solaris hs','солярис hs'],true),
    dcar('solaris','hc','Solaris HC','Solaris HC',58000,'#1A1A1A',4.3,1.85,['solaris hc','солярис hc']),
    dcar('solaris','krs','Solaris KRS','Solaris KRS',54000,'#1565C0',4.4,1.85,['krs','солярис krs']),
    dcar('solaris','krx','Solaris KRX','Solaris KRX',64000,'#2E7D32',4.5,1.9,['krx','солярис krx'])
  ],
  toyota:[
    dcar('toyota','corolla','Toyota Corolla','Corolla',78000,'#B71C1C',4.6,1.8,['королла','corolla'],true),
    dcar('toyota','camry','Toyota Camry','Camry',95000,'#1A1A1A',4.9,1.85,['камри','camry']),
    dcar('toyota','rav4','Toyota RAV4','RAV4',98000,'#E8E8E8',4.6,1.9,['рав4','rav4','рав 4']),
    dcar('toyota','prado','Toyota Land Cruiser Prado','Prado',180000,'#1B5E20',4.9,2.0,['прадо','prado'])
  ],
  vw:[
    dcar('vw','polo','Volkswagen Polo','Polo',52000,'#1565C0',4.5,1.8,['поло','polo'],true),
    dcar('vw','taos','Volkswagen Taos','Taos',76000,'#E8E8E8',4.5,1.85,['таос','taos']),
    dcar('vw','tiguan','Volkswagen Tiguan','Tiguan',88000,'#1A1A1A',4.5,1.9,['тигуан','tiguan']),
    dcar('vw','tera','Volkswagen Teramont','Teramont',140000,'#37474F',5.1,2.0,['терамонт','teramont'])
  ],
  skoda:[
    dcar('skoda','rapid','Škoda Rapid','Rapid',48000,'#C62828',4.5,1.8,['рапид','rapid'],true),
    dcar('skoda','octavia','Škoda Octavia','Octavia',64000,'#1A1A1A',4.7,1.85,['октавия','octavia']),
    dcar('skoda','karoq','Škoda Karoq','Karoq',78000,'#2E7D32',4.4,1.85,['карок','karoq']),
    dcar('skoda','kodiaq','Škoda Kodiaq','Kodiaq',98000,'#37474F',4.7,1.9,['кодиак','kodiaq'])
  ],
  bmw:[
    dcar('bmw','s3','BMW 3 серии','BMW 3',120000,'#1A1A1A',4.7,1.85,['бмв 3','3 серия','трешка'],true),
    dcar('bmw','s5','BMW 5 серии','BMW 5',160000,'#212121',5.0,1.9,['бмв 5','5 серия']),
    dcar('bmw','x3','BMW X3','BMW X3',150000,'#90A4AE',4.7,1.95,['бмв х3','бмв x3','икс 3']),
    dcar('bmw','x5','BMW X5','BMW X5',180000,'#263238',4.9,2.0,['бмв х5','бмв x5','икс 5'])
  ],
  mb:[
    dcar('mb','c','Mercedes C-класс','C-класс',130000,'#1A1A1A',4.7,1.85,['c-класс','ц-класс','цешка'],true),
    dcar('mb','e','Mercedes E-класс','E-класс',170000,'#212121',4.9,1.9,['e-класс','е-класс']),
    dcar('mb','glc','Mercedes GLC','GLC',160000,'#E8E8E8',4.7,1.95,['glc','глц']),
    dcar('mb','gle','Mercedes GLE','GLE',190000,'#263238',4.9,2.0,['gle','гле'])
  ],
  audi:[
    dcar('audi','a4','Audi A4','A4',110000,'#37474F',4.7,1.85,['ауди а4','audi a4'],true),
    dcar('audi','a6','Audi A6','A6',140000,'#1A1A1A',4.9,1.9,['ауди а6','audi a6']),
    dcar('audi','q5','Audi Q5','Q5',150000,'#E8E8E8',4.7,1.95,['ауди q5','audi q5']),
    dcar('audi','q7','Audi Q7','Q7',190000,'#212121',5.1,2.0,['ауди q7','audi q7'])
  ],
  lexus:[
    dcar('lexus','es','Lexus ES','ES',120000,'#E8E8E8',4.9,1.85,['лексус es','lexus es'],true),
    dcar('lexus','nx','Lexus NX','NX',140000,'#1A1A1A',4.6,1.9,['лексус nx','lexus nx']),
    dcar('lexus','rx','Lexus RX','RX',170000,'#37474F',4.9,1.95,['лексус rx','lexus rx']),
    dcar('lexus','gx','Lexus GX','GX',210000,'#1B5E20',4.9,2.0,['лексус gx','lexus gx'])
  ],
  porsche:[
    dcar('porsche','macan','Porsche Macan','Macan',220000,'#E8E8E8',4.7,1.95,['макан','macan'],true),
    dcar('porsche','cayenne','Porsche Cayenne','Cayenne',280000,'#1A1A1A',4.9,2.0,['кайен','cayenne']),
    dcar('porsche','pana','Porsche Panamera','Panamera',260000,'#212121',5.0,1.95,['панамера','panamera']),
    dcar('porsche','911','Porsche 911','911',320000,'#C62828',4.5,1.85,['911','порше 911'])
  ],
  haval:[
    dcar('haval','jolion','Haval Jolion','Jolion',48000,'#1565C0',4.5,1.9,['джолион','jolion'],true),
    dcar('haval','m6','Haval M6','M6',56000,'#E8E8E8',4.7,1.9,['haval m6','хавал м6','хавал m6']),
    dcar('haval','dargo','Haval Dargo','Dargo',72000,'#1A1A1A',4.6,1.95,['дарго','dargo']),
    dcar('haval','h9','Haval H9','H9',98000,'#1B5E20',5.0,2.0,['haval h9','хавал н9','хавал h9'])
  ],
  chery:[
    dcar('chery','t4','Chery Tiggo 4','Tiggo 4',42000,'#E8E8E8',4.3,1.85,['tiggo 4','тигго 4'],true),
    dcar('chery','t7','Chery Tiggo 7 Pro','Tiggo 7 Pro',56000,'#1A1A1A',4.5,1.9,['tiggo 7','тигго 7']),
    dcar('chery','t8','Chery Tiggo 8 Pro','Tiggo 8 Pro',72000,'#37474F',4.7,1.95,['tiggo 8','тигго 8']),
    dcar('chery','arrizo','Chery Arrizo 8','Arrizo 8',64000,'#1565C0',4.7,1.85,['арризо','arrizo'])
  ],
  geely:[
    dcar('geely','cool','Geely Coolray','Coolray',46000,'#1565C0',4.3,1.85,['кулрей','coolray'],true),
    dcar('geely','emg','Geely Emgrand','Emgrand',38000,'#E8E8E8',4.6,1.8,['эмгранд','emgrand']),
    dcar('geely','atlas','Geely Atlas','Atlas',68000,'#1A1A1A',4.6,1.9,['атлас','atlas']),
    dcar('geely','mon','Geely Monjaro','Monjaro',86000,'#37474F',4.8,1.95,['монджаро','monjaro'])
  ],
  belgee:[
    dcar('belgee','x50','Belgee X50','X50',42000,'#1565C0',4.3,1.85,['belgee x50','белджи x50','икс 50'],true),
    dcar('belgee','x50p','Belgee X50 Prestige','X50 Prestige',48000,'#1A1A1A',4.3,1.85,['x50 prestige','икс 50 prestige']),
    dcar('belgee','x70','Belgee X70','X70',56000,'#E8E8E8',4.5,1.9,['belgee x70','белджи x70']),
    dcar('belgee','x70f','Belgee X70 Flagship','X70 Flagship',64000,'#37474F',4.5,1.9,['x70 flagship'])
  ],
  exeed:[
    dcar('exeed','lx','Exeed LX','LX',64000,'#E8E8E8',4.5,1.9,['exeed lx','эксид lx'],true),
    dcar('exeed','txl','Exeed TXL','TXL',82000,'#1A1A1A',4.8,1.95,['txl','тхл']),
    dcar('exeed','rx','Exeed RX','RX',98000,'#37474F',4.8,1.95,['exeed rx','эксид rx']),
    dcar('exeed','vx','Exeed VX','VX',110000,'#212121',5.0,2.0,['exeed vx','эксид vx'])
  ],
  omoda:[
    dcar('omoda','c5','Omoda C5','C5',52000,'#E8E8E8',4.4,1.9,['omoda c5','омода c5','омода с5'],true),
    dcar('omoda','s5','Omoda S5','S5',48000,'#1565C0',4.6,1.85,['omoda s5','омода s5']),
    dcar('omoda','c7','Omoda C7','C7',74000,'#1A1A1A',4.7,1.95,['omoda c7','омода c7']),
    dcar('omoda','s5g','Omoda S5 GT','S5 GT',56000,'#C62828',4.6,1.85,['s5 gt'])
  ],
  jaecoo:[
    dcar('jaecoo','j7','Jaecoo J7','J7',64000,'#1A1A1A',4.5,1.9,['jaecoo j7','джаку j7','джеку j7'],true),
    dcar('jaecoo','j7u','Jaecoo J7 Ultimate','J7 Ultimate',70000,'#37474F',4.5,1.9,['j7 ultimate']),
    dcar('jaecoo','j6','Jaecoo J6','J6',72000,'#2E7D32',4.4,1.95,['jaecoo j6']),
    dcar('jaecoo','j8','Jaecoo J8','J8',86000,'#E8E8E8',4.8,1.95,['jaecoo j8'])
  ],
  changan:[
    dcar('changan','cs35','Changan CS35 Plus','CS35 Plus',44000,'#1565C0',4.2,1.85,['cs35','цс35'],true),
    dcar('changan','cs55','Changan CS55 Plus','CS55 Plus',56000,'#E8E8E8',4.5,1.9,['cs55','цс55']),
    dcar('changan','univ','Changan UNI-V','UNI-V',62000,'#1A1A1A',4.7,1.85,['uni-v','юни в','юни-в']),
    dcar('changan','unik','Changan UNI-K','UNI-K',78000,'#37474F',4.8,1.95,['uni-k','юни к','юни-к'])
  ],
  tank:[
    dcar('tank','t300','Tank 300','Tank 300',98000,'#1B5E20',4.8,2.0,['танк 300','tank 300'],true),
    dcar('tank','t400','Tank 400','Tank 400',120000,'#37474F',4.9,2.0,['танк 400','tank 400']),
    dcar('tank','t500','Tank 500','Tank 500',140000,'#1A1A1A',5.1,2.05,['танк 500','tank 500']),
    dcar('tank','t700','Tank 700','Tank 700',180000,'#212121',5.1,2.05,['танк 700','tank 700'])
  ],
  jetour:[
    dcar('jetour','dash','Jetour Dashing','Dashing',52000,'#1565C0',4.6,1.9,['дашинг','dashing'],true),
    dcar('jetour','x70','Jetour X70 Plus','X70 Plus',56000,'#E8E8E8',4.7,1.9,['x70','икс 70']),
    dcar('jetour','x90','Jetour X90 Plus','X90 Plus',68000,'#1A1A1A',4.9,1.95,['x90','икс 90']),
    dcar('jetour','t2','Jetour T2','T2',74000,'#2E7D32',4.8,1.95,['jetour t2','джетур t2'])
  ],
  kaiyi:[
    dcar('kaiyi','x3','Kaiyi X3','X3',36000,'#1565C0',4.2,1.8,['kaiyi x3','кайи x3'],true),
    dcar('kaiyi','e5','Kaiyi E5','E5',38000,'#E8E8E8',4.4,1.8,['kaiyi e5','кайи e5']),
    dcar('kaiyi','x3p','Kaiyi X3 Pro','X3 Pro',42000,'#1A1A1A',4.2,1.8,['kaiyi x3 pro','x3 pro']),
    dcar('kaiyi','x7','Kaiyi X7','X7',52000,'#37474F',4.5,1.9,['kaiyi x7','кайи x7'])
  ],
  gac:[
    dcar('gac','gs3','GAC GS3','GS3',52000,'#1565C0',4.4,1.85,['gs3','гс3'],true),
    dcar('gac','empow','GAC Empow','Empow',64000,'#C62828',4.7,1.85,['empow','эмпов']),
    dcar('gac','gs8','GAC GS8','GS8',86000,'#1A1A1A',4.9,1.95,['gs8','гс8']),
    dcar('gac','m8','GAC M8','M8',110000,'#E8E8E8',5.2,2.0,['gac m8','джиэйси м8'])
  ],
  voyah:[
    dcar('voyah','free','Voyah Free','Free',140000,'#E8E8E8',4.9,2.0,['voyah free','воя free'],true),
    dcar('voyah','dream','Voyah Dream','Dream',160000,'#1A1A1A',5.3,2.0,['voyah dream','воя dream','дрим']),
    dcar('voyah','freeu','Voyah Free Ultra','Free Ultra',155000,'#37474F',4.9,2.0,['voyah free ultra','free ultra']),
    dcar('voyah','dreamf','Voyah Dream Flagship','Dream Flagship',175000,'#212121',5.3,2.0,['dream flagship'])
  ],
  mitsubishi:[
    dcar('mitsubishi','asx','Mitsubishi ASX','ASX',54000,'#E8E8E8',4.4,1.85,['asx','асх'],true),
    dcar('mitsubishi','eclipse','Mitsubishi Eclipse Cross','Eclipse Cross',68000,'#1A1A1A',4.5,1.85,['eclipse','эклипс']),
    dcar('mitsubishi','out','Mitsubishi Outlander','Outlander',78000,'#1565C0',4.7,1.9,['аутлендер','outlander']),
    dcar('mitsubishi','paj','Mitsubishi Pajero Sport','Pajero Sport',92000,'#1B5E20',4.8,1.95,['паджеро','pajero'])
  ],
  ford:[
    dcar('ford','focus','Ford Focus','Focus',42000,'#1565C0',4.4,1.85,['фокус','focus'],true),
    dcar('ford','kuga','Ford Kuga','Kuga',62000,'#E8E8E8',4.5,1.9,['куга','kuga']),
    dcar('ford','transit','Ford Transit','Transit',72000,'#F5F5F5',5.4,2.1,['транзит','transit']),
    dcar('ford','expl','Ford Explorer','Explorer',98000,'#1A1A1A',5.0,2.0,['эксплорер','explorer'])
  ],
  renault:[
    dcar('renault','logan','Renault Logan','Logan',28000,'#E8E8E8',4.3,1.75,['логан','logan'],true),
    dcar('renault','duster','Renault Duster','Duster',44000,'#2E7D32',4.3,1.85,['дастер','duster']),
    dcar('renault','kaptur','Renault Kaptur','Kaptur',48000,'#C62828',4.3,1.85,['каптур','kaptur']),
    dcar('renault','arkana','Renault Arkana','Arkana',52000,'#1A1A1A',4.5,1.85,['аркана','arkana'])
  ],
  subaru:[
    dcar('subaru','impreza','Subaru Impreza','Impreza',56000,'#1565C0',4.6,1.8,['импреза','impreza'],true),
    dcar('subaru','xv','Subaru XV','XV',64000,'#2E7D32',4.5,1.85,['subaru xv','субару xv']),
    dcar('subaru','forester','Subaru Forester','Forester',78000,'#1B5E20',4.6,1.85,['форестер','forester']),
    dcar('subaru','outback','Subaru Outback','Outback',82000,'#37474F',4.9,1.9,['аутбек','outback'])
  ],
  daewoo:[
    dcar('daewoo','matiz','Daewoo Matiz','Matiz',12000,'#E8E8E8',3.5,1.5,['матиз','matiz'],true),
    dcar('daewoo','nexia','Daewoo Nexia','Nexia',16000,'#1565C0',4.3,1.7,['нексия','nexia']),
    dcar('daewoo','damas','Daewoo Damas','Damas',18000,'#F5F5F5',3.6,1.6,['дамас','damas']),
    dcar('daewoo','gentra','Daewoo Gentra','Gentra',24000,'#1A1A1A',4.5,1.75,['гентра','gentra'])
  ],
  multi:[
    dcar('lada','vesta','Lada Vesta','Vesta',34000,'#1A1A1A',4.6,1.85,['веста','vesta'],true),
    dcar('haval','jolion','Haval Jolion','Jolion',48000,'#1565C0',4.5,1.9,['джолион','jolion']),
    dcar('kia','sportage','Kia Sportage','Sportage',70000,'#37474F',4.5,1.9,['спортейдж','sportage']),
    dcar('toyota','camry','Toyota Camry','Camry',95000,'#C62828',4.9,1.85,['камри','camry'])
  ],
  used:[
    dcar('lada','ugranta','Lada Granta, 2019','Granta 2019',14000,'#C62828',4.6,1.85,['гранта','granta'],true),
    dcar('solaris','usol','Solaris, 2018','Solaris 2018',18000,'#1565C0',4.4,1.75,['солярис','solaris']),
    dcar('kia','urio','Kia Rio, 2018','Rio 2018',22000,'#1A1A1A',4.4,1.75,['рио','rio']),
    dcar('vw','upolo','Volkswagen Polo, 2019','Polo 2019',24000,'#E8E8E8',4.4,1.75,['поло','polo'])
  ]
};
function dealerNote(id,name){
  const n=dealerNorm(name);
  const pin=DEAL_PINS.find(b=>dealerNorm(b.n)===n);
  if(pin&&pin.note)return pin.note;
  const list=DEAL_CARS[id]||[];
  const cars=list.map(c=>c.short).join(', ');
  const title=DEAL_TITLE[id]||name||'Автосалон';
  return id==='used'
    ?`Автомир. С пробегом: ${cars}. Дешевле новых, салон забирает в зачёт только машину, которую покупали здесь.`
    :id==='multi'
    ?`Мультибренд. В зале ходовые: ${cars}. Карта или «в кредит».`
    :`${title}. В зале: ${cars}. Картой или скажите «в кредит».`;
}
function dealerPaint(it,id){
  const style=DEAL_LOOK[id]||'mass';const im=dealerImg[style];if(!it||!im)return;
  const draw=()=>{if(!im.width||interior!==it)return;const c=document.createElement('canvas');c.width=1280;c.height=720;const g=c.getContext('2d');
    const s=Math.max(1280/im.width,720/im.height),dw=im.width*s,dh=im.height*s;g.drawImage(im,(1280-dw)/2,(720-dh)/2,dw,dh);
    g.fillStyle='rgba(12,14,16,.2)';g.fillRect(0,0,1280,720);it.photoImg=c;if(typeof placeChatLook==='function')placeChatLook();};
  if(im.complete&&im.width)draw();else im.addEventListener('load',draw,{once:true});
}
function dealerMount(){if(typeof world==='undefined'||!world||!world.meta||!world.pois||dealerMount.done)return;dealerMount.done=true;
  for(const b of DEAL_PINS){const id=dealerOf(b.n);const xy=llToXY(b.ll);let got=false;
    for(const p of world.pois){if(Math.hypot(p.x-xy[0],p.y-xy[1])<70&&dealerOf(p.n)===id){got=true;break;}}
    if(got)continue;
    const o={x:xy[0],y:xy[1],t:'shop',n:b.n,st:'',i:(world.pseq=(world.pseq||0)+1)};
    if(world.pois.some(p=>Math.hypot(p.x-o.x,p.y-o.y)<16)){o.x+=18;o.y+=10;}
    world.pois.push(o);}}
if(typeof buildWorld==='function'){const dealerWorld0=buildWorld;buildWorld=function(d){const r=dealerWorld0(d);dealerMount.done=false;dealerMount();return r;};}
if(typeof window!=='undefined')setTimeout(dealerMount,2200);
if(typeof poiHours==='function'){const dealerHours0=poiHours;poiHours=function(p){
  if(p&&p.t==='shop'&&dealerOf(p.n))return {a:10,b:20};
  return dealerHours0(p);};}
if(typeof enterInterior==='function'){const dealerIn0=enterInterior;enterInterior=function(src){dealerIn0(src);
  if(!(interior&&src&&src.kind==='shop'))return;
  const id=dealerOf(src.name);if(!id)return;
  dealerPaint(interior,id);if(typeof setHint==='function')setHint(dealerNote(id,src.name));
  const staff=interior.npcs&&interior.npcs.find(n=>n.role==='staff');if(staff&&staff.p)staff.p.job='менеджер автосалона';};}
function dealerShe(w){return !!(w&&w.p&&w.p.female);}
function dealerQuote(o){
  let trade=0,oldName='';
  const old=player.carPrice||0;
  if(old>0&&ownCar&&ownCar.model&&ownCar.model!==o.model){oldName=ownCar.model;trade=Math.round(old*0.4);
    const minPay=Math.max(2000,Math.round(o.price*0.1));if(trade>o.price-minPay)trade=Math.max(0,o.price-minPay);}
  return {trade,oldName,due:Math.max(0,o.price-trade)};
}
function dealerSpot(){
  let x=player.x,y=player.y;
  if(typeof interior!=='undefined'&&interior&&interior.ret){x=interior.ret.x;y=interior.ret.y;}
  if(typeof nearestNode==='function'&&world&&world.carAdj){const n=nearestNode(x,y,world.carAdj,90);
    if(n>=0&&typeof curbSpot==='function'){const s=curbSpot(n);if(s)return s;}}
  let ox=x+8,oy=y+4;if(typeof inBuilding==='function'&&inBuilding(ox,oy)){ox=x-8;oy=y-4;}
  return {x:ox,y:oy,hx:1,hy:0};
}
function dealerProfile(o){try{const raw=localStorage.getItem('zk.profile');const p=raw?JSON.parse(raw):null;if(p&&typeof p==='object'){p.hasCar=true;p.carColor=o.color;localStorage.setItem('zk.profile',JSON.stringify(p));}}catch(e){}}
function dealerGive(o){
  const s=dealerSpot();
  const car=ownCar&&typeof ownCar==='object'?ownCar:{};
  car.kind='own';car.x=s.x;car.y=s.y;car.hx=s.hx;car.hy=s.hy;car.color=o.color;car.parked=true;car.towed=false;car.lot=null;car.paidTill=0;car.rate=0;
  car.model=o.model;car.brand=o.brand;car.price=o.price;car.len=o.len;car.wid=o.wid;
  ownCar=car;player.hasCar=true;player.carColor=o.color;player.carName=o.model;player.carBrand=o.brand;player.carPrice=o.price;player.carLen=o.len;player.carWid=o.wid;
  if(typeof ECON!=='undefined')ECON.carCond=100;
  if(typeof sitActive==='function'&&typeof endSit==='function'){const imp=sitActive('impound');if(imp)endSit(imp);const tow=sitActive('tow');if(tow)endSit(tow);}
  if(typeof unmark==='function')unmark('lot');
  dealerProfile(o);dealerPending=null;
  if(typeof syncOwnCarPin==='function')syncOwnCarPin();
  if(typeof saveState==='function')saveState();
}
function dealerDaily(left){return Math.max(100,Math.ceil(left/40/10)*10);}
function dealerPayCash(w,o,q){
  player.money-=q.due;if(typeof ECON!=='undefined')ECON.last=player.money;
  const old=q.oldName;dealerGive(o);
  const she=dealerShe(w);
  const trade=q.trade?`${she?'Зачла':'Зачёл'} «${old}» на ${fmtMoney(q.trade)}, с карты ${fmtMoney(q.due)}. `:`С карты ${fmtMoney(q.due)}. `;
  addEvent(`Автосалон: ${o.model}${q.due?' −'+fmtMoney(q.due):''}. На карте ${fmtMoney(player.money)}`,'say');
  return `«${o.model}» ваша. ${trade}Осталось ${fmtMoney(player.money)}. Стоит у салона — выходите и садитесь.${old?' Старую забрали.':''}`;
}
function dealerFulfill(w,place,o){
  if(player.vehicle)return 'Сначала выйдите из машины. Новую поставлю у салона, в двух сразу не уедете.';
  const q=dealerQuote(o);
  if((player.money||0)>=q.due)return dealerPayCash(w,o,q);
  dealerPending=o;
  const miss=q.due-(player.money||0);
  const trade=q.trade?` «${q.oldName}» зачтём на ${fmtMoney(q.trade)}, к оплате ${fmtMoney(q.due)}.`:` К оплате ${fmtMoney(q.due)}.`;
  return `«${o.short}» — ${fmtMoney(o.price)}.${trade} На карте ${fmtMoney(player.money)}, не хватает ${fmtMoney(miss)}. Можно в рассрочку салона: скажите «в кредит».`;
}
function dealerCredit(w,place,o){
  if(!o)return 'Какую берёте? Назовите модель или нажмите кнопку, потом «в кредит».';
  if(player.vehicle)return 'Сначала выйдите из машины.';
  if(player.carLoan&&player.carLoan.left>0)return `Сначала закройте рассрочку за «${player.carLoan.name}»: осталось ${fmtMoney(player.carLoan.left)}.`;
  const q=dealerQuote(o);
  if((player.money||0)>=q.due)return dealerPayCash(w,o,q);
  if(q.due<12000)return `«${o.short}» к оплате ${fmtMoney(q.due)}. На такую сумму рассрочку не даём — нужна вся сумма. На карте ${fmtMoney(player.money)}.`;
  let down=Math.max(8000,Math.round(q.due*0.3/100)*100);
  if(down>q.due)down=q.due;
  if((player.money||0)<down)return `В кредит «${o.short}»: первый взнос ${fmtMoney(down)}, дальше по ${fmtMoney(dealerDaily(q.due-down))} сорок дней. На карте ${fmtMoney(player.money)}, не хватает ${fmtMoney(down-player.money)}.`;
  player.money-=down;if(typeof ECON!=='undefined')ECON.last=player.money;
  const left=q.due-down,daily=dealerDaily(left);
  player.carLoan={left,daily,name:o.model,over:0};
  const old=q.oldName;dealerGive(o);
  addEvent(`Автосалон: ${o.model} в рассрочку, взнос −${fmtMoney(down)}. Осталось ${fmtMoney(left)}`,'say');
  const she=dealerShe(w);
  return `${she?'Оформила':'Оформил'} «${o.model}». Взнос ${fmtMoney(down)}, дальше ${fmtMoney(daily)} каждое утро, осталось ${fmtMoney(left)}.${old?` «${old}» забрали.`:''} Машина стоит у салона.`;
}
if(typeof counterPlace==='function'){const dealerPlace0=counterPlace;counterPlace=function(){
  const p=dealerPlace0();if(p&&p.kind==='shop'){const id=dealerOf(p.name);if(id){p.dealer=id;p.chain=null;}}return p;};}
if(typeof counterOffers==='function'){const dealerOff0=counterOffers;counterOffers=function(place){
  if(place&&place.dealer&&DEAL_CARS[place.dealer])return DEAL_CARS[place.dealer];
  return dealerOff0(place);};}
if(typeof counterPitch==='function'){const dealerPitch0=counterPitch;counterPitch=function(w,place,offers,t){
  if(!(place&&place.dealer))return dealerPitch0(w,place,offers,t);
  const list=(offers||[]).slice(0,4).map(o=>`${o.short} — ${fmtMoney(o.price)}`).join(', ');
  const loan=player.carLoan&&player.carLoan.left>0?` Рассрочка за «${player.carLoan.name}» ещё ${fmtMoney(player.carLoan.left)}.`:'';
  const you=typeof counterYou==='function'?counterYou():'';
  return `${you?you+', ':''}я ${w.p.name}, менеджер. В зале: ${list}. Карта списывается сразу. Не хватает — скажите «в кредит»: взнос 30%, остальное 40 дней.${loan}`;
};}
if(typeof counterReply==='function'){const dealerReply0=counterReply;counterReply=function(w,text){
  const place=typeof counterStaff==='function'?counterStaff(w):null;
  if(place&&place.dealer){
    const raw=text!=null?text:(function(){const mem=w.p&&w.p.memory||[];for(let i=mem.length-1;i>=0;i--)if(mem[i].role==='user')return mem[i].content||'';return '';})();
    const t=typeof counterNorm==='function'?counterNorm(raw):dealerNorm(raw);
    if(/кредит/.test(t)){
      const offers=counterOffers(place);
      const hit=typeof counterHit==='function'?counterHit(offers,t):null;
      return {reply:dealerCredit(w,place,hit||dealerPending),action:'none',place:''};
    }
  }
  return dealerReply0(w,text);
};}
if(typeof counterFulfill==='function'){const dealerFull0=counterFulfill;counterFulfill=function(w,place,o){
  if(o&&o.kind==='car')return dealerFulfill(w,place,o);
  return dealerFull0(w,place,o);};}
if(typeof econMorning==='function'){const dealerMorn0=econMorning;econMorning=function(first){dealerMorn0(first);
  const L=player.carLoan;if(!L||!(L.left>0)){if(L)player.carLoan=null;return;}
  const pay=Math.min(L.left,L.daily||dealerDaily(L.left));
  if((player.money||0)>=pay){player.money-=pay;if(typeof ECON!=='undefined')ECON.last=player.money;L.left-=pay;L.over=0;
    if(L.left<=0){player.carLoan=null;if(typeof phoneNote==='function')phoneNote('Автосалон','Рассрочка за машину закрыта','loan',true);else addEvent('Автосалон: рассрочка закрыта','say');}
    else if(typeof phoneNote==='function')phoneNote('Автосалон',`Платёж за «${L.name}» −${fmtMoney(pay)}. Осталось ${fmtMoney(L.left)}`,'loan');
    else addEvent(`Автосалон: платёж −${fmtMoney(pay)}. Осталось ${fmtMoney(L.left)}`);
    if(typeof saveState==='function')saveState();}
  else{L.over=(L.over||0)+1;const pen=Math.round(pay*0.1);L.left+=pen;
    const line=`Не хватило ${fmtMoney(pay)} за «${L.name}». Просрочка ${L.over} дн., пени +${fmtMoney(pen)}`;
    if(typeof phoneNote==='function')phoneNote('Автосалон',line,'debt',true);else addEvent('Автосалон: '+line,'alert');}
};}
(function dealerPics(){if(typeof document==='undefined'||typeof Image==='undefined')return;
  const L=document.getElementById('loading');if(L&&!L.hidden){setTimeout(dealerPics,800);return;}
  setTimeout(()=>{for(const k in DEAL_STILL){const im=new Image();im.src=DEAL_STILL[k];dealerImg[k]=im;}},900);})();
