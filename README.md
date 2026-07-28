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
