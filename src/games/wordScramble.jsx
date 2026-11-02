
import { useEffect, useState } from "react";
import "./wordScramble.css";

// UTC for the daily word
function todayKey() {
    return new Date().toISOString().slice(0, 10);
}

// convert the date string into a number
function hashString(text) {
    let hash = 2166136261;

    for (const char of text) {
        hash ^= char.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
}

// random select of number generator with a seed
function seededRandom(seed) {
    return () => {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function scramble(word, random = Math.random) {
    const letters = word.split("");

    for (let i = letters.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [letters[i], letters[j]] = [letters[j], letters[i]];
    }

    const result = letters.join("");

    if (result === word) {
        return word.slice(1) + word[0];
    }

    return result;
}

function createRound(words, mode, previousWord = "") {
    const date = todayKey();

    let word;
    let scrambled;

    if (mode === "daily") {
        const seed = hashString(date);
        word = words[seed % words.length];
        scrambled = scramble(word, seededRandom(seed));
    } else {
        const choices = words.filter(w => w !== previousWord);
        word = choices[Math.floor(Math.random() * choices.length)];
        scrambled = scramble(word);
    }

    return {
        date,
        word,
        scrambled,
        guesses: [],
        startedAt: null,
        finishedAt: null
    };
}

function loadRound(words, mode) {
    if (mode === "daily") {
        const saved = localStorage.getItem("scramble-daily");

        if (saved) {
            const parsed = JSON.parse(saved);
            const expected = createRound(words, "daily");

            if (
            parsed.date === todayKey() &&
            parsed.word === expected.word &&
            parsed.scrambled === expected.scrambled
            ) {
            return parsed;
            }
        }
    }

    return createRound(words, mode);
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
        remaining
    ).padStart(2, "0")}`;
}

// guesser uses the valid letters given
function sameLetters(a, b) {
    return a.split("").sort().join("") ===
        b.split("").sort().join("");
}

export default function WordScramble() {
    const [words, setWords] = useState([]);
    const [mode, setMode] = useState("daily");
    const [round, setRound] = useState(null);
    const [guess, setGuess] = useState("");
    const [error, setError] = useState("");
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        async function loadWords() {
        try {
            const response = await fetch("/words.txt");

            if (!response.ok) {
            throw new Error("Could not load word list");
            }

            const text = await response.text();

            const list = [...new Set(
            text
                .split(/\r?\n/)
                .map(w => w.trim().toUpperCase())
                .filter(w => /^[A-Z]{5}$/.test(w))
            )];

            if (!list.length) {
            throw new Error("Word list is empty");
            }

            list.sort();

            setWords(list);
            setRound(loadRound(list, "daily"));
        } catch (err) {
            setError(err.message);
        }
        }

        loadWords();
    }, []);

    // save daily so it doesn't reset if the user refreshes the page
    useEffect(() => {
        if (mode === "daily" && round) {
        localStorage.setItem(
            "scramble-daily",
            JSON.stringify(round)
        );
        }
    }, [mode, round]);

    // check if new day
    useEffect(() => {
        const interval = setInterval(() => {
        setNow(Date.now());

        if (mode === "daily" && words.length) {
            setRound(current => {
            if (!current || current.date === todayKey()) {
                return current;
            }

            return loadRound(words, "daily");
            });
        }
        }, 1000);

        return () => clearInterval(interval);
    }, [mode, words]);

    function changeMode(nextMode) {
        if (nextMode === mode) return;

        setMode(nextMode);
        setGuess("");
        setError("");
        setNow(Date.now());

        if (words.length) {
        setRound(loadRound(words, nextMode));
        }
    }

    function handleInput(value) {
        if (!round || round.finishedAt) return;

        const cleaned = value
        .replace(/[^a-z]/gi, "")
        .slice(0, 5)
        .toUpperCase();

        setGuess(cleaned);
        setError("");

        // Start timer as soon as the player types.
        if (cleaned && !round.startedAt) {
        setRound(prev => ({
            ...prev,
            startedAt: Date.now()
        }));
        }
    }

    function submitGuess(e) {
        e.preventDefault();
        if (!round || round.finishedAt) return;

        if (guess.length !== 5) {
        setError("Your guess must be 5 letters.");
        return;
        }

        if (!sameLetters(guess, round.word)) {
        setError("Use only the scrambled letters.");
        return;
        }

        if (!words.includes(guess)) {
        setError("That word isn't in the word list.");
        return;
        }

        const correct = guess === round.word;

        setRound(prev => ({
        ...prev,
        guesses: [...prev.guesses, guess],
        finishedAt: correct ? Date.now() : null
        }));

        setGuess("");
        setError("");
    }

    function nextPuzzle() {
        if (mode !== "unlimited" || !round) return;

        setRound(createRound(words, "unlimited", round.word));
        setGuess("");
        setError("");
        setNow(Date.now());
    }

    if (!round) {
        return (
        <div className="game">
            {error || "Loading words..."}
        </div>
        );
    }

    const end = round.finishedAt ?? now;
    const elapsed = round.startedAt
        ? Math.floor((end - round.startedAt) / 1000)
        : 0;

    const won = Boolean(round.finishedAt);

    return (
        <div className="game">
        <h1>Word Scramble</h1>

        <div className="mode-buttons">
            <button
            className={mode === "daily" ? "active" : ""}
            onClick={() => changeMode("daily")}
            >
            Daily
            </button>

            <button
            className={mode === "unlimited" ? "active" : ""}
            onClick={() => changeMode("unlimited")}
            >
            Unlimited
            </button>
        </div>

        <h2>
            {mode === "daily" ? "Daily Challenge" : "Unlimited Mode"}
        </h2>

        {mode === "daily" && <p>{round.date} (UTC)</p>}

        <div className="stats">
            <span>⏱ {formatTime(elapsed)}</span>
            <span>🎯 {round.guesses.length} guesses</span>
        </div>

        <p>Unscramble this word:</p>

        <div className="letters">
            {round.scrambled.split("").map((letter, index) => (
            <div className="letter" key={index}>
                {letter}
            </div>
            ))}
        </div>

        {!won ? (
            <form onSubmit={submitGuess}>
            <input
                value={guess}
                onChange={e => handleInput(e.target.value)}
                maxLength={5}
                placeholder="Your answer"
                autoComplete="off"
                aria-label="Your five-letter guess"
            />

            <button type="submit">Guess</button>
            </form>
        ) : (
            <div className="win">
            <h2>Word Found!</h2>
            <p>The word was {round.word}.</p>
            <p>
                You solved it in {formatTime(elapsed)} with{" "}
                {round.guesses.length} guesses!
            </p>

            {mode === "unlimited" ? (
                <button onClick={nextPuzzle}>
                Next Word →
                </button>
            ) : (
                <p>Come back tomorrow for a new challenge!</p>
            )}
            </div>
        )}

        {error && <p className="error">{error}</p>}

        <h3>Previous Guesses</h3>

        <div className="guesses">
            {round.guesses.map((previous, index) => (
            <div className="guess-row" key={index}>
                {previous.split("").map((letter, i) => (
                <span
                    key={i}
                    className={
                    letter === round.word[i]
                        ? "correct-tile"
                        : "wrong-tile"
                    }
                >
                    {letter}
                </span>
                ))}
            </div>
            ))}
        </div>
        </div>
    );
}
