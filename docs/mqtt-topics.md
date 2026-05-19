# Coiny — BLE Command Schema

Coiny uses BLE (Bluetooth Low Energy) for device communication, not MQTT.
The companion app connects to the device and writes JSON commands to a BLE characteristic.

---

## BLE Service Structure

```
Service UUID: coiny-main-service
  └── Characteristic: coiny-cmd
        - Properties: WRITE, WRITE_WITHOUT_RESPONSE
        - Format: JSON (UTF-8)
  └── Characteristic: coiny-status
        - Properties: NOTIFY, READ
        - Format: JSON (UTF-8)
```

UUIDs are defined as constants in `shared/mqtt-schema/topics.ts`.

---

## Command Payload (App → Device)

```json
{
  "cmd": "emote",
  "animation": "happy",
  "duration": 3000,
  "sound": "chime",
  "led": "green"
}
```

| Field | Type | Values |
|---|---|---|
| `cmd` | string | `emote` \| `sleep` \| `wake` \| `ota` |
| `animation` | string | `happy` \| `sad` \| `celebrate` \| `concerned` \| `neutral` \| `sleeping` |
| `duration` | number | milliseconds (0 = hold until next command) |
| `sound` | string | `chime` \| `fanfare` \| `warning` \| `coin` \| `off` |
| `led` | string | `green` \| `amber` \| `red` \| `rainbow` \| `off` |

---

## Status Payload (Device → App)

Device notifies the app of its current state every 60 seconds or on button press.

```json
{
  "fw": "1.2.0",
  "battery": 84,
  "mood": 72,
  "uptime": 43200
}
```

| Field | Type | Description |
|---|---|---|
| `fw` | string | Firmware version |
| `battery` | number | Battery percentage (0–100) |
| `mood` | number | Current pet mood (0–100, decays over time) |
| `uptime` | number | Seconds since last boot |

---

## Financial Event → BLE Command Mapping

| Financial Event | Animation | Sound | LED |
|---|---|---|---|
| Paycheck received | `celebrate` | `fanfare` | `rainbow` |
| Savings goal milestone (25/50%) | `happy` | `chime` | `green` |
| Savings goal 100% complete | `celebrate` | `fanfare` | `rainbow` |
| Bill paid on time | `happy` | `coin` | `green` |
| Spent within budget (weekly) | `happy` | `chime` | `green` |
| Overspent in category | `sad` | `warning` | `amber` |
| Monthly budget exceeded | `concerned` | `warning` | `red` |
| Consecutive weeks on budget | `celebrate` | `fanfare` | `green` |
| No activity (idle >24hrs) | `sleeping` | `off` | `off` |
