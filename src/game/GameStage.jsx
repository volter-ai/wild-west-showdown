import React, { useState, useEffect, useRef } from 'react';
    import { ASSETS } from '../assetManifest';

    const BASE_Z_INDEX = -2000;

    const Sprite = React.forwardRef(({
      src,
      size = 40,
      style = {},
      className = '',
      ...props
    }, ref) => {
      const aspectRatio = src ? src.width / src.height : 1;
      return (
        <div
          ref={ref}
          className={className}
          style={{
            width: `${size * aspectRatio}px`,
            height: `${size}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...style
          }}
          {...props}
        >
          {src ? (
            <img 
              src={src.path}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
              alt=""
            />
          ) : (
            <div className="bg-gray-400 w-full h-full rounded-full"></div>
          )}
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

    function GameStage({ gameState, gameInterface }) {
      const [tick, setTick] = useState(0);
      const [camera, setCamera] = useState({ x: 600, y: 600 });

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

      const isInView = (x, y, margin = 100) => {
        const screenX = x - camera.x;
        const screenY = y - camera.y;
        return screenX >= -margin &&
               screenX <= gameState.screenSize.width + margin &&
               screenY >= -margin &&
               screenY <= gameState.screenSize.height + margin;
      };

      const getPlayerAsset = (entity) => {
        if (entity.isDead) {
          return ASSETS.characters.cowboy_dead;
        }
    
        if (entity.isCovered) {
          return ASSETS.characters.cowboy_covered;
        }
    
        // Different hat styles
        switch(entity.hat) {
          case 0: return ASSETS.characters.cowboy;
          case 1: return ASSETS.characters.cowboy_hat1;
          case 2: return ASSETS.characters.cowboy_hat2;
          default: return ASSETS.characters.cowboy_hat3;
        }
      };

      const getPowerUpAsset = (type) => {
        switch (type) {
          case 'health': return ASSETS.items.health_powerup;
          case 'speed': return ASSETS.items.speed_powerup;
          case 'gun': return ASSETS.items.gun_powerup;
          default: return null;
        }
      };

      return (
        <div className="h-full w-full relative" style={{ transform: 'translateZ(0)' }}>
          {/* Background */}
          <div
            className="h-full w-full relative"
            style={{ 
              zIndex: BASE_Z_INDEX, 
              userSelect: 'none',
              backgroundImage: `url(${ASSETS.backgrounds.desert.path})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
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
      
          {/* Safe Zone Circle */}
          <div
            style={{
              position: 'absolute',
              left: gameState.safeZone.x - camera.x,
              top: gameState.safeZone.y - camera.y,
              width: gameState.safeZone.radius * 2,
              height: gameState.safeZone.radius * 2,
              border: '2px dashed red',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: BASE_Z_INDEX + 1,
            }}
          />

          {/* Render power-ups */}
          {gameState.powerUps && gameState.powerUps.map((powerUp) => (
            isInView(powerUp.x, powerUp.y) && (
              <div
                key={powerUp.id}
                style={{
                  position: 'absolute',
                  left: powerUp.x - camera.x,
                  top: powerUp.y - camera.y,
                  transform: 'translate(-50%, -50%)',
                  zIndex: Math.floor(powerUp.y) + BASE_Z_INDEX,
                }}
              >
                <div className="flex flex-col items-center gap-1 animate-bounce">
                  <Sprite
                    src={getPowerUpAsset(powerUp.type)}
                    size={30}
                  />
                  <Shadow width={15} height={4} />
                </div>
              </div>
            )
          ))}

          {/* Render bullets */}
          {gameState.bullets && gameState.bullets.map((bullet) => (
            isInView(bullet.x, bullet.y) && (
              <div
                key={bullet.id}
                style={{
                  position: 'absolute',
                  left: bullet.x - camera.x,
                  top: bullet.y - camera.y,
                  transform: 'translate(-50%, -50%)',
                  zIndex: Math.floor(bullet.y) + BASE_Z_INDEX,
                }}
              >
                <Sprite
                  src={ASSETS.items.bullet}
                  size={10}
                />
              </div>
            )
          ))}

          {/* Render players */}
          {Object.values(gameState.entities).map((entity) => (
            isInView(entity.x, entity.y) && (
              <div
                key={entity.id}
                style={{
                  position: 'absolute',
                  left: entity.x - camera.x,
                  top: entity.y - camera.y,
                  transform: 'translate(-50%, -50%)',
                  zIndex: Math.floor(entity.y) + BASE_Z_INDEX,
                  opacity: entity.isDead ? 0.5 : 1,
                }}
              >
                <div className="flex flex-col items-center gap-1">
                  <div style={{ color: 'white', marginBottom: '4px', textShadow: '1px 1px 2px black' }}>
                    {entity.name}
                    {entity.isDead && ' (Dead)'}
                  </div>
                  <div style={{ transform: `scaleX(${entity.direction === 'left' ? -1 : 1})` }}>
                    <Sprite
                      src={getPlayerAsset(entity)}
                      size={40}
                      className={entity.state === 'walking' ? 'animate-bounce' : ''}
                    />
                  </div>
                  {!entity.isDead && (
                    <div className="w-10 h-1 bg-gray-700 rounded-full mt-1">
                      <div 
                        className="h-full bg-green-500 rounded-full" 
                        style={{ width: `${entity.health}%` }}
                      />
                    </div>
                  )}
                  <Shadow />
                </div>
              </div>
            )
          ))}
        </div>
      );
    }

    export default GameStage;