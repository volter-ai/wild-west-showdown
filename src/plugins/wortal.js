/**
 * Wortal integration plugin
 * This file provides integration with the Wortal platform
 */

/**
 * Initialize the Wortal plugin
 */
function initializeWortal() {
  console.log('Initializing Wortal plugin');

  // Initialize Wortal SDK if available
  if (typeof window !== 'undefined' && window.Wortal) {
    Wortal.initializeAsync().then(() => {
      console.log('Wortal initialized successfully');
      Wortal.setLoadingProgress(100);
      Wortal.startGameAsync();
    }).catch(error => {
      console.error('Wortal initialization error:', error);
    });
    
    // Set up analytics event listener
    window.addEventListener('game_analytics', handleAnalyticsEvent);
    
    // Track the current page/state
    window.currentGameState = null;
  } else {
    console.warn('Wortal SDK not found');
  }
}

/**
 * Handle analytics events and translate them to Wortal API calls
 * @param {CustomEvent} event - The analytics event
 */
function handleAnalyticsEvent(event) {
  const analyticsData = event.detail;
  
  // Skip if Wortal is not available
  if (typeof window === 'undefined' || !window.Wortal) return;
  
  console.log('Wortal received analytics event:', analyticsData);
  
  // Handle different event types
  switch (analyticsData.type) {
    case 'PAGE_NAVIGATION':
      handlePageNavigation(analyticsData);
      break;
      
    case 'GAME_ACTION':
      handleGameAction(analyticsData);
      break;
  }
}

/**
 * Handle page navigation events
 * @param {Object} data - The navigation event data
 */
function handlePageNavigation(data) {
  const previousState = window.currentGameState;
  const currentState = data.pageName;
  
  // Update current state
  window.currentGameState = currentState;
  
  // Game started (entering game view)
  if (currentState === 'game' && previousState !== 'game') {
    console.log(`Wortal: Game started - Level ${data.level || 'unknown'}`);
    Wortal.analytics.logLevelStart(data.level?.toString() || "1");
    Wortal.session.gameplayStart();
  }
  
  // Game ended (leaving game view)
  if (previousState === 'game' && currentState !== 'game') {
    console.log(`Wortal: Game ended - Navigating to ${currentState}`);
    Wortal.analytics.logLevelEnd(data.level?.toString() || "1", data.score || 0);
    Wortal.session.gameplayStop();
  }
}

/**
 * Handle game action events
 * @param {Object} data - The game action event data
 */
function handleGameAction(data) {
  switch (data.action) {
    case 'AD_WATCH':
      console.log(`Wortal: Ad watch event - ${data.adType}`);
      // Wortal handles ads through its own API, not needed here
      break;
      
    case 'GOLD_COLLECTED':
      console.log(`Wortal: Gold collected - ${data.amount}`);
      break;
  }
}

/**
 * Show a rewarded ad and execute callbacks based on the result
 * @param {Function} onAdStart - Called when ad starts
 * @param {Function} onAdComplete - Called when ad completes successfully
 */
export function showRewardedAd(onAdStart, onAdComplete) {
  if (typeof window !== 'undefined' && window.Wortal) {
    Wortal.ads.showRewarded(
      'free_gold',
      () => { 
        console.log('Wortal: Ad started');
        if (onAdStart) onAdStart();
      },
      () => { 
        console.log('Wortal: Ad completed');
        if (onAdComplete) onAdComplete();
      },
      () => { 
        console.log('Wortal: Ad dismissed');
      },
      () => {
        console.log('Wortal: Ad viewed successfully');
      }
    );
  } else {
    console.warn('Wortal not available, simulating ad completion');
    // Simulate ad flow for testing
    if (onAdStart) onAdStart();
    setTimeout(() => {
      if (onAdComplete) onAdComplete();
    }, 1000);
  }
}

// Auto-initialize when imported
initializeWortal();

export default {
  showRewardedAd
};
