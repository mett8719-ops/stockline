import { useId, useRef, useState } from "react";
import { cn } from "@/core/utils/cn.js";

export default function Tabs({
  tabs,
  value,
  defaultValue,
  onChange,
  label = "Onglets",
  className,
}) {
  const generatedId = useId();
  const tabRefs = useRef([]);
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? tabs[0]?.id,
  );
  const selectedValue = value ?? internalValue;
  const selectedTab = tabs.find((tab) => tab.id === selectedValue) ?? tabs[0];

  function selectTab(tab) {
    if (tab.disabled) return;
    if (value === undefined) setInternalValue(tab.id);
    onChange?.(tab.id);
  }

  function handleKeyDown(event, index) {
    let nextIndex;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;

    event.preventDefault();
    let candidateIndex = nextIndex;
    while (tabs[candidateIndex]?.disabled && candidateIndex !== index) {
      candidateIndex =
        event.key === "ArrowLeft"
          ? (candidateIndex - 1 + tabs.length) % tabs.length
          : (candidateIndex + 1) % tabs.length;
    }
    tabRefs.current[candidateIndex]?.focus();
    selectTab(tabs[candidateIndex]);
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        role="tablist"
        aria-label={label}
        className="flex max-w-full gap-1 overflow-x-auto border-b border-slate-200"
      >
        {tabs.map((tab, index) => {
          const isSelected = tab.id === selectedTab?.id;
          const tabId = `${generatedId}-tab-${tab.id}`;

          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`${generatedId}-panel`}
              tabIndex={isSelected ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => selectTab(tab)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600 disabled:cursor-not-allowed disabled:opacity-50",
                isSelected
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-800",
              )}
            >
              {tab.label}
              {tab.badge != null && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div
        id={`${generatedId}-panel`}
        role="tabpanel"
        aria-labelledby={`${generatedId}-tab-${selectedTab?.id}`}
        tabIndex={0}
        className="pt-4 outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
      >
        {selectedTab?.content}
      </div>
    </div>
  );
}
