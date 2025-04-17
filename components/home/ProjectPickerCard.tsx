// File: components/home/ProjectPickerCard.tsx
// -----------------------------------------------------------------------------
// Encapsulates the project‑folder picker logic. Purely presentational; the page
// passes zustand selectors + handlers as props to adhere to SRP.
// -----------------------------------------------------------------------------

import React from "react";
import { Folder } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FolderPickerView from "@/views/FolderPickerView";

interface ProjectPickerCardProps {
  projectPath: string | null;
  setProjectPath: (path: string | null) => void;
  isLoading: boolean;
}

/** Project folder selection widget */
export default function ProjectPickerCard({
  projectPath,
  setProjectPath,
  isLoading,
}: ProjectPickerCardProps) {
  return (
    <Card className="mb-6">
      <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 py-3 px-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Folder size={16} className="text-indigo-500" />
          Project Selection
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <FolderPickerView
          currentPath={projectPath}
          onPathSelected={setProjectPath}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
}
