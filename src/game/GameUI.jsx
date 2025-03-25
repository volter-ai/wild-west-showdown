import React, { useState, useEffect, useRef } from 'react';
import { Joystick } from './CommonUI';

const HUD = ({ gameState, currentUserId }) => {
  const currentPlayer = gameState.entities[currentUserId];
  if (!currentPlayer) return null;
  
  const timeRemaining = Math.ceil(gameState.timeRemaining / 1000);
  const alivePlayers = Object.values(gameState.entities).filter(e => e.alive && !e.isBot).length;
  const totalPlayers = Object.values(gameState.entities).filter(e => !e.isBot).length;
  
  return (
    <div
      className="absolute top-0 left-0 right-0 p-2 bg-black bg-opacity-50 text-gray-300 font-game"
      style={{ userSelect: 'none', zIndex: 1000 }}
    >
      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <p>Playing as: {currentPlayer.name} ({currentPlayer.characterType})</p>
          <p>Players: {alivePlayers}/{totalPlayers}</p>
          <p>Gold: {currentPlayer.gold}</p>
        </div>
        <div className="flex gap-4">
          <p>Weapon: {currentPlayer.weapon}</p>
          <p>Ammo: {currentPlayer.ammo}/{currentPlayer.maxAmmo}</p>
          <p>Time: {timeRemaining}s</p>
        </div>
      </div>
    </div>
  );
};

const MiniMap = ({ gameState, currentUserId }) => {
  const currentPlayer = gameState.entities[currentUserId];
  if (!currentPlayer) return null;
  
  const mapSize = 150;
  const scale = mapSize / gameState.worldSize.width;
  
  // Check if player has tracking ability active
  const hasTracking = currentPlayer.powerUps && currentPlayer.powerUps.some(
    p => p.type === "tracking" && Date.now() - p.startTime < p.duration
  );
  
  return (
    <div
      className="absolute bottom-4 left-4 bg-black bg-opacity-50 border border-gray-500 rounded-lg overflow-hidden"
      style={{ width: `${mapSize}px`, height: `${mapSize}px`, zIndex: 1000 }}
    >
      {/* Player dots */}
      {Object.values(gameState.entities).map(entity => {
        // Only show other players if tracking is active or they're close to current player
        const distance = Math.sqrt(
          Math.pow(entity.x - currentPlayer.x, 2) + 
          Math.pow(entity.y - currentPlayer.y, 2)
        );
        
        const isVisible = entity.id === currentUserId || 
                          hasTracking || 
                          distance < 300;
        
        if (entity.alive && isVisible) {
          return (
            <div
              key={entity.id}
              style={{
                position: 'absolute',
                left: entity.x * scale,
                top: entity.y * scale,
                width: entity.id === currentUserId ? '6px' : '4px',
                height: entity.id === currentUserId ? '6px' : '4px',
                backgroundColor: entity.id === currentUserId ? '#4CAF50' : 
                                 entity.isBot ? '#F44336' : '#2196F3',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)'
              }}
            />
          );
        }
        return null;
      })}
      
      {/* Collectibles */}
      {hasTracking && Object.values(gameState.collectibles).map(collectible => (
        <div
          key={collectible.id}
          style={{
            position: 'absolute',
            left: collectible.x * scale,
            top: collectible.y * scale,
            width: '3px',
            height: '3px',
            backgroundColor: collectible.type === 'gold' ? '#FFD700' : 
                             collectible.type === 'weapon' ? '#FF9800' : '#9C27B0',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        />
      ))}
    </div>
  );
};

const WeaponSelector = ({ currentWeapon, onSelectWeapon }) => {
  const weapons = [
    { id: 'revolver', name: 'Revolver', emoji: '🔫' },
    { id: 'shotgun', name: 'Shotgun', emoji: '🔫' },
    { id: 'rifle', name: 'Rifle', emoji: '🔫' },
    { id: 'dynamite', name: 'Dynamite', emoji: '💣' }
  ];
  
  return (
    <div
      className="absolute bottom-4 right-24 flex"
      style={{ zIndex: 1000 }}
    >
      {weapons.map(weapon => (
        <div
          key={weapon.id}
          className={`w-12 h-12 flex items-center justify-center rounded-full mx-1 cursor-pointer ${
            currentWeapon === weapon.id ? 'bg-yellow-500' : 'bg-gray-800 bg-opacity-50'
          }`}
          onClick={() => onSelectWeapon(weapon.id)}
        >
          <div className="text-2xl">{weapon.emoji}</div>
        </div>
      ))}
    </div>
  );
};

const GameOverModal = ({ results, onFinish }) => {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center" style={{ zIndex: 2000 }}>
      <div className="bg-amber-900 p-6 rounded-lg text-white border-2 border-yellow-600 max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-yellow-400">Game Over!</h2>
        <div className="mb-6">
          <p className="text-lg mb-2">Winners:</p>
          <ul className="list-disc pl-5 mb-4">
            {results.winners.length > 0 ? 
              results.winners.map((name, i) => <li key={i}>{name}</li>) : 
              <li>None</li>
            }
          </ul>
          
          <p className="text-lg mb-2">Losers:</p>
          <ul className="list-disc pl-5">
            {results.losers.length > 0 ? 
              results.losers.map((name, i) => <li key={i}>{name}</li>) : 
              <li>None</li>
            }
          </ul>
        </div>
        <button
          className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-6 rounded w-full"
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
  const [shootAngle, setShootAngle] = useState(0);
  const [isAiming, setIsAiming] = useState(false);
  const aimStartPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });

  const handleMove = (dx, dy) => {
    gameInterface.sendGameEvent('joystick_move', {dx, dy, userId: gameInterface.userId});
  };

  const handleShoot = () => {
    gameInterface.sendGameEvent('shoot', {
      userId: gameInterface.userId,
      angle: shootAngle
    });
  };

  const handleReload = () => {
    gameInterface.sendGameEvent('reload', {userId: gameInterface.userId});
  };

  const handleSwitchWeapon = (weapon) => {
    gameInterface.sendGameEvent('switch_weapon', {
      userId: gameInterface.userId,
      weapon: weapon
    });
  };

  const handleUseAbility = () => {
    gameInterface.sendGameEvent('use_ability', {userId: gameInterface.userId});
  };

  const handleAimStart = (e) => {
    setIsAiming(true);
    const rect = e.currentTarget.getBoundingClientRect();
    aimStartPos.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    currentPos.current = {
      x: e.clientX || e.touches[0].clientX,
      y: e.clientY || e.touches[0].clientY
    };
  };

  const handleAimMove = (e) => {
    if (!isAiming) return;
    
    currentPos.current = {
      x: e.clientX || e.touches[0].clientX,
      y: e.clientY || e.touches[0].clientY
    };
    
    const dx = currentPos.current.x - aimStartPos.current.x;
    const dy = currentPos.current.y - aimStartPos.current.y;
    
    setShootAngle(Math.atan2(dy, dx));
  };

  const handleAimEnd = () => {
    if (isAiming) {
      setIsAiming(false);
      handleShoot();
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate({});
    }, 10);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isAiming) {
        handleAimMove(e);
      }
    };
    
    const handleMouseUp = () => {
      handleAimEnd();
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleMouseMove);
    document.addEventListener('touchend', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isAiming]);

  const currentPlayer = gameState.entities[gameInterface.userId];
  const currentWeapon = currentPlayer ? currentPlayer.weapon : 'revolver';
  const isReloading = currentPlayer ? currentPlayer.reloading : false;

  return (
    <>
      <HUD gameState={gameState} currentUserId={gameInterface.userId} />
      <MiniMap gameState={gameState} currentUserId={gameInterface.userId} />
      
      <Joystick onMove={handleMove} position={{ bottom: '20px', right: '20px' }} />
      
      {/* Shoot button */}
      <div
        className="absolute rounded-full bg-red-800 bg-opacity-70 flex items-center justify-center cursor-pointer"
        style={{
          bottom: '20px',
          left: '20px',
          width: '64px',
          height: '64px',
          userSelect: 'none',
          zIndex: 1000
        }}
        onMouseDown={handleAimStart}
        onTouchStart={handleAimStart}
      >
        <div className="text-white text-2xl">🔫</div>
        
        {isAiming && (
          <div
            className="absolute bg-red-500 rounded-full"
            style={{
              width: '4px',
              height: '40px',
              transformOrigin: 'bottom center',
              transform: `rotate(${shootAngle * (180 / Math.PI)}deg)`,
              bottom: '50%',
              left: 'calc(50% - 2px)'
            }}
          />
        )}
      </div>
      
      {/* Reload button */}
      <div
        className={`absolute rounded-full ${isReloading ? 'bg-gray-600' : 'bg-blue-800'} bg-opacity-70 flex items-center justify-center cursor-pointer`}
        style={{
          bottom: '20px',
          left: '100px',
          width: '50px',
          height: '50px',
          userSelect: 'none',
          zIndex: 1000
        }}
        onClick={handleReload}
      >
        <div className="text-white text-xl">🔄</div>
      </div>
      
      {/* Special ability button */}
      <div
        className="absolute rounded-full bg-purple-800 bg-opacity-70 flex items-center justify-center cursor-pointer"
        style={{
          bottom: '80px',
          left: '20px',
          width: '50px',
          height: '50px',
          userSelect: 'none',
          zIndex: 1000
        }}
        onClick={handleUseAbility}
      >
        <div className="text-white text-xl">⚡</div>
      </div>
      
      {/* Weapon selector */}
      <WeaponSelector 
        currentWeapon={currentWeapon}
        onSelectWeapon={handleSwitchWeapon}
      />
      
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
