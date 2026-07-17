# MakySchool Biometrics — Implementation Documentation

**Prepared for:** MHL Executive & Development Team
**Owner:** Matovu Abdul Karim (CEO/Founder)
**Date:** July 2026
**Status:** Planning / Pre-implementation

---

## 1. Purpose & Vision

Biometrics in MakySchool should not be treated as a standalone "attendance feature." The goal is to build **one trustworthy, verified identity per student and staff member** that every other MakySchool workflow can rely on — attendance, finance, health, safety, and exams — without re-verifying identity from scratch each time.

This mirrors how MakyI already anchors KYC (OCR, face match, liveness) across NextFi and MakyPay. Biometrics for MakySchool should follow the same pattern: a shared, reusable identity service, not a one-off school-specific build.

### What success looks like
- **Trust:** the person present is who the system says they are — stops impersonation in exams, fee fraud, fake enrollments
- **Speed:** attendance, payment, and access checks happen in a tap/scan, not a manual register
- **Continuity:** a student's identity and history follow them across schools on the MakyLegacy network — no lost records, no re-enrollment fraud on transfer
- **Safety:** only the right adults access a child's data or pick them up
- **Auditability:** every check-in, payment, and record access is logged against a verified identity

If biometrics only ever covers attendance, it's a commodity feature any competitor can copy. Built as a shared identity layer, it becomes a durable moat.

---

## 2. How Biometrics Work (Core Concept)

Every biometric method follows the same pipeline:

1. **Capture** — a sensor takes a raw reading (camera, fingerprint scanner)
2. **Feature extraction** — software pulls out distinctive, stable features (fingerprint minutiae, facial landmark distances, iris pattern)
3. **Template creation** — features become a compact numeric template — **not a stored photo**
4. **Matching** — a new capture is compared against stored template(s) using a similarity score
5. **Threshold decision** — above the threshold = match; the threshold is tunable and trades off false rejections vs. false acceptances

Two operations:
- **Verification (1:1):** "Is this the person they claim to be?" — fast, used for daily attendance/gate checks
- **Identification (1:N):** "Who is this?" — slower, used for enrollment fraud checks or when there's no claimed identity

Because only the derived template is stored (not the raw image), there's a reasonable privacy argument to make — but the template is still legally "biometric data" under Uganda's Data Protection Act, so consent and retention rules apply regardless.

---

## 3. Which Biometric Methods to Use

| Method | Hardware cost | Fit for schools | Recommendation |
|---|---|---|---|
| **Student ID (RFID/barcode)** | Lowest (~$50–100 readers) | Fast, cheap, no consent friction | **Start here — Phase 1** |
| **Facial recognition** | Low (existing camera/webcam) | Contactless, easy to demo, good for gate entry | **Phase 2** |
| **Fingerprint** | Moderate (~$30–50 scanners) | Proven in the region; young children's ridges scan poorly, causing higher false-rejection rates | **Optional add-on, Phase 2/3** |
| **Iris** | Highest, needs IR cameras | Built for border-control-level security — overkill for school attendance | **Drop from roadmap** unless a specific customer demands it |

**Note on existing school hardware:** many schools already own biometric devices (ZKTeco, Suprema, Hikvision, etc.). The pitch to these schools should be *"point your existing device at our system"* rather than *"buy new hardware."*

---

## 4. Architecture: What Belongs Where

Following MHL's standing architecture rule — **all AI through MakyI** — biometric matching is an AI/identity function and belongs in MakyI, not MakySchool. This is the same pattern already settled for KYC.

### MakyI owns (matching intelligence only):
- `enroll()` — capture + create template + run duplicate check before saving
- `verify()` — 1:1 check ("is this the claimed person")
- `identify()` — 1:N check ("who is this") — used for fraud detection and enrollment
- Template storage and versioning (never raw images long-term)
- The `BiometricProvider` interface — pluggable (mock provider now, real device/SDK providers later)
- Confidence scoring and threshold tuning

### MakySchool owns (everything school-specific):
- Student and staff records
- ID card generation/printing
- Attendance UI and logic (per-period, late/early flagging)
- Nurse module (see §7)
- Exam integrity checks
- Guardian pickup verification
- Consent capture and data retention UI
- Calls MakyI's endpoints — never builds matching logic itself

This split means MakySchool ships now with ID cards only (zero MakyI dependency), and later additions (face, fingerprint) are a matter of calling an existing MakyI endpoint rather than rebuilding anything.

---

## 5. What to Build In-House vs. Outsource

**Build in-house** (your actual product differentiation):
- The `BiometricProvider` interface design
- The 1:N fraud-check logic and enrollment flow
- How MakySchool workflows (nurse, exams, pickup, finance) consume identity
- Integration glue between MakySchool and MakyI

**Outsource / use existing solutions** (solved problems, high legal/technical risk to reinvent):
- **Matching algorithms** — use mature open-source models (e.g. InsightFace, face_recognition) or vendor SDKs (ZKTeco, SecuGen, Suprema) rather than building a custom fingerprint/face matcher
- **Device hardware** — buy off-the-shelf readers/scanners; don't manufacture
- **Liveness detection / anti-spoofing** — use a proven third-party library or SDK feature; this is an adversarial security problem, not something to build from scratch
- **Compliance/legal templates** — consent forms and retention policy wording should go through Khalayi with real legal reference to Uganda's Data Protection Act, not be drafted from assumptions

---

## 6. Simulating & Testing Without Hardware Access

Since MHL doesn't yet have direct hardware/device access for development, simulate at the **integration/protocol level**, not the biometric science itself:

1. **Mock the device protocol.** Build a `BiometricProvider` mock in MakyI that returns randomized match/no-match results with realistic latency. This lets the full pipeline (MakySchool attendance, parent notification) be built and demoed end-to-end.
2. **Fake webhook sender.** A small FastAPI script posting randomized check-in events (`student_id`, `timestamp`, `device_id`, `confidence_score`) to real MakySchool/MakyI endpoints — simulates a live gate for load-testing and demos.
3. **Use vendor SDK test modes.** Most biometric SDKs (ZKTeco especially) ship with sample templates and simulator/dev modes specifically for integrators to test without live hardware — check documentation before building custom mocks.
4. **Replay real data once obtained.** If any team member or a friendly school can share one real device export (CSV/log of check-ins), replay that data through the pipeline repeatedly — more realistic than synthetic data.

This approach means when approaching a school, the pitch becomes "connect your existing device to this URL" rather than requiring new hardware — much lower friction.

---

## 7. Full Feature Scope (Long-Term)

Biometrics should ultimately anchor these MakySchool workflows:

1. **Attendance & access control** — gate entry/exit, per-classroom attendance, late/early flagging with auto parent alerts via MakyReach
2. **Exam integrity** — verifying the right student sits the right exam (addresses real impersonation fraud in Ugandan exams)
3. **Financial linkage** — biometric ID tied to MakyPay for fee status, cafeteria, transport payments
4. **Safety & safeguarding**
   - **Guardian pickup verification** — only pre-registered, authorized guardians can check a child out
   - **Visitor management** — logging every non-student/staff person on campus
5. **School Nurse Module** (see below)
6. **Cross-school identity** — via shared MakyLegacy auth, a transferring student's record, fee history, and attendance carries over, reducing fraud from duplicate enrollments or fake transcripts
7. **Teacher/staff attendance** — same infrastructure, different user group; feeds into payroll later

### School Nurse Module — detail
- Nurse logs in with a dedicated role, scans/taps student ID or biometric
- Pulls up: allergies, chronic conditions, medications, emergency contacts, past incidents
- Logs each visit (symptom, treatment given, time) — builds a timeline per student
- Auto-notifies parent via MakyReach; can flag guardian pickup if the child needs to go home
- **Strict RBAC required:** nurse role sees only medical fields — no financial or academic record access

### Teacher attendance — two approaches
1. **Geofenced check-in:** teacher's phone detects they're within school GPS radius, prompts a face/fingerprint confirmation, logs attendance automatically — cheapest to build now
2. **Fixed device at entry:** same gate/scanner students use — a Phase 2 hardware conversation, ties into payroll later

---

## 8. Preventing Duplicate Enrollment / Fraud (Anti-Replication)

The standard solution to duplicate/fraudulent enrollment is running **identification (1:N), not just verification, at enrollment time**:

- **At enrollment:** before saving a new biometric template, run the scan against the *entire* existing database. A match above threshold blocks enrollment and flags for review — this catches someone trying to register twice under different names.
- **Cross-school check:** since MakySchool shares MakyLegacy auth, this 1:N check should ideally run across *all* schools on the platform — this is what stops a student expelled from School A from re-enrolling at School B under a different name.
- **Card cloning:** for RFID cards, use encrypted/signed chips (not raw UIDs), or pair cards with periodic biometric re-verification for sensitive actions (exams, payments).

**Design principle:** cards prove *possession*; biometrics prove *identity*. Use both together where fraud risk is high (exams, financial transactions); cards alone where risk is low (daily attendance).

**Performance note:** 1:N identification gets computationally heavier as the database grows. Fine for a single school (hundreds/low thousands of records); if run across the whole MakyLegacy network, it should be a background/async job, not a real-time check on every enrollment.

---

## 9. What to Promise Schools (Honest, Staged Commitments)

**Phase 1 — ship now:**
Student ID cards + digital attendance, parent SMS/notifications via MakyReach, admin dashboard. No biometric dependency at all.

**Phase 2 — near-term:**
"We integrate with your existing biometric attendance devices" — if a school already owns ZKTeco/Suprema/Hikvision hardware, MakySchool pulls their existing check-in data rather than replacing it.

**Phase 3 — only after real device integration testing:**
Full biometric enrollment managed directly through MakySchool, for schools with no existing system.

**Do not promise:**
- Iris recognition or specific match-accuracy numbers before real testing
- A Phase 3 timeline before at least one real device integration is complete

---

## 10. Recommended Build Order

1. **Define the interface first.** Write the `BiometricProvider` contract in MakyI (`enroll()`, `verify()`, `identify()`) plus a webhook receiver for device check-in events.
2. **Build the mock layer.** FastAPI script simulating device payloads (fake UIDs, timestamps, randomized match scores) hitting the real MakyI endpoint — build and test the whole pipeline with zero hardware.
3. **Research one real vendor SDK in parallel.** Likely ZKTeco given regional prevalence — check webhook/push format, pull API format, and simulator/test mode availability. This tells you exactly what the mock should mimic.
4. **Build attendance logic on top of the mock.** Attendance record creation, late/absent logic, parent SMS — same code path works later with a real device since it's the same event data either way.
5. **Ship MakySchool Phase 1** with ID cards only — no MakyI dependency.
6. **Add facial recognition** — works with existing cameras, no new hardware.
7. **Add fingerprint** as an add-on, integrating with whatever devices a school already owns.
8. **Build the 1:N fraud check** as a background job in MakyI.
9. **Build nurse and guardian-pickup modules** — new MakySchool features consuming the same MakyI identity verification calls.

---

## 11. Technical Stack

**FastAPI** for both MakySchool and MakyI's biometric service:
- Consistent with MakySchool's existing FastAPI/Python backend — no context-switching for Ruth, Kweko, Afrah, Faisal
- Most biometric SDKs (face_recognition, InsightFace, vendor fingerprint SDKs) are Python-first
- Async support matters for network calls between MakySchool and MakyI
- Auto-generated OpenAPI docs ease integration between teams
- Pydantic validation fits biometric payloads (base64 images, template vectors, confidence scores) naturally

**Note:** FastAPI itself is not the performance bottleneck — the actual matching (face embedding comparison, minutiae matching) usually runs as a compiled library (OpenCV, dlib, vendor SDK) called from Python. FastAPI is the thin, fast layer in front of it. If 1:N identification across thousands of records becomes heavy, offload it to a background worker (Celery/RQ) rather than blocking requests — an optimization for later, not now.

---

## 12. Compliance Checkpoint (Flag to Khalayi)

Before any of this touches real student data:
- Parental consent flow, specifically written for biometric data on minors
- Data retention policy — how long templates/records are kept, and deletion process
- The nurse module and guardian pickup carry the **highest** legal weight of all these features (health data, minors, safeguarding) — these need sign-off before medical or pickup-authorization data goes live, not after
- This should be a compliance checklist owned by Khalayi, reviewed before any real pilot — not an afterthought once features are built

---

## Summary Table

| Layer | Owner | Key responsibility |
|---|---|---|
| Matching intelligence | **MakyI** | enroll/verify/identify, template storage, provider interface |
| School-specific logic | **MakySchool** | records, attendance, nurse, exams, pickup, consent UI |
| Notifications | **MakyReach** | parent SMS/alerts on all biometric events |
| Payments | **MakyPay** | fee/cafeteria/transport linkage to biometric identity |
| Compliance | **Khalayi** | consent, retention policy, Data Protection Act alignment |
