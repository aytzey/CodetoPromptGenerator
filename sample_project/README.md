# Code to Prompt Generator Tool by Aytzey

Code to Prompt Generator Tool is an environment for composing, refining, and generating prompts offline against your locally managed files. By selecting a folder, choosing specific files or directories, and drafting meta and main instructions, you can craft comprehensive prompts intended for large language model interactions. The tool integrates a project tree view, customizable meta prompt directories, and easy copy-to-clipboard functionality, making it straightforward to build highly contextual and complex instructions for your chosen LLM.

## Key Features

- **Project Tree Navigation:** Easily browse and select files or directories from a chosen folder. The tool recursively generates a structured tree of your project’s files.
- **File Selection Management:** Pick which files or folders should be included as context in your prompt. Selected files are tracked and their token counts are displayed, giving you insight into prompt size.
- **Meta Prompt Directory Configuration:** Dynamically set and remember a directory for storing meta prompt files. Load existing prompts or create new ones directly through the UI.
- **Prompt Composition:** Combine a meta prompt and main instructions. Leverage saved templates, refresh the prompt list as you modify the directory, and load prompts on demand.
- **Copy to Clipboard:** Once your prompt is ready, copy the entire assembled prompt, including project tree and selected file contents, directly to your clipboard.

## Technologies Used

- **Next.js & React:** The application is built using Next.js and React, enabling a responsive and dynamic UI.
- **TypeScript:** Strong typing for better maintainability and fewer runtime errors.
- **Tailwind CSS:** For styling and consistent UI across all components.
- **Local Storage:** Persists user preferences, such as the last chosen meta prompts directory, between sessions.
- **Node.js & File System API:** Server-side file system operations are handled via Node.js, ensuring offline usability.

## Installation & Setup

To install and run this tool locally, follow the steps below:

### Prerequisites

- **Node.js & npm:** Make sure you have Node.js (v14 or higher recommended) and npm installed.
- **Git (optional):** If you are cloning from a repository, ensure Git is installed.

### Steps

1. **Clone or Download the Repository:**
   ```bash
   git clone https://github.com/aytzey/code_to_prompt_generator.git
   ```
   If you don't have Git, you can download a ZIP of the repository and extract it.

2. **Navigate into the Project Directory:**
   ```bash
   cd my-offline-llm-tool
   ```

3. **Install Dependencies:**
   ```bash
   npm install
   ```
   This will install all required dependencies including Next.js, React, and other necessary packages.

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   After running this command, the application will start on `http://localhost:3000`. Open this URL in your web browser to access the UI.

### Production Build (Optional)

To create a production-ready build:

1. **Build the Application:**
   ```bash
   npm run build
   ```
2. **Start the Production Server:**
   ```bash
   npm start
   ```
   The application will now be running in production mode, typically at `http://localhost:3000`.

## Usage Instructions

1. **Select a Folder:** In the UI, click the "Browse" button under the "Project Tree" panel and choose the folder containing your project files. All supported files will be listed in a hierarchical tree.
   
2. **Filter and Select Files:** Expand directories and select or deselect files or entire folders you want to include. This helps narrow down the context for your prompt.

3. **Set the Meta Prompts Directory:** In the "Settings" section, specify the path (relative or absolute) to a directory containing your meta prompt files. This directory is remembered automatically.
   
4. **Load or Create a Meta Prompt:**
   - **Loading:** Select a meta prompt from the dropdown and click "Load" to load it into the editing area.
   - **Creating New Files:** Type a new filename (e.g., `NewPrompt.txt`) and click "Save Current Prompt" to create or overwrite a meta prompt file.

5. **Write Your Main Instructions:** Compose the main instructions that complement your meta prompt in the provided text area.

6. **Review Selected Files:** Check the "Selected Files" section to see which files are included and the total token count. Make any necessary adjustments.

7. **Copy to Clipboard:** Once ready, click "Copy All to Clipboard" to copy the entire prompt, including:
   - Meta Prompt
   - Main Instructions
   - Project Tree (with excluded directories filtered out)
   - Selected File Contents

   You can then paste this prompt into your LLM interface or any other tool that accepts large text inputs.

## Troubleshooting & Tips

- **Directory Not Found:** Ensure that the directory path specified under "Settings" for your meta prompts is correct and that it exists.
- **Refresh Lists:** Use the "Refresh" buttons if you add new files or meta prompts outside of the tool. This ensures the UI is always up-to-date.
- **Token Counts:** The tool provides a rough word-based count of tokens. For more accurate token measurements specific to a particular model, additional integration would be needed.

## Contributing

If you’d like to contribute:

1. Fork the repository and create a new branch for your changes.
2. Make your improvements or additions and test them thoroughly.
3. Submit a pull request with a clear description of your modifications.

## License

This project is provided under the MIT License. See the `license` file for more details.

