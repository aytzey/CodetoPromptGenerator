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
6. [Building for Production / Distribution](#building-for-production--distribution)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)
9. [Project Structure](#project-structure)

---

## Key Features

- **Project Tree Navigation**: Select any local folder to scan and recursively build a tree of files and directories.
- **File Selection & Token Counts**: Quickly toggle the files or folders you want to include in your prompt. The tool displays total token usage.
- **Exclusion Management**: Exclude specific directories or file types globally or per-project.
- **Meta Prompt Management**: Store and retrieve partial prompts (meta prompts) in a dedicated directory.
- **AI-Powered Features**: Smart file selection and prompt refinement using LLMs (requires OpenRouter API key).
- **Task Management**: Integrated Kanban board, To-Do list, and User Story management.
- **Actor Definition**: Define and manage project actors, with AI-assisted suggestions.
- **Copy to Clipboard**: Gather your meta prompt, main instructions, project tree, and selected file contents in one click.
- **Cross-Platform**: Built with Electron for Linux, macOS, and Windows compatibility.

---

## Technology Stack

- **Frontend**:
  - [Next.js](https://nextjs.org/) & [React](https://reactjs.org/)
  - [TypeScript](https://www.typescriptlang.org/)
  - [Tailwind CSS](https://tailwindcss.com/)
  - [shadcn/ui Components](https://ui.shadcn.com)
  - [Zustand](https://zustand-demo.pmnd.rs/) for state management
- **Desktop Shell**:
  - [Electron](https://www.electronjs.org/)
- **Backend**:
  - [Python 3.9+](https://www.python.org/)
  - [Flask](https://flask.palletsprojects.com/)
  - [Flask-CORS](https://flask-cors.readthedocs.io/)
- **Miscellaneous**:
  - [Node.js](https://nodejs.org/) (v20 or higher recommended)
  - [npm](https://www.npmjs.com/) for package management

---

## Prerequisites

Before you begin, ensure you have the following installed on your system.

1.  **Node.js v20+**:
    *   We strongly recommend using [nvm](https://github.com/nvm-sh/nvm) (Node Version Manager) to manage Node.js versions.
    *   Install Node.js v20 or higher. The `.nvmrc` file in the repository will help you switch to the correct version automatically if you use `nvm`.

2.  **Python 3.9+**:
    *   Install from [https://www.python.org](https://www.python.org). Ensure `python3` and `pip` are available in your PATH.

3.  **C/C++ Build Toolchain (Crucial for `tree-sitter`)**:
    *   **On macOS**: Install the Xcode Command Line Tools by running:
        ```bash
        xcode-select --install
        ```
    *   **On Debian/Ubuntu**: Install the `build-essential` package:
        ```bash
        sudo apt-get update && sudo apt-get install -y build-essential
        ```
    *   **On Windows**: Install the "Desktop development with C++" workload from the [Visual Studio Installer](https://visualstudio.microsoft.com/downloads/).

---

## Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/aytzey/CodetoPromptGenerator.git
cd CodetoPromptGenerator
```

### 2. Run the Setup Script (Recommended)
This is the easiest and most reliable way to get started. This script will:
- Use `nvm` to set the correct Node.js version.
- Install all Node.js dependencies.
- Set up the Python virtual environment and install all required packages.

```bash
bash .codex/setup.sh
```

### 3. Manual Installation (Alternative)
If you prefer to set up manually:

```bash
# 1. Set Node.js version (if using nvm)
nvm use

# 2. Install Node dependencies. This also runs a post-install script for Python.
npm install

# 3. If the post-install script fails, set up Python manually:
cd python_backend
python3 -m venv venv
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 4. Configure Ports (Optional)
By default, the Next.js dev server runs on port 3010 and the Flask backend on port 5010. You can customize this by editing the `ports.ini` file.

---

## Usage

### Development Mode (Recommended for most users)
To run the application with hot-reloading for both the frontend and the backend:

```bash
npm run electron:dev
```
This command concurrently starts:
- The Next.js development server.
- The cross-platform Flask development server.
- The Electron application, which loads the Next.js dev server URL.

### Production Mode (Local Simulation)
To test the application as it would be packaged (using the Gunicorn server on Linux/macOS):

```bash
npm run electron:prod:local
```

---

## Building for Production / Distribution

To create distributable packages for Linux, macOS, and Windows:

### 1. Build the Next.js Frontend
This step generates the static assets for your application into the `out/` directory.
```bash
npm run build
```
    
### 2. Package with Electron Builder
The following scripts use `electron-builder` to package your application. Artifacts will be placed in the `dist/` directory.

- **For Linux (.deb and .AppImage):**
  ```bash
  npm run electron:build:linux
  ```
- **To create an unpacked version for local testing:**
  ```bash
  npm run electron:pack
  ```
This will create an unpacked application in `dist/<platform>-unpacked/`.

---

## Testing

The project includes an autotest script to verify core backend and frontend functionality.

1. Start the application in development mode:
   ```bash
   npm run electron:dev
   ```
2. Wait for both the frontend and backend to be ready.
3. In a separate terminal, run the tests:
   ```bash
   npm test
   ```
A summary of passed/failed tests will be printed.

---

## Troubleshooting

- **`tree-sitter` compilation errors on `npm install`**: This is almost always due to a missing C/C++ build toolchain. Please follow the instructions in the [Prerequisites](#prerequisites) section for your operating system.
- **`EBADENGINE` or Node Version Errors**: You are running an unsupported version of Node.js. Please use `nvm` or install Node.js v20+.
- **Port Conflicts**: If default ports (3010, 5010) are in use, modify `ports.ini` and ensure your start scripts or manual commands reflect these changes.
- **CSS/JS Not Loading in Packaged App**: This is often due to incorrect asset paths. The current `next.config.js` with `assetPrefix: './'` should handle this for the `file://` protocol.

---

## Project Structure

A brief overview of the main directories:

- **`.codex/`**: Contains setup scripts for the development environment.
- **`components/`**: Reusable React UI components.
- **`electron/`**: Electron main process and related files.
- **`lib/`**: Frontend utility functions and custom React hooks.
- **`out/`**: Static export of the Next.js frontend (generated by `npm run build`).
- **`pages/`**: Next.js page components.
- **`python_backend/`**: Flask backend application.
- **`scripts/`**: Build and utility scripts.
- **`services/`**: Frontend hooks for API communication.
- **`stores/`**: Zustand global state stores.
- **`views/`**: Larger, feature-specific React components.
