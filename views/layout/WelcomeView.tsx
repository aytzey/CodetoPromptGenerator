// File: views/layout/WelcomeView.tsx
// NEW FILE
import React from "react";
import { Rocket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface WelcomeViewProps {
  onDismiss: () => void;
}

const WelcomeView: React.FC<WelcomeViewProps> = ({ onDismiss }) => {
  return (
    <Card className="mt-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-100 dark:border-indigo-900/40 shadow-lg overflow-hidden">
      <CardContent className="p-6 md:p-8 flex flex-col items-center text-center">
        <Rocket size={48} className="text-indigo-500 mb-4" />
        <h2 className="text-2xl font-bold text-indigo-800 dark:text-indigo-300 mb-2">
          Code to Prompt Generator
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-xl text-sm">
          Select a project folder above to scan files, add instructions,
          and generate structured LLM prompts.
        </p>
        <Button variant="outline" className="mt-6" onClick={onDismiss}>
          Dismiss
        </Button>
      </CardContent>
    </Card>
  );
};

export default WelcomeView;