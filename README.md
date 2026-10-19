# Room Sentinel Watch

Add a real backend to this project.

1. Authentication: email and password login. Two roles, Owner and Viewer, stored in a separate user_roles table (never on the profile). The first user to sign up becomes Owner. Owners can change security mode, settings and devices. Viewers can only view Dashboard, Live Monitor and Events. Enforce this with database security rules, not just hidden buttons. Store only a display name in a profiles table. No avatar or preferences. Keep email confirmation off for now.

2. Database tables: devices (3 ESP32 nodes with name, room, status, signal strength, last seen, uptime), presence_events (device, room, state, confidence, timestamp), security_state (mode: Disarmed/Home/Armed, entry delay, exit delay), alerts, and settings. Replace the simulated data with data from these tables, but keep a "Demo mode" toggle that uses simulated data when on.

3. Create a secure server endpoint where an ESP32 can POST JSON like {device_id, presence, confidence, rssi, timestamp}. Protect it with a per-device API key. It should save the event, update the device's last seen and status, and apply the threshold and persistence check before creating an alert. Show me the endpoint URL and an example request.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://room-sentinel-watch.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1b3f638b-d7d9-4e18-9235-bb7b862ba7b0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
