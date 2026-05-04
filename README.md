# Burmese Checker (Expo)

A React Native + Expo Burmese-style checker game.

## Rules implemented

- 8x8 checkers board
- Red moves first
- Regular pieces move diagonally forward one step
- Captures can be made diagonally in any direction
- Captures are mandatory
- Chain captures are mandatory in the same turn
- Pieces promote to king at the far edge
- Kings move diagonally both directions
- Win when the opponent has no pieces or no legal moves

## Run

1. Install dependencies

```bash
npm install
```

2. Start Expo

```bash
npm start
```

Then run on Android, iOS, or web from Expo.

## Online multiplayer setup

1. Create a Supabase project and copy `.env.example` to `.env`.

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
```

2. Link Supabase and deploy the backend.

```bash
supabase link --project-ref your-project-ref
supabase db push
supabase functions deploy create-match
supabase functions deploy join-match
supabase functions deploy get-match
supabase functions deploy submit-move
```

Online matches use guest player tokens stored on the device. Clients call Edge Functions only; direct table access is blocked by RLS.
