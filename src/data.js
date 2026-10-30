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

// Релизы — от новых к старым. cover — имя файла в public/photos (без .webp).
// url — ссылка на релиз; если её нет, кнопка ведёт на страницу артиста в Яндекс Музыке.
export const releases = [
  { title: 'Выше градус', type: 'Сингл', year: 2026, artists: 'GRILLYAZH', cover: 'cover-vyshe-gradus', isNew: true, url: '' },
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

// Галерея (сетка «бенто»). size: big — большая плитка, wide — широкая, tall — высокая, без size — обычная.
export const gallery = [
  { name: 'studio', alt: 'GRILLYAZH, студийный портрет', size: 'tall' },
  { name: 'gallery-1', alt: 'GRILLYAZH на сцене, зал с фонариками', size: 'big' },
  { name: 'gallery-3', alt: 'GRILLYAZH на крыше на закате' },
  { name: 'gallery-4', alt: 'GRILLYAZH с микрофоном, чёрно-белое фото' },
  { name: 'fisheye', alt: 'GRILLYAZH, портрет на закате', size: 'wide' },
  { name: 'gallery-2', alt: 'Коллаж из кадров GRILLYAZH', size: 'wide' },
];
