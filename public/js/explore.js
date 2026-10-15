(function () {
  const WISHES_PER_SET = 6;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const grid = document.getElementById('wishGrid');
  const differentBtn = document.getElementById('differentBtn');
  const statusEl = document.getElementById('exploreStatus');

  let loading = false;

  function setStatus(message, isError) {
    statusEl.textContent = message || '';
    statusEl.classList.toggle('is-error', Boolean(isError));
  }

  function svgEl(name, attrs) {
    const el = document.createElementNS(SVG_NS, name);
    Object.keys(attrs).forEach((key) => el.setAttribute(key, attrs[key]));
    return el;
  }

  // A small softly-rounded star, a short delicate trail (plus a fainter one), and tiny star dust.
  function createStarIcon() {
    const svg = svgEl('svg', { class: 'star-svg', viewBox: '0 0 34 24', 'aria-hidden': 'true', focusable: 'false' });
    svg.appendChild(svgEl('path', { class: 'star-trail', d: 'M20 12.5 Q11 14 2.5 21' }));
    svg.appendChild(svgEl('path', { class: 'star-trail star-trail-faint', d: 'M19.5 9 Q12 8.5 6 12' }));
    svg.appendChild(svgEl('circle', { class: 'star-dust', cx: '12', cy: '18.5', r: '0.9' }));
    svg.appendChild(svgEl('circle', { class: 'star-dust', cx: '7.5', cy: '15', r: '0.7' }));
    svg.appendChild(svgEl('circle', { class: 'star-dust', cx: '15', cy: '21.5', r: '0.6' }));
    svg.appendChild(svgEl('circle', { class: 'star-dust', cx: '4.5', cy: '19', r: '0.55' }));
    svg.appendChild(
      svgEl('path', {
        class: 'star-body',
        transform: 'rotate(-12 26 10)',
        d: 'M26 3 L27.82 7.49 L32.66 7.84 L28.95 10.96 L30.12 15.66 L26 13.1 L21.88 15.66 L23.05 10.96 L19.34 7.84 L24.18 7.49 Z'
      })
    );
    return svg;
  }

  function setStarState(button, label, sent) {
    button.classList.toggle('is-sent', sent);
    button.setAttribute('aria-label', sent ? 'Light sent to this wish' : 'Send a little light to this wish');
    label.textContent = sent ? 'Light sent' : 'Send a little light';
  }

  async function sendLight(wish, button, label) {
    // Already sent (this page view or an earlier visit in this browser): nothing more to do.
    if (button.classList.contains('is-sent')) return;

    setStarState(button, label, true);
    if (!HW.prefersReducedMotion()) {
      button.classList.add('is-sending');
      setTimeout(() => button.classList.remove('is-sending'), 800);
    }

    try {
      await HW.fetchJSON(`/api/wishes/${encodeURIComponent(wish.id)}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorKey: HW.getVisitorKey() })
      });
      HW.rememberReacted(wish.id);
    } catch (err) {
      console.error('Error sending light:', err);
      button.classList.remove('is-sending');
      setStarState(button, label, false);
      setStatus('Something went wrong. Please try again.', true);
    }
  }

  function createWishCard(wish, index, reactedIds) {
    const card = document.createElement('article');
    card.className = 'wish-card';
    card.style.setProperty('--i', String(index));

    const text = document.createElement('p');
    text.className = 'wish-text';
    text.textContent = wish.text;

    const meta = document.createElement('div');
    meta.className = 'wish-meta';

    const time = document.createElement('time');
    time.className = 'wish-time';
    time.setAttribute('datetime', wish.created_at);
    time.textContent = HW.formatDate(wish.created_at);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'star-btn';

    const label = document.createElement('span');
    label.className = 'star-label';

    button.append(createStarIcon(), label);
    setStarState(button, label, reactedIds.includes(wish.id));
    button.addEventListener('click', () => sendLight(wish, button, label));

    meta.append(time, button);
    card.append(text, meta);
    return card;
  }

  function showEmptyState() {
    grid.replaceChildren();
    differentBtn.hidden = true;

    const box = document.createElement('div');
    box.className = 'empty-state';

    const title = document.createElement('p');
    title.className = 'wish-text';
    title.textContent = 'No wishes are here yet.';

    const sub = document.createElement('p');
    sub.textContent = 'You could leave the first one.';

    const cta = document.createElement('a');
    cta.className = 'btn';
    cta.href = '/make-a-wish';
    cta.textContent = 'Leave a wish';

    box.append(title, sub, cta);
    grid.appendChild(box);
  }

  async function loadWishes() {
    if (loading) return;
    loading = true;
    differentBtn.disabled = true;
    setStatus('');

    try {
      const request = HW.fetchJSON(`/api/wishes/random?count=${WISHES_PER_SET}`);

      const existing = grid.querySelectorAll('.wish-card');
      if (existing.length > 0 && !HW.prefersReducedMotion()) {
        existing.forEach((card) => {
          card.style.transition = 'opacity 0.25s ease';
          card.style.opacity = '0';
        });
        await HW.wait(260);
      }

      const data = await request;
      const wishes = (data && data.wishes) || [];

      if (wishes.length === 0) {
        showEmptyState();
        return;
      }

      const reactedIds = HW.getReactedIds();
      const cards = wishes.map((wish, index) => createWishCard(wish, index, reactedIds));
      grid.replaceChildren(...cards);
    } catch (err) {
      console.error('Error loading wishes:', err);
      // Restore any faded cards so the page is never left blank after a failed refresh.
      grid.querySelectorAll('.wish-card').forEach((card) => {
        card.style.opacity = '';
      });
      setStatus('Something went wrong. Please try again.', true);
    } finally {
      loading = false;
      differentBtn.disabled = false;
    }
  }

  differentBtn.addEventListener('click', loadWishes);
  loadWishes();
})();
