      
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

1.  **Node.js & npm**:
    *   Install Node.js v20 or higher from [https://nodejs.org](https://nodejs.org). npm is included.
2.  **Python 3.9+**:
    *   Install from [https://www.python.org](https://www.python.org). Ensure `pip` is available.

---

## Installation & Setup

### 1. Obtain the Project
Clone the repository:
```bash
git clone https://github.com/aytzey/CodetoPromptGenerator.git
cd CodetoPromptGenerator
```
    
### 2. Install Node.js Dependencies

This will also trigger a post-install script to set up the Python backend environment.

```bash      
npm install
```
Note: The postinstall script attempts to:

  - Locate a Python 3 interpreter.

  - Create a virtual environment (venv) in python_backend/venv.

  - Install Python dependencies from python_backend/requirements.txt.

If this fails, you can manually set up the Python environment:

```bash      
    cd python_backend
    python -m venv venv
    # On Windows:
    # venv\Scripts\activate
    # On macOS/Linux:
    # source venv/bin/activate
    pip install -r requirements.txt
    cd ..
  ```

### 3. Configure Ports (Optional)

By default, the Next.js dev server runs on port 3010 and the Flask backend on port 5010. You can customize this by editing the ports.ini file in the project root.

### 4. Development Mode
To run the application in development mode with hot-reloading for both frontend and Electron:

```bash    
npm run electron:dev
```
    

This command concurrently starts:
- The Next.js development server.

- The Python Flask backend server.

- The Electron application, which loads the Next.js dev server URL.

Fast reload for the Electron window can be enabled by setting USE_ELECTRON_RELOAD=1 in your environment before running the command.

## Usage

### Start the Application:
  - For development: npm run electron:dev
  - For a local production-like experience: npm run electron:prod:local

      Or run a packaged build (see "Building for Production / Distribution").

  - Choose Your Folder: Use the folder picker to select the root directory of your project.
  - Manage Exclusions (Optional): In "Options," configure global or project-specific exclusions.
  - Select Files: In the "Files" tab, browse the project tree and select files/folders.
  - Write Instructions: In the right panel, compose your meta prompt and main instructions. 
  - Meta prompts can be saved and loaded. 
  - The "Smart-Select" and "Actor Wizard" buttons leverage an LLM (requires OpenRouter API Key set in Settings) to assist with file selection and actor definition based on your project and instructions.
  - Manage Tasks & Actors: Use the "Tasks" and "Actors" tabs for project management features.
  - Generate & Copy Prompt: Click "Copy to Clipboard" to assemble the final prompt.

## Building for Production / Distribution

To create distributable packages for Linux, macOS, and Windows:

### 1. Prepare Application Icons (Recommended)

Create a build directory in the project root. Place your application icons inside:

    build/icon.icns (for macOS, typically 512x512 or 1024x1024)

    build/icon.ico (for Windows, multi-resolution)

    build/icon.png (for Linux, e.g., 256x256 or 512x512)

If these are not provided, default Electron icons will be used.

### 2. Build the Next.js Frontend

This step generates the static assets for your application into the out/ directory.

```    
npm run build
```
    
### 3. Package with Electron Builder

The following scripts use electron-builder to package your application. Artifacts will be placed in the dist/ directory.

For Linux (.deb and .AppImage):

          
    npm run electron:build:linux

        

For macOS (.dmg and .zip) (Requires building on a macOS machine):

      
    npm run electron:build:mac



For Windows (.exe installer and portable .exe) (Ideally build on a Windows machine):

      
    npm run electron:build:win


To attempt building for all configured platforms (best effort, platform limitations apply):

      
    npm run electron:build


To create an unpacked version for local testing (useful for debugging packaged app behavior):

      
    npm run electron:pack

This will create an unpacked application in dist/\<platform>-unpacked/.

### 4. Code Signing (Important for Distribution)

For a smoother user experience and to avoid security warnings, especially on macOS and Windows, you should code-sign your application. This typically involves:

    macOS: An Apple Developer ID certificate.

    Windows: An Authenticode code signing certificate.
    Refer to the electron-builder documentation for details on configuring code signing.

## Testing

The project includes an autotest script to verify core backend and frontend functionality.

Ensure ports.ini exists and is configured for your development ports (defaults are frontend: 3010, backend: 5010).

Start the application in development mode:

          
    npm run electron:dev

      
Wait for both the frontend and backend to be ready.

In a separate terminal, run the tests:

      
    npm test

    
A summary of passed/failed tests will be printed.

## Troubleshooting

  Python Not Found / postinstall Issues: If the automatic Python setup fails, follow the manual setup steps in the "Installation & Setup" section.

  Port Conflicts: If default ports (3010, 5010) are in use, modify ports.ini and ensure your start scripts or manual commands reflect these changes.

  Build Failures:

  - Ensure you are on the correct OS for building specific targets (e.g., macOS for .dmg).

  - Check electron-builder logs for specific error messages.

  - Ensure all dependencies (npm install) are correctly installed.

  - CSS/JS Not Loading in Packaged App: This is often due to incorrect asset paths. The current next.config.js with assetPrefix: './' should handle this for file:// protocol.

## Project Structure

A brief overview of the main directories:

    build/: Contains platform-specific build resources like application icons.

    components/: Reusable React UI components.

    docs/: Project documentation.

    electron/: Electron main process and related files.

    lib/: Frontend utility functions and custom React hooks.

    out/: Static export of the Next.js frontend (generated by npm run build).

    pages/: Next.js page components.

    python_backend/: Flask backend application.

        controllers/: API endpoint definitions.

        services/: Business logic.

        venv/: Python virtual environment (auto-created).

    scripts/: Build and utility scripts.

    services/: Frontend hooks for API communication.

    stores/: Zustand global state stores.

    styles/: Global CSS and Tailwind configuration.

    views/: Larger, feature-specific React components.

Enjoy using the Code to Prompt Generator Tool!