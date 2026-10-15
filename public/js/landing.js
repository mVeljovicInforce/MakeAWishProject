(function () {
  const featured = document.getElementById('featured');
  const featuredText = document.getElementById('featuredText');
  const anotherBtn = document.getElementById('anotherBtn');
  const heroStatus = document.getElementById('heroStatus');

  let currentId = null;
  let busy = false;

  function setStatus(message, isError) {
    heroStatus.textContent = message || '';
    heroStatus.classList.toggle('is-error', Boolean(isError));
  }

  function showEmptyState() {
    featured.hidden = true;
    anotherBtn.hidden = true;
    heroStatus.textContent = '';

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
    featured.parentNode.insertBefore(box, featured);
  }

  // Gently crossfade to a new wish. Text is always inserted with textContent.
  async function showWish(wish) {
    const animate = !HW.prefersReducedMotion() && featuredText.textContent !== '';
    if (animate) {
      featured.classList.add('is-hidden');
      await HW.wait(400);
    }
    featuredText.textContent = wish.text;
    currentId = wish.id;
    // Let the browser paint the new text at opacity 0 before fading back in.
    requestAnimationFrame(() => featured.classList.remove('is-hidden'));
  }

  async function loadFeatured() {
    try {
      const data = await HW.fetchJSON('/api/wishes/featured');
      if (data && data.wish) {
        await showWish(data.wish);
        return;
      }
      // No featured wish flagged: fall back to any random wish.
      const random = await HW.fetchJSON('/api/wishes/random?count=1');
      if (random && random.wishes && random.wishes.length > 0) {
        await showWish(random.wishes[0]);
      } else {
        showEmptyState();
      }
    } catch (err) {
      console.error('Error loading featured wish:', err);
      setStatus('Something went wrong. Please try again.', true);
    }
  }

  async function readAnother() {
    if (busy) return;
    busy = true;
    anotherBtn.disabled = true;
    setStatus('');

    try {
      const query = currentId ? `&exclude=${encodeURIComponent(currentId)}` : '';
      const data = await HW.fetchJSON(`/api/wishes/random?count=1${query}`);
      if (data && data.wishes && data.wishes.length > 0) {
        await showWish(data.wishes[0]);
      } else {
        setStatus("That's the only wish here for now.");
      }
    } catch (err) {
      console.error('Error loading wish:', err);
      setStatus('Something went wrong. Please try again.', true);
    } finally {
      busy = false;
      anotherBtn.disabled = false;
    }
  }

  anotherBtn.addEventListener('click', readAnother);
  loadFeatured();
})();
