# Zimelia Modules

Long-term, modular core. UI-independent. No external AI services.

## Public interfaces (v1.0.0)

See `src/interfaces.js` for the versioned contract.

| Module | File | Role |
|---|---|---|
| Conversation | `src/context-manager.js` | Temporary context, topic, follow-ups |
| Personality | `src/zimelia-personality.js` + `personality-config.js` | Tone and reply strategies |
| Emotion | `src/emotion-engine.js` | Heuristic emotion signals + safety route |
| Voice FX | `src/zimelia-voice-fx.js` | Optional filter on TTS audio |
| Facade | `src/zimelia-ai.js` | Wires the above; single entry for chat |

## Configuration

- Personality: pass `{ config }` to `PersonalitySystem` or edit `personality-config.js`
- Emotion: pass `{ rules, retainHistory, maxRetained }` to `EmotionEngine`
- History limit: `ConversationManager({ maxHistory })`
- Voice: `setEnabled` / `setIntensity` at runtime

## Tests

```bash
node tests/context-manager.test.js
node tests/personality.test.js
node tests/emotion-engine.test.js
```

## Extension points (not implemented)

- Local language model can replace `EmotionEngine.analyze` and the personality responder
- Persistent memory plugs into `context.memoryInterface`
- Desktop companion can import the same modules
- Multilingual flavor is config-only today

## Limitations

- Rule-based. Not full language understanding.
- Emotion scores are heuristics, not probabilities.
- Safety route is conservative and incomplete.
- No cross-device sync. No secrets in frontend code.

## Rollback

Modules are additive. To roll back the chat integration, remove the `<script type="module">` block in `index.html` and the `window.ZimeliaBrain` check in `sendMessageToAI`. The site falls back to the original local brain.
