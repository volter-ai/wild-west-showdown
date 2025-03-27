// Lazy evaluation of game ID to ensure window is available
const getGameId = () => {
  if (typeof window !== 'undefined') {
    // Check window.gameId first
    if (window.gameId) {
      return window.gameId;
    }
    
    // Use full URL as the game ID
    return window.location.href;
  }
  
  // Fall back to default
  return 'wild-west-showdown-v1';
};

// Export the getter function instead of the value
export const GAME_ID = getGameId();

// Player count configuration
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
