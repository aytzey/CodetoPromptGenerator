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
