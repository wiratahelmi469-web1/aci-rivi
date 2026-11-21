# Security Specification — Aci Rivi Firestore Rules

## 1. Data Invariants
- Every document in `/pelanggan/{pelangganId}` MUST use `pelangganId == request.auth.uid`.
- Only the authenticated owner (`request.auth.uid == pelangganId`) can `get`, `create`, or `update` their own `/pelanggan/{pelangganId}` document. Collection `list` and document `delete` are forbidden.
- `uid`, `email`, and `createdAt` are immutable after creation; `createdAt` and `updatedAt` must match `request.time`.
- `nomorWhatsApp` must match `^(08|62)[0-9]{8,12}$` (10–14 digits) and `nama` must be 1–100 characters.
- No extra/shadow fields are allowed (`hasOnly`).

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated `get` on `/pelanggan/user1`
2. Authenticated `user2` reading `/pelanggan/user1`
3. Authenticated `user1` listing `/pelanggan`
4. `user1` creating `/pelanggan/user2` (UID mismatch)
5. `user1` creating `/pelanggan/user1` with shadow field `{ isAdmin: true }`
6. `user1` creating `/pelanggan/user1` with invalid WhatsApp `"12345"`
7. `user1` creating `/pelanggan/user1` with empty `nama: ""`
8. `user1` creating `/pelanggan/user1` with client-forged `createdAt` not equal to `request.time`
9. `user1` updating `/pelanggan/user1` to change immutable `uid`
10. `user1` updating `/pelanggan/user1` to change immutable `email`
11. `user1` updating `/pelanggan/user1` with 500-char `nama` (resource poisoning)
12. `user1` deleting `/pelanggan/user1`
