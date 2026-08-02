# 🌱 Habits

A self-hosted habit & progress tracker.

- **Daily habits** — set a per-day target (e.g. 3 h of piano) and log units of work throughout the day
- **Overall habits** — set a cumulative goal (e.g. 100 h of CAD this summer) and track your total amount of work done

## Running with Docker Compose

The most basic docker-compose.yaml file looks like that:

```yaml
# docker-compose.yml
services:
  habits:
    image: ghcr.io/thomas-god/habits:latest
    restart: unless-stopped
    ports:
      - '3000:3000'
    volumes:
      - habits_data:/data # SQLite database persisted on the volume
    environment:
      ORIGIN: https://habits.example.com # set to your public URL

volumes:
  habits_data:
```

### Environment variables

| Variable        | Default           | Description                                   |
| --------------- | ----------------- | --------------------------------------------- |
| `PORT`          | `3000`            | Port the HTTP server listens on               |
| `HOST`          | `0.0.0.0`         | Interface to bind                             |
| `ORIGIN`        | _(none)_          | Public URL — required when behind a proxy/TLS |
| `DATABASE_PATH` | `/data/habits.db` | Path to the SQLite database file              |

## PWA support

Habits is a basic installable PWA: it ships a web app manifest and a service
worker that caches the static app shell, so it can be added to a phone's home
screen and loads instantly on repeat visits. It does **not** cache habit data
or work offline — every page load and form submission still talks to the
server.

> **HTTPS required.** Service workers only run in a [secure
> context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) —
> `https://` origins, or `http://localhost`. If you deploy behind plain HTTP on
> a LAN IP or hostname (no TLS), the service worker won't register and the
> app won't be installable, though the site itself still works normally.
> Put a reverse proxy with TLS (Caddy, Tailscale, etc.) in front to get PWA
> install support.

## Releases

Docker images are published to the GitHub Container Registry on every `v*.*.*`
tag push, built for `linux/amd64` and `linux/arm64`:

```
ghcr.io/thomas-god/habits:latest
ghcr.io/thomas-god/habits:1.2.3
```

To create a release:

```sh
git tag v1.0.0
git push origin v1.0.0
```

The [Release workflow](.github/workflows/release.yml) will build and push the
multi-arch image automatically.
