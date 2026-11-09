# TeaDraw (Multiplayer Party Games)

Browser-based multiplayer drawing + bluffing games.

## Setup

Install dependencies from the repo root:

```bash
npm install
```

## Run (dev)

Start server + client:

```bash
npm run dev:all
```

- Client: `http://localhost:5173`
- Server: `http://localhost:3000`


## Run (prod)

```bash
npm install && npm run build
```

```bash
npm start
```

---

## 🎨 Game Mode: Drawful
A game of drawing, party tricks, and deception.

### How to play
1. Each player receives a unique, secret prompt (e.g., "The sound of one hand clapping") and an optional **Party Trick** modifier.
2. Everyone draws their prompt on the `900 × 550` canvas.
3. One by one, the drawings are revealed (with optional **Time-Lapse Stroke Replay**).
4. Players (except the drawer) submit fake prompts that they think look like the drawing.
5. Everyone then votes on what they think the **real** prompt was (and can award 😂 **Comedy Likes** to their favorite bluffs).
6. Optional **🔥 Final Chaos Round**: Everyone draws the *same* secret prompt simultaneously and votes in secret on who drew which masterpiece!

### 30 Party Tricks (`useRandomTricks`)
- 🙈 **Blind Draw** (`blind`) • ✍️ **One Continuous Line** (`one_stroke`) • 🖌️ **Mega Marker** (`large_brush`) • 🎲 **Wildcard Brush Size** (`random_brush`) • ⚡ **Speed Draw** (`half_time`) • 🙃 **Upside-Down Canvas** (`upside_down`) • 〰️ **Earthquake Wobble** (`wobble`) • 🪞 **Kaleidoscope Mirror** (`mirror`) • 💧 **Strict Ink Ration** (`ink_limit`) • 🏹 **Slingshot Fling** (`rubberband`) • ⏳ **Time-Lag Brush** (`input_delay`) • 🎡 **Spinning Canvas** (`spinning`) • 👾 **Glitch Teleport** (`glitch`) • 🫠 **Melting Paint** (`gravity_drip`) • 👾 **8-Bit Pixelizer** (`pixel_art`) • 🫧 **Bubble Blower** (`bubbles`) • 🪚 **Guillotine Chop** (`split_halves`) • 🔦 **Flashlight Blackout** (`flashlight`) • ⛸️ **Ice Skater** (`ice_skater`) • ⌨️ **Ransom Note Stamp** (`typo_stomp`) • 🖐️ **Giant Thumb** (`shadow_finger`) • 🗜️ **Trash Compactor** (`trash_compactor`) • 🧩 **Puzzle Jumble** (`puzzle_jumble`) • 🐍 **Slithering Snake** (`snake_tail`) • 🛸 **Alien Vaporizer** (`tractor_beam`) • 🔺 **Polygon Cubism** (`cubism`) • 🕸️ **Spiderweb Threads** (`spiderweb`) • 🧲 **Magnet Anomaly** (`magnets`) • 🌬️ **Wind Tunnel** (`wind_tunnel`) • 👻 **Poltergeist Brush** (`poltergeist`)

### Custom Prompts & Practice Sandbox
- **📝 Custom Prompts**: Hosts can paste custom prompts (`1 per line`, up to 200) and choose either **Mix with standard prompts** or **Play ONLY custom prompts** (also usable as `Category: Word` pairs in Fake Artist).
- **🎯 Practice Sandbox**: Test and master all 30 tricks solo right from the Home or Lobby screen.

### Scoring (Dixit-style)
- **Drawer**: Gets **+3 points** if at least one person (but not everyone) guesses the real prompt.
- **Correct Voters**: Each person who picks the real prompt gets **+3 points**.
- **Bluffers**: You get **+1 point** for every other player who voted for your fake prompt.
- **Bonus**: If **all** or **none** of the voters choose the real prompt, the drawer gets **0**, and everyone else gets **2**.

---

## 🕵️ Game Mode: A Fake Artist Goes to New York
A game of social deduction and minimal drawing.

### How to play
1. **The Question Master (QM)** chooses a category and a word (e.g., "Animals" -> "Elephant").
2. Everyone is told the category and the word, **except for one person** (The Fake Artist), who only sees the category and a "?".
3. Everyone takes turns adding a **single continuous line** to a shared canvas.
4. After two rotations, everyone votes simultaneously for who they think the Fake Artist is.

### Winning and Scoring
- **Fake Artist Wins** if:
    - They are NOT the top voted person.
    - OR they are caught, but they correctly guess the secret word.
    - **Reward**: Fake Artist and QM both get **+2 points**.
- **Artists Win** if:
    - They catch the Fake Artist, and the Fake Artist **fails** to guess the secret word.
    - **Reward**: Every artist gets **+1 point**. (QM gets 0).

---

## Technical Details
- **Frontend**: React + Vite + Vanilla CSS
- **Backend**: Node.js + Express + Socket.io
- **Avatars**: Each player draws their own custom avatar before the game begins.

