# Capacity & scaling (SolaHub)

## Short answer

**Yes.** On the order of **100 registered users** — and typical concurrent usage well below that — a single modest API host with PostgreSQL is expected to perform comfortably. “100 users” usually means far fewer **simultaneous** connections and requests.

What actually limits you is **peak concurrent load** (requests per second, open SignalR connections, DB pool size, and **third-party Bible API** rate limits for the web client), not the total row count in `users`.

## What we optimized in code

| Area | Change |
|------|--------|
| **EF Core** | `AddDbContextPool` in non-`Test` environments — less allocation churn under concurrent HTTP requests. Integration tests still use a plain `DbContext` for container DB swaps. |
| **HTTP responses** | Brotli + Gzip **response compression** for smaller JSON payloads over the wire. |
| **SignalR / horizontal scale** | If `ConnectionStrings:Redis` is set, SignalR uses the **Redis backplane** so multiple API instances share hub messages (needed when you run **more than one** API replica behind a load balancer). |
| **Web Bible reads** | Short-lived **in-memory chapter cache** (per browser tab / client) to cut duplicate calls to bible-api.com when many people hit the same passage. |

## Operational checklist as you grow

1. **PostgreSQL**: Right-size instance; monitor connections (`max_connections` vs app pool). Use managed Postgres with backups.
2. **Redis**: Use the same `Redis` connection string in production for **distributed cache** (auth rate limiting) and **SignalR backplane** whenever you run multiple API nodes.
3. **Horizontally scale the API**: Run 2+ replicas **only with** Redis SignalR backplane (and sticky sessions are not enough for SignalR without a backplane).
4. **Bible text in web mode**: Heavy reliance on bible-api.com can hit **their** limits; for large deployments prefer **your own text/cache** or Tauri/offline bundles.
5. **Observability**: Watch latency (p95/p99), DB CPU, connection pool exhaustion, and Redis errors.

## Rough mental model

- **100 users**, sparse activity: trivial for this stack.
- **Thousands** of concurrent SignalR users or **sustained high RPS**: requires load testing, pooling tuning, read replicas or caching, and possibly moving Bible payload serving in-house.
