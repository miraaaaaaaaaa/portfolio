
import { useState } from "react";

import WordScramble from "./games/wordScramble";
import CountryGame from "./games/countryGame";

import "./App.css";

function App() {
  const [currentGame, setCurrentGame] = useState(null);

  return (
    <div className="app">
      {currentGame === null ? (
        <div className="game-menu">
          <h1> Mini Games</h1>

          <div className="game-cards">
            <div className="game-card">
              <h2>Word Scramble</h2>
              <p>
                Unscramble a five-letter word as quickly
                as possible with the fewest guesses.
              </p>

              <button onClick={() => setCurrentGame("word")}>
                Play Word Scramble
              </button>
            </div>

            <div className="game-card">
              <h2>Guess the Country</h2>
              <p>
                Guess the mystery country using as few
                clues as possible!
              </p>

              <button onClick={() => setCurrentGame("country")}>
                Play Guess the Country
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="game-container">
          <button
            className="back-button"
            onClick={() => setCurrentGame(null)}
          >
            ← Back to Games
          </button>

          {currentGame === "word" && <WordScramble />}

          {currentGame === "country" && <CountryGame />}
        </div>
      )}
    </div>
  );
}

export default App;
