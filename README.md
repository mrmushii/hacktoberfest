# UniHub 🎓

An intelligent academic intelligence and resource management platform built for Hacktoberfest. UniHub streamlines university notices, diffs exam and schedule announcements, indexes course documents and past papers, and leverages local LLMs (via Ollama) for automated question extraction and study aids.

## 🚀 Key Features

- **Notice Management & Version Diffing**:
  - Automatically parses notice announcements, schedules, and deadlines.
  - Detects notice revisions, highlighting added, modified, or cancelled fields (e.g., date, time, venue changes).
  - Normalizes courses, sections, and room numbers into canonical formats.
- **Course Documents & Past Paper Indexing**:
  - Supports PDF ingestion and multi-page text extraction (`unpdf`).
  - Automatic exam question detection, mark breakdown, and topic tagging.
- **Local AI Processing via Ollama**:
  - Two-tier model execution (fast vs. smart) with automated JSON schema validation using Zod.
  - Content-hash-based AI result caching to prevent redundant LLM invocations.
- **Relational Data Model**:
  - Backed by Prisma ORM with SQLite for instant local development and zero-config setup.
- **Automated Testing Suite**:
  - Unit and integration tests powered by Vitest.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Turbopack) & [React 19](https://react.dev/)
- **Database & ORM**: [Prisma](https://www.prisma.io/) with SQLite
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [Lucide React](https://lucide.dev/)
- **Validation**: [Zod](https://zod.dev/)
- **PDF Processing**: [unpdf](https://github.com/unjs/unpdf)
- **Local AI Engine**: [Ollama](https://ollama.ai/)
- **Testing**: [Vitest](https://vitest.dev/)

---

## 🏁 Getting Started

### 1. Prerequisites

- **Node.js**: `v20+` or `v22+`
- **npm** / **pnpm** / **bun**
- *(Optional)* [Ollama](https://ollama.ai/) for local AI inference

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/mrmushii/hacktoberfest.git
cd hacktoberfest
npm install
```

### 3. Environment Variables

Copy the example environment configuration:

```bash
cp .env.example .env
```

Default `.env` configuration:
```env
DATABASE_URL="file:./dev.db"
AI_BASE_URL="http://localhost:11434"
MODEL_FAST="qwen3.5:4b"
MODEL_SMART="qwen3.5:4b"
AI_NUM_CTX="8192"
AI_CONCURRENCY="1"
AI_TIMEOUT_MS="600000"
CACHE_MODE="readwrite"
```

### 4. Database Setup

Push the Prisma schema to generate the SQLite database client:

```bash
npx prisma db push
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to view the application.

---

## 🧪 Running Tests

Run the Vitest test suite:

```bash
npm test
```

Or run with watch mode:

```bash
npx vitest
```

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server with Turbopack |
| `npm run build` | Builds the application for production |
| `npm run start` | Starts the production server |
| `npm run lint` | Runs ESLint checks |
| `npm test` | Runs the test suite via Vitest |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
