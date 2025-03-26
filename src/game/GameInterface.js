import io from 'socket.io-client';
import { PLAYER } from '../playerData';
import { GAME_ID, MIN_PLAYERS, MAX_PLAYERS } from './config';

class GameInterface {
  constructor(levelId) {
    this.socket = null;
    this.userId = 'local-player';
    const urlParams = new URLSearchParams(window.location.search);
    const isAutoplay = urlParams.get('autoplay') === 'true';
    this.users = {
      'local-player': {
        sid: 'local-player',
        name: PLAYER.name,
        stats: {...PLAYER.stats},
        is_host: true,
        is_bot: isAutoplay
      }
    };
    this.hostId = 'local-player';
    this.lobbyId = null;
    this.callbacks = {};
    this.isConnected = false;
    this.actionQueue = [];
    this.levelId = levelId;
    console.log('GameInterface: Initialized');
  }

  connect() {
    console.log('GameInterface: Attempting to connect to server...');
    // Connection options that help avoid 400 errors in console
    const options = {
      reconnection: false,      // Don't attempt to reconnect
      timeout: 5000,            // Short timeout to fail faster
      autoConnect: true,        // Connect immediately
      forceNew: true,           // Force a new connection
      transports: ['websocket'] // Skip polling which causes 400 errors in console
    };

    this.socket = io('https://sockets_1.draw2.games', options);

    this.socket.on('connect', () => {
      console.log('GameInterface: Connected to server successfully');
      this.isConnected = true;
      this.userId = this.socket.id;

      // Trigger 'connected' event
      if (this.callbacks.connected) {
        this.callbacks.connected();
      }
    });

    this.socket.on('connect_error', () => {
      // Silently fail
      this.isConnected = false;
    });

    this.socket.on('join_lobby_success', (data) => {
      this.lobbyId = data.lobby_id;
      console.log('GameInterface: Joined lobby', this.lobbyId);
      this.updateUserData();
    });

    this.socket.on('join_lobby_failed', (data) => {
      console.warn('GameInterface: Failed to join lobby:', data.error);
      if (this.callbacks.join_lobby_failed) {
        this.callbacks.join_lobby_failed(data.error);
      }
    });

    this.socket.on('game_event', (data) => {
      const eventType = data.type;
      const eventData = data.data;

      if (eventType === 'player_list_changed') {
        console.log('GameInterface: Handling player_list_changed event');
        this.hostId = eventData.host_id;
        this.lobbyId = eventData.lobby_id;
        // Update users data
        this.users = eventData.users;
        console.log('GameInterface: Updated users data', this.users);
        if (this.callbacks.player_list_changed) {
          this.callbacks.player_list_changed(eventData);
        }
      } else {
        if (this.callbacks[eventType]) {
          if (eventData.user_id) {
            eventData.userId = eventData.user_id;
          }
          this.callbacks[eventType](eventData);
        }
      }
    });

    this.socket.on('disconnect', () => {
      // Silently handle disconnection
      this.isConnected = false;
    });
  }

  updateUserData() {
    this.sendGameEvent('update_user_data', {
      name: PLAYER.name,
      stats: PLAYER.stats
    });
  }

  joinLobby(lobbyId = null) {
    if (!this.isConnected) {
      console.warn('GameInterface: Cannot join lobby, not connected');
      return;
    }
    if (this.lobbyId) {
      this.leaveLobby(() => {
        this.socket.emit('join_lobby', {
          lobby_id: lobbyId,
          player_name: PLAYER.name,
          game_id: GAME_ID,
          level_id: this.levelId,
          min_players: MIN_PLAYERS,
          max_players: MAX_PLAYERS
        });
      });
    } else {
      this.socket.emit('join_lobby', {
        lobby_id: lobbyId,
        player_name: PLAYER.name,
        game_id: GAME_ID,
        level_id: this.levelId,
        min_players: MIN_PLAYERS,
        max_players: MAX_PLAYERS
      });
    }
  }

  createNewLobby() {
    if (!this.isConnected) {
      console.warn('GameInterface: Cannot create lobby, not connected');
      return;
    }
    if (this.lobbyId) {
      this.leaveLobby(() => {
        this.socket.emit('join_lobby', {
          create_new: true,
          player_name: PLAYER.name,
          game_id: GAME_ID,
          level_id: this.levelId,
          min_players: MIN_PLAYERS,
          max_players: MAX_PLAYERS
        });
      });
    } else {
      this.socket.emit('join_lobby', {
        create_new: true,
        player_name: PLAYER.name,
        game_id: GAME_ID,
        level_id: this.levelId,
        min_players: MIN_PLAYERS,
        max_players: MAX_PLAYERS
      });
    }
  }

  leaveLobby(callback) {
    if (!this.isConnected) {
      if (callback) callback();
      return;
    }
    if (this.lobbyId) {
      console.log('GameInterface: Leaving lobby', this.lobbyId);
      this.socket.emit('leave_lobby', { lobby_id: this.lobbyId }, () => {
        this.lobbyId = null;
        this.users = {};
        this.hostId = null;
        if (callback) callback();
      });
    } else if (callback) {
      callback();
    }
  }

  on(event, callback) {
    console.log('GameInterface: Registered callback for event:', event);
    this.callbacks[event] = callback;
  }

  sendGameEvent(type, data) {
    // If we're the host or it's a bot action, directly call the callback
    if ((this.userId === this.hostId || data.userId?.startsWith('bot-')) && this.callbacks[type]) {
      this.callbacks[type]({
        ...data,
        userId: data.userId || this.userId
      });
    }

    // Always send to server for other clients if connected
    if (this.isConnected && this.socket) {
      try {
        this.socket.emit('game_event', {
          type,
          data
        });
      } catch (e) {
        // Silently fail on any socket errors
        this.isConnected = false;
      }
    }
  }

  sendGameStateUpdate(gameState) {
    // Skip silently if we've detected an invalid session or error
    if (!this.isConnected) {
      return;
    }

    try {
      // Handle circular references in game state
      const serializedState = JSON.parse(JSON.stringify(gameState, (key, value) => {
        // Drop functions
        if (typeof value === 'function') {
          return undefined;
        }

        // Skip any socket objects
        if (key === 'socket' || (value && typeof value === 'object' && value.on && value.emit)) {
          return undefined;
        }

        // If the object has getPosition and getAngle, assume it is a physics body
        if (value && typeof value.getPosition === 'function' && typeof value.getAngle === 'function') {
          return {
            position: value.getPosition(),
            angle: value.getAngle()
          };
        }
        return value;
      }));

      // Only try to send if still connected
      if (this.isConnected) {
        this.sendGameEvent('game_state_update', serializedState);
      }
    } catch (error) {
      // Silently fail and disconnect
      this.isConnected = false;
      if (this.socket) {
        this.socket.disconnect();
      }
    }
  }

  sendStartGame() {
    console.log('GameInterface: Sending start_game event');
    this.sendGameEvent('start_game', {});
  }

  sendGameFinish() {
    console.log('GameInterface: Sending game_ended event');
    this.sendGameEvent('game_ended', {});
  }

  disconnect() {
    console.log('GameInterface: Disconnecting from server');
    if (this.isConnected && this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
    }
  }
}

export default GameInterface;