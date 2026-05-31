"use client";

import { memo, useCallback } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "reactflow";
import { Plus, Trash2, Pencil } from "lucide-react";

export interface ResponseOption {
  id: string;
  label: string;
}

export interface ResponseNodeData {
  body: string;
  options: ResponseOption[];
  variable: string;
  onUpdate?: (id: string, data: Partial<ResponseNodeData>) => void;
}

function ResponseNodeInner({ id, data }: NodeProps<ResponseNodeData>) {
  const { setNodes } = useReactFlow();

  const update = useCallback(
    (patch: Partial<ResponseNodeData>) => {
      setNodes((nodes) =>
        nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
      );
    },
    [id, setNodes],
  );

  function addOption() {
    const newOption: ResponseOption = {
      id: Math.random().toString(36).slice(2, 7),
      label: `Option ${data.options.length + 1}`,
    };
    update({ options: [...data.options, newOption] });
  }

  function removeOption(optId: string) {
    update({ options: data.options.filter((o) => o.id !== optId) });
  }

  function updateOptionLabel(optId: string, label: string) {
    update({ options: data.options.map((o) => (o.id === optId ? { ...o, label } : o)) });
  }

  return (
    <div className="w-[280px] rounded-xl border border-border bg-card shadow-lg overflow-visible">
      {/* Target handle (left) */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        style={{ background: "#22c55e", width: 12, height: 12, border: "2px solid hsl(var(--card))" }}
      />

      {/* Header */}
      <div className="flex items-center justify-between rounded-t-xl bg-[#22c55e] px-3 py-2">
        <span className="text-xs font-bold text-white tracking-wide">Response Message</span>
        <Pencil className="h-3 w-3 text-white/80 cursor-pointer" />
      </div>

      {/* Body text */}
      <div className="px-3 pt-3 pb-1">
        <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground tracking-wide">Add body text</p>
        <textarea
          className="w-full resize-none rounded-md border border-border bg-muted p-2 text-xs text-foreground focus:border-[#22c55e] focus:outline-none focus:ring-1 focus:ring-[#22c55e]"
          rows={3}
          value={data.body}
          placeholder="Type your message…"
          onChange={(e) => update({ body: e.target.value })}
        />
      </div>

      {/* Options */}
      <div className="px-3 pb-1">
        <p className="mb-1.5 text-[10px] font-semibold uppercase text-muted-foreground tracking-wide">Configure Input options</p>
        <div className="space-y-1">
          {data.options.map((opt, idx) => (
            <div key={opt.id} className="relative flex items-center gap-1.5">
              {/* Option number + input */}
              <span className="shrink-0 text-xs font-medium text-muted-foreground w-4">{idx + 1}.</span>
              <input
                className="flex-1 rounded-md border border-border bg-muted px-2 py-1 text-xs text-foreground focus:border-[#22c55e] focus:outline-none focus:ring-1 focus:ring-[#22c55e]"
                value={opt.label}
                onChange={(e) => updateOptionLabel(opt.id, e.target.value)}
              />
              <button
                className="shrink-0 text-muted-foreground/50 hover:text-red-400 transition-colors"
                onClick={() => removeOption(opt.id)}
              >
                <Trash2 className="h-3 w-3" />
              </button>

              {/* Per-option source handle */}
              <Handle
                type="source"
                position={Position.Right}
                id={`opt-${opt.id}`}
                style={{
                  background: "#22c55e",
                  width: 12,
                  height: 12,
                  border: "2px solid hsl(var(--card))",
                  top: "auto",
                  right: -20,
                  position: "absolute",
                  transform: "none",
                }}
              />
            </div>
          ))}
        </div>

        <button
          onClick={addOption}
          className="mt-2 flex items-center gap-1 text-xs text-[#22c55e] font-medium hover:underline"
        >
          <Plus className="h-3 w-3" /> Add option
        </button>
      </div>

      {/* Variable */}
      <div className="border-t border-border px-3 py-2">
        <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground tracking-wide">Save reply in a variable</p>
        <input
          className="w-full rounded-md border border-border bg-muted px-2 py-1 text-xs text-muted-foreground focus:border-[#22c55e] focus:outline-none focus:ring-1 focus:ring-[#22c55e]"
          placeholder="Enter value"
          value={data.variable}
          onChange={(e) => update({ variable: e.target.value })}
        />
      </div>
    </div>
  );
}

export const ResponseNode = memo(ResponseNodeInner);
