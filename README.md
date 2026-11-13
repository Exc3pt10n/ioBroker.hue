![Logo](admin/hue.jpeg)
# ioBroker Philips Hue adapter (API v2)

![Test and Release](https://github.com/Exc3pt10n/ioBroker.hue-v2/workflows/Test%20and%20Release/badge.svg)

> [!IMPORTANT]
> This is a fork of the official [hue adapter](https://github.com/iobroker-community-adapters/ioBroker.hue), rewritten for the Hue API v2.
> It is called `hue-v2` and can be installed **in parallel** to the official `hue` adapter: its instances (`hue-v2.0`, ...) have their own namespace and do not touch the objects of `hue.0`.

## Installation
The adapter is not published on npm and is installed directly from GitHub.

**Admin UI:** tab *Adapters* → GitHub icon ("Install from custom URL", enable the expert mode if necessary) → tab *Custom* → enter the URL, install and create an instance afterwards:

```
https://github.com/Exc3pt10n/ioBroker.hue-v2/tarball/master
```

**Console** on the ioBroker host:

```bash
iobroker url https://github.com/Exc3pt10n/ioBroker.hue-v2/tarball/master
iobroker add hue-v2
```

> Note: ioBroker derives the adapter name from the repository name and is case-sensitive. The repository is called `ioBroker.hue-v2`, which matches the adapter name `hue-v2`. If the name is not detected correctly, pass it explicitly: `iobroker url <URL> hue-v2`.

Instead of `master` any branch or commit can be used, e.g. to test a development version. Updates are installed the same way; the instance and its settings are kept.

> When installing from GitHub, npm builds the adapter itself (script `prepare`). For this the development tools (TypeScript, ESLint, …) are downloaded once. This takes a few minutes on a Raspberry Pi and temporarily needs about 250 MB of disk space.

After the installation, configure the new instance in the admin UI. Create a **new** user on the bridge for it (link button), so it does not share its application key with the official adapter.

Requirements: js-controller >= 6.0.11, Admin >= 7.7.22, Node.js >= 22.19.0, Hue bridge v2 (square model) or newer.

## Description
This adapter connects your Philips Hue bridge with ioBroker. It controls Philips Hue lights, Friends of Hue lamps, plugs and
other Zigbee lights paired with the bridge, and provides the states of Hue sensors, switches and dials.

Since version 4 the adapter uses the **Hue API v2** exclusively:
- State changes are pushed by the bridge in real time via its event stream, polling is not needed anymore.
- Commands are sent with respect to the rate limits of the bridge. Commands for the same light which are waiting are merged into a single request.
- Rooms, zones, scenes, smart scenes, entertainment areas and automations of the Hue app are supported.

A Hue bridge v2 (square model) or newer is required.

### Setup
1. Create an instance of the adapter and open its settings.
2. Select your bridge in the field "Bridge Address". The adapter searches for bridges via mDNS and the Hue discovery service (the adapter instance has to be running for this). You can also enter the IP address manually. If the bridge is only reachable via a different port (e.g. behind a port forwarding), use `ip:port`.
3. Press the round link button on your bridge and click "Create User" within 30 seconds. The field "Bridge User" will be filled automatically.
4. Save the settings. The adapter creates all objects and keeps them in sync with the bridge.

### Settings
| Name                    | Description                                                                                                                                  |
|-------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
| __Bridge address__      | IP address (optionally `ip:port`) of your Hue bridge.                                                                                        |
| __Bridge user__         | Application key of the bridge. Use the button "Create User" to create one.                                                                   |
| __Ignore groups__       | Do not create rooms, zones and the group `all`.                                                                                              |
| __Ignore scenes__       | Do not create scenes and smart scenes.                                                                                                       |
| __Turn on with others__ | Also turn lights on when color, color temperature or effect is changed. If disabled, lights are only turned on via `on` and `brightness`. |

### Objects
Object ids are derived from the names in the Hue app. Once created, an id is kept even if you rename the device in the Hue app,
so your scripts keep working. To get a new id after a rename, delete the object and restart the adapter.
Objects of devices which are removed from the bridge are deleted automatically.

| Object                                  | Description                                                                         |
|-----------------------------------------|-------------------------------------------------------------------------------------|
| `hue-v2.0.lights.<name>`                   | A light                                                                             |
| `hue-v2.0.rooms.<name>`                    | A room of the Hue app                                                               |
| `hue-v2.0.zones.<name>`                    | A zone of the Hue app                                                               |
| `hue-v2.0.all`                             | All lights of the bridge                                                            |
| `hue-v2.0.rooms.<name>.scenes.<scene>`     | Button to activate a scene (same for zones)                                         |
| `hue-v2.0.rooms.<name>.smartScenes.<name>` | Switch to start/stop a smart scene (same for zones)                                 |
| `hue-v2.0.sensors.<name>`                  | Motion sensors, contact sensors, switches, dials, ...                               |
| `hue-v2.0.entertainment.<name>`            | Switch to start/stop streaming of an entertainment area                             |
| `hue-v2.0.automations.<name>`              | Switch to enable/disable an automation of the Hue app                               |

#### Lights, rooms and zones
States are only created if at least one light supports the feature.

| State              | Writable | Description                                                                                       |
|--------------------|:--------:|---------------------------------------------------------------------------------------------------|
| `on`               |    ✓     | On/off. For rooms and zones `true` means that at least one light is on                            |
| `allOn`            |          | Rooms and zones only: all lights are on                                                           |
| `brightness`       |    ✓     | Brightness in %. Values > 0 turn the light on, 0 turns it off                                     |
| `colorTemperature` |    ✓     | Color temperature in Kelvin                                                                       |
| `xy`               |    ✓     | Color as CIE xy coordinates, e.g. `0.4573,0.41`                                                   |
| `rgb`              |    ✓     | Color as hex value, e.g. `#FF8800`. Only the color is set, use `brightness` for the brightness    |
| `colorMode`        |          | Lights only: `ct` (color temperature) or `xy` (color)                                             |
| `effect`           |    ✓     | Lights only: effect like `candle` or `fire`, `no_effect` stops it. Possible values depend on the light |
| `alert`            |    ✓     | Let the light(s) breathe once to identify them                                                    |
| `reachable`        |          | Lights only: the light is reachable by the bridge                                                 |
| `activeScene`      |          | Rooms and zones only: name of the active scene, empty if none is active                           |
| `command`          |    ✓     | Change several properties at once, see below                                                      |

For rooms and zones the bridge does not report color, color temperature and effect, so these states only show the last value set by ioBroker.

#### Sensors
| State           | Writable | Description                                                                                    |
|-----------------|:--------:|------------------------------------------------------------------------------------------------|
| `motion`        |          | Motion detected                                                                                |
| `motionEnabled` |    ✓     | Enable/disable the motion detection                                                            |
| `temperature`   |          | Temperature in °C                                                                              |
| `illuminance`   |          | Illuminance in lux                                                                             |
| `open`          |          | Contact sensor is open                                                                         |
| `tampered`      |          | Sensor has been tampered with                                                                  |
| `button<n>`     |          | Last event of button n: `initial_press`, `repeat`, `short_release`, `long_release`, `long_press`, `double_short_release`. The state is updated on every press, even if the value stays the same |
| `rotary`        |          | Steps of the last rotation of a dial, negative values mean counter clockwise                  |
| `battery`       |          | Battery level in %                                                                             |
| `lowBattery`    |          | Battery is low                                                                                 |
| `reachable`     |          | Device is reachable by the bridge                                                              |

### Commands
The `command` state of a light, room or zone accepts a JSON object to change several properties with a single request.
Supported keys are `on`, `brightness`, `brightnessDelta`, `colorTemperature`, `xy`, `rgb`, `effect`, `alert`, `transition` (in milliseconds) and, for rooms and zones, `scene`.

```javascript
// dim to 30 % with a warm white within 2 seconds
setState('hue-v2.0.lights.Desk.command', JSON.stringify({ brightness: 30, colorTemperature: 2700, transition: 2000 }));

// increase the brightness of a room by 10 %
setState('hue-v2.0.rooms.Living_room.command', JSON.stringify({ brightnessDelta: 10 }));

// activate a scene by name (or id) with a transition time of 3 seconds and 60 % brightness
setState('hue-v2.0.rooms.Living_room.command', JSON.stringify({ scene: 'Relax', transition: 3000, brightness: 60 }));
```

### Differences to the official hue adapter (version 3)
This adapter is a complete rewrite based on the Hue API v2 and **not compatible** with the official hue adapter:
- The object structure is completely new, scripts, visualizations, aliases and history settings have to be adjusted when switching.
- `bri` (0-254) and `level` were replaced by `brightness` (0-100 %), `ct` by `colorTemperature` (Kelvin), `r`/`g`/`b` by `rgb` (hex). `hue` and `sat` do not exist anymore, because the Hue API v2 only works with xy colors.
- Button events are reported as text (e.g. `short_release`) instead of numeric codes like `1002`.
- The options port, SSL, polling, polling interval, legacy structure, native turn on/off behaviour, ignore Osram and sync software sensors were removed. The lights always turn on with their last brightness, like in the Hue app.
- CLIP software sensors are not supported by the Hue API v2. Automations of the Hue app can be enabled and disabled below `automations` instead.
- A user created for the official adapter could be used as well, but a separate user is recommended.

## Changelog

<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->

### 4.0.0-alpha.1 (2026-11-13)
- (Exc3pt10n) Installation directly from GitHub via "Install from custom URL", npm builds the adapter during the installation
- (Exc3pt10n) Version tags are created automatically after a merge, the npm release workflow of the official adapter was removed

### 4.0.0-alpha.0 (2026-11-13)
- (Exc3pt10n) Renamed to `hue-v2`, so it can be installed in parallel to the official hue adapter
- (Exc3pt10n) BREAKING: the adapter has been rewritten to use the Hue API v2 exclusively, see "Differences to the official hue adapter" for details
- (Exc3pt10n) State changes are pushed by the bridge via the event stream, polling has been removed
- (Exc3pt10n) Added support for zones, smart scenes, automations, tap dials, contact and tamper sensors
- (Exc3pt10n) Commands are rate limited and merged to avoid overloading the bridge
- (Exc3pt10n) Bridge discovery via mDNS and the Hue discovery service
- (Exc3pt10n) Removed dependencies node-hue-api, hue-push-client and axios
- (copilot) Adapter requires node.js >= 22.19.0 now

### 3.17.4 (2026-09-15))
- (mcm1957) support to install from github has been dropped

### 3.17.2 (2026-09-15)
- (copilot) Fixed user creation not updating configuration field automatically- #776

### 3.17.1 (2026-09-15)
- (a-i-ks) fixed: ct object min/max being stricter than the adapter's supported color temperature range, causing "less than min"/"greater than max" warnings (closes #586)
- (copilot) Adapter requires node.js >= 22 now
- (copilot) Adapter requires admin >= 7.7.22 now
- (copilot) Adapter requires js-controller >= 6.0.11 now

### 3.16.2 (2025-04-12)
* (@foxriver76) do not try to use v2 functionality on legacy Hue bridges (closes #720)

### 3.16.1 (2025-03-07)
* (@foxriver76) fix if no tamper report is present on state creation


[Older changelogs can be found there](CHANGELOG_OLD.md)

## Roadmap/Todo

* Automatic bridge discovery
* Automatic user setup via bridge link button

## License

Apache 2.0


Copyright (c) 2026 iobroker-community-adapters <iobroker-community-adapters@gmx.de>  
Copyright (c) 2017-2025 Bluefox <dogafox@gmail.com>  
Copyright (c) 2014-2016 hobbyquaker
