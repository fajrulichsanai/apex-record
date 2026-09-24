# Session handling (httpOnly cookie + same-origin proxy)

The browser never holds the API access token.

```
browser ──(cookie apex_session, same origin)──▶ Next.js /api/backend/* ──(Authorization: Bearer)──▶ NestJS API
```

- `app/api/backend/[...path]/route.ts` forwards every API call to the backend
  and adds `Authorization` from the `apex_session` cookie (httpOnly,
  SameSite=Lax, Secure over HTTPS, expires with the token).
- Login, MFA verify, refresh and impersonate responses have `accessToken`
  moved into that cookie and stripped from the JSON the page receives.
- Logout (`POST /api/backend/auth/logout`) revokes the token on the backend
  and clears the cookie. Exiting impersonation (`DELETE
  /api/session/impersonation`) revokes the impersonation token and restores
  the Super Admin's parked `apex_impersonator` cookie.
- Non-GET requests with a foreign `Origin` header are rejected (CSRF defence
  on top of SameSite=Lax).
- `localStorage` keeps only the non-secret user profile (`user`) so the UI
  knows someone is signed in.

## Configuration

| Variable | Where | Purpose |
| --- | --- | --- |
| `BACKEND_URL` | Next.js server env | Backend base URL the proxy calls, e.g. `http://127.0.0.1:3001`. Falls back to `NEXT_PUBLIC_API_URL`. |

## nginx in front of Next.js

The proxy forwards `X-Forwarded-For` so the backend's rate limits and audit
log see the real client IP. nginx must overwrite (not append to) that header
so clients can't spoof it, and pass the original host/protocol:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host              $host;
    proxy_set_header X-Forwarded-Host  $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For   $remote_addr;
}
```

On the backend, keep `TRUST_PROXY=loopback` when Next.js calls it on the same
host (`BACKEND_URL=http://127.0.0.1:3001`).
