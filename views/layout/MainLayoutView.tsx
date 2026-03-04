import React from "react";
import LeftPanelView from "./LeftPanelView";
import RightPanelView from "./RightPanelView";
import type { FileNode } from "@/types";
import type { FileTreeViewHandle } from "@/views/FileTreeView";

interface MainLayoutViewProps {
  activeTab: "files" | "options" | "tasks";
  setActiveTab: (tab: "files" | "options" | "tasks") => void;
  projectPath: string;
  isLoadingTree: boolean;
  fileSearchTerm: string;
  setFileSearchTerm: (term: string) => void;
  handleRefresh: () => void;
  handleSelectAll: () => void;
  deselectAllFiles: () => void;
  treeRef: React.RefObject<FileTreeViewHandle | null>;
  selectedFilePaths: string[];
  setSelectedFilePaths: (paths: string[]) => void;
  fileTree: FileNode[];
  rawFileTree: FileNode[];

  hasContent: boolean;
  selectedFileCount: number;
  totalTokens: number;
}

const MainLayoutView: React.FC<MainLayoutViewProps> = (props) => {
  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
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
            selectedFilePaths={props.selectedFilePaths}
            setSelectedFilePaths={props.setSelectedFilePaths}
            selectedFileCount={props.selectedFileCount}
            fileTree={props.fileTree}
            rawFileTree={props.rawFileTree}
          />
        </div>
        <div>
          <RightPanelView
            hasContent={props.hasContent}
            selectedFileCount={props.selectedFileCount}
            totalTokens={props.totalTokens}
          />
        </div>
      </div>
    </div>
  );
};

export default MainLayoutView;
