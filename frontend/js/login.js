// Login page JavaScript

document.addEventListener('DOMContentLoaded', () => {
  // Check if user is already logged in
  const token = localStorage.getItem('token');
  if (token) {
    window.location.href = 'home.html';
    return;
  }

  const loginForm = document.getElementById('login-form');
  const errorMessage = document.getElementById('error-message');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form data
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Basic validation
    if (!email || !password) {
      showError('Please enter both email and password');
      return;
    }
    
    try {
      // Show loading state
      const submitButton = loginForm.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.textContent;
      submitButton.textContent = 'Signing in...';
      submitButton.disabled = true;
      
      // Make API request
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      // Reset button state
      submitButton.textContent = originalButtonText;
      submitButton.disabled = false;
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      // Save token and user info to localStorage
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify({
        id: data.data.id,
        username: data.data.username,
        email: data.data.email
      }));
      
      // Redirect to home page
      window.location.href = 'home.html';
      
    } catch (error) {
      showError(error.message || 'Login failed. Please try again.');
    }
  });
  
  // Function to show error message
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    
    // Hide error after 5 seconds
    setTimeout(() => {
      errorMessage.classList.add('hidden');
    }, 5000);
  }
}); 