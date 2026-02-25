import React, { useState, useEffect, useRef } from 'react';
import './index.css';

const TEXTS = [
  "The quick brown fox jumps over the lazy dog. Programming is the art of algorithm design and the craft of debugging errant code. It is a process of problem solving. Technology continues to evolve at a breakneck pace, transforming the way we live and work.",
  "A journey of a thousand miles begins with a single step. The only way to do great work is to love what you do. If you haven't found it yet, keep looking. Don't settle. As with all matters of the heart, you'll know when you find it.",
  "In the middle of every difficulty lies opportunity. Success is not final, failure is not fatal: it is the courage to continue that counts. Believe you can and you're halfway there. Keep your face always toward the sunshine and shadows will fall behind you."
];

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [appState, setAppState] = useState('home'); // home, typing, result, history
  const [duration, setDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [text, setText] = useState('');
  const [input, setInput] = useState('');
  const [errors, setErrors] = useState(0);
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('typingHistory') || '[]'));

  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Audio Context for sound feedback
  const playTypingSound = (isCorrect) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = isCorrect ? 440 : 150; // A4 vs Low pitch for error
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      // Ignore if audio not supported or user hasn't interacted
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const startTest = () => {
    const randomText = TEXTS[Math.floor(Math.random() * TEXTS.length)];
    // duplicate text if 120s to assure enough words
    setText(duration === 120 ? randomText + " " + randomText : randomText);
    setInput('');
    setErrors(0);
    setTimeLeft(duration);
    setAppState('typing');
    startTimeRef.current = Date.now();

    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const endTest = () => {
    clearInterval(timerRef.current);

    // Calculate final stats needed to be saved immediately
    setAppState('result');
  };

  const handleInputChange = (e) => {
    const val = e.target.value;

    // Prevent copy-paste via length check
    if (val.length - input.length > 2) return;

    // Check for errors and play sound
    if (val.length > 0 && text[val.length - 1]) {
      const isCorrect = val[val.length - 1] === text[val.length - 1];
      if (!isCorrect) {
        setErrors(prev => prev + 1);
      }
      playTypingSound(isCorrect);
    }

    setInput(val);

    // End test early if text finished
    if (val.length === text.length) {
      endTest();
    }
  };

  const calculateStats = () => {
    const wordsTyped = input.length / 5;
    const minutes = (duration - timeLeft) / 60 || 0.01;
    const wpm = Math.round(wordsTyped / minutes);

    let correctChars = 0;
    for (let i = 0; i < input.length; i++) {
      if (input[i] === text[i]) correctChars++;
    }

    const accuracy = input.length > 0 ? Math.round((correctChars / input.length) * 100) : 0;
    return { wpm, accuracy, errors };
  };

  useEffect(() => {
    if (appState === 'result') {
      const finalStats = calculateStats();
      const newRecord = {
        date: new Date().toLocaleDateString(),
        wpm: finalStats.wpm,
        accuracy: finalStats.accuracy,
        duration: duration
      };
      setHistory(prev => {
        const updatedHistory = [newRecord, ...prev].slice(0, 10);
        localStorage.setItem('typingHistory', JSON.stringify(updatedHistory));
        return updatedHistory;
      });
    }
  }, [appState]);

  const stats = calculateStats();

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo">TypeSpeed</div>
        <div className="header-actions">
          <button className="history-toggle" onClick={() => setAppState(appState === 'history' ? 'home' : 'history')}>
            {appState === 'history' ? 'Close History' : 'History'}
          </button>
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </header>

      {appState === 'home' && (
        <main className="home-screen">
          <h1 className="home-title">Check Your Typing Speed</h1>
          <p className="home-subtitle">Improve your typing skills with real-time feedback</p>

          <div className="options-group">
            <span className="options-label">Select Time</span>
            <div className="options">
              {[30, 60, 120].map(time => (
                <button
                  key={time}
                  className={`option-btn ${duration === time ? 'active' : ''}`}
                  onClick={() => setDuration(time)}
                >
                  {time}s
                </button>
              ))}
            </div>
          </div>

          <button className="start-btn" onClick={startTest}>
            Start Test
          </button>
        </main>
      )}

      {appState === 'typing' && (
        <main className="typing-screen" onClick={() => inputRef.current && inputRef.current.focus()}>
          <div className="stats-bar">
            <div className="stat-item">
              <span className="stat-value">{timeLeft}</span>
              <span className="stat-label">Seconds</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.wpm}</span>
              <span className="stat-label">WPM</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.accuracy}%</span>
              <span className="stat-label">Accuracy</span>
            </div>
          </div>

          <div className="progress-container">
            <div
              className="progress-bar"
              style={{ width: `${((duration - timeLeft) / duration) * 100}%` }}
            ></div>
          </div>

          <div className="text-display">
            {text.split('').map((char, index) => {
              let className = 'char ';
              if (index < input.length) {
                className += input[index] === char ? 'correct' : 'incorrect';
              } else if (index === input.length) {
                className += 'active'; // The current typing cursor
              }
              return (
                <span key={index} className={className}>
                  {char}
                </span>
              );
            })}
          </div>

          <input
            ref={inputRef}
            type="text"
            className="hidden-input"
            value={input}
            onChange={handleInputChange}
            onPaste={(e) => e.preventDefault()} // Disable paste
            onCopy={(e) => e.preventDefault()}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />

          <button className="option-btn" onClick={endTest} style={{ alignSelf: 'center' }}>
            End Early
          </button>
        </main>
      )}

      {appState === 'result' && (
        <main className="result-screen">
          <h2 className="home-title">Test Completed!</h2>
          <div className="result-grid">
            <div className="result-item">
              <div className="result-value">{stats.wpm}</div>
              <div className="result-label">WPM</div>
            </div>
            <div className="result-item">
              <div className="result-value">{stats.accuracy}%</div>
              <div className="result-label">Accuracy</div>
            </div>
            <div className="result-item" style={{ gridColumn: '1 / -1' }}>
              <div className="result-value" style={{ color: 'var(--incorrect)' }}>{errors}</div>
              <div className="result-label">Total Errors</div>
            </div>
          </div>

          <div className="options" style={{ marginTop: '2rem' }}>
            <button className="start-btn" onClick={startTest}>
              Try Again
            </button>
            <button className="option-btn" onClick={() => setAppState('home')} style={{ marginTop: '1rem', border: 'none', background: 'transparent', textDecoration: 'underline' }}>
              Back Home
            </button>
          </div>
        </main>
      )}

      {appState === 'history' && (
        <main className="history-screen">
          <h2 className="home-title">Your Score History</h2>
          {history.length === 0 ? (
            <p className="home-subtitle">No history yet. Take a test!</p>
          ) : (
            <div className="history-list">
              {history.map((record, idx) => (
                <div key={idx} className="history-item">
                  <span style={{ color: 'var(--text-muted)' }}>{record.date} ({record.duration}s)</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{record.wpm} WPM</span>
                  <span style={{ color: 'var(--correct)' }}>{record.accuracy}% Acc</span>
                </div>
              ))}
            </div>
          )}
        </main>
      )}
    </div>
  );
}

export default App;
