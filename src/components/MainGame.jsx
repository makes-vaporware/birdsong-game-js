import { useState, useEffect, useCallback, useRef } from "react";

import "./MainGame.css";
import flowerSound1 from "../assets/sounds/flower1.mp3";
import flowerSound2 from "../assets/sounds/flower2.mp3";
import flowerSound3 from "../assets/sounds/flower3.mp3";

import bird from "../assets/bird_openmoji.png";

const FLOWERS = ["🌸", "🪻", "🌼"];
const AUDIO_FILES = {
  "🌸": flowerSound1,
  "🪻": flowerSound2,
  "🌼": flowerSound3,
};
const PATTERN_DELAY = 800;

// ---

const MainGame = () => {
  const [gameStarted, setGameStarted] = useState(false);

  // TODO: change to a lower/upper range instead.
  // or don't! fix the lengthier patterns.
  const [maxPatternLength, setMaxPatternLength] = useState(1);
  const [unlockedFlowers, setUnlockedFlowers] = useState([FLOWERS[0]]);
  const [numCompleted, setNumCompleted] = useState(0);

  const [targetPattern, setTargetPattern] = useState([]);
  const [userPattern, setUserPattern] = useState([]);

  const [birdHue, _setBirdHue] = useState(-50);

  const playNextPattern = useRef(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(5);

  const [audioCache] = useState(() => {
    const cache = {};
    FLOWERS.forEach((flower) => {
      cache[flower] = new Audio(AUDIO_FILES[flower]);
      cache[flower].preload = "auto";
      cache[flower].volume = (volume / 10) ** 1.5;
    });
    return cache;
  });
  const timeoutRefs = useRef([]);

  const handleVolumeChange = (newVolume) => {
    console.log(audioCache);
    setVolume(newVolume);

    Object.values(audioCache).forEach((audio) => {
      audio.volume = (newVolume / 10) ** 1.5;
    });
  };

  const stopAllAudio = useCallback(() => {
    Object.values(audioCache).forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });

    timeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
    timeoutRefs.current = [];

    setIsPlaying(false);
  }, [audioCache]);

  const generateNewPattern = useCallback(() => {
    const length = Math.floor(Math.random() * maxPatternLength) + 1;
    const pattern = Array.from(
      { length },
      () => FLOWERS[Math.floor(Math.random() * unlockedFlowers.length)]
    );
    setTargetPattern(pattern);
    setUserPattern([]);
  }, [maxPatternLength, unlockedFlowers.length]);

  const playFlowerSound = useCallback(
    (flower) => {
      const audio = audioCache[flower];
      audio.currentTime = 0;
      audio.play().catch((err) => console.error("Audio play failed:", err));
    },
    [audioCache]
  );

  const playPatternSequence = useCallback(async () => {
    setIsPlaying(true);
    timeoutRefs.current = [];

    for (let i = 0; i < targetPattern.length; i++) {
      const flower = targetPattern[i];
      playFlowerSound(flower);

      if (i < targetPattern.length - 1) {
        await new Promise((resolve) => {
          const timeout = setTimeout(resolve, PATTERN_DELAY);
          timeoutRefs.current.push(timeout);
        });
      }
    }

    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 500);
      timeoutRefs.current.push(timeout);
    });

    setIsPlaying(false);
    timeoutRefs.current = [];
  }, [playFlowerSound, targetPattern]);

  const handleReplayPattern = useCallback(() => {
    if (isPlaying) stopAllAudio();

    // Small delay to ensure cleanup is complete
    setTimeout(() => {
      playPatternSequence();
    }, 50);
  }, [isPlaying, playPatternSequence, stopAllAudio]);

  const handleFlowerClick = useCallback(
    (flower) => {
      if (!unlockedFlowers.includes(flower)) return;
      if (userPattern.length >= targetPattern.length) return;
      setUserPattern([...userPattern, flower]);
    },
    [targetPattern.length, unlockedFlowers, userPattern]
  );

  const handleSend = useCallback(() => {
    const isRightLength = targetPattern.length === userPattern.length;

    if (!isRightLength) return;

    if (isPlaying) stopAllAudio();

    const isCorrect =
      isRightLength &&
      targetPattern.every((flower, index) => flower === userPattern[index]);

    if (isCorrect) {
      const newNumCompleted = numCompleted + 1;
      setNumCompleted(newNumCompleted);

      if (newNumCompleted === 5) {
        setUnlockedFlowers([...unlockedFlowers, FLOWERS[1]]);
      } else if (newNumCompleted === 10) {
        setMaxPatternLength(2);
      } else if (newNumCompleted === 15) {
        setUnlockedFlowers([...unlockedFlowers, FLOWERS[2]]);
      } else if (newNumCompleted === 25) {
        setMaxPatternLength(3);
      }

      playNextPattern.current = true;
      generateNewPattern();
    } else {
      // handleReplayPattern();
      setUserPattern([]);
    }
  }, [
    isPlaying,
    stopAllAudio,
    targetPattern,
    userPattern,
    numCompleted,
    generateNewPattern,
    unlockedFlowers,
  ]);

  const handleUndo = useCallback(() => {
    if (userPattern.length === 0) return;

    setUserPattern(userPattern.slice(0, -1));
  }, [userPattern]);

  const handleClear = useCallback(() => {
    setUserPattern([]);
  }, []);

  const blurOnClick = (callback) => (e) => {
    e.currentTarget.blur();
    callback?.(e);
  };

  const startGame = () => {
    setGameStarted(true);
    generateNewPattern();
    playPatternSequence();
  };

  // Play pattern when it's generated
  useEffect(() => {
    if (gameStarted && targetPattern.length > 0 && playNextPattern.current) {
      playNextPattern.current = false;
      playPatternSequence();
    }
  }, [gameStarted, playPatternSequence, targetPattern.length]);

  // Keyboard listener
  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();

      if (key === "s") {
        handleFlowerClick(FLOWERS[0]);
      } else if (key === "d") {
        handleFlowerClick(FLOWERS[1]);
      } else if (key === "f") {
        handleFlowerClick(FLOWERS[2]);
      } else if (key === "r") {
        handleReplayPattern();
      } else if (key === "enter") {
        handleSend();
      } else if (key === "backspace") {
        handleUndo();
      } else if (key === "delete") {
        event.preventDefault();
        handleClear();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    userPattern,
    targetPattern,
    isPlaying,
    handleFlowerClick,
    handleSend,
    handleClear,
    handleReplayPattern,
    handleUndo,
  ]);

  return (
    <>
      {!gameStarted && (
        <div className="overlay">
          <div className="start-modal">
            <button className="start-btn" onClick={startGame}>
              Start Game
            </button>
            <p>(This game requires audio!)</p>
          </div>
        </div>
      )}
      <div className="game-container">
        <div className="game-header">
          <div className="volume-container">
            <span className="volume-label">🔊</span>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={volume}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
            />
            <span>{volume}</span>
          </div>
        </div>

        <div className="pattern-display-container">
          <div className="pattern-display">
            <img
              style={{ filter: `hue-rotate(${birdHue}deg)` }}
              src={bird}
              alt="bird"
            />
            <div className="bird-bubble">
              <div className="pattern">
                {!gameStarted ? "❓" : "❓".repeat(targetPattern.length)}
              </div>
              <button
                className="replay-btn"
                onClick={blurOnClick(handleReplayPattern)}
              >
                {isPlaying ? "🔊 Playing..." : "🔊 Play Pattern"}
                <span className="key-hint">R</span>
              </button>
            </div>
          </div>
          <div className="pattern-display">
            <div className="user-bubble">
              <div className="pattern-boxes">
                {gameStarted ? (
                  Array.from({ length: targetPattern.length }).map(
                    (_, index) => (
                      <div
                        key={index}
                        className={`pattern-box ${
                          userPattern[index] ? "filled" : "empty"
                        }`}
                      >
                        {userPattern[index] || ""}
                      </div>
                    )
                  )
                ) : (
                  <div className={"pattern-box empty"}></div>
                )}
              </div>
            </div>
            <img
              style={{ filter: `hue-rotate(140deg)` }}
              src={bird}
              alt="bird"
            />
          </div>
        </div>

        <div className="controls">
          <div className="flower-buttons">
            {FLOWERS.map((flower, index) => (
              <button
                key={index}
                className={`flower-btn flower-${index} ${
                  !unlockedFlowers.includes(flower) ? "flower-locked" : ""
                }`}
                onClick={blurOnClick(() => handleFlowerClick(flower))}
                disabled={!unlockedFlowers.includes(flower)}
              >
                <div className="flower-icon">{flower}</div>
                <div className="key-hint">{["S", "D", "F"][index]}</div>
              </button>
            ))}
          </div>

          <div className="action-buttons">
            <button className="clear-btn" onClick={blurOnClick(handleClear)}>
              Clear All
              <span className="key-hint">Del</span>
            </button>
            <button className="undo-btn" onClick={blurOnClick(handleUndo)}>
              Undo
              <span className="key-hint">⌫</span>
            </button>
            <button className="send-btn" onClick={blurOnClick(handleSend)}>
              Send
              <span className="key-hint">Enter</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MainGame;
