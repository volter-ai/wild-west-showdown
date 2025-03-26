import React, { useEffect, useState } from 'react';
import { BOT_NAMES } from './botNames';
import { PLAYER } from '../playerData';
import { MAX_PLAYERS } from './config';

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
    <div className="flex flex-col items-center justify-center h-full w-full bg-gray-800 text-white">
      <h1 className="text-3xl mb-4">Matchmaking</h1>
      <div className="max-w-md w-full p-6 bg-gray-700 rounded-lg">
        <div className="text-center text-gray-300 mb-6">
          {matchmaking ? 'Finding players...' : startingMatch ? 'Starting...' : 'Match Ready!'}
        </div>
        <ul className="space-y-2">
          {usersList.map((user) => (
            <li
              key={user.sid}
              className="flex items-center justify-between p-2 bg-gray-600 rounded"
            >
              <span>{user.name}</span>
            </li>
          ))}
        </ul>
        <div className="text-center mt-4 text-gray-300">
          {`Players: ${usersList.length}/${MAX_PLAYERS}`}
        </div>
      </div>
      <button
        onClick={onFinishGame}
        className="absolute bottom-4 left-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
      >
        Leave
      </button>
    </div>
  );
}

export default Matchmaking;
