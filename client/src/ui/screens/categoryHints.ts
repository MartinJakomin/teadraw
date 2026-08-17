export type CategoryWordHint = { category: string; word: string; pack?: string };

export const THEMED_WORD_PACKS: Record<string, CategoryWordHint[]> = {
  movies: [
    { category: "Movies & TV", word: "Inception" },
    { category: "Movies & TV", word: "Titanic" },
    { category: "Movies & TV", word: "Star Wars" },
    { category: "Movies & TV", word: "Jurassic Park" },
    { category: "Movies & TV", word: "Harry Potter" },
    { category: "Movies & TV", word: "The Matrix" },
    { category: "Movies & TV", word: "Shrek" },
    { category: "Movies & TV", word: "Barbie" },
    { category: "Movies & TV", word: "Avatar" },
    { category: "Movies & TV", word: "Spider-Man" },
    { category: "Movies & TV", word: "Batman" },
    { category: "Movies & TV", word: "The Lion King" },
    { category: "Movies & TV", word: "Stranger Things" },
    { category: "Movies & TV", word: "Breaking Bad" },
    { category: "Movies & TV", word: "Game of Thrones" },
    { category: "Movies & TV", word: "Lord of the Rings" },
    { category: "Movies & TV", word: "Squid Game" },
    { category: "Movies & TV", word: "Ratatouille" },
    { category: "Movies & TV", word: "Pirates of the Caribbean" },
    { category: "Movies & TV", word: "Ghostbusters" }
  ],
  gaming: [
    { category: "Gaming", word: "Minecraft" },
    { category: "Gaming", word: "Super Mario" },
    { category: "Gaming", word: "Pikachu" },
    { category: "Gaming", word: "Sonic the Hedgehog" },
    { category: "Gaming", word: "Legend of Zelda" },
    { category: "Gaming", word: "Among Us" },
    { category: "Gaming", word: "Pac-Man" },
    { category: "Gaming", word: "Tetris" },
    { category: "Gaming", word: "Fortnite" },
    { category: "Gaming", word: "Donkey Kong" },
    { category: "Gaming", word: "Roblox" },
    { category: "Gaming", word: "Master Chief" },
    { category: "Gaming", word: "Lara Croft" },
    { category: "Gaming", word: "Portal Gun" },
    { category: "Gaming", word: "Witcher" },
    { category: "Gaming", word: "Dark Souls" },
    { category: "Gaming", word: "Grand Theft Auto" },
    { category: "Gaming", word: "Fall Guys" },
    { category: "Gaming", word: "Angry Birds" },
    { category: "Gaming", word: "Crash Bandicoot" }
  ],
  animals: [
    { category: "Animals", word: "Platypus" },
    { category: "Animals", word: "Flamingo" },
    { category: "Animals", word: "Chameleon" },
    { category: "Animals", word: "Octopus" },
    { category: "Animals", word: "Kangaroo" },
    { category: "Animals", word: "Koala" },
    { category: "Animals", word: "Sloth" },
    { category: "Animals", word: "Walrus" },
    { category: "Animals", word: "Peacock" },
    { category: "Animals", word: "Hedgehog" },
    { category: "Nature", word: "Aurora Borealis" },
    { category: "Nature", word: "Volcano" },
    { category: "Nature", word: "Coral Reef" },
    { category: "Nature", word: "Waterfall" },
    { category: "Nature", word: "Rainforest" },
    { category: "Nature", word: "Geyser" },
    { category: "Nature", word: "Glacier" },
    { category: "Nature", word: "Desert Oasis" },
    { category: "Nature", word: "Fjord" },
    { category: "Nature", word: "Tornado" }
  ],
  food: [
    { category: "Food & Drinks", word: "Pizza" },
    { category: "Food & Drinks", word: "Ramen" },
    { category: "Food & Drinks", word: "Sushi" },
    { category: "Food & Drinks", word: "Croissant" },
    { category: "Food & Drinks", word: "Boba Tea" },
    { category: "Food & Drinks", word: "Taco" },
    { category: "Food & Drinks", word: "Cheeseburger" },
    { category: "Food & Drinks", word: "Lasagna" },
    { category: "Food & Drinks", word: "Pancakes" },
    { category: "Food & Drinks", word: "Guacamole" },
    { category: "Food & Drinks", word: "Ice Cream Sundae" },
    { category: "Food & Drinks", word: "Cheese Fondue" },
    { category: "Food & Drinks", word: "Cinnamon Roll" },
    { category: "Food & Drinks", word: "Waffles" },
    { category: "Food & Drinks", word: "Hot Dog" },
    { category: "Food & Drinks", word: "Espresso" },
    { category: "Food & Drinks", word: "Burrito" },
    { category: "Food & Drinks", word: "Donut" },
    { category: "Food & Drinks", word: "Nachos" },
    { category: "Food & Drinks", word: "Smoothie" }
  ],
  landmarks: [
    { category: "Landmarks", word: "Eiffel Tower" },
    { category: "Landmarks", word: "Statue of Liberty" },
    { category: "Landmarks", word: "Great Pyramids" },
    { category: "Landmarks", word: "Colosseum" },
    { category: "Landmarks", word: "Taj Mahal" },
    { category: "Landmarks", word: "Big Ben" },
    { category: "Landmarks", word: "Mount Fuji" },
    { category: "Landmarks", word: "Great Wall of China" },
    { category: "Landmarks", word: "Machu Picchu" },
    { category: "Landmarks", word: "Sydney Opera House" },
    { category: "Landmarks", word: "Stonehenge" },
    { category: "Landmarks", word: "Grand Canyon" },
    { category: "Landmarks", word: "Leaning Tower of Pisa" },
    { category: "Landmarks", word: "Mount Everest" },
    { category: "Landmarks", word: "Niagara Falls" },
    { category: "Landmarks", word: "Golden Gate Bridge" },
    { category: "Landmarks", word: "Hollywood Sign" },
    { category: "Landmarks", word: "Christ the Redeemer" },
    { category: "Landmarks", word: "Times Square" },
    { category: "Landmarks", word: "Loch Ness" }
  ],
  superheroes: [
    { category: "Fantasy & Heroes", word: "Spider-Man" },
    { category: "Fantasy & Heroes", word: "Batman" },
    { category: "Fantasy & Heroes", word: "Iron Man" },
    { category: "Fantasy & Heroes", word: "Wonder Woman" },
    { category: "Fantasy & Heroes", word: "Superman" },
    { category: "Fantasy & Heroes", word: "Thor" },
    { category: "Fantasy & Heroes", word: "Deadpool" },
    { category: "Fantasy & Heroes", word: "Dragon" },
    { category: "Fantasy & Heroes", word: "Unicorn" },
    { category: "Fantasy & Heroes", word: "Phoenix" },
    { category: "Fantasy & Heroes", word: "Wizard" },
    { category: "Fantasy & Heroes", word: "Vampire" },
    { category: "Fantasy & Heroes", word: "Mermaid" },
    { category: "Fantasy & Heroes", word: "Pegasus" },
    { category: "Fantasy & Heroes", word: "Kraken" },
    { category: "Fantasy & Heroes", word: "Werewolf" },
    { category: "Fantasy & Heroes", word: "Minotaur" },
    { category: "Fantasy & Heroes", word: "Cyborg" },
    { category: "Fantasy & Heroes", word: "Genie" },
    { category: "Fantasy & Heroes", word: "Alien" }
  ]
};

export const CATEGORY_WORD_HINTS: CategoryWordHint[] = [
  ...THEMED_WORD_PACKS.movies!,
  ...THEMED_WORD_PACKS.gaming!,
  ...THEMED_WORD_PACKS.animals!,
  ...THEMED_WORD_PACKS.food!,
  ...THEMED_WORD_PACKS.landmarks!,
  ...THEMED_WORD_PACKS.superheroes!,
  { category: "Sports", word: "Badminton" },
  { category: "Sports", word: "Parkour" },
  { category: "Sports", word: "Curling" },
  { category: "Professions", word: "Sommelier" },
  { category: "Professions", word: "Cartographer" },
  { category: "Professions", word: "Astronaut" },
  { category: "Technology", word: "Blockchain" },
  { category: "Technology", word: "Firewall" },
  { category: "Technology", word: "Emoji" },
  { category: "Music", word: "Theremin" },
  { category: "Music", word: "Ukulele" },
  { category: "Music", word: "Trombone" },
  { category: "Household", word: "Vacuum" },
  { category: "Household", word: "Thermos" },
  { category: "Art", word: "Origami" },
  { category: "Art", word: "Mosaic" },
  { category: "Games", word: "Pinball" },
  { category: "Games", word: "Sudoku" },
  { category: "Vehicles", word: "Submarine" },
  { category: "Vehicles", word: "Hovercraft" },
  { category: "Clothing", word: "Sombrero" },
  { category: "Clothing", word: "Overalls" }
];

export function getWordPackList(packKey?: string): CategoryWordHint[] {
  if (packKey && packKey !== "all" && THEMED_WORD_PACKS[packKey]) {
    return THEMED_WORD_PACKS[packKey]!;
  }
  return CATEGORY_WORD_HINTS;
}

export function pickRandomHints(count: number, packKey?: string): CategoryWordHint[] {
  const pool = [...getWordPackList(packKey)];
  const out: CategoryWordHint[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const j = Math.floor(Math.random() * pool.length);
    out.push(pool[j]!);
    pool.splice(j, 1);
  }
  return out;
}

