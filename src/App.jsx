import React, { useState, useEffect } from 'react';
    import { GameInterface } from '@volter/ige5';
    import { GameSimulation } from './game/gameSimulation';

    function App() {
      const [screen, setScreen] = useState('title');
      const [gameInterface, setGameInterface] = useState(null);
      const [gameState, setGameState] = useState(null);
      const [gameSimulation, setGameSimulation] = useState(null);
      const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight
      });

      useEffect(() => {
        const handleResize = () => {
          setWindowSize({
            width: window.innerWidth,
            height: window.innerHeight
          });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
      }, []);

      const handleStartGame = (interface) => {
        setGameInterface(interface);
        setScreen('lobby');
      };

      const handleJoinGame = () => {
        setScreen('game');
      };

      const handleFinishGame = () => {
        setGameSimulation(null);
        setGameState(null);
        setScreen('title');
      };

      return (
        <div className="h-screen w-screen overflow-hidden">
          {screen === 'title' && (
            <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-b from-yellow-700 to-yellow-500">
              <div className="text-center mb-8">
                <h1 className="text-5xl font-bold text-white mb-2">Wild West Showdown</h1>
                <p className="text-xl text-white">The last cowboy standing wins!</p>
              </div>
              <button className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded">
                Create New Game
              </button>
            </div>
          )}
          {screen === 'lobby' && (
            <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-b from-yellow-700 to-yellow-500">
              <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                <h2 className="text-2xl font-bold mb-4 text-center">Game Lobby</h2>
                <button
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                  onClick={handleJoinGame}
                >
                  Start Game
                </button>
              </div>
            </div>
          )}
          {screen === 'game' && (
            <div className="h-full w-full bg-gradient-to-b from-yellow-700 to-yellow-500 relative">
              <div className="absolute top-0 left-0 right-0 p-2 bg-black bg-opacity-50 text-white">
                <div className="flex justify-between items-center">
                  <div>Wild West Showdown</div>
                  <button
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-sm"
                    onClick={handleFinishGame}
                  >
                    Exit Game
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    export default App;