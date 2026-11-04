// Весь контент сайта — здесь. Чтобы обновить релизы, концерты или ссылки,
// достаточно поправить этот файл: разметка соберётся сама.

export const asset = (path) => `${import.meta.env.BASE_URL}${path}`;
export const photo = (name) => asset(`photos/${name}.webp`);

export const links = {
  yandex: 'https://music.yandex.ru/artist/16514152',
  telegram: 'https://t.me/grillyazhhh',
  vk: 'https://vk.com/grillyazh',
  tiktok: 'https://www.tiktok.com/@grillyazh',
  instagram: 'https://www.instagram.com/grillyazhhh/',
  manager: 'https://t.me/dobrayasanya',
};

export const socials = [
  { id: 'telegram', label: 'Telegram-канал', handle: '@grillyazhhh', url: links.telegram },
  { id: 'vk', label: 'ВКонтакте', handle: '@grillyazh', url: links.vk },
  { id: 'tiktok', label: 'TikTok', handle: '@grillyazh', url: links.tiktok },
  { id: 'instagram', label: 'Instagram', handle: '@grillyazhhh', url: links.instagram },
];

export const manager = {
  handle: '@dobrayasanya',
  url: links.manager,
  rules: ['Видеоприветы и реклама не продаются', 'Фиты и биты не нужны', 'Пишите только по рабочим вопросам'],
};

// Предстоящий релиз. Если сборка на GitHub достала данные с Яндекс Музыки (yandex.json),
// сайт возьмёт оттуда свежий предстоящий релиз, а это — запасной вариант.
export const upcoming = {
  title: 'После прослушивания сжечь',
  artists: 'GRILLYAZH',
  releaseDate: '2026-11-06T00:00:00+03:00',
  cover: 'cover-upcoming',
  url: links.yandex,
};

// Хиты, которые играют на сайте: превью припева в public/audio (около 40 секунд).
// photo — фон экрана трека, cover — обложка.
export const hits = [
  { id: 'poslednim-letom', title: 'последним летом', artists: 'madk1d, GRILLYAZH', year: 2025, audio: 'audio/poslednim-letom.mp3', cover: 'cover-poslednim-letom', photo: 'stage-mic', url: '' },
  { id: 'v-gorode', title: 'В городе', artists: 'GRILLYAZH, f0lk', year: 2023, audio: 'audio/v-gorode.mp3', cover: 'cover-v-gorode', photo: 'crowd', url: '' },
  { id: 'dvinulsya', title: 'Двинулся на тебе', artists: 'GRILLYAZH, Кишлак', year: 2022, audio: 'audio/dvinulsya.mp3', cover: 'cover-dvinulsya', photo: 'stage-red', url: '' },
];

// Дискография — от новых к старым. cover — имя файла в public/photos (без .webp).
// url — ссылка на релиз; если её нет, кнопка ведёт на страницу артиста в Яндекс Музыке.
// Если есть yandex.json, список берётся оттуда.
export const releases = [
  { title: 'Выше градус', type: 'Сингл', year: 2026, artists: 'GRILLYAZH', cover: 'cover-vyshe-gradus', url: '' },
  { title: 'последним летом', type: 'Сингл', year: 2025, artists: 'madk1d, GRILLYAZH', cover: 'cover-poslednim-letom', url: '' },
  { title: 'В городе', type: 'Сингл', year: 2023, artists: 'GRILLYAZH, f0lk', cover: 'cover-v-gorode', url: '' },
  { title: 'Двинулся на тебе', type: 'Сингл', year: 2022, artists: 'GRILLYAZH, Кишлак', cover: 'cover-dvinulsya', url: '' },
];

// Концерты. date — ISO-время начала (московское). Прошедшие даты сами уходят в архив.
export const concerts = [
  {
    date: '2026-04-26T20:00:00+03:00',
    city: 'Санкт-Петербург',
    venue: 'Рассвет (ex. Mod)',
    tags: ['Поп', 'Альтернатива', '16+'],
    url: 'https://afisha.yandex.ru/saint-petersburg/concert/grillyazh-2026-04-26?source=artist',
  },
  {
    date: '2026-05-03T20:00:00+03:00',
    city: 'Москва',
    venue: 'Урбан',
    tags: ['16+'],
    url: 'https://afisha.yandex.ru/',
  },
];

// Фото: три колонки, которые при прокрутке едут с разной скоростью.
// name — файл в public/photos, ratio — пропорции кадра (ширина / высота), caption — подпись.
export const gallery = [
  { name: 'stage-dive', ratio: 2000 / 1359, caption: 'Прыжок', alt: 'GRILLYAZH прыгает со сцены в зал' },
  { name: 'crowd', ratio: 1396 / 2000, caption: 'В толпе', alt: 'GRILLYAZH смеётся в толпе фанатов' },
  { name: 'stage-mic', ratio: 2000 / 1481, caption: 'Сцена', alt: 'GRILLYAZH с микрофоном, чёрно-белое фото' },
  { name: 'studio', ratio: 4 / 5, caption: 'Студия', alt: 'GRILLYAZH, студийный портрет' },
  { name: 'stage-red', ratio: 2000 / 1334, caption: 'Улыбка', alt: 'GRILLYAZH на сцене в красном свете' },
  { name: 'fisheye', ratio: 2 / 3, caption: 'Улица', alt: 'GRILLYAZH, портрет на закате' },
  { name: 'stage-walk', ratio: 1334 / 2000, caption: 'Выход', alt: 'GRILLYAZH идёт по сцене и улыбается' },
  { name: 'jump-back', ratio: 2000 / 1334, caption: 'Полёт', alt: 'GRILLYAZH прыгает со сцены в зал, вид со спины' },
  { name: 'stage-smoke', ratio: 2000 / 1334, caption: 'Дым', alt: 'GRILLYAZH на сцене в дыму, вид сверху на зал' },
  { name: 'stage-screen', ratio: 2000 / 1334, caption: 'Экран', alt: 'GRILLYAZH на сцене в красном свете на фоне экрана' },
  { name: 'stage-duo', ratio: 2000 / 1334, caption: 'Дуэт', alt: 'GRILLYAZH поёт вдвоём на сцене перед залом' },
  { name: 'stage-cap', ratio: 1335 / 2000, caption: 'Голос', alt: 'GRILLYAZH поёт на сцене в кепке' },
  { name: 'stage-point', ratio: 1335 / 2000, caption: 'Жест', alt: 'GRILLYAZH на сцене с поднятой рукой на фоне зелёного логотипа' },
  { name: 'stage-snow', ratio: 2000 / 1333, caption: 'Снег', alt: 'GRILLYAZH прыгает на сцене под снегом из хлопушек' },
  { name: 'stage-lights', ratio: 2000 / 1333, caption: 'Фонарики', alt: 'GRILLYAZH поёт перед залом с фонариками' },
];
