/**
 * BuildMate - Frontend Application
 */

// API base URL
const API_BASE = '/api';

// DOM Elements
const buildForm = document.getElementById('build-form');
const buildResult = document.getElementById('build-result');
const resultContent = document.getElementById('result-content');

/**
 * Initialize the application
 */
function init() {
  // Set up form submission handler
  if (buildForm) {
    buildForm.addEventListener('submit', handleBuildSubmit);
  }

  // Check API health on load
  checkApiHealth();
}

/**
 * Check API health status
 */
async function checkApiHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    console.log('API Status:', data);
  } catch (error) {
    console.error('API health check failed:', error);
  }
}

/**
 * Handle build form submission
 */
async function handleBuildSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnContent = submitBtn.innerHTML;

  // Get form data
  const formData = new FormData(form);
  const data = {
    description: formData.get('description'),
    budgetMin: parseFloat(formData.get('budgetMin')),
    budgetMax: parseFloat(formData.get('budgetMax')),
  };

  // Validate
  if (!data.description || !data.budgetMin || !data.budgetMax) {
    showAlert('Please fill in all fields', 'error');
    return;
  }

  if (data.budgetMin >= data.budgetMax) {
    showAlert('Minimum budget must be less than maximum budget', 'error');
    return;
  }

  // Show loading state
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Creating...';

  try {
    const response = await fetch(`${API_BASE}/builds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to create build');
    }

    // Show success result
    showBuildResult(result);
    form.reset();
  } catch (error) {
    console.error('Build creation error:', error);
    showAlert(error.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnContent;
  }
}

/**
 * Show build result
 */
function showBuildResult(build) {
  buildResult.classList.remove('hidden');

  resultContent.innerHTML = `
    <div class="build-info">
      <div class="alert alert-success">
        Build created successfully!
      </div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Build ID</span>
          <span class="info-value">${build.buildId}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Description</span>
          <span class="info-value">${escapeHtml(build.description)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Budget</span>
          <span class="info-value">$${build.budget.min.toLocaleString()} - $${build.budget.max.toLocaleString()}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Status</span>
          <span class="info-value status-badge">${build.status}</span>
        </div>
      </div>
      <div class="next-steps">
        <p>Next step: Initialize your build to get AI-powered component recommendations.</p>
        <button class="btn btn-primary" onclick="initializeBuild('${build.buildId}')">
          Initialize Build
        </button>
      </div>
    </div>
  `;

  // Add styles for build info
  addBuildInfoStyles();

  // Scroll to result
  buildResult.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Initialize a build (trigger AI)
 */
async function initializeBuild(buildId) {
  const btn = event.target;
  const originalContent = btn.innerHTML;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Initializing...';

  try {
    const response = await fetch(`${API_BASE}/builds/${buildId}/init`, {
      method: 'POST',
    });

    const result = await response.json();

    if (response.status === 501) {
      showAlert('AI structure generation is coming soon!', 'info');
    } else if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to initialize build');
    } else {
      showAlert('Build initialized successfully!', 'success');
    }
  } catch (error) {
    console.error('Build initialization error:', error);
    showAlert(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalContent;
  }
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
  // Remove existing alerts
  const existingAlerts = document.querySelectorAll('.alert-toast');
  existingAlerts.forEach((alert) => alert.remove());

  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-toast`;
  alert.textContent = message;

  // Add toast styles
  alert.style.cssText = `
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1000;
    max-width: 400px;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(alert);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    alert.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => alert.remove(), 300);
  }, 5000);
}

/**
 * Add build info styles dynamically
 */
function addBuildInfoStyles() {
  if (document.getElementById('build-info-styles')) return;

  const styles = document.createElement('style');
  styles.id = 'build-info-styles';
  styles.textContent = `
    .build-info {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .info-label {
      font-size: 0.875rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .info-value {
      font-size: 1rem;
      color: var(--text);
      word-break: break-all;
    }

    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background: var(--primary);
      color: white;
      border-radius: 1rem;
      font-size: 0.875rem;
      width: fit-content;
    }

    .next-steps {
      padding-top: 1rem;
      border-top: 1px solid var(--border);
    }

    .next-steps p {
      color: var(--text-muted);
      margin-bottom: 1rem;
    }

    .alert-info {
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid var(--primary);
      color: var(--primary-light);
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(styles);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Make initializeBuild available globally
window.initializeBuild = initializeBuild;
