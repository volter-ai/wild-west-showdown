import React, { useState, useEffect } from 'react';
import { Joystick } from './CommonUI';

const HUD = ({ gameState, currentUserId }) => {
  const currentPlayer = gameState.entities[currentUserId];
  if (!currentPlayer) return null;
  
  const timeRemaining = Math.ceil(gameState.timeRemaining / 1000);
  const playerName = currentPlayer.name || 'Unknown Player';
  const health = currentPlayer.health;
  const maxHealth = currentPlayer.maxHealth;
  const gold = currentPlayer.gold;
  const ammo = currentPlayer.ammo;
  const maxAmmo = currentPlayer.maxAmmo;
  const isReloading = currentPlayer.reloading;
  const isEliminated = currentPlayer.eliminated;

  return (
    <div
      className="absolute top-0 left-0 right-0 p-2 bg-black bg-opacity-50 text-gray-300 font-game"
      style={{ userSelect: 'none' }}
    >
      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <p>Playing as: {playerName}</p>
          <div className="flex items-center">
            <span>❤️ </span>
            <div className="w-20 h-4 bg-gray-700 rounded-full ml-1 overflow-hidden">
              <div 
                className="h-full rounded-full" 
                style={{ 
                  width: `${(health / maxHealth) * 100}%`,
                  backgroundColor: health > maxHealth * 0.5 ? '#4CAF50' : '#F44336'
                }}
              />
            </div>
          </div>
          <p>💰 {gold}</p>
          <p>🔫 {ammo}/{maxAmmo} {isReloading ? '(Reloading...)' : ''}</p>
        </div>
        <p>⏱️ {timeRemaining}s</p>
      </div>
      
      {isEliminated && (
        <div className="text-center text-red-500 font-bold mt-2">
          ELIMINATED! Respawning in {Math.ceil(currentPlayer.respawnTime / 1000)}s
        </div>
      )}
    </div>
  );
};

const Leaderboard = ({ leaderboard }) => {
  return (
    <div
      className="absolute top-16 right-2 p-2 bg-black bg-opacity-50 text-gray-300 font-game rounded"
      style={{ userSelect: 'none', maxWidth: '200px' }}
    >
      <h3 className="text-center font-bold mb-1">Leaderboard</h3>
      <ul>
        {leaderboard.map((player, index) => (
          <li key={index} className="flex justify-between">
            <span>{player.name}</span>
            <span>{player.score} pts</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const GameOverModal = ({ results, onFinish }) => {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-4 rounded-lg text-black">
        <h2 className="text-xl font-bold mb-4">Game Over!</h2>
        <div className="mb-4">
          <p>Winners: {results.winners.join(', ') || 'None'}</p>
          <p>Losers: {results.losers.join(', ') || 'None'}</p>
        </div>
        <h3 className="font-bold mb-2">Final Scores:</h3>
        <ul className="mb-4">
          {results.leaderboard.map((player, index) => (
            <li key={index} className="flex justify-between">
              <span>{player.name}</span>
              <span>{player.score} pts (Gold: {player.gold})</span>
            </li>
          ))}
        </ul>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={onFinish}
        >
          OK
        </button>
      </div>
    </div>
  );
};

function GameUI({ gameState, gameInterface, onFinishGame }) {
  const [, forceUpdate] = useState();

  const handleMove = (dx, dy) => {
    gameInterface.sendGameEvent('joystick_move', {dx, dy, userId: gameInterface.userId});
  }

  const handleShoot = (e) => {
    e.preventDefault();
    gameInterface.sendGameEvent('shoot', {userId: gameInterface.userId});
  }

  const handleReload = (e) => {
    e.preventDefault();
    gameInterface.sendGameEvent('reload', {userId: gameInterface.userId});
  }

  const handleMine = (e) => {
    e.preventDefault();
    gameInterface.sendGameEvent('mine', {userId: gameInterface.userId});
  }

  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate({});
    }, 10);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <HUD gameState={gameState} currentUserId={gameInterface.userId} />
      <Leaderboard leaderboard={gameState.leaderboard} />
      <Joystick onMove={handleMove} position={{ bottom: '20px', right: '20px' }} />
      
      {/* Shoot Button */}
      <div
        className="absolute rounded-full bg-red-800 bg-opacity-70 flex items-center justify-center cursor-pointer"
        style={{
          bottom: '20px',
          left: '20px',
          width: '64px',
          height: '64px',
          userSelect: 'none'
        }}
        onPointerDown={handleShoot}
      >
        <div className="text-white text-2xl">🔫</div>
      </div>
      
      {/* Reload Button */}
      <div
        className="absolute rounded-full bg-blue-800 bg-opacity-70 flex items-center justify-center cursor-pointer"
        style={{
          bottom: '20px',
          left: '100px',
          width: '64px',
          height: '64px',
          userSelect: 'none'
        }}
        onPointerDown={handleReload}
      >
        <div className="text-white text-2xl">🔄</div>
      </div>
      
      {/* Mine Button */}
      <div
        className="absolute rounded-full bg-yellow-800 bg-opacity-70 flex items-center justify-center cursor-pointer"
        style={{
          bottom: '20px',
          left: '180px',
          width: '64px',
          height: '64px',
          userSelect: 'none'
        }}
        onPointerDown={handleMine}
      >
        <div className="text-white text-2xl">⛏️</div>
      </div>
      
      {gameState.isGameOver && (
        <GameOverModal
          results={gameState.results}
          onFinish={onFinishGame}
        />
      )}
    </>
  );
}

export default GameUI;
