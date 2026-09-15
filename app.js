const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

document.body.style.background = tg.themeParams.bg_color || '';

// ---------------------------------------------------------------------------
// Реальные данные с публичного API https://api.changes.tg
// ---------------------------------------------------------------------------

const API_BASE = 'https://api.changes.tg';

function modelImgUrl(giftName, modelName) {
  return `${API_BASE}/model/${encodeURIComponent(giftName)}/${encodeURIComponent(modelName)}.png?size=64`;
}

function symbolImgUrl(giftName, symbolName) {
  return `${API_BASE}/symbol/${encodeURIComponent(giftName)}/${encodeURIComponent(symbolName)}.png?size=64`;
}

/** @type {{ name: string, icon?: string }[]} */
let GIFT_OPTIONS = [];

/** Кэш атрибутов по имени подарка: { model: [], symbol: [], backdrop: [] } */
const attributesCache = {};

/** Простой emoji-fallback по первой букве / ключевым словам */
function giftIcon(name) {
  const n = name.toLowerCase();
  if (n.includes('pepe') || n.includes('frog')) return '🐸';
  if (n.includes('cat')) return '🐱';
  if (n.includes('cap') || n.includes('hat')) return '🧢';
  if (n.includes('peach')) return '🍑';
  if (n.includes('heart') || n.includes('locket')) return '🧡';
  if (n.includes('bag') || n.includes('loot')) return '🎒';
  if (n.includes('cake') || n.includes('muffin') || n.includes('cookie')) return '🎂';
  if (n.includes('ring')) return '💍';
  if (n.includes('candle')) return '🕯️';
  if (n.includes('snake')) return '🐍';
  if (n.includes('egg')) return '🥚';
  if (n.includes('star')) return '⭐';
  if (n.includes('skull')) return '💀';
  if (n.includes('rose') || n.includes('flower')) return '🌹';
  if (n.includes('watch')) return '⌚';
  if (n.includes('sword')) return '⚔️';
  if (n.includes('helmet')) return '🪖';
  if (n.includes('snoop')) return '🐶';
  return '🎁';
}

async function loadGiftsList() {
  try {
    const res = await fetch(`${API_BASE}/gifts`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const names = await res.json();
    GIFT_OPTIONS = names.map(name => ({
      name,
      icon: giftIcon(name),
    }));
    console.log(`[NFT Radar] Loaded ${GIFT_OPTIONS.length} gifts`);
  } catch (e) {
    console.error('Failed to load gifts list', e);
    // Минимальный fallback, чтобы UI не ломался
    GIFT_OPTIONS = [
      { icon: '🐸', name: 'Plush Pepe' },
      { icon: '🧢', name: "Durov's Cap" },
      { icon: '🧡', name: 'Heart Locket' },
      { icon: '🐱', name: 'Scared Cat' },
      { icon: '🍑', name: 'Precious Peach' },
    ];
  }
}

/**
 * Загружает модели / символы / фоны для конкретного подарка.
 * Кэширует результат.
 */
async function loadAttributesForGift(giftName) {
  if (attributesCache[giftName]) {
    return attributesCache[giftName];
  }

  try {
    const res = await fetch(`${API_BASE}/gift/${encodeURIComponent(giftName)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const mapAttr = (arr, kind) =>
      (arr || []).map(item => ({
        name: item.name,
        pct: typeof item.rarity === 'number' ? item.rarity : parseFloat(item.rarity) || 0,
        kind, // model | symbol | backdrop
        giftName,
      }));

    const attrs = {
      model: mapAttr(data.models, 'model'),
      symbol: mapAttr(data.symbols, 'symbol'),
      backdrop: mapAttr(data.backdrops, 'backdrop'),
    };

    attributesCache[giftName] = attrs;

    // Превью подарка = картинка первой модели
    if (attrs.model.length > 0) {
      const g = GIFT_OPTIONS.find(x => x.name === giftName);
      if (g) {
        g.previewUrl = modelImgUrl(giftName, attrs.model[0].name);
        g.previewModel = attrs.model[0].name;
      }
    }

    console.log(
      `[NFT Radar] ${giftName}: ${attrs.model.length} models, ` +
      `${attrs.symbol.length} symbols, ${attrs.backdrop.length} backdrops`
    );
    return attrs;
  } catch (e) {
    console.error(`Failed to load attributes for ${giftName}`, e);
    const empty = { model: [], symbol: [], backdrop: [] };
    attributesCache[giftName] = empty;
    return empty;
  }
}

function attrsForCurrentGift() {
  if (!selectedGift) return { model: [], symbol: [], backdrop: [] };
  return attributesCache[selectedGift.name] || { model: [], symbol: [], backdrop: [] };
}

// --- Чипы маркетплейсов ---
document.querySelectorAll('#marketplaces .chip').forEach(chip => {
  chip.addEventListener('click', () => chip.classList.toggle('active'));
});

// --- Состояние выбора ---
let selectedGift = null;
const selectedAttrs = { model: [], symbol: [], backdrop: [] };

// ============ Поле "Подарок" (одиночный выбор) ============

function renderGiftField() {
  const field = document.querySelector('.select-field[data-attr="gift"]');
  if (!selectedGift) {
    field.innerHTML = `<span class="select-placeholder">Выберите подарок</span><i class="select-arrow">▾</i>`;
    return;
  }
  const thumb = selectedGift.previewUrl
    ? `<img class="field-thumb" src="${selectedGift.previewUrl}" alt="" onerror="this.remove()">`
    : '';
  field.innerHTML = `
    <span class="select-tag">${thumb}${selectedGift.name}
      <span class="clear" data-clear="gift">✕</span>
    </span>`;
}

function giftThumbHtml(g) {
  if (g.previewUrl) {
    return `<img class="item-thumb gift-preview" src="${g.previewUrl}" alt="" loading="lazy" onerror="this.remove()">`;
  }
  // Пока превью не загружено — только название, без эмодзи
  return `<span class="item-thumb-placeholder"></span>`;
}

function renderGiftDropdown(query = '') {
  const list = document.querySelector('.dropdown[data-for="gift"] .dropdown-list');
  list.innerHTML = '';

  if (GIFT_OPTIONS.length === 0) {
    list.innerHTML = `<div class="dropdown-item" style="color:var(--text-muted);cursor:default;">Загрузка списка...</div>`;
    return;
  }

  const filtered = GIFT_OPTIONS.filter(g =>
    g.name.toLowerCase().includes(query.toLowerCase())
  );

  filtered.forEach(g => {
    const item = document.createElement('div');
    item.className = 'dropdown-item';
    item.dataset.giftName = g.name;
    item.innerHTML = `${giftThumbHtml(g)}<span class="item-name">${g.name}</span>`;
    item.addEventListener('click', async () => {
      selectedGift = g;
      renderGiftField();

      selectedAttrs.model = [];
      selectedAttrs.symbol = [];
      selectedAttrs.backdrop = [];
      ['model', 'symbol', 'backdrop'].forEach(renderAttrField);

      document.querySelector('.dropdown[data-for="gift"]').classList.remove('open');

      await loadAttributesForGift(g.name);
      renderGiftField();
      updateFloorHint();
    });
    list.appendChild(item);
  });

  // Фоном подгружаем превью для видимых подарков (без превью)
  prefetchGiftPreviews(filtered.slice(0, 24));
}

/** Подгружает превью (первую модель) для списка подарков, с лимитом параллелизма */
const previewLoading = new Set();
async function prefetchGiftPreviews(gifts) {
  const queue = gifts.filter(g => !g.previewUrl && !previewLoading.has(g.name));
  const concurrency = 4;

  async function worker() {
    while (queue.length) {
      const g = queue.shift();
      if (!g) break;
      previewLoading.add(g.name);
      try {
        await loadAttributesForGift(g.name);
        // Обновить картинку в открытом дропдауне, если элемент ещё на экране
        const el = Array.from(document.querySelectorAll('.dropdown[data-for="gift"] .dropdown-item'))
          .find(n => n.dataset.giftName === g.name);
        if (el && g.previewUrl) {
          const slot = el.querySelector('.item-thumb-placeholder, .gift-preview, .item-thumb');
          const img = `<img class="item-thumb gift-preview" src="${g.previewUrl}" alt="" loading="lazy" onerror="this.remove()">`;
          if (slot) {
            slot.outerHTML = img;
          } else {
            el.insertAdjacentHTML('afterbegin', img);
          }
        }
      } catch (_) {
        /* ignore */
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
}

document.querySelector('.dropdown[data-for="gift"] .dropdown-search')
  .addEventListener('input', (e) => renderGiftDropdown(e.target.value));

document.querySelector('.select-field[data-attr="gift"]').addEventListener('click', (e) => {
  if (e.target.dataset.clear) {
    selectedGift = null;
    renderGiftField();
    e.stopPropagation();
    return;
  }
  renderGiftDropdown();
  document.querySelector('.dropdown[data-for="gift"]').classList.toggle('open');
});

// ============ Поля "Модель / Символ / Фон" (мультивыбор) ============

const ATTR_LABELS = { model: 'модель', symbol: 'символ', backdrop: 'фон' };

function renderAttrField(attr) {
  const field = document.querySelector(`.select-field[data-attr="${attr}"]`);
  const chosen = selectedAttrs[attr];

  if (chosen.length === 0) {
    field.innerHTML = `<span class="select-placeholder">Выберите ${ATTR_LABELS[attr]}</span>
      <span class="select-actions"><i class="select-arrow">▾</i></span>`;
    return;
  }

  field.innerHTML = `
    <span class="select-tag">Выбрано: ${chosen.length}</span>
    <span class="select-actions">
      <i class="clear-all" data-clear="${attr}">✕</i>
      <i class="select-arrow">▾</i>
    </span>`;
}

function renderAttrDropdown(attr, query = '') {
  const list = document.querySelector(`.dropdown[data-for="${attr}"] .dropdown-list`);
  list.innerHTML = '';

  if (!selectedGift) {
    list.innerHTML = `<div class="dropdown-item" style="color:var(--text-muted);cursor:default;">Сначала выберите подарок</div>`;
    return;
  }

  const options = attrsForCurrentGift()[attr] || [];

  if (options.length === 0) {
    list.innerHTML = `<div class="dropdown-item" style="color:var(--text-muted);cursor:default;">Загрузка атрибутов...</div>`;
    // Попробуем догрузить
    loadAttributesForGift(selectedGift.name).then(() => {
      renderAttrDropdown(attr, query);
    });
    return;
  }

  options
    .filter(o => o.name.toLowerCase().includes(query.toLowerCase()))
    .forEach(opt => {
      const isSelected = selectedAttrs[attr].some(o => o.name === opt.name);
      const item = document.createElement('div');
      item.className = 'dropdown-item' + (isSelected ? ' selected' : '');
      let thumb = '';
      if (opt.kind === 'model' && selectedGift) {
        thumb = `<img class="item-thumb" src="${modelImgUrl(selectedGift.name, opt.name)}" alt="" loading="lazy" onerror="this.style.display='none'">`;
      } else if (opt.kind === 'symbol' && selectedGift) {
        thumb = `<img class="item-thumb" src="${symbolImgUrl(selectedGift.name, opt.name)}" alt="" loading="lazy" onerror="this.style.display='none'">`;
      } else {
        thumb = `<span class="item-icon">•</span>`;
      }
      item.innerHTML = `
        <span class="check">${isSelected ? '✓' : ''}</span>
        ${thumb}
        <span class="item-name">${opt.name}</span>
        <span class="pct">(${opt.pct}%)</span>`;
      item.addEventListener('click', () => {
        if (isSelected) {
          selectedAttrs[attr] = selectedAttrs[attr].filter(o => o.name !== opt.name);
        } else {
          selectedAttrs[attr] = [...selectedAttrs[attr], opt];
        }
        renderAttrField(attr);
        renderAttrDropdown(attr, query);
      });
      list.appendChild(item);
    });
}

['model', 'symbol', 'backdrop'].forEach(attr => {
  const field = document.querySelector(`.select-field[data-attr="${attr}"]`);

  document.querySelector(`.dropdown[data-for="${attr}"] .dropdown-search`)
    .addEventListener('input', (e) => renderAttrDropdown(attr, e.target.value));

  field.addEventListener('click', async (e) => {
    if (e.target.dataset.clear) {
      selectedAttrs[attr] = [];
      renderAttrField(attr);
      e.stopPropagation();
      return;
    }

    // Если атрибуты ещё не загружены — грузим
    if (selectedGift && !attributesCache[selectedGift.name]) {
      await loadAttributesForGift(selectedGift.name);
    }

    renderAttrDropdown(attr);
    document.querySelector(`.dropdown[data-for="${attr}"]`).classList.toggle('open');
  });

  renderAttrField(attr);
});

// --- Слайдер отклонения от флора ---
const floorSlider = document.getElementById('floorSlider');
const floorValueLabel = document.getElementById('floorValueLabel');

floorSlider.addEventListener('input', () => {
  const val = floorSlider.value;
  floorValueLabel.textContent = val == 0 ? 'Только флор' : `${val}%`;
  updateFloorHint();
});

function updateFloorHint() {
  const el = document.getElementById('floorHint');
  if (!el) return;
  const pct = Number(floorSlider.value);
  if (!selectedGift) {
    el.innerHTML = 'Выберите подарок — подсказка по порогу от флора';
    return;
  }
  // Актуальный floor берётся в боте с площадок в момент листинга (CORS не даёт надёжно
  // читать маркетплейсы прямо из Mini App). Здесь объясняем правило.
  if (pct === 0) {
    el.innerHTML = `<strong>${selectedGift.name}</strong>: сработает только если цена ≤ <strong>текущего флора</strong> на площадке.`;
  } else {
    el.innerHTML = `<strong>${selectedGift.name}</strong>: цена не выше флора + <strong>${pct}%</strong> (floor&nbsp;×&nbsp;${(1 + pct / 100).toFixed(2)}). Флор подставляется при проверке листинга.`;
  }
}

// --- Сбор фильтра и отправка боту ---
document.getElementById('saveBtn').addEventListener('click', () => {
  const activeMarketplaces = Array.from(
    document.querySelectorAll('#marketplaces .chip.active')
  ).map(chip => chip.dataset.value);

  const editId = document.getElementById('editFilterId').value.trim();
  const filter = {
    id: editId || undefined,
    name: document.getElementById('filterName').value.trim() || null,
    marketplaces: activeMarketplaces,
    gift: selectedGift?.name || null,
    gift_number: document.getElementById('giftNumber').value || null,
    models: selectedAttrs.model.map(o => o.name),
    symbols: selectedAttrs.symbol.map(o => o.name),
    backdrops: selectedAttrs.backdrop.map(o => o.name),
    price_min: document.getElementById('priceMin').value || null,
    price_max: document.getElementById('priceMax').value || null,
    max_above_floor_percent: Number(floorSlider.value),
    also_create_sale_filter: document.getElementById('alsoSaleFilter').checked,
  };

  tg.sendData(JSON.stringify(filter));
  tg.close();
});

// ---------------------------------------------------------------------------
// Инициализация: загружаем список подарков при старте
// ---------------------------------------------------------------------------
async function applyEditPayload(f) {
  if (!f || typeof f !== 'object') return;
  document.getElementById('editFilterId').value = f.id || '';
  document.getElementById('filterName').value = f.name || '';
  document.getElementById('giftNumber').value = f.gift_number || '';
  document.getElementById('priceMin').value = f.price_min ?? '';
  document.getElementById('priceMax').value = f.price_max ?? '';
  if (f.max_above_floor_percent != null) {
    floorSlider.value = f.max_above_floor_percent;
    floorValueLabel.textContent = f.max_above_floor_percent == 0 ? 'Только флор' : `${f.max_above_floor_percent}%`;
  }
  document.getElementById('alsoSaleFilter').checked = !!f.also_create_sale_filter;

  // Маркетплейсы
  const wanted = new Set(f.marketplaces || []);
  document.querySelectorAll('#marketplaces .chip').forEach(chip => {
    chip.classList.toggle('active', wanted.size === 0 ? true : wanted.has(chip.dataset.value));
  });

  // Подарок + атрибуты
  if (f.gift) {
    let g = GIFT_OPTIONS.find(x => x.name === f.gift);
    if (!g) {
      g = { name: f.gift, icon: giftIcon(f.gift) };
      GIFT_OPTIONS.push(g);
    }
    selectedGift = g;
    renderGiftField();
    await loadAttributesForGift(g.name);
    selectedAttrs.model = (f.models || []).map(name => ({ name, pct: 0, kind: 'model', giftName: g.name }));
    selectedAttrs.symbol = (f.symbols || []).map(name => ({ name, pct: 0, kind: 'symbol', giftName: g.name }));
    selectedAttrs.backdrop = (f.backdrops || []).map(name => ({ name, pct: 0, kind: 'backdrop', giftName: g.name }));
    ['model', 'symbol', 'backdrop'].forEach(renderAttrField);
  }

  document.getElementById('saveBtn').textContent = 'Сохранить изменения';
  const h1 = document.querySelector('.app-header h1');
  if (h1) h1.textContent = 'Редактирование фильтра';
  updateFloorHint();
}

(async () => {
  await loadGiftsList();
  updateFloorHint();

  // Режим редактирования: ?edit=<url-encoded JSON>
  try {
    const params = new URLSearchParams(location.search);
    const raw = params.get('edit');
    if (raw) {
      const f = JSON.parse(decodeURIComponent(raw));
      await applyEditPayload(f);
    }
  } catch (e) {
    console.error('edit payload', e);
  }
})();
