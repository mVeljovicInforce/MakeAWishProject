const wishesContainer = document.getElementById('wishesContainer');
const refreshBtn = document.getElementById('refreshBtn');
const wishForm = document.getElementById('wishForm');
const wishInput = document.getElementById('wishInput');
const charCount = document.getElementById('charCount');
const formMessage = document.getElementById('formMessage');

let animationCounter = 0;
let isSubmitting = false;

// Load initial wishes on page load
document.addEventListener('DOMContentLoaded', () => {
  loadWishes();
});

// Character count tracker
wishInput.addEventListener('input', (e) => {
  charCount.textContent = e.target.value.length;
  const count = document.querySelector('.char-count');
  if (e.target.value.length > 400) {
    count.classList.add('warning');
  } else {
    count.classList.remove('warning');
  }
});

// Refresh wishes button
refreshBtn.addEventListener('click', loadWishes);

// Submit wish form
wishForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (isSubmitting) {
    return;
  }

  const text = wishInput.value.trim();

  if (!text) {
    showFormMessage('Please write a wish first', 'error');
    return;
  }

  if (text.length > 500) {
    showFormMessage('Wish is too long (max 500 characters)', 'error');
    return;
  }

  isSubmitting = true;
  refreshBtn.disabled = true;
  const submitBtn = wishForm.querySelector('.btn-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Releasing...';

  try {
    const response = await fetch('/api/wishes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to submit wish');
    }

    showFormMessage('Your wish is out there now.', 'success');
    wishInput.value = '';
    charCount.textContent = '0';
    document.querySelector('.char-count').classList.remove('warning');

    // Reload wishes after a short delay
    setTimeout(() => {
      loadWishes();
    }, 500);
  } catch (err) {
    console.error('Error submitting wish:', err);
    showFormMessage(err.message || 'Failed to submit wish. Please try again.', 'error');
  } finally {
    isSubmitting = false;
    refreshBtn.disabled = false;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Release your wish';
  }
});

async function loadWishes() {
  refreshBtn.disabled = true;

  const existingCards = wishesContainer.querySelectorAll('.wish-card');
  existingCards.forEach((card) => card.classList.add('is-fading-out'));

  const wishesRequest = fetch('/api/wishes/random?count=3');

  if (existingCards.length > 0 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    await new Promise((resolve) => setTimeout(resolve, 220));
  }

  wishesContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  try {
    const response = await wishesRequest;

    if (!response.ok) {
      throw new Error('Failed to load wishes');
    }

    const data = await response.json();
    const wishes = data.wishes || [];

    // Clear container
    wishesContainer.innerHTML = '';

    if (wishes.length === 0) {
      wishesContainer.innerHTML = '<div class="loading">No wishes yet. Be the first to share one!</div>';
      refreshBtn.disabled = false;
      return;
    }

    // Add wishes with staggered animation
    wishes.forEach((wish, index) => {
      setTimeout(() => {
        const card = createWishCard(wish);
        wishesContainer.appendChild(card);
      }, index * 100);
    });

    refreshBtn.disabled = false;
  } catch (err) {
    console.error('Error loading wishes:', err);
    wishesContainer.innerHTML = '<div class="loading">Could not load wishes. Please try again.</div>';
    refreshBtn.disabled = false;
  }
}

function createWishCard(wish) {
  const card = document.createElement('div');
  card.className = 'wish-card';
  card.style.setProperty('--animation-order', animationCounter++);

  const text = document.createElement('p');
  text.className = 'wish-text';
  text.textContent = wish.text;

  const date = document.createElement('p');
  date.className = 'wish-date';
  date.textContent = formatDate(wish.created_at);

  card.appendChild(text);
  card.appendChild(date);

  return card;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function showFormMessage(message, type) {
  formMessage.textContent = message;
  formMessage.className = `form-message show ${type}`;

  setTimeout(() => {
    formMessage.classList.remove('show');
  }, 4000);
}
