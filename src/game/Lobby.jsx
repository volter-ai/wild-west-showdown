import React, { useEffect, useState } from 'react';
import { PLAYER } from '../playerData';
import { MIN_PLAYERS, MAX_PLAYERS } from './config';
import { BOT_NAMES } from './botNames';
import { ASSETS } from '../assetManifest';

const WesternButton = ({ onClick, children, className = '', disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`relative px-4 py-2 font-['Rye'] text-amber-100 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 ${className}`}
  >
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
      <path
        d="M5,2 L95,2 C97,2 98,3 98,5 L98,35 C98,37 97,38 95,38 L5,38 C3,38 2,37 2,35 L2,5 C2,3 3,2 5,2 Z"
        fill="#8B4513"
        stroke="#422006"
        strokeWidth="2"
      />
      <path
        d="M10,6 L90,6 C92,6 94,7 94,9 L94,31 C94,33 92,34 90,34 L10,34 C8,34 6,33 6,31 L6,9 C6,7 8,6 10,6 Z"
        fill="#A0522D"
        stroke="#422006"
        strokeWidth="1"
      />
    </svg>
    <span className="relative z-10 drop-shadow-md">{children}</span>
  </button>
);

const WesternInput = ({ value, onChange, placeholder, className = '' }) => (
  <div className={`relative ${className}`}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
      <path
        d="M5,2 L95,2 C97,2 98,3 98,5 L98,35 C98,37 97,38 95,38 L5,38 C3,38 2,37 2,35 L2,5 C2,3 3,2 5,2 Z"
        fill="#3C2415"
        stroke="#422006"
        strokeWidth="2"
      />
    </svg>
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full h-full bg-transparent relative z-10 px-4 py-2 text-amber-100 font-['Special_Elite'] placeholder-amber-100/50 outline-none"
    />
  </div>
);

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
    <div className="flex flex-col items-center justify-center h-full w-full bg-amber-900/20 text-amber-100 relative">
      {/* Background image */}
      <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{backgroundImage: `url(${ASSETS.backgrounds.mainMenu.path})`}} />
      
      <div className="relative z-10 max-w-md w-full p-6">
        <div className="relative mb-6">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="none">
            <path
              d="M10,0 L190,0 C195,0 200,5 200,10 L200,50 C200,55 195,60 190,60 L10,60 C5,60 0,55 0,50 L0,10 C0,5 5,0 10,0 Z"
              fill="#2D1B0E"
              fillOpacity="0.85"
              stroke="#422006"
              strokeWidth="2"
            />
          </svg>
          <h1 className="text-3xl font-['Rye'] text-center relative z-10 py-4">Game Lobby</h1>
        </div>
        
        <div className="mb-6 relative">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 150" preserveAspectRatio="none">
            <path
              d="M10,0 L290,0 C295,0 300,5 300,10 L300,140 C300,145 295,150 290,150 L10,150 C5,150 0,145 0,140 L0,10 C0,5 5,0 10,0 Z"
              fill="#2D1B0E"
              fillOpacity="0.85"
              stroke="#422006"
              strokeWidth="2"
            />
          </svg>
          <div className="p-4 relative z-10">
            <p className="text-center font-['Special_Elite'] mb-3">Enter Lobby ID to join a specific lobby or leave blank to create a new lobby:</p>
            <WesternInput
              value={inputLobbyId}
              onChange={handleLobbyIdChange}
              placeholder="Enter Lobby ID"
              className="h-10 mb-3"
            />
            <div className="flex justify-center">
              <WesternButton onClick={handleJoinLobby}>
                Join Lobby
              </WesternButton>
            </div>
            {joinError && <p className="mt-2 text-red-500 text-center font-['Special_Elite']">{joinError}</p>}
          </div>
        </div>

        {lobbyId && (
          <div className="relative mb-6">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 250" preserveAspectRatio="none">
              <path
                d="M10,0 L290,0 C295,0 300,5 300,10 L300,240 C300,245 295,250 290,250 L10,250 C5,250 0,245 0,240 L0,10 C0,5 5,0 10,0 Z"
                fill="#2D1B0E"
                fillOpacity="0.85"
                stroke="#422006"
                strokeWidth="2"
              />
            </svg>
            <div className="p-4 relative z-10">
              <p className="text-center font-['Special_Elite'] mb-2">Your Lobby ID: <span className="font-bold">{lobbyId}</span></p>
              <h2 className="text-xl font-['Rye'] text-center mt-4 mb-2">Connected Players:</h2>
              <div className="bg-amber-900/30 rounded-lg p-2 mb-4 border border-amber-800/50 max-h-32 overflow-y-auto">
                <ul className="font-['Special_Elite']">
                  {usersList.map((user) => (
                    <li key={user.sid} className="p-1 flex items-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" className="mr-2 text-amber-500">
                        <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                      </svg>
                      {user.name}
                      {user.is_host && (
                        <span className="ml-2 text-yellow-400 text-xs">
                          (Host)
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-center font-['Special_Elite'] mb-4">
                {`Waiting for players... (${usersList.length}/${MAX_PLAYERS})`}
              </p>
              {gameInterface.userId === gameInterface.hostId && (
                <div className="flex justify-center">
                  <WesternButton
                    onClick={handleStartGame}
                    disabled={usersList.length < MIN_PLAYERS}
                    className={usersList.length < MIN_PLAYERS ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    Start Game
                  </WesternButton>
                </div>
              )}
              {usersList.length < MIN_PLAYERS && gameInterface.userId === gameInterface.hostId && (
                <p className="mt-2 text-yellow-400 text-center font-['Special_Elite']">
                  Need at least {MIN_PLAYERS} players to start
                </p>
              )}
            </div>
          </div>
        )}
      </div>
      
      <WesternButton
        onClick={onFinishGame}
        className="absolute bottom-4 left-4"
      >
        Leave
      </WesternButton>
    </div>
  );
}

export default Lobby;
