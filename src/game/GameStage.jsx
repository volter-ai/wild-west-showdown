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
      position: 'absolute',
      left: '50%',
      top: '-15px',
      width: `${width}px`,
      height: '4px',
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: '2px',
      transform: 'translateX(-50%)'
    }}
  >
    <div
      style={{
        width: `${(current / max) * 100}%`,
        height: '100%',
        backgroundColor: current > max * 0.5 ? '#4CAF50' : '#F44336',
        borderRadius: '2px'
      }}
    />
  </div>
);

function GameStage({ gameState, gameInterface }) {
  const [tick, setTick] = useState(0);
  const [camera, setCamera] = useState({ x: 600, y: 600 });
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

  // Add shooting particles
  useEffect(() => {
    Object.values(gameState.entities).forEach(entity => {
      if (entity.state === 'shooting' && !entity.isBullet && isInView(entity.x, entity.y)) {
        const direction = entity.direction === 'right' ? 1 : -1;
        const newParticle = {
          id: `muzzle_${entity.id}_${Date.now()}`,
          x: entity.x + (direction * 30),
          y: entity.y - 10,
          lifespan: 200,
          type: 'muzzle'
        };
        
        setParticles(prev => [...prev, newParticle]);
      }
    });
    
    // Update particle lifespans
    setParticles(prev => 
      prev
        .map(p => ({ ...p, lifespan: p.lifespan - 20 }))
        .filter(p => p.lifespan > 0)
    );
  }, [tick, gameState.entities]);

  const isInView = (x, y, margin = 100) => {
    const screenX = x - camera.x;
    const screenY = y - camera.y;
    return screenX >= -margin &&
           screenX <= gameState.screenSize.width + margin &&
           screenY >= -margin &&
           screenY <= gameState.screenSize.height + margin;
  };

  const getEntityEmoji = (entity) => {
    if (entity.isBullet) return '•';
    
    if (entity.isBot) {
      if (entity.botType === 'sheriff') return '🤠';
      if (entity.botType === 'bandit') return '🤠';
      return '🤖';
    }
    
    return '🤠';
  };

  const getEntityState = (entity) => {
    if (entity.eliminated) return 'eliminated';
    return entity.state;
  };

  return (
    <div className="h-full w-full relative" style={{ transform: 'translateZ(0)' }}>
      {/* Background */}
      <div
        className="h-full w-full relative bg-gradient-to-b from-amber-200 to-amber-100 overflow-hidden"
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
          border: '4px solid rgba(139, 69, 19, 0.5)',
          zIndex: BASE_Z_INDEX + 1,
        }}
      />
      
      {/* Buildings */}
      {gameState.buildings.map((building, index) => (
        isInView(building.x, building.y, building.width) && (
          <div
            key={`building_${index}`}
            style={{
              position: 'absolute',
              left: building.x - camera.x - building.width/2,
              top: building.y - camera.y - building.height/2,
              width: building.width,
              height: building.height,
              backgroundColor: building.type === 'saloon' ? '#8B4513' : 
                              building.type === 'bank' ? '#DAA520' : 
                              building.type === 'sheriff' ? '#A52A2A' : 
                              building.type === 'store' ? '#CD853F' : '#D2B48C',
              border: '2px solid #5D4037',
              zIndex: Math.floor(building.y) + BASE_Z_INDEX,
            }}
          >
            <div 
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'white',
                textShadow: '1px 1px 1px black',
                whiteSpace: 'nowrap'
              }}
            >
              {building.type.toUpperCase()}
            </div>
          </div>
        )
      ))}
      
      {/* Gold Mines */}
      {gameState.goldMines.map((mine, index) => (
        isInView(mine.x, mine.y, mine.radius) && (
          <div
            key={`mine_${index}`}
            style={{
              position: 'absolute',
              left: mine.x - camera.x,
              top: mine.y - camera.y,
              width: mine.radius * 2,
              height: mine.radius * 2,
              backgroundColor: 'rgba(218, 165, 32, 0.3)',
              border: '2px dashed #DAA520',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: Math.floor(mine.y) + BASE_Z_INDEX,
            }}
          >
            <div 
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '24px'
              }}
            >
              💰
            </div>
          </div>
        )
      ))}

      {/* Entities (players, bots, bullets) */}
      {Object.values(gameState.entities).map((entity) => (
        isInView(entity.x, entity.y) && (
          <div
            key={entity.id}
            style={{
              position: 'absolute',
              left: entity.x - camera.x,
              top: entity.y - camera.y,
              transform: 'translate(-50%, -50%)',
              zIndex: Math.floor(entity.y) + BASE_Z_INDEX + (entity.isBullet ? 10 : 0),
              opacity: entity.eliminated ? 0.5 : 1,
            }}
          >
            <div className="flex flex-col items-center gap-1">
              {!entity.isBullet && (
                <div style={{ color: entity.isBot ? (entity.botType === 'sheriff' ? 'blue' : 'red') : 'black', marginBottom: '4px', whiteSpace: 'nowrap' }}>
                  {entity.name || (entity.botType === 'sheriff' ? 'Sheriff' : 'Bandit')}
                  {entity.reloading && ' (Reloading)'}
                  {entity.eliminated && ' (Eliminated)'}
                </div>
              )}
              
              {!entity.isBullet && !entity.eliminated && (
                <HealthBar current={entity.health} max={entity.maxHealth} />
              )}
              
              <div style={{ transform: `scaleX(${entity.direction === 'left' ? -1 : 1})` }}>
                <Sprite
                  emoji={getEntityEmoji(entity)}
                  size={entity.isBullet ? 10 : 40}
                  className={
                    getEntityState(entity) === 'walking' ? 'animate-bounce' : 
                    getEntityState(entity) === 'mining' ? 'animate-pulse' : 
                    getEntityState(entity) === 'shooting' ? 'animate-ping' : ''
                  }
                />
              </div>
              
              {!entity.isBullet && (
                <Shadow width={entity.isBot ? 25 : 20} height={6} />
              )}
              
              {!entity.isBullet && entity.isMining && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '-25px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '16px'
                  }}
                >
                  ⛏️
                </div>
              )}
            </div>
          </div>
        )
      ))}
      
      {/* Particles */}
      {particles.map(particle => (
        <div
          key={particle.id}
          style={{
            position: 'absolute',
            left: particle.x - camera.x,
            top: particle.y - camera.y,
            transform: 'translate(-50%, -50%)',
            zIndex: Math.floor(particle.y) + BASE_Z_INDEX + 20,
          }}
        >
          {particle.type === 'muzzle' && (
            <div className="animate-ping" style={{ fontSize: '20px' }}>
              💥
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default GameStage;
