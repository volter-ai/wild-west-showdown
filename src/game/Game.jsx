import React, { useRef, useState, useEffect } from 'react';
import { GameSimulation } from './gameSimulation';
import { ClientSimulation } from './clientSimulation';
import GameStage from './GameStage';
import GameUI from './GameUI';
import GameInterface from './GameInterface';
import Lobby from './Lobby';
import Matchmaking from './Matchmaking';
import { LEVELS } from './data';
import BotController from './BotController';

// Fixed game dimensions
const GAME_WIDTH = 390;
const GAME_HEIGHT = 844;
const GAME_ASPECT_RATIO = GAME_WIDTH / GAME_HEIGHT;

function Game({ app, levelId = 'level1', onFinishGame, singlePlayer = true }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameVersion, setGameVersion] = useState(0);
  const [gameState, setGameState] = useState(null);
  const [dimensions, setDimensions] = useState({ scale: 1 });
  const [botControllers, setBotControllers] = useState([]);
  const gameInterfaceRef = useRef(null);
  const renderer = useRef(null);
  const containerRef = useRef(null);
  const lastUpdateTime = useRef(performance.now());

  // Calculate the scale factor based on the container size
  const updateDimensions = () => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerAspectRatio = containerRect.width / containerRect.height;

    let scale;
    if (containerAspectRatio > GAME_ASPECT_RATIO) {
      // Container is wider than our game aspect ratio — scale to fit height (pillarboxing)
      scale = containerRect.height / GAME_HEIGHT;
    } else {
      // Container is taller — scale to fit width (letterboxing)
      scale = containerRect.width / GAME_WIDTH;
    }

    setDimensions({ scale });
  };

  const cleanupGame = () => {
    // Cleanup bot controllers
    botControllers.forEach(controller => controller.destroy());
    setBotControllers([]);

    renderer.current = null;
    setGameStarted(false);
    setGameState(null);
    setGameVersion((v) => v + 1);
  };

  const startGame = () => {
    if (gameInterfaceRef.current === null) {
      return;
    }

    // Clean up any existing game state first
    cleanupGame();

    const isHost = singlePlayer ||
      gameInterfaceRef.current.userId === gameInterfaceRef.current.hostId;

    if (isHost) {
      renderer.current = new GameSimulation(
        gameInterfaceRef.current,
        gameInterfaceRef.current.users,
        GAME_WIDTH,
        GAME_HEIGHT,
        LEVELS[levelId]
      );

      // Create bot controllers for bot users
      const newBotControllers = Object.entries(gameInterfaceRef.current.users)
        .filter(([userId, user]) => user.is_bot)
        .map(([userId, user]) => new BotController(
          gameInterfaceRef.current,
          userId,
          renderer.current.gameState
        ));

      // Check if autoplay is enabled via URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      const autoplayEnabled = urlParams.get('autoplay') === 'true';

      // If autoplay is enabled, add a bot controller for the local player
      if (autoplayEnabled && !gameInterfaceRef.current.users[gameInterfaceRef.current.userId]?.is_bot) {
        newBotControllers.push(new BotController(
          gameInterfaceRef.current,
          gameInterfaceRef.current.userId,
          renderer.current.gameState
        ));
      }

      setBotControllers(newBotControllers);
    } else {
      renderer.current = new ClientSimulation(
        gameInterfaceRef.current,
        GAME_WIDTH,
        GAME_HEIGHT
      );
    }

    lastUpdateTime.current = performance.now();
    setGameStarted(true);
  };

  // Initialize the game interface
  if (!gameInterfaceRef.current) {
    gameInterfaceRef.current = new GameInterface(levelId);
    if (!singlePlayer) {
      gameInterfaceRef.current.connect();
      gameInterfaceRef.current.on('game_started', () => {
        console.log('Game started with users:');
        Object.values(gameInterfaceRef.current.users).forEach((user) => {
          console.log(`User: ${user.name}`);
          console.log('Stats:', JSON.stringify(user.stats, null, 2));
        });
        startGame();
      });
    }
  }

  // Update scale on window resize
  useEffect(() => {
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Use ResizeObserver to update dimensions when container is fully loaded or resized
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(containerRef.current);

    // Ensure dimensions update immediately on mount
    updateDimensions();

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Disconnect the game interface on unmount
  useEffect(() => {
    return () => {
      gameInterfaceRef.current?.disconnect();
      gameInterfaceRef.current = null;
    };
  }, []);

  // Update the game state with real time delta
  useEffect(() => {
    const updateFrame = () => {
      if (renderer.current) {
        const currentTime = performance.now();
        const deltaTime = currentTime - lastUpdateTime.current;
        lastUpdateTime.current = currentTime;
        renderer.current.update(deltaTime);
        if (renderer.current.gameState) {
          gameInterfaceRef.current?.sendGameStateUpdate(renderer.current.gameState);
          setGameState(renderer.current.gameState);
        }
        if (gameInterfaceRef.current?.users[gameInterfaceRef.current.userId]?.is_bot
          && renderer.current.gameState.isGameOver) {
          handleGameFinish();
        }
      }
    };

    const frameId = requestAnimationFrame(function tick() {
      updateFrame();
      requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(frameId);
  }, [gameStarted]);

  const handleGameFinish = (...args) => {
    if (!singlePlayer) {
      gameInterfaceRef.current.sendGameFinish();
    }
    cleanupGame();
    onFinishGame?.(...args);
  };

  const renderBody = () => {
    if (!gameStarted) {
      if (singlePlayer) {
        return <Matchmaking gameInterface={gameInterfaceRef.current} onMatchReady={startGame} onFinishGame={handleGameFinish} />;
      } else {
        return <Lobby gameInterface={gameInterfaceRef.current} onFinishGame={handleGameFinish} />;
      }
    } else if (!renderer.current || !gameState) {
      return <div>Loading game...</div>;
    } else {
      // Compute the scaled width and height of the play area
      const scaledWidth = GAME_WIDTH * dimensions.scale;
      const scaledHeight = GAME_HEIGHT * dimensions.scale;
      return (
        // Outer wrapper with the scaled dimensions.
        <div
          style={{
            width: scaledWidth,
            height: scaledHeight,
            position: 'relative',
            overflow: 'hidden' // Add overflow hidden to clip content
          }}
        >
          {/* Inner container applies the scaling transform. */}
          <div
            style={{
              width: GAME_WIDTH,
              height: GAME_HEIGHT,
              transform: `scale(${dimensions.scale})`,
              transformOrigin: 'top left',
              position: 'relative',
              overflow: 'hidden' // Add overflow hidden to clip content
            }}
          >
            <GameStage
              key={gameVersion}
              gameState={renderer.current.gameState}
              gameInterface={renderer.current.gameInterface}
            />
            <div className="absolute inset-0 pointer-events-none">
              <div className="pointer-events-auto">
                <GameUI
                  key={gameVersion}
                  gameState={renderer.current.gameState}
                  gameInterface={renderer.current.gameInterface}
                  onFinishGame={handleGameFinish}
                />
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    // Outer container centered with a black background for letterboxing/pillarboxing.
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'black'
      }}
    >
      {renderBody()}
    </div>
  );
}

export default Game;
