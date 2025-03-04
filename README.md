# Code to Prompt Generator Tool by Aytzey

A tool for quickly assembling Large Language Model (LLM) prompts from a local file tree. You can select or exclude specific files/folders, compose meta and main instructions, and instantly copy everything (including file contents) to your clipboard for LLM usage.

---

## Table of Contents
1. [Key Features](#key-features)
2. [Technology Stack](#technology-stack)
3. [Prerequisites](#prerequisites)
4. [Installation & Setup](#installation--setup)
5. [Usage](#usage)
6. [Production Build (Optional)](#production-build-optional)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)
9. [Project Structure](#project-structure)

---

## Key Features

- **Project Tree Navigation**  
  Select any local folder to scan and recursively build a tree of files and directories.  
  Exclude specific directories or file types with a simple UI.

- **File Selection & Token Counts**  
  Quickly toggle the files or folders you want to include in your prompt. The tool displays total token usage based on a naive word/punctuation count.

- **Meta Prompt Management**  
  Store and retrieve partial prompts (so-called "meta prompts") in a dedicated directory. Load or save these text files at any time.

- **Copy to Clipboard**  
  Gather your meta prompt, main instructions, plus the selected files’ contents in one click. Paste directly into your preferred LLM interface.

- **Python Backend for Extended Services**  
  An optional Python/Flask backend (e.g., for to-do items, scanning directory structure on certain OSes, or future expansions).

---

## Technology Stack

- **Frontend**  
  - [Next.js](https://nextjs.org/) & [React](https://reactjs.org/)  
  - [TypeScript](https://www.typescriptlang.org/)  
  - [Tailwind CSS](https://tailwindcss.com/)  
  - [shadcn/ui Components](https://ui.shadcn.com)

- **Backend**  
  - [Python 3.7+](https://www.python.org/)  
  - [Flask](https://flask.palletsprojects.com/)  
  - [Flask-CORS](https://flask-cors.readthedocs.io/)

- **Miscellaneous**  
  - [Node.js](https://nodejs.org/) (v14 or higher recommended)  
  - [npm](https://www.npmjs.com/) for package management  
  - Local file system operations for scanning and retrieving files.

---

## Prerequisites

1. **Node.js & npm**  
   - Install from [https://nodejs.org](https://nodejs.org) if not already on your system.
2. **Python 3.7+**  
   - Install from [https://www.python.org](https://www.python.org).

*(Optional)* You may want [Git](https://git-scm.com/) if you plan to clone the repository instead of downloading.

---

## Installation & Setup

### 1. Obtain the Project
You can either **clone** the repository via Git or **download** and extract the ZIP:

```bash
git clone https://github.com/aytzey/code_to_prompt_generator.git
cd code_to_prompt_generator
```

*(If you downloaded a ZIP, just unzip and then `cd` into the extracted folder.)*

### 2. Install Node.js Dependencies
Install the frontend and supporting packages:

```bash
npm install
```

> **Note**: During `npm install`, a `postinstall.js` script will attempt to automatically:
> - Locate a Python 3 interpreter.
> - Create a virtual environment (`venv`) in `python_backend/venv`.
> - Install Python dependencies (`requirements.txt`).

If you do **not** see this happen or if it fails, you may manually do:
```bash
cd python_backend
pip install -r requirements.txt
cd ..
```

### 3. Start the Tool
There are multiple ways to start both the frontend (Next.js) and backend (Flask):

#### (A) Single Command via npm
```bash
npm run start:all
```
This launches both servers together:
- Frontend on [http://localhost:3000](http://localhost:3000)
- Backend on [http://localhost:5000](http://localhost:5000)

Press `Ctrl + C` to stop both.

#### (B) Using Provided Scripts
- **Windows**: Double-click `start.bat` or run it from the command line.
- **Mac/Linux**: Make it executable (`chmod +x start.sh`) then run `./start.sh`.

Both scripts call the same Node script under the hood (`start.js`), which starts the Python backend and the Next.js frontend together.

---

## Usage

1. **Open the UI**  
   - Navigate to [http://localhost:3000](http://localhost:3000).

2. **Choose Your Folder**  
   - Use the folder picker to select the root directory containing your project or files you want to scan.

3. **Exclude Directories (Optional)**  
   - In "Options," edit the excluded paths via the **Exclusions Manager**.  
   - Common exclusions: `node_modules`, `.git`, `.next`, `dist`, etc.

4. **Filter by Extensions (Optional)**  
   - In "Options," add any file extensions (e.g. `.js`, `.tsx`) to limit the file tree to certain types.

5. **Select Files**  
   - Expand the project tree and pick the files or directories you’d like included in your final prompt.

6. **Write or Load a Meta Prompt**  
   - Under **Prompts** (right panel), choose a meta prompt file to load, or type in new text.  
   - Save it to a new or existing file name as needed.

7. **Add Main Instructions**  
   - Enter any additional context or instructions in the "Main Instructions" area.

8. **Copy All to Clipboard**  
   - Click **Copy All to Clipboard**. The text will include:
     - Meta Prompt (if any)
     - Main Instructions
     - Project Tree (with excluded directories filtered out)
     - Contents of all selected files

9. **Paste into Your LLM**  
   - Simply paste this data wherever you interact with GPT/LLMs.

---

## Production Build (Optional)

For a more optimized deployment build:

1. **Build the Frontend**  
   ```bash
   npm run build
   ```

2. **Start in Production Mode**  
   ```bash
   npm start
   ```
   - The production Next.js server runs on [http://localhost:3000](http://localhost:3000) by default.
   - The Python backend isn’t automatically run by `npm start`; you still need to run it yourself (e.g., using `python app.py`) if needed in production.

---

## Testing

We include an **autotest** script in `scripts/autotest.js`. It checks:

1. **Todo Endpoints**  
   - `GET /api/todos`, `POST /api/todos`, `DELETE /api/todos/:id`

2. **Project Tree & File Endpoint**  
   - `POST /api/files` for loading the tree
   - `POST /api/files/contents` for reading file contents

3. **Frontend Basic Checks**  
   - Verifies that the root page (`/`) loads Next.js HTML

**How to run tests**:

1. **Start** the whole app (both frontend & backend) via:
   ```bash
   npm run start:all
   ```
2. **In a separate terminal**, run:
   ```bash
   node scripts/autotest.js
   ```
3. A short summary is printed. Success returns exit code `0`; any failures return `1`.

---

## Troubleshooting

- **Python Not Found**  
  If the auto-virtual-environment creation fails, manually install dependencies:  
  ```bash
  cd python_backend
  pip install -r requirements.txt
  cd ..
  ```
- **Port Already in Use**  
  If port `3000` or `5000` is taken, stop any conflicting service or change the default ports (edit `.env` or the scripts as needed).
- **Permission Denied**  
  On some systems, you may need `chmod +x start.sh` or run commands with `sudo`.  
- **General Debug**  
  Check your terminal outputs. The Node script (`start.js`) logs success/failure, and the Flask console prints any errors for the backend.

---

## Project Structure

Below is a high-level overview:

```
.
├── pages/                 # Next.js pages (including index.tsx - the main UI)
├── views/                 # Reusable React components (file tree, prompts, etc.)
├── lib/                   # Utility functions for filters/transformations
├── styles/                # Tailwind global stylesheet
├── python_backend/        # Flask-based backend
│   ├── app.py             # Main Flask entry
│   ├── controllers/       # Endpoints: files, metaprompts, todo, etc.
│   ├── services/          # Services for scanning directories, etc.
│   ├── models/            # Data models (in-memory or DB-based)
│   └── requirements.txt   # Python dependencies
├── scripts/
│   ├── postinstall.js     # Auto-setup script for Python venv & pip install
│   └── autotest.js        # Basic test script 
├── start.js               # Launches both servers (Node & Python)
├── start.bat              # Windows launcher
├── start.sh               # Linux/Mac launcher
├── package.json
└── README.md              # This file
```

---
**Enjoy using the Code to Prompt Generator Tool!** If you encounter any issues, open an issue or reach out for support. Happy coding!
