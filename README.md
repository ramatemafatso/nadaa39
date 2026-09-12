# NADAA 39 — Morbius Processing Intelligence (MPI)

**Creator:** Ramatema Pule  
**Assistant name:** Nadaa (pronounced **nah-dah**)  
**Model/orchestration layer:** **Morbius Processing Intelligence (MPI)**

Nadaa 39 is a free-first, cross-platform personal AI assistant architecture. It combines a multimodal voice interface, model routing, local speaker verification, web/file ingestion, document generation, and device automation behind one assistant identity.

> The IQ/“720” language is treated as branding, not a scientific IQ claim. MPI is an orchestration layer over external and local models; it is not a single magically merged neural network.

## What is included

- React/Vite futuristic space UI with an animated 3D Morbius strip (Three.js).
- Gemini Live WebSocket voice chat using short-lived ephemeral tokens issued by the API server.
- Local creator voice verification using SpeechBrain ECAPA-TDNN embeddings.
- MPI router with Gemini + OpenAI-compatible providers (Groq/OpenRouter/Hugging Face) and automatic fallback.
- Tool/action framework for safe OS and mobile actions (including WhatsApp/phone handoff).
- File upload + link ingestion hooks.
- PDF, DOCX, PPTX and LaTeX generation.
- PWA shell plus Capacitor mobile configuration and Tauri desktop configuration.
- GitHub Actions workflows for web, Android, iOS, and desktop builds.

## Important free-use reality

There is no reliable way to guarantee “all AI models in the world, completely free, forever.” Provider free tiers, quotas, licenses, and model availability change. MPI therefore uses a **provider adapter** architecture: you can enable whatever free services/accounts are currently available, while keeping local tools and local speaker verification free/offline.

Gemini’s Live API uses WebSockets and supports real-time audio input/output; Google recommends ephemeral tokens for browser/mobile clients instead of exposing a long-lived API key. See the official docs linked in the README references. 

## Setup

### 1. API server

```bash
cd apps/api
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env  # Windows
# or cp .env.example .env
uvicorn main:app --reload --port 8000
```

Put your Gemini API key in `.env`. Do not commit it.

### 2. Web app

```bash
cd apps/web
npm install
npm run dev
```

Create `apps/web/.env.local` with:

```env
VITE_API_BASE=http://localhost:8000
```

### 3. Creator voice enrollment

Start the API, open Nadaa, and record 3–5 clean enrollment clips. The server stores only the averaged voice embedding in the local data directory by default.

### 4. Mobile/Desktop builds

The repository contains configuration for Capacitor and Tauri. Build jobs are provided in `.github/workflows/`. iOS compilation requires a macOS runner/Xcode; Android requires the Android toolchain; desktop bundles use Tauri.

## Actions and safety

Nadaa does not silently execute destructive or irreversible actions. The tool layer categorizes actions:

- **SAFE:** open URLs/apps, read files, create documents.
- **CONFIRM:** place a call, send a message, delete/overwrite data, make purchases, or act on another person’s account.
- **BLOCKED:** credential theft, malware, evasion, or harmful automation.

For “open WhatsApp and call John,” the mobile app can resolve a contact and hand off to WhatsApp/phone using platform APIs, subject to the user’s permissions and OS confirmation policies.

## Architecture

```text
                    ┌──────────────────────────┐
                    │       Nadaa 39 UI         │
                    │ React + Three.js + PWA    │
                    └─────────────┬────────────┘
                                  │ HTTPS / WSS
                    ┌─────────────▼────────────┐
                    │       MPI Gateway         │
                    │   FastAPI + Tool Bus      │
                    └───────┬─────────┬────────┘
                            │         │
              ┌─────────────┘         └─────────────┐
              ▼                                     ▼
     ┌─────────────────┐                   ┌─────────────────┐
     │ Model Providers │                   │ Local Services  │
     │ Gemini / Groq   │                   │ ECAPA speaker   │
     │ OpenRouter / HF │                   │ Docs/PDF/PPTX   │
     └─────────────────┘                   └─────────────────┘
```

## Official references

- Google Gemini Live API: https://ai.google.dev/gemini-api/docs/live-api
- Gemini Live WebSockets: https://ai.google.dev/gemini-api/docs/live-api/get-started-websocket
- Gemini billing/free tier: https://ai.google.dev/gemini-api/docs/billing
- SpeechBrain ECAPA speaker verification: https://huggingface.co/speechbrain/spkrec-ecapa-voxceleb
