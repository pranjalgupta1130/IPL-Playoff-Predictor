# TODO

## Milestone 2 — Authentication (JWT)

- [ ] Create `backend/src/services/jwtService.ts` for JWT sign/verify
- [ ] Create `backend/src/middleware/authMiddleware.ts` (Bearer token -> req.user)
- [ ] Update `backend/src/services/authService.ts` to issue JWT on login
- [ ] Update `backend/src/controllers/authController.ts`:
  - [ ] modify `login` to return `{ user, accessToken }`
  - [ ] add `me` handler
  - [ ] add `logout` handler (stateless)
- [ ] Update `backend/src/routes/auth.ts`:
  - [ ] add `GET /me`
  - [ ] add `POST /logout` (or omit if stateless per spec)
- [ ] Add env vars to backend docs/examples if needed (`JWT_SECRET`, `JWT_EXPIRES_IN`)
- [ ] Frontend:
  - [ ] Update `frontend/src/services/api.ts` with auth token persistence + axios interceptor
  - [ ] Add `getMe()` and `logout()` api helpers
  - [ ] Build a small auth state/store (token + current user)
- [ ] Update login page to persist token and set auth state
- [ ] Add protected route(s) where appropriate (likely just redirect logic)
- [ ] Backend build + seed smoke test
- [ ] Frontend lint/build smoke test


