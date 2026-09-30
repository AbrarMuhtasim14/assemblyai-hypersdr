# AssemblyAI Agent Operating Rules

Before writing AssemblyAI code, read https://www.assemblyai.com/docs/agent-instructions.md
and https://www.assemblyai.com/docs/llms.txt. The API has changed — do not rely on
memorized parameter names.

## Key Rules & Parameters
1. **Voice Agent API Authentication**: Requires `Authorization: Bearer <API_KEY>` (unlike REST STT which uses the raw key).
2. **WebSocket Endpoint**: `wss://agents.assemblyai.com/v1/ws` (Edge Routing).
3. **Audio Format**: Signed 16-bit little-endian PCM at 24 kHz (mono).
4. **Tool Schema**: Flat JSON Schema definition (`{ type: "function", name: "...", description: "...", parameters: {...} }`).
5. **Speech Model**: Universal-3.5 Pro STT, George neural voice.
