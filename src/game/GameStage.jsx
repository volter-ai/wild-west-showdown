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

const HealthBar = ({ current, max, width = 40 }) => (
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
        width: `${(current / max) * 100}%`,
        height: '100%',
        backgroundColor: current / max > 0.6 ? '#4CAF50' : current / max > 0.3 ? '#FFC107' : '#F44336',
        transition: 'width 0.2s'
      }}
    />
  </div>
);

const AmmoIndicator = ({ current, max, width = 40 }) => (
  <div
    style={{
      width: `${width}px`,
      height: '4px',
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: '2px',
      overflow: 'hidden',
      display: 'flex'
    }}
  >
    {Array.from({ length: max }).map((_, i) => (
      <div
        key={i}
        style={{
          flex: 1,
          height: '100%',
          backgroundColor: i < current ? '#2196F3' : 'transparent',
          margin: '0 1px'
        }}
      />
    ))}
  </div>
);

function GameStage({ gameState, gameInterface }) {
  const [tick, setTick] = useState(0);
  const [camera, setCamera] = useState({ x: 1000, y: 1000 });
  const [particles, setParticles] = useState([]);

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
  }, [tick, gameState.entities, gameInterface.userId]);

  // Add gunshot particles
  useEffect(() => {
    // Clean up old particles
    setParticles(prev => prev.filter(p => Date.now() - p.createdAt < p.lifetime));
    
    // Add new particles for shooting entities
    Object.values(gameState.entities).forEach(entity => {
      if (entity.state === 'shooting' && entity.alive) {
        const direction = entity.direction === 'right' ? 1 : -1;
        const offsetX = direction * 30;
        
        // Add muzzle flash
        setParticles(prev => [
          ...prev,
          {
            id: `muzzle_${entity.id}_${Date.now()}`,
            x: entity.x + offsetX,
            y: entity.y - 5,
            type: 'muzzleFlash',
            createdAt: Date.now(),
            lifetime: 100
          }
        ]);
      }
    });
  }, [tick, gameState.entities]);

  const isInView = (x, y, margin = 100) => {
    const screenX = x - camera.x;
    const screenY = y - camera.y;
    return screenX >= -margin &&
           screenX <= gameState.screenSize.width + margin &&
           screenY >= -margin &&
           screenY <= gameState.screenSize.height + margin;
  };

  // Get character emoji based on type and state
  const getCharacterEmoji = (entity) => {
    if (!entity.alive) return '💀';
    
    if (entity.stunned) return '😵';
    
    if (entity.state === 'shooting') {
      switch (entity.characterType) {
        case 'Sheriff': return '🤠🔫';
        case 'Outlaw': return '🤠🔫';
        case 'BountyHunter': return '🤠🔫';
        default: return '🤠🔫';
      }
    }
    
    switch (entity.characterType) {
      case 'Sheriff': return '🤠';
      case 'Outlaw': return '🤠';
      case 'BountyHunter': return '🤠';
      default: return '🤠';
    }
  };

  // Get weapon emoji
  const getWeaponEmoji = (weaponType) => {
    switch (weaponType) {
      case 'revolver': return '🔫';
      case 'shotgun': return '🔫';
      case 'rifle': return '🔫';
      case 'dynamite': return '💣';
      default: return '🔫';
    }
  };

  // Get power-up emoji
  const getPowerUpEmoji = (powerUpType) => {
    switch (powerUpType) {
      case 'speedBoost': return '⚡';
      case 'quickReload': return '🔄';
      case 'extraHealth': return '❤️';
      default: return '🎁';
    }
  };

  // Calculate day/night overlay opacity
  const getNightOverlayOpacity = () => {
    return Math.min(0.7, gameState.dayNightCycle / 100 * 0.7);
  };

  return (
    <div className="h-full w-full relative" style={{ transform: 'translateZ(0)' }}>
      {/* Background */}
      <div
        className="h-full w-full relative bg-gradient-to-b from-amber-200 to-amber-500 overflow-hidden"
        style={{ zIndex: BASE_Z_INDEX, userSelect: 'none' }}
      />
      
      {/* Night overlay */}
      <div
        className="h-full w-full absolute top-0 left-0 bg-indigo-900 pointer-events-none"
        style={{ 
          zIndex: BASE_Z_INDEX + 5000, 
          opacity: getNightOverlayOpacity(),
          transition: 'opacity 0.5s'
        }}
      />
      
      {/* Game World Border */}
      <div
        style={{
          position: 'absolute',
          left: -camera.x,
          top: -camera.y,
          width: gameState.worldSize.width,
          height: gameState.worldSize.height,
          border: '4px solid rgba(139, 69, 19, 0.5)',
          zIndex: BASE_Z_INDEX + 1,
        }}
      />
      
      {/* Environmental elements - cacti, rocks, etc. */}
      {Array.from({ length: 30 }).map((_, i) => {
        const x = (i * 200) % gameState.worldSize.width;
        const y = Math.floor(i / 5) * 200;
        
        if (isInView(x, y)) {
          return (
            <div
              key={`env_${i}`}
              style={{
                position: 'absolute',
                left: x - camera.x,
                top: y - camera.y,
                transform: 'translate(-50%, -50%)',
                zIndex: Math.floor(y) + BASE_Z_INDEX,
              }}
            >
              <Sprite emoji={i % 3 === 0 ? '🌵' : i % 3 === 1 ? '🪨' : '🌴'} size={50} />
            </div>
          );
        }
        return null;
      })}
      
      {/* Hazards */}
      {Object.values(gameState.hazards).map((hazard) => {
        if (hazard.active) {
          switch (hazard.type) {
            case 'cattle':
              if (hazard.direction === 'horizontal') {
                if (isInView(hazard.x, hazard.position)) {
                  return (
                    <div
                      key={hazard.id}
                      style={{
                        position: 'absolute',
                        left: hazard.x - camera.x,
                        top: hazard.position - camera.y,
                        transform: 'translate(-50%, -50%)',
                        zIndex: Math.floor(hazard.position) + BASE_Z_INDEX + 10,
                      }}
                    >
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Sprite key={i} emoji="🐂" size={40} className="animate-bounce" />
                        ))}
                      </div>
                    </div>
                  );
                }
              } else {
                if (isInView(hazard.position, hazard.y)) {
                  return (
                    <div
                      key={hazard.id}
                      style={{
                        position: 'absolute',
                        left: hazard.position - camera.x,
                        top: hazard.y - camera.y,
                        transform: 'translate(-50%, -50%)',
                        zIndex: Math.floor(hazard.y) + BASE_Z_INDEX + 10,
                      }}
                    >
                      <div className="flex flex-col">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Sprite key={i} emoji="🐂" size={40} className="animate-bounce" />
                        ))}
                      </div>
                    </div>
                  );
                }
              }
              break;
              
            case 'minecart':
              if (hazard.direction === 'horizontal') {
                if (isInView(hazard.x, hazard.position)) {
                  return (
                    <div
                      key={hazard.id}
                      style={{
                        position: 'absolute',
                        left: hazard.x - camera.x,
                        top: hazard.position - camera.y,
                        transform: 'translate(-50%, -50%)',
                        zIndex: Math.floor(hazard.position) + BASE_Z_INDEX + 10,
                      }}
                    >
                      <Sprite emoji="🚃" size={50} />
                    </div>
                  );
                }
              } else {
                if (isInView(hazard.position, hazard.y)) {
                  return (
                    <div
                      key={hazard.id}
                      style={{
                        position: 'absolute',
                        left: hazard.position - camera.x,
                        top: hazard.y - camera.y,
                        transform: 'translate(-50%, -50%)',
                        zIndex: Math.floor(hazard.y) + BASE_Z_INDEX + 10,
                      }}
                    >
                      <Sprite emoji="🚃" size={50} />
                    </div>
                  );
                }
              }
              break;
              
            case 'saloon':
              if (isInView(hazard.x, hazard.y)) {
                return (
                  <div
                    key={hazard.id}
                    style={{
                      position: 'absolute',
                      left: hazard.x - camera.x,
                      top: hazard.y - camera.y,
                      width: hazard.radius * 2,
                      height: hazard.radius * 2,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 0, 0, 0.2)',
                      transform: 'translate(-50%, -50%)',
                      zIndex: Math.floor(hazard.y) + BASE_Z_INDEX + 5,
                    }}
                  >
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <Sprite emoji="🍺" size={60} className="animate-bounce" />
                    </div>
                  </div>
                );
              }
              break;
          }
        }
        return null;
      })}
      
      {/* Collectibles */}
      {Object.values(gameState.collectibles).map((collectible) => {
        if (isInView(collectible.x, collectible.y)) {
          return (
            <div
              key={collectible.id}
              style={{
                position: 'absolute',
                left: collectible.x - camera.x,
                top: collectible.y - camera.y,
                transform: 'translate(-50%, -50%)',
                zIndex: Math.floor(collectible.y) + BASE_Z_INDEX + 10,
              }}
            >
              <div className="flex flex-col items-center">
                {collectible.type === 'weapon' && (
                  <Sprite emoji={getWeaponEmoji(collectible.weaponType)} size={30} className="animate-pulse" />
                )}
                {collectible.type === 'powerUp' && (
                  <Sprite emoji={getPowerUpEmoji(collectible.powerUpType)} size={30} className="animate-pulse" />
                )}
                {collectible.type === 'gold' && (
                  <Sprite emoji="💰" size={30} className="animate-pulse" />
                )}
                <Shadow />
              </div>
            </div>
          );
        }
        return null;
      })}
      
      {/* Projectiles */}
      {Object.values(gameState.projectiles).map((projectile) => {
        if (isInView(projectile.x, projectile.y)) {
          return (
            <div
              key={projectile.id}
              style={{
                position: 'absolute',
                left: projectile.x - camera.x,
                top: projectile.y - camera.y,
                transform: 'translate(-50%, -50%)',
                zIndex: Math.floor(projectile.y) + BASE_Z_INDEX + 20,
              }}
            >
              {projectile.type === 'dynamite' ? (
                <Sprite emoji="💣" size={20} />
              ) : (
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#FFD700',
                    borderRadius: '50%',
                  }}
                />
              )}
            </div>
          );
        }
        return null;
      })}
      
      {/* Particles */}
      {particles.map((particle) => {
        if (isInView(particle.x, particle.y)) {
          if (particle.type === 'muzzleFlash') {
            return (
              <div
                key={particle.id}
                style={{
                  position: 'absolute',
                  left: particle.x - camera.x,
                  top: particle.y - camera.y,
                  transform: 'translate(-50%, -50%)',
                  zIndex: Math.floor(particle.y) + BASE_Z_INDEX + 30,
                }}
              >
                <Sprite emoji="✨" size={20} />
              </div>
            );
          }
        }
        return null;
      })}
      
      {/* Player Entities */}
      {Object.values(gameState.entities).map((entity) => {
        if (isInView(entity.x, entity.y)) {
          return (
            <div
              key={entity.id}
              style={{
                position: 'absolute',
                left: entity.x - camera.x,
                top: entity.y - camera.y,
                transform: 'translate(-50%, -50%)',
                zIndex: Math.floor(entity.y) + BASE_Z_INDEX + 100,
              }}
            >
              <div className="flex flex-col items-center gap-1">
                {/* Player name and status */}
                <div style={{ color: 'white', fontSize: '12px', textAlign: 'center', marginBottom: '2px' }}>
                  {entity.name || 'Bot'}
                  {entity.reloading && ' (Reloading)'}
                </div>
                
                {/* Health bar */}
                <HealthBar current={entity.health} max={entity.maxHealth} />
                
                {/* Ammo indicator */}
                <AmmoIndicator current={entity.ammo} max={entity.maxAmmo} />
                
                {/* Character sprite */}
                <div style={{ transform: `scaleX(${entity.direction === 'left' ? -1 : 1})` }}>
                  <Sprite
                    emoji={getCharacterEmoji(entity)}
                    size={40}
                    className={entity.state === 'walking' ? 'animate-bounce' : ''}
                  />
                </div>
                
                {/* Power-up indicators */}
                {entity.powerUps && entity.powerUps.length > 0 && (
                  <div className="flex mt-1">
                    {entity.powerUps.map((powerUp, index) => (
                      <div key={index} className="mx-1">
                        <Sprite emoji={getPowerUpEmoji(powerUp.type)} size={15} />
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Gold indicator */}
                {entity.gold > 0 && (
                  <div className="flex items-center mt-1">
                    <Sprite emoji="💰" size={15} />
                    <span style={{ color: 'gold', fontSize: '12px', marginLeft: '2px' }}>{entity.gold}</span>
                  </div>
                )}
                
                <Shadow />
              </div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

export default GameStage;
