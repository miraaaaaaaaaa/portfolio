
import { countries } from "../data/countries";
import { continents } from "../data/continents";
import { animals } from "../data/animals";
import { flowers } from "../data/flowers";
import { food } from "../data/food";
import { famousPeople } from "../data/famousePeople";
import { gdp } from "../data/gdp";
import { countriesGeneralData } from "../data/countriesGeneralData";

// Convert arrays into lookup objects for faster searching.
function makeLookup(items) {
  return Object.fromEntries(
    items
      .filter(item => item.flagCode)
      .map(item => [
        item.flagCode.toLowerCase(),
        item
      ])
  );
}

const animalData = makeLookup(animals);
const flowerData = makeLookup(flowers);
const foodData = makeLookup(food);
const peopleData = makeLookup(famousPeople);

const generalData = Object.fromEntries(
  countriesGeneralData
    .filter(item => item.cca2)
    .map(item => [
      item.cca2.toLowerCase(),
      item
    ])
);

// Seeded random function: same seed = same results.
function seededRandom(seed) {
  return () => {
    seed += 0x6D2B79F5;

    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text) {
  let value = 2166136261;

  for (const char of text) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }

  return value >>> 0;
}

function randomItem(items, random) {
  return items[Math.floor(random() * items.length)];
}

export function getToday() {
  return new Date().toISOString().slice(0, 10);
}

// Create all five clues for a country.
export function createClues(code, seed) {
  const random = seededRandom(seed);
  const levels = [[], [], [], []];

  // LEVEL 1: Animal OR GDP
  const animal = animalData[code]?.nationalAnimal;

  if (animal) {
    levels[0].push({
      category: "National Animal",
      text: `An animal associated with this country is the ${animal}.`
    });
  }

  const economy = gdp[code];

  if (economy && Number.isFinite(economy.value)) {
    const amount = economy.value / 1_000_000_000;

    levels[0].push({
      category: "GDP",
      text: `In ${economy.year}, this country's GDP was approximately US$${amount.toFixed(1)} billion.`
    });
  }

  // LEVEL 2: Continent OR Flower
  const continent = continents[code];

  if (continent && continent !== "International") {
    levels[1].push({
      category: "Continent",
      text: `This country is located in ${continent}.`
    });
  }

  const flower = flowerData[code];

  if (flower?.nationalFlower) {
    levels[1].push({
      category: "National Flower",
      text: `A floral symbol associated with this country is ${flower.nationalFlower}.`
    });
  }

  // LEVEL 3: Food OR Famous Person
  const dish = foodData[code]?.CountriesNationalDishes;

  if (dish) {
    levels[2].push({
      category: "Traditional Dish",
      text: `A traditional dish associated with this country is ${dish}.`
    });
  }

  const people = peopleData[code]?.famousPeople || [];

  const validPeople = people.filter(person => person.name);

  if (validPeople.length > 0) {
    const person = randomItem(validPeople, random);

    const occupation = person.occupation?.[0]
      ?.replaceAll("_", " ") || "public figure";

    levels[2].push({
      category: "Famous Person",
      text: `${person.name}, a ${occupation}, is associated with this country.`
    });
  }

  // LEVEL 4: Capital OR Currency
  const general = generalData[code];

  if (general?.capital?.length > 0) {
    levels[3].push({
      category: "Capital",
      text: `A capital city of this country is ${general.capital.join(", ")}.`
    });
  }

  if (general?.currencies) {
    const currencyList = Object.entries(general.currencies);

    if (currencyList.length > 0) {
      const [currencyCode, currency] =
        randomItem(currencyList, random);

      levels[3].push({
        category: "Currency",
        text: `This country uses the ${currency.name} (${currencyCode}).`
      });
    }
  }

  // Do not select countries with missing difficulty levels.
  if (levels.some(level => level.length === 0)) {
    return null;
  }

  // Pick one clue from each pair.
  const clues = levels.map(level =>
    randomItem(level, random)
  );

  // LEVEL 5: Flag
  clues.push({
    category: "Flag",
    type: "flag",
    image: `https://flagcdn.com/w320/${code}.png`
  });

  return clues;
}

// Only use sovereign countries with enough clue data.
export const eligibleCodes = Object.keys(countries)
  .filter(code => {
    if (code.length !== 2) return false;
    if (generalData[code]?.independent !== true) return false;

    return createClues(code, hash(`check-${code}`)) !== null;
  })
  .sort();

// All sovereign countries remain available as guesses.
export const countryOptions = Object.entries(countries)
  .filter(([code]) =>
    generalData[code]?.independent === true
  )
  .sort((a, b) => a[1].localeCompare(b[1]));

// Daily challenge
export function getDailyPuzzle(date = getToday()) {
  if (!eligibleCodes.length) {
    throw new Error("No eligible countries found.");
  }

  const seed = hash(date);
  const code = eligibleCodes[seed % eligibleCodes.length];

  return {
    date,
    code,
    name: countries[code],
    clues: createClues(code, seed)
  };
}

// Unlimited mode: completely random puzzle.
export function getUnlimitedPuzzle(previousCode = "") {
  const choices = eligibleCodes.filter(
    code => code !== previousCode
  );

  if (!choices.length) {
    throw new Error("Not enough countries for Unlimited mode.");
  }

  const code = choices[Math.floor(Math.random() * choices.length)];

  return {
    date: getToday(),
    code,
    name: countries[code],
    clues: createClues(
      code,
      Math.floor(Math.random() * 2 ** 32)
    )
  };
}
