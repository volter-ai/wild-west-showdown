import React, { useState } from 'react';
import { ASSETS } from '../assetManifest';
import { PLAYER } from '../playerData';

const WesternButton = ({ onClick, children, className = '', disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`relative px-4 py-2 font-['Rye'] text-amber-100 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 ${className}`}
  >
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
      <path
        d="M5,2 L95,2 C97,2 98,3 98,5 L98,35 C98,37 97,38 95,38 L5,38 C3,38 2,37 2,35 L2,5 C2,3 3,2 5,2 Z"
        fill="#8B4513"
        stroke="#422006"
        strokeWidth="2"
      />
      <path
        d="M10,6 L90,6 C92,6 94,7 94,9 L94,31 C94,33 92,34 90,34 L10,34 C8,34 6,33 6,31 L6,9 C6,7 8,6 10,6 Z"
        fill="#A0522D"
        stroke="#422006"
        strokeWidth="1"
      />
    </svg>
    <span className="relative z-10 drop-shadow-md">{children}</span>
  </button>
);

const WesternInput = ({ value, onChange, placeholder, className = '' }) => (
  <div className={`relative ${className}`}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
      <path
        d="M5,2 L95,2 C97,2 98,3 98,5 L98,35 C98,37 97,38 95,38 L5,38 C3,38 2,37 2,35 L2,5 C2,3 3,2 5,2 Z"
        fill="#3C2415"
        stroke="#422006"
        strokeWidth="2"
      />
    </svg>
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full h-full bg-transparent relative z-10 px-4 py-2 text-amber-100 font-['Special_Elite'] placeholder-amber-100/50 outline-none"
    />
  </div>
);

function Home({ app }) {
  const [playerName, setPlayerName] = useState(PLAYER.name);

  const handleStartGame = (isSinglePlayer) => {
    app.setPlayerName(playerName);
    app.goToGame(isSinglePlayer);
  };

  return (
    <div className="bg-gradient-to-br from-[#3C1518] via-[#69140E] to-[#3C1518] h-full w-full mx-auto relative overflow-hidden text-white">
      <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{backgroundImage: `url(${ASSETS.backgrounds.mainMenu.path})`}} />
      <div className="absolute inset-0 bg-gradient-to-r from-[#3C1518]/90 via-[#69140E]/70 to-[#3C1518]/90" />
      
      <div className="p-4 flex flex-col h-full relative z-10">
        <div className="flex-grow flex flex-col items-center justify-center gap-6">
          <div className="mb-6 relative">
            <svg width="300" height="100" viewBox="0 0 300 100">
              <path
                d="M20,10 L280,10 C290,10 290,20 280,20 L260,20 L270,30 L250,30 L240,20 L60,20 L50,30 L30,30 L40,20 L20,20 C10,20 10,10 20,10 Z"
                fill="#8B4513"
                stroke="#422006"
                strokeWidth="2"
              />
              <path
                d="M30,30 L270,30 C275,30 280,35 280,40 L280,80 C280,85 275,90 270,90 L30,90 C25,90 20,85 20,80 L20,40 C20,35 25,30 30,30 Z"
                fill="#A0522D"
                stroke="#422006"
                strokeWidth="2"
              />
              <text x="150" y="65" fontSize="28" fontFamily="Rye" fill="#F5DEB3" textAnchor="middle">WILD WEST SHOWDOWN</text>
            </svg>
          </div>
          
          <WesternInput
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            className="w-64 h-10 mb-4"
          />
          
          <WesternButton
            onClick={() => handleStartGame(true)}
            className="w-64 py-4 text-xl"
          >
            PLAY
          </WesternButton>
          
          <WesternButton
            onClick={() => handleStartGame(false)}
            className="w-48 py-2"
          >
            Play with Friends
          </WesternButton>
        </div>
      </div>
    </div>
  );
}

export default Home;
