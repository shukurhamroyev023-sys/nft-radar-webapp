/* Английская версия мини-аппа.
   Язык: параметр ?lang=en от бота (по команде /lang), иначе — язык Telegram. */
(function () {
  var RU_CODES = ['ru', 'uk', 'be', 'kk', 'ky', 'tg', 'uz'];
  var lang = new URLSearchParams(location.search).get('lang');
  if (!lang) {
    try {
      var code = ((window.Telegram.WebApp.initDataUnsafe.user || {}).language_code || 'ru').split('-')[0];
      lang = RU_CODES.indexOf(code) >= 0 ? 'ru' : 'en';
    } catch (e) { lang = 'ru'; }
  }
  if (lang !== 'en') return;
  document.documentElement.lang = 'en';

  var EXACT = {
    'NFT Radar — Фильтры': 'NFT Radar — Filters',
    'Новый фильтр': 'New filter',
    'Редактирование фильтра': 'Edit filter',
    'Название': 'Name',
    'Например: Дешёвые Pepe': 'e.g. Cheap Pepe',
    'Площадки': 'Marketplaces',
    'Подарок': 'Gift',
    'Выберите подарок': 'Choose a gift',
    'Поиск...': 'Search...',
    'Или номер подарка': 'Or gift number',
    'Введите номер подарка': 'Enter gift number',
    'Дополнительные параметры': 'Additional parameters',
    'Модель': 'Model',
    'Символ': 'Symbol',
    'Фон': 'Backdrop',
    'Выберите модель': 'Choose model',
    'Выберите символ': 'Choose symbol',
    'Выберите фон': 'Choose backdrop',
    'Цена': 'Price',
    'От': 'From',
    'До': 'To',
    'Минимальная цена': 'Minimum price',
    'Максимальная цена': 'Maximum price',
    'Также создать фильтр продажи': 'Also create a sale filter',
    'Сохранить фильтр': 'Save filter',
    'Сохранить изменения': 'Save changes',
    'Загрузка списка...': 'Loading list...',
    'Загрузка атрибутов...': 'Loading attributes...',
    'Сначала выберите подарок': 'Choose a gift first',
    'Ничего не найдено': 'Nothing found',
    'Не дороже флора на': 'No more than floor +',
    'Только по флору': 'Floor only',
    'Только флор': 'Floor only',
    'Без ограничения': 'No limit',
    'Выберите подарок — подсказка по флору': 'Choose a gift — floor hint',
    'Выберите подарок — подсказка по порогу от флора': 'Choose a gift — floor threshold hint'
  };
  var RX = [
    [/^Выбрано: (\d+)$/, 'Selected: $1'],
    [/^Выберите (.+)$/, 'Choose $1']
  ];

  function tr(s) {
    if (!s) return s;
    var t = s.trim();
    if (!t || !/[А-Яа-яЁё]/.test(t)) return s;
    var out = EXACT[t];
    if (out === undefined) {
      for (var i = 0; i < RX.length; i++) {
        if (RX[i][0].test(t)) { out = t.replace(RX[i][0], RX[i][1]); break; }
      }
    }
    return out === undefined ? s : s.replace(t, out);
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      var v = tr(root.nodeValue);
      if (v !== root.nodeValue) root.nodeValue = v;
      return;
    }
    if (root.nodeType !== 1) return;
    if (root.placeholder) {
      var p = tr(root.placeholder);
      if (p !== root.placeholder) root.placeholder = p;
    }
    for (var c = root.firstChild; c; c = c.nextSibling) walk(c);
  }

  function run() {
    document.title = tr(document.title);
    walk(document.body);
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        if (m.type === 'characterData') walk(m.target);
        else m.addedNodes.forEach(walk);
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
