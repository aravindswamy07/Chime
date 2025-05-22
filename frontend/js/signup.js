// Signup page JavaScript

document.addEventListener('DOMContentLoaded', () => {
  // Check if user is already logged in
  const token = localStorage.getItem('token');
  if (token) {
    window.location.href = 'home.html';
    return;
  }

  const signupForm = document.getElementById('signup-form');
  const errorMessage = document.getElementById('error-message');

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form data
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Basic validation
    if (!username || !email || !password || !confirmPassword) {
      showError('Please fill in all fields');
      return;
    }
    
    if (password.length < 8) {
      showError('Password must be at least 8 characters long');
      return;
    }
    
    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }
    
    try {
      // Show loading state
      const submitButton = signupForm.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.textContent;
      submitButton.textContent = 'Creating account...';
      submitButton.disabled = true;
      
      // Make API request
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      });
      
      const data = await response.json();
      
      // Reset button state
      submitButton.textContent = originalButtonText;
      submitButton.disabled = false;
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
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
      showError(error.message || 'Registration failed. Please try again.');
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