// File: views/layout/MainLayoutView.tsx
// NEW FILE
import React from "react";
import LeftPanelView from "./LeftPanelView";
import RightPanelView from "./RightPanelView";
import type { FileNode } from "@/types";
import type { FileTreeViewHandle } from "@/views/FileTreeView";

interface MainLayoutViewProps {
  // Props needed for Left Panel
  activeTab: "files" | "options" | "tasks";
  setActiveTab: (tab: "files" | "options" | "tasks") => void;
  projectPath: string;
  isLoadingTree: boolean;
  fileSearchTerm: string;
  setFileSearchTerm: (term: string) => void;
  handleRefresh: () => void;
  handleSelectAll: () => void;
  deselectAllFiles: () => void;
  treeRef: React.RefObject<FileTreeViewHandle>;
  filteredTree: FileNode[];
  selectedFilePaths: string[];
  setSelectedFilePaths: (paths: string[]) => void;
  fileTree: FileNode[]; // Needed for SelectionGroupsView

  // Props needed for Right Panel
  hasContent: boolean;
  selectedFileCount: number;
  totalTokens: number;
}

const MainLayoutView: React.FC<MainLayoutViewProps> = (props) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <LeftPanelView
        activeTab={props.activeTab}
        setActiveTab={props.setActiveTab}
        projectPath={props.projectPath}
        isLoadingTree={props.isLoadingTree}
        fileSearchTerm={props.fileSearchTerm}
        setFileSearchTerm={props.setFileSearchTerm}
        handleRefresh={props.handleRefresh}
        handleSelectAll={props.handleSelectAll}
        deselectAllFiles={props.deselectAllFiles}
        treeRef={props.treeRef}
        filteredTree={props.filteredTree}
        selectedFilePaths={props.selectedFilePaths}
        setSelectedFilePaths={props.setSelectedFilePaths}
        selectedFileCount={props.selectedFileCount}
        fileTree={props.fileTree}
      />
      <RightPanelView
        hasContent={props.hasContent}
        selectedFileCount={props.selectedFileCount}
        totalTokens={props.totalTokens}
      />
    </div>
  );
};

export default MainLayoutView;