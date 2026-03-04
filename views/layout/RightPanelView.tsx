import React from "react";
import { BarChart2, FileCode, MessageSquare, Sparkles, Terminal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import InstructionsInputView from "@/views/InstructionsInputView";
import CopyButtonView from "@/views/CopyButtonView";

interface RightPanelViewProps {
  hasContent: boolean;
  selectedFileCount: number;
  totalTokens: number;
}

const clampPercent = (value: number, maxBase: number) =>
  Math.min(100, Math.max(0, Math.round((value / maxBase) * 100)));

const StatBar: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  percent: number;
}> = ({ label, value, icon, percent }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between text-sm">
      <span className="inline-flex items-center gap-2 text-[rgb(var(--color-text-secondary))]">
        {icon}
        {label}
      </span>
      <span className="font-mono text-[rgb(var(--color-text-primary))]">{value}</span>
    </div>
    <div className="h-2 overflow-hidden rounded bg-[rgba(var(--color-border),0.3)]">
      <div
        className="h-full rounded bg-[rgb(var(--color-primary))] transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  </div>
);

const RightPanelView: React.FC<RightPanelViewProps> = ({
  hasContent,
  selectedFileCount,
  totalTokens,
}) => {
  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare size={18} className="text-[rgb(var(--color-tertiary))]" />
            1-2. Prompt Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InstructionsInputView />
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles size={18} className="text-[rgb(var(--color-accent-4))]" />
            3. Generate Prompt
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasContent ? (
            <CopyButtonView />
          ) : (
            <div className="rounded border border-dashed border-[rgba(var(--color-border),0.5)] bg-[rgba(var(--color-bg-secondary),0.25)] p-6 text-center text-sm text-[rgb(var(--color-text-muted))]">
              Add instructions or select files to enable prompt generation.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart2 size={18} className="text-[rgb(var(--color-accent-2))]" />
            Prompt Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <StatBar
            label="Files Selected"
            value={String(selectedFileCount)}
            icon={<FileCode size={14} className="text-[rgb(var(--color-primary))]" />}
            percent={clampPercent(selectedFileCount, 25)}
          />
          <StatBar
            label="Total Tokens"
            value={totalTokens.toLocaleString()}
            icon={<Terminal size={14} className="text-[rgb(var(--color-secondary))]" />}
            percent={clampPercent(totalTokens, 12000)}
          />
        </CardContent>
        <CardFooter className="border-t border-[rgba(var(--color-border),0.25)] py-2 text-xs text-[rgb(var(--color-text-muted))]">
          Token values are backend-estimated for prompt sizing guidance.
        </CardFooter>
      </Card>
    </div>
  );
};

export default RightPanelView;
