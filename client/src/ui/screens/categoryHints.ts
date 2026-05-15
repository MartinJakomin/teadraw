export type CategoryWordHint = { category: string; word: string };

/** Client-side pool for QM “random ideas” (category + secret word). */
export const CATEGORY_WORD_HINTS: CategoryWordHint[] = [
  { category: "Animals", word: "Octopus" },
  { category: "Animals", word: "Platypus" },
  { category: "Animals", word: "Flamingo" },
  { category: "Animals", word: "Walrus" },
  { category: "Food", word: "Lasagna" },
  { category: "Food", word: "Gnocchi" },
  { category: "Food", word: "Kimchi" },
  { category: "Food", word: "Croissant" },
  { category: "Sports", word: "Badminton" },
  { category: "Sports", word: "Parkour" },
  { category: "Sports", word: "Curling" },
  { category: "Sports", word: "Triathlon" },
  { category: "Movies", word: "Inception" },
  { category: "Movies", word: "Parasite" },
  { category: "Movies", word: "Casablanca" },
  { category: "Movies", word: "Ratatouille" },
  { category: "Professions", word: "Sommelier" },
  { category: "Professions", word: "Choreographer" },
  { category: "Professions", word: "Cartographer" },
  { category: "Professions", word: "Luthier" },
  { category: "Nature", word: "Aurora" },
  { category: "Nature", word: "Geyser" },
  { category: "Nature", word: "Mangrove" },
  { category: "Nature", word: "Fjord" },
  { category: "Technology", word: "Blockchain" },
  { category: "Technology", word: "Firewall" },
  { category: "Technology", word: "Router" },
  { category: "Technology", word: "Emoji" },
  { category: "Music", word: "Theremin" },
  { category: "Music", word: "Ukulele" },
  { category: "Music", word: "Trombone" },
  { category: "Music", word: "Metronome" },
  { category: "Geography", word: "Iceland" },
  { category: "Geography", word: "Patagonia" },
  { category: "Geography", word: "Kyoto" },
  { category: "Geography", word: "Sahara" },
  { category: "Mythology", word: "Phoenix" },
  { category: "Mythology", word: "Minotaur" },
  { category: "Mythology", word: "Pegasus" },
  { category: "Mythology", word: "Kraken" },
  { category: "Household", word: "Vacuum" },
  { category: "Household", word: "Thermos" },
  { category: "Household", word: "Clothespin" },
  { category: "Household", word: "Ladle" },
  { category: "Science", word: "Neutron" },
  { category: "Science", word: "Mitosis" },
  { category: "Science", word: "Entropy" },
  { category: "Science", word: "Prism" },
  { category: "Art", word: "Collage" },
  { category: "Art", word: "Origami" },
  { category: "Art", word: "Mosaic" },
  { category: "Art", word: "Pottery" },
  { category: "Games", word: "Backgammon" },
  { category: "Games", word: "Sudoku" },
  { category: "Games", word: "Pinball" },
  { category: "Games", word: "Dominoes" },
  { category: "Vehicles", word: "Submarine" },
  { category: "Vehicles", word: "Hovercraft" },
  { category: "Vehicles", word: "Zeppelin" },
  { category: "Vehicles", word: "Unicycle" },
  { category: "Clothing", word: "Sombrero" },
  { category: "Clothing", word: "Overalls" },
  { category: "Clothing", word: "Mittens" },
  { category: "Clothing", word: "Suspenders" },
  { category: "Furniture", word: "Hammock" },
  { category: "Furniture", word: "Chandelier" },
  { category: "Furniture", word: "Bookshelf" },
  { category: "Furniture", word: "Cradle" },
  { category: "Insects", word: "Praying Mantis" },
  { category: "Insects", word: "Centipede" },
  { category: "Insects", word: "Mosquito" },
  { category: "Insects", word: "Tarantula" }
];

export function pickRandomHints(count: number): CategoryWordHint[] {
  const pool = [...CATEGORY_WORD_HINTS];
  const out: CategoryWordHint[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const j = Math.floor(Math.random() * pool.length);
    out.push(pool[j]!);
    pool.splice(j, 1);
  }
  return out;
}
