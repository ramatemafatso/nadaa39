# Creator voice lock

Nadaa uses SpeechBrain's `spkrec-ecapa-voxceleb` speaker-verification model. It creates a speaker embedding from an enrollment recording and compares incoming speech against it using cosine similarity. The default threshold is configurable with `VOICE_THRESHOLD`.

For stronger security, enroll several samples in varied conditions and average their normalized embeddings; also combine voice verification with device-local authentication (PIN/biometrics) before sensitive actions.
