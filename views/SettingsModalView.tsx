// views/SettingsModalView.tsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { KeyRound } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose(): void;
}

/**
 * Modal for entering / updating the OpenRouter API‑key.
 * Follows SOLID:
 *   • SRP – only handles key input.
 *   • OCP – extensible (extra settings) without modifying callers.
 */
const SettingsModalView: React.FC<Props> = ({ isOpen, onClose }) => {
  const { openrouterApiKey, setOpenrouterApiKey } = useSettingsStore();
  const [tempKey, setTempKey] = useState(openrouterApiKey);

  useEffect(() => setTempKey(openrouterApiKey), [openrouterApiKey]);

  const handleSave = () => {
    setOpenrouterApiKey(tempKey.trim());
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound size={18} className="text-indigo-500" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <label className="text-sm font-medium">OpenRouter API Key</label>
          <Input
            type="password"
            value={tempKey}
            onChange={(e) => setTempKey(e.target.value)}
            placeholder="sk‑..."
          />
          <p className="text-xs text-gray-500">
            The key is stored **locally in your browser** and sent only to your
            own backend.
          </p>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!tempKey.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModalView;
