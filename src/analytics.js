/**
 * Analytics module for tracking user actions and game navigation
 */

/**
 * Initialize analytics
 */
export function initializeAnalytics() {
  console.log('Analytics initialized');
  
  // Set up any global analytics listeners or configurations here
  if (typeof window !== 'undefined') {
    window.addEventListener('game_analytics', (event) => {
      // Make analytics events available on window for debugging
      window.lastAnalyticsEvent = event.detail;
    });
  }
}

/**
 * Track a page navigation event
 * @param {string} pageName - The name of the page being navigated to
 * @param {Object} params - Additional parameters to include with the event
 */
export function trackPageNavigation(pageName, params = {}) {
  const event = {
    type: 'PAGE_NAVIGATION',
    pageName,
    timestamp: Date.now(),
    ...params
  };
  
  // Log to console for development
  console.log('Analytics Event:', event);
  
  // Dispatch a custom event to the window for external tracking
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('game_analytics', { 
      detail: event 
    }));
  }
}

/**
 * Track a game action event
 * @param {string} action - The action being performed
 * @param {Object} params - Additional parameters to include with the event
 */
export function trackGameAction(action, params = {}) {
  const event = {
    type: 'GAME_ACTION',
    action,
    timestamp: Date.now(),
    ...params
  };
  
  // Log to console for development
  console.log('Analytics Event:', event);
  
  // Dispatch a custom event to the window for external tracking
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('game_analytics', { 
      detail: event 
    }));
  }
}

/**
 * Track when a player starts a game session
 * @param {Object} params - Additional parameters like level number
 */
export function trackGameStart(params = {}) {
  trackGameAction('GAME_START', params);
}

/**
 * Track when a player ends a game session
 * @param {Object} params - Additional parameters like score, time played
 */
export function trackGameEnd(params = {}) {
  trackGameAction('GAME_END', params);
}

/**
 * Track when a player watches an ad
 * @param {string} adType - The type of ad (rewarded, interstitial)
 * @param {Object} params - Additional parameters
 */
export function trackAdWatch(adType, params = {}) {
  trackGameAction('AD_WATCH', { adType, ...params });
}

/**
 * Track when a player collects gold
 * @param {number} amount - Amount of gold collected
 * @param {Object} params - Additional parameters
 */
export function trackGoldCollected(amount, params = {}) {
  trackGameAction('GOLD_COLLECTED', { amount, ...params });
}
