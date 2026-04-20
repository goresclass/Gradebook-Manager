import { useState } from "react";
import { LayoutList, BookOpen, Settings } from "lucide-react";

import { SettingsProvider } from "./contexts/SettingsContext";
import { GradebookProvider } from "./contexts/GradebookContext";
import { GradebookTab } from "./components/GradebookTab";
import { StudentDetail } from "./components/StudentDetail";
import { QuickReference } from "./components/QuickReference";
import { SettingsTab } from "./components/SettingsTab";
import { ExportView } from "./components/ExportView";

type Tab = "gradebook" | "reference" | "settings";
type SubView = { type: "student"; id: number } | { type: "export" } | null;

function GradebookApp() {
  const [activeTab, setActiveTab] = useState<Tab>("gradebook");
  const [subView, setSubView] = useState<SubView>(null);

  const openStudent = (id: number) => setSubView({ type: "student", id });
  const openExport = () => setSubView({ type: "export" });
  const closeSubView = () => setSubView(null);

  // Render main content
  const renderContent = () => {
    // Sub-views overlay the tab content
    if (subView) {
      if (subView.type === "student") {
        return <StudentDetail studentId={subView.id} onBack={closeSubView} />;
      }
      if (subView.type === "export") {
        return <ExportView onBack={closeSubView} />;
      }
    }

    switch (activeTab) {
      case "gradebook":
        return <GradebookTab onOpenStudent={openStudent} onOpenExport={openExport} />;
      case "reference":
        return <QuickReference />;
      case "settings":
        return <SettingsTab />;
    }
  };

  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: "gradebook", icon: <LayoutList size={20} />, label: "Gradebook" },
    { id: "reference", icon: <BookOpen size={20} />, label: "Reference" },
    { id: "settings",  icon: <Settings size={20} />,  label: "Settings"  },
  ];

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      {/* Main content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {renderContent()}
      </div>

      {/* Bottom tab bar — hidden during sub-views */}
      {!subView && (
        <div className="bg-[#0c1527] border-t border-white/10 flex-shrink-0">
          <div className="flex">
            {tabs.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors
                    ${active ? "text-primary" : "text-slate-500 hover:text-slate-300"}`}
                >
                  {tab.icon}
                  <span className={`text-xs font-medium ${active ? "text-primary" : ""}`}>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

import React from "react";

function App() {
  return (
    <SettingsProvider>
      <GradebookProvider>
        <GradebookApp />
      </GradebookProvider>
    </SettingsProvider>
  );
}

export default App;
