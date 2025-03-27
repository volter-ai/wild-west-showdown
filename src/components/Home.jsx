import React, { useState } from 'react';
import { ASSETS } from '../assetManifest';
import { PLAYER } from '../playerData';

function Home({ app }) {
  const [playerName, setPlayerName] = useState(PLAYER.name);

  const handleStartGame = (isSinglePlayer) => {
    app.setPlayerName(playerName);
    app.goToGame(isSinglePlayer);
  };

  return (
    <div className="bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#1a1a2e] h-full w-full mx-auto relative overflow-hidden text-white">
      <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{backgroundImage: `url(${ASSETS.backgrounds.mainMenu.path})`}} />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a]/90 via-[#1e293b]/70 to-[#0f172a]/90" />
      
      <div className="p-4 flex flex-col h-full relative z-10">
        <div className="flex-grow flex flex-col items-center justify-center gap-4">
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            className="w-64 py-2 px-4 bg-white/90 text-gray-900 rounded-lg"
          />
          
          <button
            onClick={() => handleStartGame(true)}
            className="w-64 py-4 bg-white/90 text-gray-900 font-bold hover:bg-white transition-colors text-xl uppercase rounded-lg"
          >
            Play
          </button>
          
          <button
            onClick={() => handleStartGame(false)}
            className="w-48 py-2 bg-white/20 text-white font-bold hover:bg-white/30 transition-colors text-md uppercase rounded-lg"
          >
            Play with Friends
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
