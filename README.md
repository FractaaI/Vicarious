# Vicarious

Vicarious is a keyboard-first writing space for dialogues.

I built it for my personal use, to help me writing dialogues for visual-novel ish video games.

Feel free to use it and adapt it as you want.
---

## Features

- **Real-Time Visual Preview**: A split-screen design where the left side is your script editor and the right side renders a visual, chat-like preview of the conversation.
- **Frictionless Input**: Type dialogue at the speed of thought. No clicking text boxes or selecting options from dropdowns—just use your keyboard.
- **Character Management**: Color-code and define up to four distinct characters per scene. Track word counts for each character automatically. 
- **Scene Organization**: Keep your game's script organized by breaking it down into individual scenes.
- **Stage Directions**: Type `[...]`, `INT.`, or `EXT.` to automatically format a line as a scene header or action description instead of spoken dialogue.
- **Local First**: No accounts to set up. Everything saves automatically and instantly to your browser's local storage. (Just in case, export everytime you finish just to have a local save)
- **Import / Export**: Save complete `.vicarious` project backups, or export your finished scenes directly to Markdown for implementation in your game engine or script editor.

---

## User Flow

1. **Set the Stage**: Create a new scene and set up your characters in the bottom bar (click their circle to pick a color, click their name to rename them).
2. **Start Typing**: Write your dialogue. Press `Enter` to break to a new line, and use `Tab` to cycle to the next speaking character.
3. **Add Context**: Need to describe the setting or an action? Type a bracket `[Like this]` and it formats as a neutral stage direction.
4. **Review**: Watch the conversation take shape in the right-hand panel, ensuring the back-and-forth pacing feels natural.
5. **Export**: Click the Export button to grab a Markdown file of your current scene, ready to copy into your engine.

---

## Keyboard is the interface

Vicarious is meant to disappear once learned.

- **Enter** — write a new line of dialogue  
- **Tab** — switch speaker within the scene  
- **Backspace** — remove an empty line / step back in structure  
- **↑ / ↓** — move through dialogue lines 

---


## Getting Started

1. Clone this repository.
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start the development server.
4. Open your browser to the local URL provided by Vite.

## License

MIT
