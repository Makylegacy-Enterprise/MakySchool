# MakySchool Biometrics — Phase 2 (scaffold only)

## Planned architecture

Biometric features are intentionally **not implemented** in this migration. This module documents the future design.

### Use cases

1. **Enrollment** — capture face encoding or fingerprint template for students/staff
2. **Attendance** — gate/device scan matched to enrolled identity
3. **Exam verification** — confirm candidate identity before assessments

### Data privacy principles

- Never store raw biometric images or fingerprint templates in the school API database
- Store only encrypted references / irreversible templates in a dedicated vault
- Persist **match results + metadata** (student_id, timestamp, device_id, confidence, liveness_passed)
- Per-tenant isolation (`school_id` on all records)
- Guardian consent and retention policies

### Planned tables

- `biometric_devices` — school_id, device_type, location, public_key
- `biometric_enrollments` — user/student reference, vault_reference_id, enrolled_at
- `biometric_scan_logs` — attendance/verification events (no template bytes)

### Planned packages

- `face_recognition` / `deepface` / `opencv-python-headless` for face
- `PyFingerprint` for hardware fingerprint readers

### Integration flow

```
Device → Edge gateway → Biometric service → MakySchool API (events only)
```

Login biometrics (WebAuthn/passkeys) belong in a future auth enhancement, not this module.
