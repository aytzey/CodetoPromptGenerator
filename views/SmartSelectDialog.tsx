import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type AnswerMap = Record<number, string>;

interface Props {
  questions: string[];
  onDone(ans: AnswerMap | null): void;
}

export const SmartSelectDialog: React.FC<Props> = ({ questions, onDone }) => {
  const [answers, setAnswers] = useState<AnswerMap>({});

  return (
    <Dialog open onOpenChange={() => onDone(null)}>
      <DialogContent className="smart-select-dialog">
        <DialogHeader>
          <DialogTitle>Help Smart-Select</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[70vh] overflow-auto">
          {questions.map((q, i) => (
            <div key={i} className="space-y-2">
              <p className="font-medium">{q}</p>
              <textarea
                className="w-full border rounded p-2 text-sm resize-vertical"
                rows={3}
                value={answers[i] ?? ""}
                onChange={e => setAnswers({ ...answers, [i]: e.target.value })}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button size="sm" variant="ghost" onClick={() => onDone(null)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => onDone(answers)}
            disabled={questions.some((_, i) => !answers[i]?.trim())}
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* --- helper to open programmatically --- */
export function openSmartSelectDialog(questions: string[]): Promise<Record<string, string> | null> {
  return new Promise(resolve => {
    const div = document.createElement("div");
    document.body.appendChild(div);

    const handleDone = (ans: Record<number, string> | null) => {
      React.unmountComponentAtNode(div);
      div.remove();
      resolve(
        ans
          ? Object.fromEntries(Object.entries(ans).map(([k, v]) => [`q${k}`, v.trim()]))
          : null,
      );
    };

    React.render(<SmartSelectDialog questions={questions} onDone={handleDone} />, div);
  });
}
