<div align="center">

<img width="1458" height="1068" alt="image" src="https://github.com/user-attachments/assets/799baf67-822d-42d2-b33f-37335288ddb0" />

# 🪐 ThothCloud
### **The Sovereign Private Cloud & Forensic Data Governance Suite**

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com)

**ThothCloud** is an industrial-grade private cloud ecosystem designed for high-security environments, media professionals, and data sovereign users. It combines a high-performance **FastAPI** backend with a stunning **Glassmorphic React** interface.

[**Explore Features**](#-key-capabilities) | [**Quick Start**](#-deployment-options) | [**Architecture**](#-ecosystem-architecture)

</div>

---

## ✨ Key Capabilities

### 🛡️ Forensic Security & Integrity
*   **Argon2id Hashing:** Utilizing industry-best standards for password entropy and protection.
*   **Stateless JWT Security:** High-entropy tokenization with secure rotation and expiration policies.
*   **Audit Sentinel:** Deep activity tracking records every action (Login, IP, Timestamp, User context) for forensic accountability.
*   **Secure Isolation:** Directory-level locking and recursive permission validation.

### ⚡ Professional Performance
*   **Atomic Chunked Uploads:** Handle multi-GB files with ease via segmented uploads, parallel processing, and resilient reassembly.
*   **Media Engine:** Real-time **FFmpeg Transcoding** allows for fluid media streaming even on low-bandwidth connections.
*   **Async Core:** Driven by a high-concurrency event loop, optimized for both high-end servers and low-power ARM devices.

### 🎨 Premium User Experience
*   **Fluid Glassmorphism:** A multi-layered, interactive interface designed for modern aesthetics and reduced cognitive load.
*   **Dynamic Theme Engine:** Instant transitions between *Cyber Dark*, *Stellar White*, and *High Contrast* modes.
*   **Advanced Media Suite:** Native support for 4K video, lossless audio (FLAC/WAV), PDF rendering, and high-fidelity image previews.

---

## 🚀 Deployment Options

### 🐍 Recommended: Native Python Runner
The fastest way to get ThothCloud up and running. This script handles both the backend and frontend development servers.

```bash
python start.py
```

### 🛠️ Option 2: Manual Full-Stack Setup
<details>
<summary>View Manual Instructions</summary>

**Backend (Python):**
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend (React/Vite):**
```bash
cd frontend
npm install
npm run dev
```
</details>

---

## 📋 API Architecture Reference

| Endpoint | Method | Scope | Description |
| :--- | :--- | :--- | :--- |
| `/auth/login` | `POST` | Public | Authenticate and retrieve secure JWT session. |
| `/files/list` | `GET` | User | Fetch recursive file/folder hierarchy. |
| `/files/upload-chunk`| `POST`| User | Multi-threaded segmented large file transfer. |
| `/files/stream/{id}` | `GET` | User | Low-latency streaming with transcoding (`quality=720p`). |
| `/share/{uuid}` | `GET` | Public | High-speed access to shared Uplinks. |
| `/settings/pick-folder`|`GET` | Admin | Remote directory selection via secure system bridge. |

---

## 📁 Ecosystem Architecture

```text
├── backend/            # FastAPI Async Engine & Logic Core
│   ├── modules/        # Domain logic (Auth, File Management, Sharing)
│   ├── database.py     # SQLAlchemy ORM & Data Layer
│   ├── models.py       # DB Schemas & Forensic Audit Definitions
│   └── requirements.txt# Python dependencies
├── frontend/           # React + Vite Professional UI
│   ├── src/components/ # Modular, theme-aware UI components
│   ├── src/index.css   # Glassmorphic Design System tokens
│   └── package.json    # Node.js dependencies
├── storage/            # Physical Data Isolation Node
├── docker-compose.yml  # Multi-container orchestration
└── start.py            # Unified Python orchestrator
```

---

## 🤝 Community & Support

*   **Contribute:** Please review the [**Contributing Guidelines**](./CONTRIBUTING.md) before submitting PRs.
*   **Issues:** Report bugs or request features via the GitHub Issues tab.
*   **License:** Hosted under the ThothCloud Open-Sovereign License.
