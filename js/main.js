// Renders the hero chips, project grid, filters and skills from js/projects-data.js.
(function () {
  'use strict';

  var PAGE_SIZE = 6;
  var state = { filter: 'all', expanded: false };

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function initials(p) {
    if (p.initials) return p.initials;
    return p.title.split(/[\s:]+/).filter(Boolean).slice(0, 2)
      .map(function (w) { return w[0].toUpperCase(); }).join('');
  }

  function renderOpenToWork() {
    if (!SITE.openToWork) return;
    var chip = el('span', 'chip chip--status');
    chip.appendChild(el('span', 'status-dot'));
    chip.appendChild(document.createTextNode('Open to work'));
    document.getElementById('hero-chips').appendChild(chip);
  }

  function usedCategories() {
    var ids = [];
    PROJECTS.forEach(function (p) {
      if (ids.indexOf(p.category) === -1) ids.push(p.category);
    });
    // Keep CATEGORIES' order so filters don't reshuffle when projects are reordered.
    return Object.keys(CATEGORIES).filter(function (id) { return ids.indexOf(id) !== -1; })
      .concat(ids.filter(function (id) { return !(id in CATEGORIES); }));
  }

  function matchingProjects() {
    if (state.filter === 'all') return PROJECTS;
    return PROJECTS.filter(function (p) { return p.category === state.filter; });
  }

  function renderFilters() {
    var group = document.getElementById('project-filters');
    group.textContent = '';
    var defs = [{ id: 'all', label: 'All', count: PROJECTS.length }].concat(
      usedCategories().map(function (id) {
        return {
          id: id,
          label: CATEGORIES[id] || id,
          count: PROJECTS.filter(function (p) { return p.category === id; }).length
        };
      })
    );
    // A single category adds nothing to filter by.
    group.hidden = defs.length < 3;

    defs.forEach(function (d) {
      var active = d.id === state.filter;
      var btn = el('button', 'filter' + (active ? ' filter--active' : ''));
      btn.type = 'button';
      btn.setAttribute('aria-pressed', String(active));
      if (active) {
        btn.insertAdjacentHTML('beforeend',
          '<svg class="filter__check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>');
      }
      btn.appendChild(document.createTextNode(d.label + ' · ' + d.count));
      btn.addEventListener('click', function () {
        state.filter = d.id;
        state.expanded = false;
        render();
      });
      group.appendChild(btn);
    });
  }

  function projectCard(p) {
    var card = el('a', 'card');
    card.href = p.url;
    if (p.external) {
      card.target = '_blank';
      card.rel = 'noopener';
    }

    if (p.image) {
      var img = el('img', 'card__media');
      img.src = p.image;
      img.alt = '';
      img.loading = 'lazy';
      if (p.imagePosition) img.style.objectPosition = p.imagePosition;
      card.appendChild(img);
    } else {
      card.appendChild(el('div', 'card__media card__media--initials', initials(p)));
    }

    var body = el('div', 'card__body');
    body.appendChild(el('span', 'tag', CATEGORIES[p.category] || p.category));
    body.appendChild(el('h3', 'card__title', p.title));
    body.appendChild(el('p', 'card__desc', p.description));
    body.appendChild(el('div', 'card__stack', p.stack.join(' · ')));
    card.appendChild(body);
    return card;
  }

  function renderProjects() {
    var grid = document.getElementById('project-grid');
    var more = document.getElementById('project-more');
    var matching = matchingProjects();
    var shown = state.expanded ? matching : matching.slice(0, PAGE_SIZE);

    grid.textContent = '';
    shown.forEach(function (p) { grid.appendChild(projectCard(p)); });

    var hasMore = !state.expanded && matching.length > PAGE_SIZE;
    more.hidden = !hasMore;
    if (hasMore) {
      more.querySelector('button').textContent = 'Show all ' + matching.length + ' projects';
    }
  }

  function renderSkills() {
    var wrap = document.getElementById('skill-groups');
    SKILLS.forEach(function (g) {
      var card = el('div', 'skill-card');
      var head = el('div', 'skill-card__head');
      head.appendChild(el('span', 'dot dot--' + g.color));
      head.appendChild(el('h3', null, g.label));
      card.appendChild(head);
      var list = el('ul', 'skill-list');
      g.items.forEach(function (s) { list.appendChild(el('li', 'chip', s)); });
      card.appendChild(list);
      wrap.appendChild(card);
    });
  }

  function render() {
    renderFilters();
    renderProjects();
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('project-more').querySelector('button')
      .addEventListener('click', function () {
        state.expanded = true;
        renderProjects();
      });
    document.getElementById('year').textContent = new Date().getFullYear();
    renderOpenToWork();
    render();
    renderSkills();
  });
})();
