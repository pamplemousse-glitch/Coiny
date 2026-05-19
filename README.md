# Coiny

A Tamagotchi-like physical desk companion linked to your bank account. Coiny reacts in real time to your financial behavior — celebrating good choices and showing concern when you stray from your goals.

## Structure

```
coiny/
├── firmware/     # ESP32 (PlatformIO/C++) — pet state machine, display, MQTT
├── backend/      # Node.js — rule engine, Teller integration, MQTT broker
├── mobile/       # React Native (Expo) — companion app, onboarding, goals
├── shared/       # MQTT schemas, pet model, spending types (shared across all)
├── hardware/     # Schematics, PCB Gerbers, STL enclosure files
└── docs/         # Architecture, MQTT topic reference, OTA process
```

## Docs

- [Architecture](docs/architecture.md)
- [MQTT Topics](docs/mqtt-topics.md)
- [OTA Process](docs/ota-process.md)
