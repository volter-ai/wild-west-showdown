import React, { useState, useEffect, useRef } from 'react';

const BASE_Z_INDEX = -2000;

const Sprite = React.forwardRef(({
  emoji,
  size = 40,
  style = {},
  className = '',
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={className}
      style={{
        fontSize: `${size}px`,
        lineHeight: 1,
        height: `${size}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
      {...props}
    >
      {emoji}
    </div>
  );
});

Sprite.displayName = 'Sprite';

const Shadow = ({ width = 20, height = 6 }) => (
  <div
    style={{
      position: 'absolute',
      left: '50%',
      top: '100%',
      width: `${width}px`,
      height: `${height}px`,
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: '50%',
      transform: 'translate(-50%, -50%)'
    }}
  />
);

const HealthBar = ({ current, max, width = 40 }) => {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div
      style={{
        width: `${width}px`,
        height: '4px',
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: '2px',
        overflow: 'hidden',
        marginBottom: '2px'
      }}
    >
      <div
        style={{
          width: `${percentage}%`,
          height: '100%',
          backgroundColor: percentage > 50 ? '#4CAF50' : percentage > 25 ? '#FFC107' : '#F44336',
          transition: 'width 0.2s'
        }}
      />
    </div>
  );
};

const Bullet = ({ type, style }) => {
  let emoji = '•';
  let size = 20;
  
  switch (type) {
    case 'revolver':
      emoji = '•';
      size = 20;
      break;
    case 'shotgun':
      emoji = '∴';
      size = 15;
      break;
    case 'rifle':
      emoji = '⁍';
      size = 25;
      break;
    case 'dynamite':
      emoji = '💣';
      size = 30;
      break;
    default:
      emoji = '•';
  }
  
  return <Sprite emoji={emoji} size={size} style={style} />;
};

const PowerUp = ({ type }) => {
  let emoji = '🔮';
  
  switch (type) {
    case 'health':
      emoji = '❤️';
      break;
    case 'speed':
      emoji = '👢';
      break;
    case 'quickReload':
      emoji = '⚡';
      break;
    default:
      emoji = '🔮';
  }
  
  return (
    <div className="animate-bounce">
      <Sprite emoji={emoji} size={30} />
      <Shadow width={15} height={4} />
    </div>
  );
};

const Gold = ({ value }) => {
  return (
    <div className="animate-pulse">
      <Sprite emoji="💰" size={25} />
      <Shadow width={15} height={4} />
    </div>
  );
};

function GameStage({ gameState, gameInterface }) {
  const [tick, setTick] = useState(0);
  const [camera, setCamera] = useState({ x: 1000, y: 1000 });

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 10);
    return () => clearInterval(interval);
  }, []);

  // Update camera to follow current player
  useEffect(() => {
    const currentPlayer = gameState.entities[gameInterface.userId];
    if (currentPlayer) {
      let targetX = currentPlayer.x - gameState.screenSize.width / 2;
      let targetY = currentPlayer.y - gameState.screenSize.height / 2;
      
      // Constrain camera to world bounds
      targetX = Math.max(0, Math.min(targetX, gameState.worldSize.width - gameState.screenSize.width));
      targetY = Math.max(0, Math.min(targetY, gameState.worldSize.height - gameState.screenSize.height));
      
      // Smooth camera movement
      setCamera(prev => ({
        x: prev.x + (targetX - prev.x) * 0.1,
        y: prev.y + (targetY - prev.y) * 0.1
      }));
    }
  }, [tick, gameState.entities, gameInterface.userId, gameState.screenSize, gameState.worldSize]);

  const isInView = (x, y, margin = 100) => {
    const screenX = x - camera.x;
    const screenY = y - camera.y;
    return screenX >= -margin &&
           screenX <= gameState.screenSize.width + margin &&
           screenY >= -margin &&
           screenY <= gameState.screenSize.height + margin;
  };

  // Handle mouse/touch aim
  const handlePointerMove = (e) => {
    const currentPlayer = gameState.entities[gameInterface.userId];
    if (currentPlayer && !currentPlayer.isDead) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Calculate angle from player to pointer
      const playerScreenX = currentPlayer.x - camera.x;
      const playerScreenY = currentPlayer.y - camera.y;
      const angle = Math.atan2(y - playerScreenY, x - playerScreenX);
      
      gameInterface.sendGameEvent('aim', { userId: gameInterface.userId, angle });
    }
  };

  // Handle shooting
  const handlePointerDown = (e) => {
    if (e.button === 0) { // Left click
      gameInterface.sendGameEvent('shoot', { userId: gameInterface.userId });
    }
  };

  // Get background based on day/night cycle
  const getBackgroundStyle = () => {
    if (gameState.dayNightCycle === 'day') {
      return 'bg-gradient-to-b from-blue-500 to-yellow-200';
    } else {
      return 'bg-gradient-to-b from-indigo-900 to-purple-900';
    }
  };

  // Get character emoji based on type and state
  const getCharacterEmoji = (entity) => {
    if (entity.isDead) return '💀';
    
    const baseEmoji = {
      sheriff: '🤠',
      outlaw: '🦹',
      bountyHunter: '🧙'
    }[entity.characterType] || '🤠';
    
    if (entity.isShooting) return '🔫';
    if (entity.isReloading) return '🔄';
    
    return baseEmoji;
  };

  return (
    <div 
      className="h-full w-full relative" 
      style={{ transform: 'translateZ(0)' }}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
    >
      <div
        className={`h-full w-full relative ${getBackgroundStyle()} overflow-hidden`}
        style={{ zIndex: BASE_Z_INDEX, userSelect: 'none' }}
      />
      
      {/* Game World Border */}
      <div
        style={{
          position: 'absolute',
          left: -camera.x,
          top: -camera.y,
          width: gameState.worldSize.width,
          height: gameState.worldSize.height,
          border: '4px solid rgba(139, 69, 19, 0.8)',
          zIndex: BASE_Z_INDEX + 1,
        }}
      />
      
      {/* Western Town Elements */}
      {[...Array(10)].map((_, i) => {
        const x = 200 + (i * 200);
        const y = 200;
        return isInView(x, y) && (
          <div
            key={`building-${i}`}
            style={{
              position: 'absolute',
              left: x - camera.x,
              top: y - camera.y,
              transform: 'translate(-50%, -50%)',
              zIndex: Math.floor(y) + BASE_Z_INDEX,
            }}
          >
            <Sprite emoji="🏛️" size={80} />
          </div>
        );
      })}
      
      {[...Array(5)].map((_, i) => {
        const x = 300 + (i * 300);
        const y = 1800;
        return isInView(x, y) && (
          <div
            key={`cactus-${i}`}
            style={{
              position: 'absolute',
              left: x - camera.x,
              top: y - camera.y,
              transform: 'translate(-50%, -50%)',
              zIndex: Math.floor(y) + BASE_Z_INDEX,
            }}
          >
            <Sprite emoji="🌵" size={60} />
          </div>
        );
      })}
      
      {/* Gold */}
      {Object.values(gameState.gold).map((gold) => (
        isInView(gold.x, gold.y) && (
          <div
            key={gold.id}
            style={{
              position: 'absolute',
              left: gold.x - camera.x,
              top: gold.y - camera.y,
              transform: 'translate(-50%, -50%)',
              zIndex: Math.floor(gold.y) + BASE_Z_INDEX + 1,
            }}
          >
            <Gold value={gold.value} />
          </div>
        )
      ))}
      
      {/* Power-ups */}
      {Object.values(gameState.powerUps).map((powerUp) => (
        isInView(powerUp.x, powerUp.y) && (
          <div
            key={powerUp.id}
            style={{
              position: 'absolute',
              left: powerUp.x - camera.x,
              top: powerUp.y - camera.y,
              transform: 'translate(-50%, -50%)',
              zIndex: Math.floor(powerUp.y) + BASE_Z_INDEX + 1,
            }}
          >
            <PowerUp type={powerUp.type} />
          </div>
        )
      ))}
      
      {/* Bullets */}
      {Object.values(gameState.bullets).map((bullet) => (
        isInView(bullet.x, bullet.y) && (
          <div
            key={bullet.id}
            style={{
              position: 'absolute',
              left: bullet.x - camera.x,
              top: bullet.y - camera.y,
              transform: 'translate(-50%, -50%) rotate(' + Math.atan2(bullet.dy, bullet.dx) + 'rad)',
              zIndex: Math.floor(bullet.y) + BASE_Z_INDEX + 2,
            }}
          >
            <Bullet type={bullet.type} />
          </div>
        )
      ))}
      
      {/* Players */}
      {Object.values(gameState.entities).map((entity) => (
        isInView(entity.x, entity.y) && (
          <div
            key={entity.id}
            style={{
              position: 'absolute',
              left: entity.x - camera.x,
              top: entity.y - camera.y,
              transform: 'translate(-50%, -50%)',
              zIndex: Math.floor(entity.y) + BASE_Z_INDEX + 3,
              opacity: entity.isDead ? 0.7 : 1,
            }}
          >
            <div className="flex flex-col items-center gap-1">
              <div style={{ color: 'white', fontSize: '12px', textAlign: 'center', marginBottom: '2px' }}>
                {entity.name || 'Gunslinger'}
                {entity.isBot && ' (Bot)'}
              </div>
              
              {/* Health bar */}
              {!entity.isDead && (
                <HealthBar current={entity.health} max={entity.maxHealth} width={40} />
              )}
              
              {/* Weapon indicator */}
              {!entity.isDead && (
                <div style={{ fontSize: '10px', color: 'white', marginBottom: '2px' }}>
                  {entity.currentWeapon} {entity.ammo}/{entity.maxAmmo}
                </div>
              )}
              
              {/* Character sprite with rotation */}
              <div 
                style={{ 
                  transform: `rotate(${entity.rotation}rad)`,
                  transformOrigin: 'center',
                }}
              >
                <Sprite
                  emoji={getCharacterEmoji(entity)}
                  size={40}
                  className={entity.state === 'walking' ? 'animate-bounce' : ''}
                />
              </div>
              
              <Shadow />
              
              {/* Power-up indicators */}
              {entity.speedBoost > 0 && (
                <div style={{ position: 'absolute', top: '-20px', right: '-15px' }}>
                  <Sprite emoji="👢" size={15} />
                </div>
              )}
              
              {entity.quickReload > 0 && (
                <div style={{ position: 'absolute', top: '-20px', left: '-15px' }}>
                  <Sprite emoji="⚡" size={15} />
                </div>
              )}
            </div>
          </div>
        )
      ))}
    </div>
  );
}

export default GameStage;
