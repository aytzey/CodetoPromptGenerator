# Code to Prompt Generator Tool

A tool for quickly assembling Large Language Model (LLM) prompts from a local file tree. You can select or exclude specific files/folders, compose meta and main instructions, and instantly copy everything (including file contents) to your clipboard for LLM usage.

![Screenshot from 2025-03-05 01-14-47](https://github.com/user-attachments/assets/3a82881f-41f9-4268-9778-fc9c314aa4ee)


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

1.  **Node.js & npm**
    *   Install from [https://nodejs.org](https://nodejs.org) if not already on your system.
2.  **Python 3.7+**
    *   Install from [https://www.python.org](https://www.python.org).

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

### 3. Configure Ports (Optional)
By default, the frontend runs on port `3000` and the backend on port `5000`. You can customize this by editing the `ports.ini` file in the project root.

### 4. Start the Tool
There are multiple ways to start both the frontend (Next.js) and backend (Flask):

#### (A) Single Command via npm
This script reads `ports.ini` and starts both servers correctly configured.
```bash
npm run start:all
# OR directly:
node start.js
```
This launches both servers:
- Frontend on port specified in `ports.ini` (default: `http://localhost:3000`)
- Backend on port specified in `ports.ini` (default: `http://localhost:5000`)

Press `Ctrl + C` to stop both.

#### (B) Using Provided Batch/Shell Scripts
- **Windows**: Double-click `start.bat` or run it from the command line.
- **Mac/Linux**: Make it executable (`chmod +x start.sh`) then run `./start.sh`.

These scripts also execute `node start.js`.

#### (C) Manual Start (Separate Terminals)
If you prefer to run them separately (e.g., for debugging), ensure ports match `ports.ini` or defaults:
*   **Backend:**
    ```bash
    cd python_backend
    # Set port manually if not using default 5000 and not using start.js
    # export FLASK_PORT=5001 (Linux/Mac) or set FLASK_PORT=5001 (Windows)
    python app.py
    ```
*   **Frontend:**
    ```bash
    # Set API URL and Port manually if not using default and not using start.js
    # export PORT=3001
    # export NEXT_PUBLIC_API_URL=http://127.0.0.1:5001
    npm run dev
    ```
> **Note:** Running manually requires setting the `NEXT_PUBLIC_API_URL` environment variable for the frontend if the backend is not on the default `http://127.0.0.1:5000`. Using `npm run start:all` handles this automatically via `ports.ini`.


---

## Usage

1. **Open the UI**  
    *   Navigate to the frontend URL (default: `http://localhost:3000`, or as specified in `ports.ini`).

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

1.  **Ensure `ports.ini` exists** with the correct ports for your running application (or use defaults).
2.  **Start** the whole app (both frontend & backend) using the **recommended** `npm run start:all` command.
3.  **In a separate terminal**, run:
    ```bash
    node scripts/autotest.js
    ```
4. A summary is printed. Success returns exit code `0`; any failures return `1`. The test script will read `ports.ini` to connect to the correct endpoints.

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
**Enjoy using the Code to Prompt Generator Tool!** If you encounter any issues, open an issue or reach out for support. Happy coding!
