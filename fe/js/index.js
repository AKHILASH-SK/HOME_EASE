/**
 * ==============================================================================
 * HomeEase - Guest Landing Page Logic (index.html)
 * ==============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // If user is already logged in, redirect directly to home.html
  const currentUser = getCurrentUser();
  if (currentUser) {
    window.location.href = 'home.html';
    return;
  }

  // Check if URL query has ?login=true or ?register=true to automatically open modal
  const params = new URLSearchParams(window.location.search);
  if (params.get('login') === 'true') {
    openAuthModal('login');
  } else if (params.get('register') === 'true') {
    openAuthModal('register');
  }
});
