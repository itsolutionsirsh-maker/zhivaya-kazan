// Жители районов. Уникальные имена, без повторов с центром и между собой. district = id жилого района.
window.cityFolk2=[
  {id:'ravil', name:'Равиль', job:'продавец у парка Горького', district:'gorky',
    bio:'Держит прилавок у парка. Вечером считает кассу сам.',
    speech:'Спокойно.', trait:'не торопит', age:52, female:false,
    day:[[0,'home'],[9,'work'],[18,'haunt'],[22,'home']],
    work:{kind:'shop', hints:['горьк']}, haunt:{kind:'park', hints:['горьк']}},
  {id:'leila', name:'Лейла', female:true, job:'библиотекарь у Арского', district:'arsk',
    bio:'Работает в читальном зале. После смены идёт в парк.',
    speech:'Тихо.', trait:'помнит книги', age:36,
    day:[[0,'home'],[9,'work'],[17,'haunt'],[21,'home']],
    work:{kind:'library', hints:['арск']}, haunt:{kind:'park', hints:['арск']}},
  {id:'nail', name:'Наиль', job:'водитель в Горках', district:'gorki',
    bio:'Возит маршрут через Горки. Знает все объезды.',
    speech:'Коротко.', trait:'знает дороги', age:47, female:false,
    day:[[0,'home'],[6,'work'],[16,'haunt'],[22,'home']],
    work:{kind:'bus', hints:['горки']}, haunt:{kind:'cafe', hints:['горки']}},
  {id:'dinara', name:'Динара', female:true, job:'продавец в Азино', district:'azino',
    bio:'Стоит за прилавком в магазине на Фучика. Помнит постоянных.',
    speech:'Вежливо.', trait:'помнит покупателей', age:41,
    day:[[0,'home'],[8,'work'],[18,'haunt'],[21,'home']],
    work:{kind:'shop', hints:['азино']}, haunt:{kind:'metro', hints:['азино']}},
  {id:'farid', name:'Фарид', job:'механик в Дербышках', district:'derbyshki',
    bio:'Чинит машины во дворах. После работы идёт к электричке.',
    speech:'Прямо.', trait:'чинит быстро', age:39, female:false,
    day:[[0,'home'],[9,'work'],[18,'haunt'],[22,'home']],
    work:{kind:'garage', hints:['дербышк']}, haunt:{kind:'station', hints:['дербышк']}}
];
// Дальше дописываются жители в остальные жилые районы.
