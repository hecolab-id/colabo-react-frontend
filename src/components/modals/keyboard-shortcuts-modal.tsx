"use client";

import { Command } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // Task Detail Modal
  { keys: ["Esc"], description: "Close task detail modal", category: "Task Detail" },
  
  // Kanban Board (Planned)
  { keys: ["↑", "↓"], description: "Navigate tasks in column", category: "Kanban Board (Coming Soon)" },
  { keys: ["←", "→"], description: "Switch between columns", category: "Kanban Board (Coming Soon)" },
  { keys: ["Enter"], description: "Open selected task", category: "Kanban Board (Coming Soon)" },
  { keys: ["N"], description: "Create new task in focused column", category: "Kanban Board (Coming Soon)" },
  
  // Global
  { keys: ["?"], description: "Show keyboard shortcuts", category: "Global" },
];

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <ModalShell
      title="Keyboard Shortcuts"
      description="Quick actions available across your workspace."
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
      bodyClassName="max-h-[90vh] overflow-y-auto"
      mobileSheet={false}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <Command className="h-5 w-5 text-primary" aria-hidden="true" />
          Press <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-xs font-semibold text-foreground">?</kbd> anytime to open this dialog
        </div>

        <div className="space-y-6">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <kbd
                          key={keyIdx}
                          className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded shadow-sm min-w-[28px] text-center"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}
