import React, { useState, useEffect } from 'react';
import { Joystick } from './CommonUI';
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

const WesternPanel = ({ children, className = '' }) => (
  <div className={`relative p-4 ${className}`}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path
        d="M3,3 L97,3 C98,3 99,4 99,5 L99,95 C99,96 98,97 97,97 L3,97 C2,97 1,96 1,95 L1,5 C1,4 2,3 3,3 Z"
        fill="#2D1B0E"
        stroke="#422006"
        strokeWidth="2"
      />
      <path
        d="M5,5 L95,5 C96,5 97,6 97,7 L97,93 C97,94 96,95 95,95 L5,95 C4,95 3,94 3,93 L3,7 C3,6 4,5 5,5 Z"
        fill="#3C2415"
        stroke="#422006"
        strokeWidth="1"
      />
    </svg>
    <div className="relative z-10">{children}</div>
  </div>
);

const HUD = ({ gameState, currentUserId }) => {
  const currentPlayer = gameState.entities[currentUserId];
  if (!currentPlayer) return null;
  
  const timeRemaining = Math.ceil(gameState.timeRemaining / 1000);
  const alivePlayers = Object.values(gameState.entities).filter(e => !e.isDead).length;
  const totalPlayers = Object.values(gameState.entities).length;
  
  return (
    <div
      className="absolute top-0 left-0 right-0 p-2 font-['Special_Elite'] text-amber-100"
      style={{ userSelect: 'none' }}
    >
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
        <path
          d="M0,0 L100,0 L100,25 C90,30 10,30 0,25 Z"
          fill="#2D1B0E"
          fillOpacity="0.85"
          stroke="#422006"
          strokeWidth="1"
        />
      </svg>
      <div className="relative z-10 flex justify-between items-center">
        <div className="flex gap-4 ml-2">
          <p className="flex items-center">
            <svg width="16" height="16" viewBox="0 0 24 24" className="mr-1 text-red-500">
              <path fill="currentColor" d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z" />
            </svg>
            {Math.ceil(currentPlayer.health)}/{currentPlayer.maxHealth}
          </p>
          <p className="flex items-center">
            <svg width="16" height="16" viewBox="0 0 24 24" className="mr-1 text-yellow-500">
              <path fill="currentColor" d="M12,15.39L8.24,17.66L9.23,13.38L5.91,10.5L10.29,10.13L12,6.09L13.71,10.13L18.09,10.5L14.77,13.38L15.76,17.66M22,9.24L14.81,8.63L12,2L9.19,8.63L2,9.24L7.45,13.97L5.82,21L12,17.27L18.18,21L16.54,13.97L22,9.24Z" />
            </svg>
            {currentPlayer.gold}
          </p>
          <p className="flex items-center">
            <svg width="16" height="16" viewBox="0 0 24 24" className="mr-1 text-gray-400">
              <path fill="currentColor" d="M7,15L11.5,9L15,13.5L17.5,10.5L21,15M22,4H2V6H22V4M2,20H22V18H2V20M2,14H22V8H2V14Z" />
            </svg>
            {currentPlayer.ammo}/{currentPlayer.maxAmmo}
          </p>
        </div>
        <div className="flex gap-4 mr-2">
          <p className="flex items-center">
            <svg width="16" height="16" viewBox="0 0 24 24" className="mr-1 text-blue-400">
              <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
            </svg>
            {alivePlayers}/{totalPlayers}
          </p>
          <p className="flex items-center">
            <svg width="16" height="16" viewBox="0 0 24 24" className="mr-1 text-amber-300">
              <path fill="currentColor" d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" />
            </svg>
            {timeRemaining}s
          </p>
          <p className="flex items-center">
            {gameState.dayNightCycle === 'day' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" className="mr-1 text-yellow-400">
                <path fill="currentColor" d="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" className="mr-1 text-blue-200">
                <path fill="currentColor" d="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.64 6.35,17.66C9.37,20.67 14.19,20.78 17.33,17.97Z" />
              </svg>
            )}
            {gameState.dayNightCycle === 'day' ? 'Day' : 'Night'}
          </p>
        </div>
      </div>
    </div>
  );
};

const WeaponSelector = ({ currentWeapon, onSelectWeapon }) => {
  const weapons = [
    { id: 'revolver', name: 'Revolver', asset: ASSETS.weapons.revolver },
    { id: 'shotgun', name: 'Shotgun', asset: ASSETS.weapons.shotgun },
    { id: 'rifle', name: 'Rifle', asset: ASSETS.weapons.rifle },
    { id: 'dynamite', name: 'Dynamite', asset: ASSETS.weapons.dynamite }
  ];
  
  return (
    <div
      className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex gap-2"
      style={{ userSelect: 'none' }}
    >
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 80" preserveAspectRatio="none">
        <path
          d="M10,0 L290,0 C295,0 300,5 300,10 L300,70 C300,75 295,80 290,80 L10,80 C5,80 0,75 0,70 L0,10 C0,5 5,0 10,0 Z"
          fill="#2D1B0E"
          fillOpacity="0.85"
          stroke="#422006"
          strokeWidth="2"
        />
      </svg>
      <div className="relative z-10 flex gap-2 p-2">
        {weapons.map(weapon => (
          <div
            key={weapon.id}
            className={`p-2 rounded cursor-pointer transition-all hover:scale-105 ${currentWeapon === weapon.id ? 'bg-amber-700/70' : 'bg-gray-700/50'}`}
            onClick={() => onSelectWeapon(weapon.id)}
          >
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 flex items-center justify-center">
                <img src={weapon.asset.path} alt={weapon.name} className="max-w-full max-h-full" />
              </div>
              <span className="text-xs text-amber-100 font-['Special_Elite']">{weapon.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MiniMap = ({ gameState, currentUserId }) => {
  const mapSize = 150;
  const scale = mapSize / gameState.worldSize.width;
  
  return (
    <div
      className="absolute top-16 right-4 overflow-hidden"
      style={{ width: `${mapSize}px`, height: `${mapSize}px`, userSelect: 'none' }}
    >
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 150 150" preserveAspectRatio="none">
        <path
          d="M5,0 L145,0 C147.5,0 150,2.5 150,5 L150,145 C150,147.5 147.5,150 145,150 L5,150 C2.5,150 0,147.5 0,145 L0,5 C0,2.5 2.5,0 5,0 Z"
          fill="#2D1B0E"
          fillOpacity="0.85"
          stroke="#422006"
          strokeWidth="2"
        />
        <path
          d="M10,5 L140,5 C142.5,5 145,7.5 145,10 L145,140 C145,142.5 142.5,145 140,145 L10,145 C7.5,145 5,142.5 5,140 L5,10 C5,7.5 7.5,5 10,5 Z"
          fill="#3C2415"
          fillOpacity="0.7"
          stroke="#422006"
          strokeWidth="1"
        />
      </svg>
      <div className="relative z-10 w-full h-full">
        {/* Players */}
        {Object.values(gameState.entities).map(entity => {
          const x = entity.x * scale;
          const y = entity.y * scale;
          const isCurrentPlayer = entity.id === currentUserId;
          
          return (
            <div
              key={entity.id}
              className={`absolute rounded-full ${entity.isDead ? 'bg-gray-500' : isCurrentPlayer ? 'bg-blue-500' : 'bg-red-500'}`}
              style={{
                left: `${x}px`,
                top: `${y}px`,
                width: isCurrentPlayer ? '6px' : '4px',
                height: isCurrentPlayer ? '6px' : '4px',
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 2px rgba(0,0,0,0.5)'
              }}
            />
          );
        })}
        
        {/* Gold */}
        {Object.values(gameState.gold).map(gold => {
          const x = gold.x * scale;
          const y = gold.y * scale;
          
          return (
            <div
              key={gold.id}
              className="absolute bg-yellow-400 rounded-full"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                width: '2px',
                height: '2px',
                transform: 'translate(-50%, -50%)'
              }}
            />
          );
        })}
        
        {/* Power-ups */}
        {Object.values(gameState.powerUps).map(powerUp => {
          const x = powerUp.x * scale;
          const y = powerUp.y * scale;
          
          return (
            <div
              key={powerUp.id}
              className="absolute bg-purple-400 rounded-full"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                width: '3px',
                height: '3px',
                transform: 'translate(-50%, -50%)'
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

const GameOverModal = ({ results, onFinish }) => {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
      <WesternPanel className="max-w-md w-full">
        <h2 className="text-2xl font-['Rye'] text-amber-300 mb-4 text-center border-b-2 border-amber-700 pb-2">
          Game Over!
        </h2>
        
        <div className="mb-6 text-amber-100">
          <h3 className="text-xl font-['Special_Elite'] mb-2 text-center">Last Gunslingers Standing</h3>
          <div className="bg-amber-900/30 p-3 rounded mb-4 border border-amber-800/50">
            {results.winners.length > 0 ? (
              <ul className="list-disc pl-5">
                {results.winners.map((name, index) => (
                  <li key={index} className="text-green-400 font-['Special_Elite']">{name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-400 font-['Special_Elite']">No survivors</p>
            )}
          </div>
          
          <h3 className="text-xl font-['Special_Elite'] mb-2 text-center">Fallen Gunslingers</h3>
          <div className="bg-amber-900/30 p-3 rounded mb-4 border border-amber-800/50">
            {results.losers.length > 0 ? (
              <ul className="list-disc pl-5">
                {results.losers.map((name, index) => (
                  <li key={index} className="text-red-400 font-['Special_Elite']">{name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-400 font-['Special_Elite']">Everyone survived</p>
            )}
          </div>
          
          <h3 className="text-xl font-['Special_Elite'] mb-2 text-center">Gold Leaders</h3>
          <div className="bg-amber-900/30 p-3 rounded border border-amber-800/50">
            {results.goldLeaders.length > 0 ? (
              <ul className="list-disc pl-5">
                {results.goldLeaders.map((name, index) => (
                  <li key={index} className="text-yellow-400 font-['Special_Elite']">{name} {index === 0 ? '(Top Collector)' : ''}</li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-400 font-['Special_Elite']">No gold collected</p>
            )}
          </div>
        </div>
        
        <WesternButton
          className="w-full"
          onClick={onFinish}
        >
          Return to Saloon
        </WesternButton>
      </WesternPanel>
    </div>
  );
};

function GameUI({ gameState, gameInterface, onFinishGame }) {
  const [, forceUpdate] = useState();
  const currentPlayer = gameState.entities[gameInterface.userId];

  const handleMove = (dx, dy) => {
    gameInterface.sendGameEvent('joystick_move', {dx, dy, userId: gameInterface.userId});
  };

  const handleShoot = () => {
    gameInterface.sendGameEvent('shoot', {userId: gameInterface.userId});
  };

  const handleReload = () => {
    gameInterface.sendGameEvent('reload', {userId: gameInterface.userId});
  };

  const handleSelectWeapon = (weapon) => {
    gameInterface.sendGameEvent('change_weapon', {userId: gameInterface.userId, weapon});
  };

  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate({});
    }, 10);
    return () => clearInterval(interval);
  }, []);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        handleShoot();
      } else if (e.code === 'KeyR') {
        handleReload();
      } else if (e.code === 'Digit1') {
        handleSelectWeapon('revolver');
      } else if (e.code === 'Digit2') {
        handleSelectWeapon('shotgun');
      } else if (e.code === 'Digit3') {
        handleSelectWeapon('rifle');
      } else if (e.code === 'Digit4') {
        handleSelectWeapon('dynamite');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <HUD gameState={gameState} currentUserId={gameInterface.userId} />
      
      <MiniMap gameState={gameState} currentUserId={gameInterface.userId} />
      
      <Joystick onMove={handleMove} position={{ bottom: '20px', left: '20px' }} />
      
      {/* Shoot button */}
      <div
        className="absolute rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
        style={{
          bottom: '20px',
          right: '20px',
          width: '64px',
          height: '64px',
          userSelect: 'none'
        }}
        onPointerDown={handleShoot}
      >
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="32" fill="#8B0000" fillOpacity="0.8" />
          <circle cx="32" cy="32" r="28" fill="#A52A2A" fillOpacity="0.9" stroke="#422006" strokeWidth="1" />
        </svg>
        <div className="w-8 h-8 relative z-10">
          <img src={ASSETS.ui.shoot.path} alt="Shoot" className="w-full h-full" />
        </div>
      </div>
      
      {/* Reload button */}
      <div
        className="absolute rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
        style={{
          bottom: '20px',
          right: '100px',
          width: '64px',
          height: '64px',
          userSelect: 'none'
        }}
        onPointerDown={handleReload}
      >
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="32" fill="#00008B" fillOpacity="0.8" />
          <circle cx="32" cy="32" r="28" fill="#4169E1" fillOpacity="0.9" stroke="#422006" strokeWidth="1" />
        </svg>
        <div className="w-8 h-8 relative z-10">
          <img src={ASSETS.ui.reload.path} alt="Reload" className="w-full h-full" />
        </div>
      </div>
      
      {/* Weapon selector */}
      {currentPlayer && !currentPlayer.isDead && (
        <WeaponSelector 
          currentWeapon={currentPlayer.currentWeapon} 
          onSelectWeapon={handleSelectWeapon} 
        />
      )}
      
      {/* Game status message */}
      {currentPlayer && currentPlayer.isDead && !gameState.isGameOver && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 rounded text-center">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
            <path
              d="M10,0 L190,0 C195,0 200,5 200,10 L200,90 C200,95 195,100 190,100 L10,100 C5,100 0,95 0,90 L0,10 C0,5 5,0 10,0 Z"
              fill="#2D1B0E"
              fillOpacity="0.85"
              stroke="#422006"
              strokeWidth="2"
            />
          </svg>
          <p className="text-2xl mb-2 text-red-500 font-['Rye'] relative z-10">You were eliminated!</p>
          <p className="text-amber-100 font-['Special_Elite'] relative z-10">Spectating remaining players...</p>
        </div>
      )}
      
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
