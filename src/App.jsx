import React, { useState } from 'react';
import Game from './game/Game';
import Home from './components/Home';
import { PLAYER } from './playerData';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [singlePlayer, setSinglePlayer] = useState(true);
  
  const app = {
    goToGame: (isSinglePlayer) => {
      setSinglePlayer(isSinglePlayer);
      setCurrentPage('game');
    },
    setPlayerName: (name) => {
      PLAYER.name = name;
    }
  };

  return (
    <div className="h-full w-full mx-auto relative">
      {currentPage === 'home' ? (
        <Home app={app} />
      ) : (
        <Game 
          app={app}
          singlePlayer={singlePlayer}
          onFinishGame={() => setCurrentPage('home')}
        />
      )}
    </div>
  );
}

export default App;
