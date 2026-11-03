
import { useEffect, useState } from "react";
import {
  countryOptions,
  getDailyPuzzle,
  getUnlimitedPuzzle,
  getToday
} from "./dataForTheCountryGame.jsx";

import "./css/countryGuessingGame.css";

function newProgress(puzzle) {
  return {
    ...puzzle,
    revealed: 1,
    guesses: [],
    status: "playing"
  };
}

function loadDailyGame() {
  const puzzle = getDailyPuzzle();
  const key = `country-game-${puzzle.date}`;


  const saved = JSON.parse(localStorage.getItem(key));

  if (
    saved &&
    saved.code === puzzle.code &&
    Array.isArray(saved.guesses) &&
    saved.revealed >= 1 &&
    saved.revealed <= 5 &&
    ["playing", "won", "lost"].includes(saved.status)
  ) {
    return {
      ...newProgress(puzzle),
      revealed: saved.revealed,
      guesses: saved.guesses,
      status: saved.status
    };
  }

  return newProgress(puzzle);
}

export default function CountryGame() {
  const [mode, setMode] = useState("daily");
  const [game, setGame] = useState(loadDailyGame);
  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState("");

  const { code, name, clues, revealed, guesses, status } = game;

  const finished = status !== "playing";

  const score = status === "won"
    ? (6 - revealed) * 20
    : 0;

  // Save
  useEffect(() => {
    if (mode !== "daily") return;

    localStorage.setItem(
      `country-game-${game.date}`,
      JSON.stringify({
        code: game.code,
        revealed: game.revealed,
        guesses: game.guesses,
        status: game.status
      })
    );
  }, [game, mode]);

  // show latest daily game 
  useEffect(() => {
    if (mode !== "daily") return;

    const interval = setInterval(() => {
      if (getToday() !== game.date) {
        setGame(loadDailyGame());
        setGuess("");
        setMessage("");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [mode, game.date]);

  function changeMode(nextMode) {
    if (nextMode === mode) return;

    setMode(nextMode);
    setGuess("");
    setMessage("");

    if (nextMode === "daily") {
      setGame(loadDailyGame());
    } else {
      setGame(newProgress(getUnlimitedPuzzle()));
    }
  }

  function revealClue() {
    if (finished || revealed >= 5) return;

    setGame(prev => ({
      ...prev,
      revealed: prev.revealed + 1
    }));

    setMessage("");
  }

  function submitGuess(event) {
    event.preventDefault();

    if (!guess || finished) return;

    if (guesses.includes(guess)) {
      setMessage("You've already guessed that country!");
      return;
    }

    const correct = guess === code;

    setGame(prev => ({
      ...prev,
      guesses: [...prev.guesses, guess],
      revealed: correct
        ? prev.revealed
        : Math.min(5, prev.revealed + 1),
      status: correct
        ? "won"
        : prev.revealed === 5
          ? "lost"
          : "playing"
    }));

    setMessage(correct ? "Correct answer!" : "Not quite!");
    setGuess("");
  }

  function nextGame() {
    setGame(newProgress(getUnlimitedPuzzle(code)));
    setGuess("");
    setMessage("");
  }

  return (
    <main className="country-game">
      <h1> Guess the Country</h1>

      <p>Guess the mystery country with as few clues as possible.</p>

      <div className="country-modes">
        <button
          className={mode === "daily" ? "selected" : ""}
          onClick={() => changeMode("daily")}
        >
          Daily
        </button>

        <button
          className={mode === "unlimited" ? "selected" : ""}
          onClick={() => changeMode("unlimited")}
        >
          Unlimited
        </button>
      </div>

      <h2>
        {mode === "daily"
          ? `Daily Challenge — ${game.date}`
          : "Unlimited Challenge"}
      </h2>

      <div className="country-stats">
        <span>Clues: {revealed}/5</span>
        <span>Guesses: {guesses.length}</span>
      </div>

      <div className="country-progress">
        {[1, 2, 3, 4, 5].map(number => (
          <div
            key={number}
            className={number <= revealed ? "active" : ""}
          />
        ))}
      </div>

      <section className="country-clues">
        {clues.slice(0, revealed).map((clue, index) => (
          <article className="country-clue" key={index}>
            <div className="country-clue-header">
              <strong>Clue {index + 1}</strong>
              <span>{clue.category}</span>
            </div>

            {clue.type === "flag" ? (
              <img
                src={clue.image}
                alt="Mystery country flag"
                className="country-flag"
              />
            ) : (
              <p>{clue.text}</p>
            )}
          </article>
        ))}
      </section>

      {!finished ? (
        <div className="country-controls">
          <form onSubmit={submitGuess}>
            <select
              value={guess}
              onChange={e => setGuess(e.target.value)}
              required
            >
              <option value="">Select a country...</option>

              {countryOptions.map(([countryCode, countryName]) => (
                <option
                  key={countryCode}
                  value={countryCode}
                >
                  {countryName}
                </option>
              ))}
            </select>

            <button type="submit">Guess</button>
          </form>

          {revealed < 5 && (
            <button
              className="next-clue"
              onClick={revealClue}
            >
              Reveal Next Clue →
            </button>
          )}
        </div>
      ) : (
        <section className="country-result">
          <h2>
            {status === "won"
              ? "You got it!"
              : "Game Over!"}
          </h2>

          <p>The mystery country was:</p>

          <h2>{name}</h2>

          <img
            src={`https://flagcdn.com/w320/${code}.png`}
            alt={`Flag of ${name}`}
            className="country-flag"
          />

          <p>Clues used: {revealed}/5</p>
          <p>Guesses made: {guesses.length}</p>

          <h2>Score: {score}/100</h2>

          {mode === "unlimited" ? (
            <button onClick={nextGame}>
              Next Country →
            </button>
          ) : (
            <p>Come back tomorrow for another challenge!</p>
          )}
        </section>
      )}

      {message && (
        <p className="country-message" role="status">
          {message}
        </p>
      )}

      {guesses.length > 0 && (
        <section className="country-guesses">
          <h3>Previous Guesses</h3>

          {guesses.map((guessedCode, index) => {
            const found = countryOptions.find(
              ([c]) => c === guessedCode
            );

            return (
              <p key={index}>
                {guessedCode === code ? "✅" : "❌"}{" "}
                {found?.[1] || guessedCode}
              </p>
            );
          })}
        </section>
      )}
    </main>
  );
}
