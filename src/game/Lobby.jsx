import React, { useEffect, useState } from 'react';
import { PLAYER } from '../playerData';
import { MIN_PLAYERS, MAX_PLAYERS } from './config';
import { BOT_NAMES } from './botNames';

function Lobby({ gameInterface, onFinishGame }) {
  const [usersList, setUsersList] = useState([]);
  const [lobbyId, setLobbyId] = useState(gameInterface?.lobbyId);
  const [inputLobbyId, setInputLobbyId] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const updateUsers = (data) => {
      setUsersList(Object.values(gameInterface.users));
      setLobbyId(data.lobby_id);
    };

    const handleJoinLobbyFailed = (error) => {
      setJoinError(error);
      setIsJoining(false);
    };

    const handleConnected = () => {
      console.log('Lobby: Connected to server, attempting to join lobby');
      if (!gameInterface.lobbyId && !isJoining) {
        setIsJoining(true);
        gameInterface.joinLobby();
      }
    };

    gameInterface.on('player_list_changed', updateUsers);
    gameInterface.on('join_lobby_failed', handleJoinLobbyFailed);
    gameInterface.on('connected', handleConnected);

    if (gameInterface.isConnected) {
      handleConnected();
    }

    return () => {
      if (gameInterface.callbacks.player_list_changed === updateUsers) {
        gameInterface.callbacks.player_list_changed = null;
      }
      if (gameInterface.callbacks.join_lobby_failed === handleJoinLobbyFailed) {
        gameInterface.callbacks.join_lobby_failed = null;
      }
      if (gameInterface.callbacks.connected === handleConnected) {
        gameInterface.callbacks.connected = null;
      }
    };
  }, [gameInterface, isJoining]);

  const handleLobbyIdChange = (e) => {
    setInputLobbyId(e.target.value.toUpperCase());
  };

  const handleJoinLobby = () => {
    setJoinError('');
    gameInterface.joinLobby(inputLobbyId.trim() || null);
  };

  const addBots = () => {
    const currentPlayers = Object.values(gameInterface.users).length;
    const botsNeeded = MAX_PLAYERS - currentPlayers;
    
    for (let i = 0; i < botsNeeded; i++) {
      const botId = `bot-${i}`;
      
      gameInterface.users[botId] = {
        sid: botId,
        name: `Bot ${i + 1}`,
        stats: { ...PLAYER.stats },
        is_bot: true,
        lobby_id: lobbyId
      };
    }
  };

  const handleStartGame = () => {
    if (usersList.length < MAX_PLAYERS) {
      addBots();
    }
    gameInterface.sendStartGame();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-gray-800 text-white">
      <h1 className="text-3xl mb-4">Game Lobby</h1>
      <p>Enter Lobby ID to join a specific lobby or leave blank to create a new lobby:</p>
      <input
        className="mt-2 px-2 py-1 text-black rounded"
        type="text"
        value={inputLobbyId}
        onChange={handleLobbyIdChange}
      />
      <div className="flex gap-2 mt-2">
        <button
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          onClick={handleJoinLobby}
        >
          Join Lobby
        </button>
      </div>
      {joinError && <p className="mt-2 text-red-500">{joinError}</p>}

      {lobbyId && (
        <>
          <p className="mt-4">Your Lobby ID: {lobbyId}</p>
          <h2 className="text-2xl mt-4">Connected Players:</h2>
          <ul className="mt-2">
            {usersList.map((user) => (
              <li key={user.sid}>
                {user.name}
                {user.is_host && ' (Host)'}
              </li>
            ))}
          </ul>
          <p className="mt-6">
            {`Waiting for players... (${usersList.length}/${MAX_PLAYERS})`}
          </p>
          {gameInterface.userId === gameInterface.hostId && (
            <div className="mt-4 flex flex-col items-center">
              <button
                className={`px-4 py-2 text-white rounded ${
                  usersList.length >= MIN_PLAYERS
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-600 cursor-not-allowed'
                }`}
                onClick={handleStartGame}
                disabled={usersList.length < MIN_PLAYERS}
              >
                Start Game
              </button>
              {usersList.length < MIN_PLAYERS && (
                <p className="mt-2 text-yellow-400">
                  Need at least {MIN_PLAYERS} players to start
                </p>
              )}
            </div>
          )}
        </>
      )}
      <button
        onClick={onFinishGame}
        className="absolute bottom-4 left-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
      >
        Leave
      </button>
    </div>
  );
}

export default Lobby;
