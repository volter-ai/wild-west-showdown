import React, { useState, useEffect } from 'react';
import { Joystick } from './CommonUI';
import { ASSETS } from '../assetManifest';

const HUD = ({ gameState, currentUserId }) => {
  const currentPlayer = gameState.entities[currentUserId];
  if (!currentPlayer) return null;
  
  const timeRemaining = Math.ceil(gameState.timeRemaining / 1000);
  const alivePlayers = Object.values(gameState.entities).filter(e => !e.isDead).length;
  const totalPlayers = Object.values(gameState.entities).length;
  
  return (
    <div
      className="absolute top-0 left-0 right-0 p-2 bg-black bg-opacity-50 text-gray-300 font-game"
      style={{ userSelect: 'none' }}
    >
      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <p>Health: {Math.ceil(currentPlayer.health)}/{currentPlayer.maxHealth}</p>
          <p>Gold: {currentPlayer.gold}</p>
          <p>Ammo: {currentPlayer.ammo}/{currentPlayer.maxAmmo}</p>
        </div>
        <div className="flex gap-4">
          <p>Players: {alivePlayers}/{totalPlayers}</p>
          <p>Time: {timeRemaining}s</p>
          <p>{gameState.dayNightCycle === 'day' ? 'Day' : 'Night'}</p>
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
      className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 rounded-lg p-2 flex gap-2"
      style={{ userSelect: 'none' }}
    >
      {weapons.map(weapon => (
        <div
          key={weapon.id}
          className={`p-2 rounded cursor-pointer ${currentWeapon === weapon.id ? 'bg-yellow-600' : 'bg-gray-700'}`}
          onClick={() => onSelectWeapon(weapon.id)}
        >
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 flex items-center justify-center">
              <img src={weapon.asset.path} alt={weapon.name} className="max-w-full max-h-full" />
            </div>
            <span className="text-xs text-white">{weapon.name}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const MiniMap = ({ gameState, currentUserId }) => {
  const mapSize = 150;
  const scale = mapSize / gameState.worldSize.width;
  
  return (
    <div
      className="absolute top-16 right-4 bg-black bg-opacity-50 border border-gray-600 rounded-lg overflow-hidden"
      style={{ width: `${mapSize}px`, height: `${mapSize}px`, userSelect: 'none' }}
    >
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
              transform: 'translate(-50%, -50%)'
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
  );
};

const GameOverModal = ({ results, onFinish }) => {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
      <div className="bg-gray-800 p-6 rounded-lg text-white border-2 border-yellow-600 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-yellow-400 text-center">Game Over!</h2>
        
        <div className="mb-6">
          <h3 className="text-xl mb-2 text-center">Last Gunslingers Standing</h3>
          <div className="bg-gray-700 p-3 rounded mb-4">
            {results.winners.length > 0 ? (
              <ul className="list-disc pl-5">
                {results.winners.map((name, index) => (
                  <li key={index} className="text-green-400">{name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-400">No survivors</p>
            )}
          </div>
          
          <h3 className="text-xl mb-2 text-center">Fallen Gunslingers</h3>
          <div className="bg-gray-700 p-3 rounded mb-4">
            {results.losers.length > 0 ? (
              <ul className="list-disc pl-5">
                {results.losers.map((name, index) => (
                  <li key={index} className="text-red-400">{name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-400">Everyone survived</p>
            )}
          </div>
          
          <h3 className="text-xl mb-2 text-center">Gold Leaders</h3>
          <div className="bg-gray-700 p-3 rounded">
            {results.goldLeaders.length > 0 ? (
              <ul className="list-disc pl-5">
                {results.goldLeaders.map((name, index) => (
                  <li key={index} className="text-yellow-400">{name} {index === 0 ? '(Top Collector)' : ''}</li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-400">No gold collected</p>
            )}
          </div>
        </div>
        
        <button
          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded transition"
          onClick={onFinish}
        >
          Return to Saloon
        </button>
      </div>
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
        className="absolute rounded-full bg-red-800 bg-opacity-70 flex items-center justify-center cursor-pointer"
        style={{
          bottom: '20px',
          right: '20px',
          width: '64px',
          height: '64px',
          userSelect: 'none'
        }}
        onPointerDown={handleShoot}
      >
        <div className="w-8 h-8">
          <img src={ASSETS.ui.shoot.path} alt="Shoot" className="w-full h-full" />
        </div>
      </div>
      
      {/* Reload button */}
      <div
        className="absolute rounded-full bg-blue-800 bg-opacity-70 flex items-center justify-center cursor-pointer"
        style={{
          bottom: '20px',
          right: '100px',
          width: '64px',
          height: '64px',
          userSelect: 'none'
        }}
        onPointerDown={handleReload}
      >
        <div className="w-8 h-8">
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
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-70 p-4 rounded text-white text-center">
          <p className="text-2xl mb-2">You were eliminated!</p>
          <p>Spectating remaining players...</p>
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
