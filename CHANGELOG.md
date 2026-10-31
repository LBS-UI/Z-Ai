# Changelog

## 1.0.0 — 2026-10-31

### Added
- Conversation Manager (`src/context-manager.js`) — temporary context, follow-ups, topic tracking
- Personality System (`src/zimelia-personality.js`, `src/personality-config.js`)
- Emotion Engine (`src/emotion-engine.js`) — heuristic signals, uncertainty, separate safety route
- Voice FX (`src/zimelia-voice-fx.js`) — optional warmth filter on TTS
- Facade (`src/zimelia-ai.js`) wiring the above
- Stable interface versions in `src/interfaces.js`
- Tests for conversation, personality, and emotion

### Notes
- No external AI services.
- Emotion history is off by default.
- Chat integration is optional and falls back if modules fail to load.
