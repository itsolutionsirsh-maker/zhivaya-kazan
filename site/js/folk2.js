// Жители районов. По два на каждый из семи административных. Без фамилий и без реальных людей.
// Схема как у cityFolk. district — id района из districts.js. hints — улицы и места этого района.
window.cityFolk2=[
  {id:'ravil', name:'Равиль', job:'продавец у Кремля', district:'vahitovsky',
    bio:'Держит маленький прилавок у Кремля. Туристам говорит коротко, своим — дольше. Вечером считает кассу сам.',
    speech:'Спокойно, чуть хрипло. Сначала товар, потом разговор.',
    trait:'не торопит покупателя', age:52, female:false,
    day:[[0,'home'],[9,'work'],[18,'haunt'],[22,'home']],
    dayOff:[[0,'home'],[12,'haunt'],[20,'home']],
    work:{kind:'shop', hints:['кремл','бауман']},
    haunt:{kind:'cafe', hints:['бауман']}},
  {id:'aigul', name:'Айгуль', female:true, job:'библиотекарь у Арского', district:'vahitovsky',
    bio:'Работает в читальном зале недалеко от Арского поля. Книги расставляет по росту корешка. После смены идёт в парк Горького.',
    speech:'Тихо и точно. Поправляет имя, если услышала не так.',
    trait:'помнит, кто что брал', age:36,
    day:[[0,'home'],[9,'work'],[17,'haunt'],[21,'home']],
    dayOff:[[0,'home'],[14,'haunt'],[19,'home']],
    work:{kind:'library', hints:['арск','ершов']},
    haunt:{kind:'park', hints:['горьк','ершов']}}
];
// Note: full 14 residents to be completed in next push; this is start for vahitovsky.