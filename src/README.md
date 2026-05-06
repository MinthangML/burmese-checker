# Source Structure

The app uses Expo Router for file-based routes. Files in `app/` should stay thin and render screens from `src/screens`.

- `src/screens/` owns full route screens: main menu, game, settings, online lobby, and splash.
- `src/components/` owns reusable UI pieces shared across screens.
- `src/context/GameContext.js` owns shared game state, side effects, navigation commands, and actions.
- `src/constants/` stores app constants and asset references.
- `src/utils/` stores pure helpers that can be tested or reused without React.

Keep new UI out of context. Add it as a component first, then compose it in a screen.
