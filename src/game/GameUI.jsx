import React, { useState, useEffect } from 'react';
import { Joystick } from './CommonUI';

const HUD = ({ gameState }) => {
  const jailedCount = Object.values(gameState.entities).filter(e => e.inJail && !e.isBot).length;
  const timeRemaining = Math.ceil(gameState.timeRemaining / 1000);

  return (
    <div
      className="absolute top-0 left-0 right-0 p-2 bg-black bg-opacity-50 text-gray-300 font-game"
      style={{ userSelect: 'none' }}
    >
      <div className="flex justify-between items-center">
        <p>Players Jailed: {jailedCount}</p>
        <p>Time Remaining: {timeRemaining}s</p>
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
          <p>Caught: {results.losers.join(', ') || 'None'}</p>
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

function GameUI({ gameState, gameInterface, onFinishGame }) {
  const [, forceUpdate] = useState();

  const handleMove = (dx, dy) => {
    gameInterface.sendGameEvent('joystick_move', {dx, dy, userId: gameInterface.userId});
  }

  const handleDash = (e) => {
    e.preventDefault();
    gameInterface.sendGameEvent('dash', {userId: gameInterface.userId});
  }

  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate({});
    }, 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <HUD gameState={gameState} />
      <Joystick onMove={handleMove} position={{ bottom: '20px', right: '20px' }} />
      <div
        className="absolute rounded-full bg-gray-800 bg-opacity-30 flex items-center justify-center cursor-pointer"
        style={{
          bottom: '20px',
          left: '20px',
          width: '64px',
          height: '64px',
          userSelect: 'none'
        }}
        onPointerDown={handleDash}
      >
        <div className="text-white text-2xl">⚡</div>
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
