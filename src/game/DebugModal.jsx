import React, { useState, useRef, useEffect } from 'react';
import { Settings } from 'lucide-react';

const DebugModal = ({ game }) => {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // const setMaxGold = () => {
  //   game.gold = 999999;
  // };

  return (
    <div className="absolute top-2 right-2 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-full bg-gray-800 bg-opacity-50 hover:bg-opacity-75"
        >
          <Settings className="text-white" size={24} />
        </button>
      )}

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40" />
          <div
            ref={modalRef}
            className="absolute top-12 right-0 bg-gray-800 p-6 rounded-lg shadow-lg min-w-[300px] min-h-[200px] z-50"
          >
            <h2 className="text-white text-xl mb-4">Debug Controls</h2>
            {/*<button */}
            {/*  onClick={setMaxGold}*/}
            {/*  className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 rounded"*/}
            {/*>*/}
            {/*  Set Max Gold*/}
            {/*</button>*/}
          </div>
        </>
      )}
    </div>
  );
};

export default DebugModal;
