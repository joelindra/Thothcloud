# Contributing to ThothCloud 🪐

First off, thank you for considering contributing to ThothCloud! It's people like you that make ThothCloud such a great tool for the privacy-conscious community.

## 📜 Code of Conduct
By participating in this project, you agree to abide by our standards of professionalism and respect.

## 🚀 How Can I Contribute?

### Reporting Bugs
- **Check the Issues:** See if the bug has already been reported.
- **Provide Details:** Use a clear title, describe the steps to reproduce the bug, and include screenshots if possible.
- **System Info:** Mention your OS, Browser, and ThothCloud version.

### Suggesting Enhancements
- **Open an Issue:** Describe the feature you want to see and why it would be useful.
- **Be Specific:** Explain the use case and how it fits into the "Offline-First" philosophy.

### Pull Requests
1. **Fork the Repo:** Create your own branch from `main`.
2. **Setup Dev Environment:** Follow the manual setup guide in the README.
3. **Write Clean Code:** 
   - Backend: Follow PEP 8 and use Pydantic for validation.
   - Frontend: Use functional components and custom CSS variables for styling.
4. **Update Docs:** If you change a feature, update the relevant documentation.
5. **Submit PR:** Provide a detailed description of what you changed.

## 🛠️ Development Standards

### Backend (FastAPI)
- Use `Session` dependency for database access.
- Always include type hints.
- Ensure all new endpoints are rate-limited via `limiter`.

### Frontend (React)
- Use `Lucide-React` for icons.
- Ensure all new UI elements are theme-aware (use CSS variables from `index.css`).
- Prioritize accessibility (ARIA labels).

## 🤔 Questions?
Feel free to open a discussion or contact the maintainers.

Happy coding! 🚀
