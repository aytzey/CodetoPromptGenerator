// File: views/layout/RightPanelView.tsx
// NEW FILE
import React from "react";
import { BookOpen, Flame, BarChart2, Coffee } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import InstructionsInputView from "@/views/InstructionsInputView";
import CopyButtonView from "@/views/CopyButtonView";

interface RightPanelViewProps {
  hasContent: boolean;
  selectedFileCount: number;
  totalTokens: number;
}

const RightPanelView: React.FC<RightPanelViewProps> = ({
  hasContent,
  selectedFileCount,
  totalTokens,
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BookOpen size={16} className="text-purple-500" />
            Prompt Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <InstructionsInputView />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Flame size={16} className="text-orange-500" />
            Generate & Copy
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {hasContent ? (
            <CopyButtonView />
          ) : (
            <div className="flex flex-col items-center py-6 text-gray-500">
              <Coffee size={24} className="mb-2" />
              Select files or add instructions first.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart2 size={16} className="text-blue-500" />
            Prompt Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center justify-between p-2 border rounded">
            <span>Files</span>
            <span className="font-medium">{selectedFileCount}</span>
          </div>
          <div className="flex items-center justify-between p-2 border rounded">
            <span>Tokens</span>
            <span className="font-medium">{totalTokens.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RightPanelView;