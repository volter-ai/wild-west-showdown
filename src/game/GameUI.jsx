import React, { useState, useEffect } from 'react';
    import { ASSETS } from '../assetManifest';

    const HUD = ({ gameState, currentUserId }) => {
      const aliveCount = Object.values(gameState.entities).filter(e => !e.isDead).length;
      const timeRemaining = Math.ceil(gameState.timeRemaining / 1000);
      const currentPlayer = gameState.entities[currentUserId];
      const playerName = currentPlayer ? currentPlayer.name : 'Unknown Player';
      const health = currentPlayer ? Math.max(0, Math.round(currentPlayer.health)) : 0;

      return (
        <div
          className="absolute top-0 left-0 right-0 p-2 bg-black bg-opacity-50 text-white font-bold"
          style={{ userSelect: 'none' }}
        >
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <p>Playing as: {playerName}</p>
              <div className="flex items-center">
                <img 
                  src={ASSETS.ui.health_icon ? ASSETS.ui.health_icon.path : ''} 
                  className="w-4 h-4 mr-1" 
                  alt="" 
                />
                <p>Health: {health}%</p>
              </div>
              <p>Players Alive: {aliveCount}</p>
            </div>
            <div className="flex items-center gap-2">
              <img 
                src={ASSETS.ui.safe_zone_icon ? ASSETS.ui.safe_zone_icon.path : ''} 
                className="w-4 h-4 mr-1" 
                alt="" 
              />
              <p>Safe Zone: {Math.round(gameState.safeZone.radius)}</p>
              <p>Time: {timeRemaining}s</p>
            </div>
          </div>
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
              <p>Eliminated: {results.losers.join(', ') || 'None'}</p>
            </div>
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

    const Joystick = ({ onMove, position = { bottom: '20px', right: '20px' } }) => {
      const [isDragging, setIsDragging] = useState(false);
      const [offset, setOffset] = useState({ x: 0, y: 0 });
      const joystickRef = React.useRef(null);
      const maxDistance = 30;

      const handlePointerDown = (e) => {
        e.preventDefault();
        setIsDragging(true);
        setOffset({ x: 0, y: 0 });
      };

      const handlePointerMove = (e) => {
        if (isDragging && joystickRef.current) {
          const rect = joystickRef.current.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
      
          let dx = e.clientX - centerX;
          let dy = e.clientY - centerY;
      
          // Normalize if beyond max distance
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > maxDistance) {
            dx = (dx / distance) * maxDistance;
            dy = (dy / distance) * maxDistance;
          }
      
          setOffset({ x: dx, y: dy });
      
          // Normalize for game input
          const normalizedDx = dx / maxDistance;
          const normalizedDy = dy / maxDistance;
          onMove(normalizedDx, normalizedDy);
        }
      };

      const handlePointerUp = () => {
        if (isDragging) {
          setIsDragging(false);
          setOffset({ x: 0, y: 0 });
          onMove(0, 0);
        }
      };

      useEffect(() => {
        if (isDragging) {
          window.addEventListener('pointermove', handlePointerMove);
          window.addEventListener('pointerup', handlePointerUp);
        }
    
        return () => {
          window.removeEventListener('pointermove', handlePointerMove);
          window.removeEventListener('pointerup', handlePointerUp);
        };
      }, [isDragging]);

      return (
        <div
          ref={joystickRef}
          className="absolute"
          style={{
            ...position,
            width: '100px',
            height: '100px',
            userSelect: 'none',
            touchAction: 'none'
          }}
          onPointerDown={handlePointerDown}
        >
          <img 
            src={ASSETS.ui.joystick_base ? ASSETS.ui.joystick_base.path : ''} 
            className="absolute w-full h-full" 
            alt="" 
          />
          <div
            className="absolute"
            style={{
              width: '40px',
              height: '40px',
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`
            }}
          >
            <img 
              src={ASSETS.ui.joystick_handle ? ASSETS.ui.joystick_handle.path : ''} 
              className="w-full h-full" 
              alt="" 
            />
          </div>
        </div>
      );
    };

    function GameUI({ gameState, gameInterface, onFinishGame }) {
      const [, forceUpdate] = useState();
      const [aimPosition, setAimPosition] = useState({ x: 0, y: 0 });

      const handleMove = (dx, dy) => {
        gameInterface.sendGameEvent('joystick_move', {dx, dy, userId: gameInterface.userId});
      }

      const handleShoot = (e) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
    
        setAimPosition({ x, y });
    
        gameInterface.sendGameEvent('shoot', {
          userId: gameInterface.userId,
          targetX: x + gameState.entities[gameInterface.userId].x - gameState.screenSize.width / 2,
          targetY: y + gameState.entities[gameInterface.userId].y - gameState.screenSize.height / 2
        });
      }

      const handleTakeCover = (e) => {
        e.preventDefault();
        gameInterface.sendGameEvent('take_cover', {userId: gameInterface.userId});
      }

      useEffect(() => {
        const interval = setInterval(() => {
          forceUpdate({});
        }, 30);
        return () => clearInterval(interval);
      }, []);

      return (
        <>
          <HUD gameState={gameState} currentUserId={gameInterface.userId} />
      
          <div 
            className="absolute inset-0"
            onPointerDown={handleShoot}
          >
            {aimPosition.x !== 0 && aimPosition.y !== 0 && (
              <div
                className="absolute w-4 h-4 border-2 border-red-500 rounded-full"
                style={{
                  left: aimPosition.x - 2,
                  top: aimPosition.y - 2,
                  opacity: 0.7
                }}
              />
            )}
          </div>
      
          <Joystick onMove={handleMove} position={{ bottom: '20px', right: '20px' }} />
      
          <div
            className="absolute"
            style={{
              bottom: '20px',
              left: '20px',
              width: '64px',
              height: '64px',
              userSelect: 'none'
            }}
            onPointerDown={handleTakeCover}
          >
            <img 
              src={ASSETS.ui.cover_button ? ASSETS.ui.cover_button.path : ''} 
              className="w-full h-full" 
              alt="" 
            />
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