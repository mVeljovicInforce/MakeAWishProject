(function () {
  const MAX_LENGTH = 500;

  const formSection = document.getElementById('formSection');
  const successSection = document.getElementById('successSection');
  const form = document.getElementById('wishForm');
  const input = document.getElementById('wishInput');
  const charCount = document.getElementById('charCount');
  const charCountValue = document.getElementById('charCountValue');
  const releaseBtn = document.getElementById('releaseBtn');
  const message = document.getElementById('formMessage');
  const leaveAnotherBtn = document.getElementById('leaveAnotherBtn');

  let submitting = false;

  function setMessage(text, isError) {
    message.textContent = text || '';
    message.classList.toggle('is-error', Boolean(isError));
  }

  function updateCounter() {
    const length = input.value.length;
    charCountValue.textContent = String(length);
    charCount.classList.toggle('is-near', length >= MAX_LENGTH - 50);
  }

  async function showSuccess() {
    if (!HW.prefersReducedMotion()) {
      formSection.style.transition = 'opacity 0.5s ease';
      formSection.style.opacity = '0';
      await HW.wait(500);
    }
    formSection.hidden = true;
    formSection.style.opacity = '';
    formSection.style.transition = '';
    successSection.hidden = false;
    successSection.focus();
  }

  function showForm() {
    successSection.hidden = true;
    formSection.hidden = false;
    setMessage('');
    input.focus();
  }

  input.addEventListener('input', updateCounter);
  leaveAnotherBtn.addEventListener('click', showForm);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting) return;

    const text = input.value.trim();

    if (!text) {
      setMessage('Your wish is empty. Write a few words first.', true);
      input.focus();
      return;
    }

    if (text.length > MAX_LENGTH) {
      setMessage('That is a little long. A wish can be up to 500 characters.', true);
      input.focus();
      return;
    }

    submitting = true;
    releaseBtn.disabled = true;
    releaseBtn.textContent = 'Releasing...';
    setMessage('');

    try {
      await HW.fetchJSON('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      input.value = '';
      updateCounter();
      await showSuccess();
    } catch (err) {
      console.error('Error releasing wish:', err);
      if (err.status === 400) {
        setMessage('A wish needs 1 to 500 characters. Please check yours and try again.', true);
      } else {
        setMessage("Your wish couldn't be released just now. Please try again.", true);
      }
    } finally {
      submitting = false;
      releaseBtn.disabled = false;
      releaseBtn.textContent = 'Release my wish';
    }
  });

  updateCounter();
})();
