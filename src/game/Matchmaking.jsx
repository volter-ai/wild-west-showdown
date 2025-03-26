import React, { useEffect, useState } from 'react';
import { BOT_NAMES } from './botNames';
import { PLAYER } from '../playerData';
import { MAX_PLAYERS } from './config';
import { ASSETS } from '../assetManifest';

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

function Matchmaking({ gameInterface, onMatchReady, onFinishGame }) {
  const [matchmaking, setMatchmaking] = useState(true);
  const [startingMatch, setStartingMatch] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [matchReadyTriggered, setMatchReadyTriggered] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameInterface) {
        setUsersList(Object.values(gameInterface.users));
      }
    }, 10);

    return () => clearInterval(interval);
  }, [gameInterface]);
  
  useEffect(() => {
    const availableNames = [...BOT_NAMES];
    let botCount = 0;
    
    const addBot = () => {
      if (botCount >= MAX_PLAYERS - 1) return;
      
      const nameIndex = Math.floor(Math.random() * availableNames.length);
      const botName = availableNames.splice(nameIndex, 1)[0];
      const botId = `bot-${botCount}`;
      
      gameInterface.users[botId] = {
        sid: botId,
        name: botName,
        stats: { ...PLAYER.stats },
        is_bot: true
      };
      
      botCount++;
      
      if (Object.keys(gameInterface.users).length >= MAX_PLAYERS && !matchReadyTriggered) {
        setMatchmaking(false);
        setStartingMatch(true);
        setMatchReadyTriggered(true);
        setTimeout(() => {
          onMatchReady();
        }, 1200);
      }
    };
    
    const timeouts = [];
    for (let i = 0; i < MAX_PLAYERS - 1; i++) {
      const randomDelay = 500 + Math.random() * 3000;
      timeouts.push(setTimeout(addBot, randomDelay));
    }
    
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [gameInterface, onMatchReady, matchReadyTriggered]);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-amber-900/20 text-amber-100 relative">
      {/* Background image */}
      <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{backgroundImage: `url(${ASSETS.backgrounds.mainMenu.path})`}} />
      
      <div className="relative z-10 max-w-md w-full p-6">
        <div className="relative mb-6">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="none">
            <path
              d="M10,0 L190,0 C195,0 200,5 200,10 L200,50 C200,55 195,60 190,60 L10,60 C5,60 0,55 0,50 L0,10 C0,5 5,0 10,0 Z"
              fill="#2D1B0E"
              fillOpacity="0.85"
              stroke="#422006"
              strokeWidth="2"
            />
          </svg>
          <h1 className="text-3xl font-['Rye'] text-center relative z-10 py-4">Matchmaking</h1>
        </div>
        
        <div className="relative">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 300" preserveAspectRatio="none">
            <path
              d="M10,0 L290,0 C295,0 300,5 300,10 L300,290 C300,295 295,300 290,300 L10,300 C5,300 0,295 0,290 L0,10 C0,5 5,0 10,0 Z"
              fill="#2D1B0E"
              fillOpacity="0.85"
              stroke="#422006"
              strokeWidth="2"
            />
          </svg>
          <div className="p-6 relative z-10">
            <div className="text-center text-amber-100 font-['Special_Elite'] mb-6 text-lg">
              {matchmaking ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Finding players...
                </div>
              ) : startingMatch ? (
                <div className="text-amber-300">Starting...</div>
              ) : (
                <div className="text-green-400">Match Ready!</div>
              )}
            </div>
            
            <div className="bg-amber-900/30 rounded-lg border border-amber-800/50 mb-4">
              <ul className="divide-y divide-amber-800/30">
                {usersList.map((user) => (
                  <li
                    key={user.sid}
                    className="flex items-center justify-between p-3"
                  >
                    <div className="flex items-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" className="mr-2 text-amber-500">
                        <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                      </svg>
                      <span className="font-['Special_Elite']">{user.name}</span>
                    </div>
                    {user.is_bot && (
                      <span className="text-xs text-amber-400/70 font-['Special_Elite']">Bot</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="text-center font-['Special_Elite'] text-amber-100">
              <div className="flex items-center justify-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" className="text-amber-500">
                  <path fill="currentColor" d="M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V19H23V16.5C23,14.17 18.33,13 16,13M8,13C5.67,13 1,14.17 1,16.5V19H15V16.5C15,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z" />
                </svg>
                <span>{`Players: ${usersList.length}/${MAX_PLAYERS}`}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <WesternButton
        onClick={onFinishGame}
        className="absolute bottom-4 left-4"
      >
        Leave
      </WesternButton>
    </div>
  );
}

export default Matchmaking;
