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

function GameStage({ gameState }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 10);
    return () => clearInterval(interval);
  }, []);

  const isInView = (x, y, margin = 100) => {
    return x >= -margin &&
           x <= gameState.screenSize.width + margin &&
           y >= -margin &&
           y <= gameState.screenSize.height + margin;
  };

  return (
    <div className="h-full w-full relative" style={{ transform: 'translateZ(0)' }}>
      <div
        className="h-full w-full relative bg-gradient-to-b from-purple-900 to-purple-700 overflow-hidden"
        style={{ zIndex: BASE_Z_INDEX, userSelect: 'none' }}
      />
      
      {/* Jail Zone */}
      <div
        style={{
          position: 'absolute',
          left: gameState.jail.x - 50,
          top: gameState.jail.y - 50,
          width: 100,
          height: 100,
          border: '2px dashed white',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: BASE_Z_INDEX + 1,
        }}
      />

      {Object.values(gameState.entities).map((entity) => (
        isInView(entity.x, entity.y) && (
          <div
            key={entity.id}
            style={{
              position: 'absolute',
              left: entity.x,
              top: entity.y,
              transform: 'translate(-50%, -50%)',
              zIndex: Math.floor(entity.y) + BASE_Z_INDEX,
              opacity: entity.inJail ? 0.5 : 1,
            }}
          >
            <div className="flex flex-col items-center gap-1">
              <div style={{ color: 'white', marginBottom: '4px' }}>
                {entity.name || 'Bot'}
                {entity.isTagger && ' (Tagger)'}
                {entity.inJail && ' (Jailed)'}
              </div>
              <div style={{ transform: `scaleX(${entity.direction === 'left' ? -1 : 1})` }}>
                <Sprite
                  emoji={entity.isTagger ? '👻' : (entity.isBot ? '🤖' : '🧍')}
                  size={40}
                  className={entity.state === 'walking' ? 'animate-bounce' : ''}
                />
              </div>
              <Shadow />
            </div>
          </div>
        )
      ))}
    </div>
  );
}

export default GameStage;
