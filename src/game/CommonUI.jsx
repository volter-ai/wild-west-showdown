import React, { useEffect, useRef, useState } from 'react';

export const Joystick = ({ onMove, position }) => {
  const joystickRef = useRef(null);
  const [stickPosition, setStickPosition] = useState({ dx: 0, dy: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [activeKeyState, setActiveKeyState] = useState({
    up: false,
    down: false,
    left: false,
    right: false
  });
  const activeTouches = useRef(new Map());
  const lastMove = useRef({ dx: 0, dy: 0 });
  const animationFrameId = useRef(null);
  const activeKeys = useRef(new Set());
  const STICK_SIZE = 128;
  const INNER_SIZE = 64;
  const MAX_DISTANCE = (STICK_SIZE - INNER_SIZE) / 2;

  // Detect if device has touch capability
  useEffect(() => {
    const checkTouchDevice = () => {
      // Most reliable way to detect touch capability
      const hasTouchPoints = 'maxTouchPoints' in navigator && navigator.maxTouchPoints > 0;
      const hasTouch = 'ontouchstart' in window ||
                       (window.DocumentTouch && document instanceof DocumentTouch);

      setIsMobile(hasTouchPoints || hasTouch);
    };

    checkTouchDevice();
  }, []);

  const calculateStickPosition = (clientX, clientY, rect) => {
    const centerX = rect.left + STICK_SIZE / 2;
    const centerY = rect.top + STICK_SIZE / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > MAX_DISTANCE) {
      dx = (dx / distance) * MAX_DISTANCE;
      dy = (dy / distance) * MAX_DISTANCE;
    }

    return {
      dx: dx / MAX_DISTANCE,
      dy: dy / MAX_DISTANCE,
      pixelX: dx,
      pixelY: dy,
    };
  };

  const startContinuousMove = () => {
    const update = () => {
      if (activeTouches.current.size > 0 || activeKeys.current.size > 0) {
        onMove(lastMove.current.dx, lastMove.current.dy);
        animationFrameId.current = requestAnimationFrame(update);
      }
    };
    if (!animationFrameId.current) {
      animationFrameId.current = requestAnimationFrame(update);
    }
  };

  const stopContinuousMove = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    onMove(0, 0);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      let dx = 0;
      let dy = 0;

      if (e.key.toLowerCase() === 'w' || e.key === 'ArrowUp') {
        activeKeys.current.add('up');
        setActiveKeyState(prev => ({...prev, up: true}));
      }
      if (e.key.toLowerCase() === 's' || e.key === 'ArrowDown') {
        activeKeys.current.add('down');
        setActiveKeyState(prev => ({...prev, down: true}));
      }
      if (e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft') {
        activeKeys.current.add('left');
        setActiveKeyState(prev => ({...prev, left: true}));
      }
      if (e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') {
        activeKeys.current.add('right');
        setActiveKeyState(prev => ({...prev, right: true}));
      }

      if (activeKeys.current.has('up')) dy -= 1;
      if (activeKeys.current.has('down')) dy += 1;
      if (activeKeys.current.has('left')) dx -= 1;
      if (activeKeys.current.has('right')) dx += 1;

      if (dx !== 0 || dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx /= length;
        dy /= length;
        lastMove.current = { dx, dy };
        setStickPosition({ dx: dx * MAX_DISTANCE, dy: dy * MAX_DISTANCE });
        startContinuousMove();
      }
    };

    const handleKeyUp = (e) => {
      if (e.key.toLowerCase() === 'w' || e.key === 'ArrowUp') {
        activeKeys.current.delete('up');
        setActiveKeyState(prev => ({...prev, up: false}));
      }
      if (e.key.toLowerCase() === 's' || e.key === 'ArrowDown') {
        activeKeys.current.delete('down');
        setActiveKeyState(prev => ({...prev, down: false}));
      }
      if (e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft') {
        activeKeys.current.delete('left');
        setActiveKeyState(prev => ({...prev, left: false}));
      }
      if (e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') {
        activeKeys.current.delete('right');
        setActiveKeyState(prev => ({...prev, right: false}));
      }

      if (activeKeys.current.size === 0) {
        lastMove.current = { dx: 0, dy: 0 };
        setStickPosition({ dx: 0, dy: 0 });
        stopContinuousMove();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const joystickElement = joystickRef.current;

    const handleTouchStart = (e) => {
      e.preventDefault();

      const rect = joystickElement.getBoundingClientRect();

      Array.from(e.changedTouches).forEach((touch) => {
        if (
          touch.clientX >= rect.left &&
          touch.clientX <= rect.right &&
          touch.clientY >= rect.top &&
          touch.clientY <= rect.bottom
        ) {
          const { dx, dy, pixelX, pixelY } = calculateStickPosition(
            touch.clientX,
            touch.clientY,
            rect
          );

          activeTouches.current.set(touch.identifier, {
            touch,
            pixelX,
            pixelY,
            dx,
            dy,
          });

          lastMove.current = { dx, dy };
          setStickPosition({ dx: pixelX, dy: pixelY });
          startContinuousMove();
        }
      });
    };

    const handleTouchMove = (e) => {
      e.preventDefault();

      const rect = joystickElement.getBoundingClientRect();

      Array.from(e.changedTouches).forEach((touch) => {
        if (activeTouches.current.has(touch.identifier)) {
          const { dx, dy, pixelX, pixelY } = calculateStickPosition(
            touch.clientX,
            touch.clientY,
            rect
          );

          activeTouches.current.set(touch.identifier, {
            touch,
            pixelX,
            pixelY,
            dx,
            dy,
          });

          lastMove.current = { dx, dy };
          setStickPosition({ dx: pixelX, dy: pixelY });
        }
      });
    };

    const handleTouchEnd = (e) => {
      e.preventDefault();

      Array.from(e.changedTouches).forEach((touch) => {
        if (activeTouches.current.has(touch.identifier)) {
          activeTouches.current.delete(touch.identifier);
          if (activeTouches.current.size === 0) {
            setStickPosition({ dx: 0, dy: 0 });
            lastMove.current = { dx: 0, dy: 0 };
            stopContinuousMove();
          }
        }
      });
    };

    joystickElement.addEventListener('touchstart', handleTouchStart, {
      passive: false,
    });
    joystickElement.addEventListener('touchmove', handleTouchMove, {
      passive: false,
    });
    joystickElement.addEventListener('touchend', handleTouchEnd, {
      passive: false,
    });
    joystickElement.addEventListener('touchcancel', handleTouchEnd, {
      passive: false,
    });

    return () => {
      joystickElement.removeEventListener('touchstart', handleTouchStart);
      joystickElement.removeEventListener('touchmove', handleTouchMove);
      joystickElement.removeEventListener('touchend', handleTouchEnd);
      joystickElement.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  useEffect(() => {
    const joystickElement = joystickRef.current;

    const handleMouseDown = (e) => {
      e.preventDefault();

      const rect = joystickElement.getBoundingClientRect();

      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        const { dx, dy, pixelX, pixelY } = calculateStickPosition(
          e.clientX,
          e.clientY,
          rect
        );

        activeTouches.current.set('mouse', { dx, dy, pixelX, pixelY });
        lastMove.current = { dx, dy };
        setStickPosition({ dx: pixelX, dy: pixelY });
        startContinuousMove();

        const handleMouseMove = (eMove) => {
          const { dx, dy, pixelX, pixelY } = calculateStickPosition(
            eMove.clientX,
            eMove.clientY,
            rect
          );

          activeTouches.current.set('mouse', { dx, dy, pixelX, pixelY });
          lastMove.current = { dx, dy };
          setStickPosition({ dx: pixelX, dy: pixelY });
        };

        const handleMouseUp = () => {
          activeTouches.current.delete('mouse');
          setStickPosition({ dx: 0, dy: 0 });
          lastMove.current = { dx: 0, dy: 0 };
          stopContinuousMove();
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }
    };

    joystickElement.addEventListener('mousedown', handleMouseDown);

    return () => {
      joystickElement.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return (
    <div
      ref={joystickRef}
      className="joystick-area absolute rounded-full bg-gray-800 bg-opacity-30 flex items-center justify-center"
      style={{
        userSelect: 'none',
        width: `${STICK_SIZE}px`,
        height: `${STICK_SIZE}px`,
        ...position,
      }}
    >
      <div
        className="joystick-inner absolute bg-gray-400 bg-opacity-70 rounded-full"
        style={{
          width: `${INNER_SIZE}px`,
          height: `${INNER_SIZE}px`,
          transform: `translate(${stickPosition.dx}px, ${stickPosition.dy}px)`,
          left: `${(STICK_SIZE - INNER_SIZE) / 2}px`,
          top: `${(STICK_SIZE - INNER_SIZE) / 2}px`,
        }}
      />
      {!isMobile && (
  <div className="absolute top-0 flex space-x-0">
    <span className={`text-lg font-bold ${activeKeyState.up ? 'text-yellow-300' : 'text-white'}`}>W</span>
    <span className={`text-lg font-bold ${activeKeyState.left ? 'text-yellow-300' : 'text-white'}`}>A</span>
    <span className={`text-lg font-bold ${activeKeyState.down ? 'text-yellow-300' : 'text-white'}`}>S</span>
    <span className={`text-lg font-bold ${activeKeyState.right ? 'text-yellow-300' : 'text-white'}`}>D</span>
  </div>
)}
    </div>
  );
};