// views/SettingsModalView.tsx
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/stores/useAppStore";
import { KeyRound, PlusCircle } from "lucide-react";

interface SettingsModalViewProps {
  apiKeyDraft: string;
  setApiKeyDraft: (key: string) => void;
  saveApiKey: () => void; // This function from useHomePageLogic will handle saving and then closing the modal.
}

const SettingsModalView: React.FC<SettingsModalViewProps> = ({
  apiKeyDraft,
  setApiKeyDraft,
  saveApiKey,
}) => {
  const isSettingsModalOpen = useAppStore((s) => s.isSettingsModalOpen);
  const closeSettingsModal = useAppStore((s) => s.closeSettingsModal);

  return (
    <Dialog open={isSettingsModalOpen} onOpenChange={(open) => !open && closeSettingsModal()}>
      <DialogContent className="sm:max-w-md border-[rgba(var(--color-border),0.6)] bg-[rgba(var(--color-bg-tertiary),0.95)] backdrop-blur-xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] glass">
        <DialogHeader className="border-b border-[rgba(var(--color-border),0.6)] pb-3 relative">
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[rgba(var(--color-tertiary),0.3)] to-transparent"></div>
          <DialogTitle className="flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-[rgb(var(--color-accent-2))] to-[rgb(var(--color-primary))]">
            <div className="p-1.5 rounded-md bg-[rgba(var(--color-accent-2),0.1)] border border-[rgba(var(--color-accent-2),0.2)]">
              <KeyRound size={18} className="text-[rgb(var(--color-accent-2))]" />
            </div>
            OpenRouter Settings
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-1 py-4">
          <Label htmlFor="or-key" className="font-medium text-[rgb(var(--color-text-secondary))]">
            API Key
          </Label>
          <div className="relative group">
            <Input
              id="or-key"
              type="password"
              placeholder="sk-..."
              value={apiKeyDraft}
              onChange={(e) => setApiKeyDraft(e.target.value)}
              className="bg-[rgba(var(--color-bg-secondary),0.6)] border-[rgba(var(--color-border),0.7)] focus:border-[rgb(var(--color-primary))] focus:ring-[rgb(var(--color-primary))] focus-within:shadow-glow-primary transition-all pl-3 pr-3 py-2"
            />
            <div className="absolute inset-0 rounded-md border border-[rgba(var(--color-primary),0.2)] opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity shadow-[0_0_8px_rgba(var(--color-primary),0.1)]"></div>
          </div>
          <p className="text-xs text-[rgb(var(--color-text-muted))] italic">
            Your API key is stored locally in your browser and never sent to our server.
          </p>
        </div>
        <DialogFooter className="mt-4 border-t border-[rgba(var(--color-border),0.6)] pt-4 relative">
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[rgba(var(--color-tertiary),0.3)] to-transparent"></div>
          <Button
            variant="outline"
            onClick={closeSettingsModal} // Use store action to close
            className="bg-transparent border-[rgba(var(--color-border),0.7)] text-[rgb(var(--color-text-secondary))] hover:bg-[rgba(var(--color-border),0.15)] hover:text-[rgb(var(--color-text-primary))] transition-all"
          >
            Cancel
          </Button>
          <Button
            onClick={saveApiKey} // Prop from useHomePageLogic handles save & close
            disabled={!apiKeyDraft.trim()}
            className="relative overflow-hidden bg-gradient-to-r from-[rgb(var(--color-accent-2))] to-[rgb(var(--color-primary))] text-[rgb(var(--color-bg-primary))] font-medium shadow-[0_0_15px_rgba(var(--color-primary),0.3)] hover:shadow-[0_0_20px_rgba(var(--color-primary),0.5)] hover:from-[rgb(var(--color-primary))] hover:to-[rgb(var(--color-accent-2))] transition-all active:scale-95"
          >
            <div className="relative z-10 flex items-center">
              <PlusCircle size={16} className="mr-1.5" />
              Save Key
            </div>
            <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-[shimmer_2s_infinite]"></div>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModalView;