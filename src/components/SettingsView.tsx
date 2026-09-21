import React, { useRef } from 'react';
import { Sparkles, Trash2, Download, Upload, AlertTriangle, ShieldCheck, Database, RefreshCw } from 'lucide-react';
import { AppData } from '../types';

interface SettingsViewProps {
  data: AppData;
  onLoadDemoData: () => void;
  onClearDemoData: () => void;
  onClearAllData: () => void;
  onImportData: (data: AppData) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  data,
  onLoadDemoData,
  onClearDemoData,
  onClearAllData,
  onImportData,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute(
      'download',
      `pharmacy_inventory_${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          onImportData({
            medicines: Array.isArray(parsed.medicines) ? parsed.medicines : [],
            batches: Array.isArray(parsed.batches) ? parsed.batches : [],
            suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : [],
            dispensingRecords: Array.isArray(parsed.dispensingRecords)
              ? parsed.dispensingRecords
              : [],
            isDemoData: Boolean(parsed.isDemoData),
          });
        }
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          System Settings & Data Controls
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage system state, optional demonstration datasets, and inventory backups.
        </p>
      </div>

      {/* Demo Data Management Card */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Optional Demonstration Data
                </h3>
                {data.isDemoData && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                    Demo Data Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                The pharmacy database defaults to 100% empty for real pharmacist operations. You may optionally populate sample medicines, FEFO batches, and suppliers to inspect workflow functionality.
              </p>
            </div>
          </div>
        </div>

        {data.isDemoData ? (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-300 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Demo data is currently loaded in this session.
              </span>
            </div>
            <button
              id="clear-demo-data-btn"
              onClick={onClearDemoData}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
            >
              Clear Demo Data
            </button>
          </div>
        ) : (
          <div className="pt-2 flex items-center gap-3">
            <button
              id="load-demo-data-btn"
              onClick={onLoadDemoData}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Load Demo Data
            </button>
            <span className="text-xs text-slate-400">
              Populates 3 sample medicines with critical & normal FEFO batches for testing.
            </span>
          </div>
        )}
      </div>

      {/* Backup & Restore */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Data Backup & Portability
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Export your medicine catalog, suppliers, and batch history to local JSON, or restore from a previous backup.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleExportJSON}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            Export Database (JSON)
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-2"
          >
            <Upload className="w-3.5 h-3.5" />
            Import Database (JSON)
          </button>
        </div>
      </div>

      {/* Danger Zone: Clear All */}
      <div className="p-6 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-rose-950 dark:text-rose-200">
              Reset Entire Inventory
            </h3>
            <p className="text-xs text-rose-700/80 dark:text-rose-400 mt-0.5">
              Permanently wipes all medicines, batches, suppliers, and dispensing history back to clean empty state.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <button
            id="reset-all-data-btn"
            onClick={() => {
              if (
                confirm(
                  'Are you sure you want to completely erase all pharmacy records? This cannot be undone.'
                )
              ) {
                onClearAllData();
              }
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
};
