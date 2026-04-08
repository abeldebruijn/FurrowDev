# Zero Auth Patterns

Use this reference when choosing an auth transport or debugging a failing Zero connection.

## Cookie-Forwarded Auth

Use this when the app already authenticates with secure server cookies.

### Fit

- server-rendered app
- existing session middleware
- route handlers can read cookies directly
- zero-cache can forward cookies to query and mutate endpoints

### Shape

1. Browser authenticates with the app normally.
2. Zero client connects to zero-cache.
3. zero-cache forwards cookies to query and mutate endpoints.
4. Server reads the session cookie and builds viewer context.

### Requirements

- zero-cache forwards cookies for both query and mutate traffic
- query and mutate routes can parse the same session source
- websocket path and HTTP path both result in the same effective identity

### Risks

- cookie forwarding not enabled
- wrong domain, same-site, or secure cookie settings
- auth helper only works on routes covered by middleware, while Zero routes are outside that matcher

## Bearer-Token Auth

Use this when the client can acquire an explicit token for Zero.

### Fit

- SPA-heavy apps
- mobile or cross-domain clients
- token refresh already exists in the app
- auth provider exposes a usable access token or custom JWT

### Shape

1. Client acquires a token.
2. Zero client connects with `auth`.
3. Server validates the token on query and mutate routes.
4. Server derives viewer context from token claims plus database lookup.

### Requirements

- token subject is stable
- refresh path exists before the token expires
- Zero reconnect behavior after `401` or `403` is handled

### Risks

- stale token during long-lived websocket sessions
- token subject does not match chosen `userID`
- server validates token but never maps it to the persisted app user

## Identity Mapping Rules

Keep these separate unless there is a strong reason to collapse them:

- auth provider subject
- Zero `userID`
- application `users.id`

Recommended pattern:

1. Keep provider subject in a unique database column.
2. Reconcile to a persisted app user row at auth boundary.
3. Use app user id for ownership and permissions.
4. Use provider subject or a stable derivative for Zero client identity only if it matches the sync partition strategy.

## Route Boundary Checklist

At the Zero query and mutate route boundary:

1. parse cookie or token
2. reject unauthenticated request
3. resolve provider subject
4. load or upsert persisted app user
5. build minimal viewer context
6. dispatch named query or mutator with that context

## Debugging Connection Failures

When the client shows websocket failures:

1. verify zero-cache is running
2. verify `cacheURL` points to the right host and port
3. verify query and mutate endpoint env values inside zero-cache
4. verify cookie forwarding or bearer-token forwarding is enabled
5. verify the route can parse auth outside any normal page middleware assumptions
6. verify the server returns `401` for missing auth instead of crashing

## Provider-Specific Notes

Provider-specific implementations vary.

- Session-cookie providers often pair well with cookie forwarding.
- JWT-first providers often pair well with bearer-token auth.
- Some providers expose both, so choose the path that best matches the app architecture and deployment model.
