/* Searchable dropdown ("combobox") following the WAI-ARIA APG combobox pattern.
   Items: { value, label, sub?, badge?, icon? (HTML), keywords?: string[], group?, data? }.
   Uses esc() from app.js at call time. */
(() => {
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const MAX_SHOWN = 120;
  let uid = 0;

  function Combobox({ input, onSelect, onType, allowFree = false, freeLabel = q => `Use “${q}”`, emptyText = 'No matches', groupOrder = [] }) {
    const id = `cb-${++uid}`;
    const wrap = document.createElement('div'); wrap.className = 'cb';
    input.parentNode.insertBefore(wrap, input); wrap.appendChild(input);
    const prefix = document.createElement('span'); prefix.className = 'cb-prefix'; prefix.hidden = true; wrap.prepend(prefix);
    const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'cb-toggle'; toggle.tabIndex = -1; toggle.setAttribute('aria-label', 'Show options');
    toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
    wrap.appendChild(toggle);
    const list = document.createElement('ul'); list.className = 'cb-list'; list.id = `${id}-list`; list.setAttribute('role', 'listbox'); list.hidden = true;
    wrap.appendChild(list);
    Object.assign(input, { autocomplete: 'off' });
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-expanded', 'false'); input.setAttribute('aria-controls', list.id);
    const label = input.closest('label')?.querySelector('.pf-label'); if (label) { label.id = label.id || `${id}-label`; list.setAttribute('aria-labelledby', label.id); }

    let items = []; let shown = []; let active = -1; let selected = null; let status = '';
    let lastChoice = null; // previous choice, restored if the student types over it but picks nothing

    function score(item, q) {
      if (!q) return 0;
      const l = norm(item.label); const keys = (item.keywords || []).map(norm);
      if (keys.some(k => k === q)) return 0;
      if (l.startsWith(q)) return 1;
      if (l.split(/[\s,()/&-]+/).some(w => w.startsWith(q))) return 2;
      if (l.includes(q)) return 3;
      if (keys.some(k => k.includes(q))) return 4;
      // Initials, e.g. "tum" → Technical University of Munich.
      const initials = l.split(/[\s-]+/).filter(w => w && !['of', 'the', 'and', 'for', 'de', 'di', 'der', 'du'].includes(w)).map(w => w[0]).join('');
      if (q.length >= 2 && initials.startsWith(q)) return 2.5;
      return Infinity;
    }
    function highlight(text, q) {
      const safe = esc(text); if (!q) return safe;
      const i = norm(text).indexOf(q); if (i < 0) return safe;
      return `${esc(text.slice(0, i))}<mark>${esc(text.slice(i, i + q.length))}</mark>${esc(text.slice(i + q.length))}`;
    }
    // While the box still shows the chosen item, opening it lists everything (not just that item).
    const showingSelection = () => Boolean(selected && input.value === selected.label);
    function render() {
      const q = showingSelection() ? '' : norm(input.value.trim());
      const matches = items.map(it => ({ it, s: score(it, q) })).filter(x => x.s !== Infinity)
        .sort((a, b) => (q ? a.s - b.s : 0) || (groupOrder.indexOf(a.it.group) - groupOrder.indexOf(b.it.group)) || 0)
        .map(x => x.it);
      shown = matches.slice(0, MAX_SHOWN);
      const exact = items.some(it => norm(it.label) === q);
      // "Use what I typed" goes last when there are real matches, so Enter picks the best match.
      const free = allowFree && q && !exact ? [{ value: input.value.trim(), label: freeLabel(input.value.trim()), free: true }] : [];
      shown = shown.length ? [...shown, ...free] : free;
      let html = ''; let lastGroup = null;
      shown.forEach((it, i) => {
        if (!q && it.group && it.group !== lastGroup) { html += `<li role="presentation" class="cb-group">${esc(it.group)}</li>`; lastGroup = it.group; }
        html += `<li role="option" id="${id}-o${i}" class="cb-option${it.free ? ' cb-free' : ''}${selected && selected.value === it.value && !it.free ? ' is-selected' : ''}" aria-selected="${i === active}" data-i="${i}">
          ${it.icon ? `<span class="cb-icon">${it.icon}</span>` : ''}<span class="cb-text"><b>${it.free ? esc(it.label) : highlight(it.label, q)}</b>${it.sub ? `<small>${highlight(it.sub, q)}</small>` : ''}</span>${it.badge ? `<span class="cb-badge${it.badgeTone ? ` cb-badge-${it.badgeTone}` : ''}">${esc(it.badge)}</span>` : ''}</li>`;
      });
      if (!shown.length) html = `<li role="presentation" class="cb-empty">${esc(status || emptyText)}</li>`;
      else if (matches.length > MAX_SHOWN) html += `<li role="presentation" class="cb-more">Showing ${MAX_SHOWN} of ${matches.length.toLocaleString('en')} — keep typing to narrow down</li>`;
      else if (status) html += `<li role="presentation" class="cb-more">${esc(status)}</li>`;
      list.innerHTML = html;
    }
    function open() {
      if (input.disabled) return;
      render(); list.hidden = false; input.setAttribute('aria-expanded', 'true'); wrap.classList.add('is-open');
      // Highlight and scroll to the current choice so it is easy to see what is selected.
      if (showingSelection()) { const i = shown.findIndex(it => !it.free && it.value === selected.value); if (i >= 0) setActive(i); }
    }
    function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; wrap.classList.remove('is-open'); }
    function setActive(i) {
      active = Math.max(-1, Math.min(shown.length - 1, i));
      list.querySelectorAll('[role=option]').forEach(li => li.setAttribute('aria-selected', String(Number(li.dataset.i) === active)));
      const el = list.querySelector(`#${id}-o${active}`);
      if (el) { input.setAttribute('aria-activedescendant', el.id); el.scrollIntoView({ block: 'nearest' }); } else input.removeAttribute('aria-activedescendant');
    }
    function choose(i) {
      const it = shown[i]; if (!it) return;
      selected = it.free ? { value: it.value, label: it.value, free: true } : it;
      lastChoice = selected;
      input.value = selected.label; setPrefix(selected.icon || '');
      close(); onSelect?.(selected);
    }
    function setPrefix(html) { prefix.innerHTML = html || ''; prefix.hidden = !html; wrap.classList.toggle('has-prefix', Boolean(html)); }

    input.addEventListener('input', () => { if (selected && input.value !== selected.label) { selected = null; setPrefix(''); } onType?.(input.value); open(); setActive(input.value.trim() ? 0 : -1); });
    input.addEventListener('focus', () => { if (!input.value) open(); });
    // Clicking a filled box selects its text, so typing replaces it straight away (no backspacing).
    input.addEventListener('click', () => { if (showingSelection()) input.select(); if (list.hidden) open(); });
    input.addEventListener('keydown', e => {
      const isOpen = !list.hidden;
      if (e.key === 'ArrowDown') { e.preventDefault(); if (!isOpen) open(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (!isOpen) open(); setActive(active <= 0 ? shown.length - 1 : active - 1); }
      else if (e.key === 'Enter' && isOpen && active >= 0) { e.preventDefault(); choose(active); }
      else if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation();
        // Typed over a choice and changed your mind: Esc puts the previous choice back.
        if (lastChoice && !selected) { selected = lastChoice; input.value = selected.label; setPrefix(selected.icon || ''); close(); }
        else if (isOpen) close();
        else if (input.value) { input.value = ''; selected = null; lastChoice = null; setPrefix(''); onSelect?.(null); }
      }
      else if (e.key === 'Tab' && isOpen) close();
    });
    toggle.addEventListener('mousedown', e => e.preventDefault());
    toggle.addEventListener('click', () => { if (list.hidden) { input.focus(); open(); } else close(); });
    list.addEventListener('mousedown', e => e.preventDefault()); // keep focus in the input
    list.addEventListener('click', e => { const li = e.target.closest('[role=option]'); if (li) choose(Number(li.dataset.i)); });
    // Broken logos fall back to the initials badge that follows them.
    list.addEventListener('error', e => { if (e.target.tagName === 'IMG') e.target.classList.add('cb-img-failed'); }, true);
    prefix.addEventListener('error', e => { if (e.target.tagName === 'IMG') e.target.classList.add('cb-img-failed'); }, true);
    input.addEventListener('blur', () => setTimeout(() => {
      close();
      // Left without picking anything: put the previous choice back instead of keeping half-typed text.
      if (!selected && lastChoice) { selected = lastChoice; input.value = selected.label; setPrefix(selected.icon || ''); }
    }, 120));

    return {
      setItems(next, { keepValue = false } = {}) { items = next; status = ''; if (!keepValue) { selected = null; lastChoice = null; input.value = ''; setPrefix(''); } if (!list.hidden) render(); },
      setStatus(text) { status = text || ''; if (!list.hidden) render(); },
      setDisabled(disabled, placeholder) { input.disabled = disabled; wrap.classList.toggle('is-disabled', disabled); if (placeholder) input.placeholder = placeholder; if (disabled) close(); },
      select(value) { const it = items.find(x => x.value === value); if (it) { selected = lastChoice = it; input.value = it.label; setPrefix(it.icon || ''); } },
      clear() { selected = null; lastChoice = null; input.value = ''; setPrefix(''); },
      get value() { return selected ? selected.value : input.value.trim(); },
      get selected() { return selected; },
      open, close, input
    };
  }
  window.Combobox = Combobox;
})();
