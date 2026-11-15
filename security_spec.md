# ASTRACARE Firestore Security Specification

## 1. Data Invariants
1. **Verified Identity Gate**: No user may read or write `/users/{userId}` unless `request.auth != null`, `request.auth.uid == userId`, and `request.auth.token.email_verified == true`.
2. **PII Isolation**: `/users/{userId}` contains private astronaut PII (`email`, `fullName`, `medicalNotes`, biometrics). `allow list` is explicitly `false`, and `allow get` is strictly limited to the verified owner.
3. **Immutable Ownership & Timestamps**: `uid`, `email`, and `createdAt` cannot be modified after document creation; `createdAt` on create and `updatedAt` on create/update must equal `request.time`.
4. **Strict Field Allowlisting**: Document keys must match the exact `UserProfile` schema (`hasAll` + `hasOnly` on create/validate; `affectedKeys().hasOnly(...)` on update).

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated read/write**: `request.auth == null` reading or writing `/users/uid123`.
2. **Unverified email write**: `request.auth.uid == "uid123"`, `request.auth.token.email_verified == false` creating `/users/uid123`.
3. **Unverified email read**: `request.auth.uid == "uid123"`, `request.auth.token.email_verified == false` reading `/users/uid123`.
4. **Cross-user PII read**: Verified `uidA` attempting `get(/users/uidB)`.
5. **Collection scraping**: Verified `uidA` attempting `list(/users)`.
6. **UID spoofing**: Verified `uidA` creating `/users/uidA` with payload `{ uid: "uidB", ... }`.
7. **Email spoofing**: Verified `uidA` (`token.email: "a@gmail.com"`) creating `/users/uidA` with `{ email: "admin@nasa.gov" }`.
8. **Shadow / Ghost field injection**: Verified `uidA` creating `/users/uidA` with an extra `{ isAdmin: true }` field.
9. **ID poisoning**: Request targeting `/users/../../invalid$id` or a 1.5KB document ID.
10. **Client timestamp forgery**: Creating or updating `/users/uidA` with backdated `createdAt` or `updatedAt != request.time`.
11. **Value poisoning / oversized string**: Updating `fullName` with a 10,000-char string or invalid `role: "SuperAdmin"` or `age: 5`.
12. **Immutable field tampering on update**: Updating `uid`, `email`, or `createdAt` on `/users/uidA`.
