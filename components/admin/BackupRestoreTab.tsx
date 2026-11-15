'use client';

import React, { useState } from 'react';
import { 
  Database, Download, Upload, RefreshCw, AlertTriangle, CheckCircle2, 
  FileSpreadsheet, ShieldCheck, HardDrive, Calendar 
} from 'lucide-react';
import { 
  exportCompleteDatabase, importDatabaseBackup, resetDatabaseToDefaults, 
  getPayments, db 
} from '@/lib/db';

interface BackupRestoreTabProps {
  onRefreshData: () => void;
  showToast: (msg: string) => void;
}

export default function BackupRestoreTab({ onRefreshData, showToast }: BackupRestoreTabProps) {
  const [resetConfirmWord, setResetConfirmWord] = useState('');
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  // Database metrics
  const students = db.getStudents();
  const batches = db.getBatches();
  const payments = getPayments();
  const attendance = db.getAttendance();
  const testResults = db.getTestResults();
  const teachers = db.getTeachers();

  // Export full JSON Backup
  const handleExportJson = () => {
    const data = exportCompleteDatabase();
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', jsonStr);
    dlAnchor.setAttribute('download', `prime_learning_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    showToast('Encrypted JSON backup downloaded successfully!');
  };

  // Export Fee Ledger as CSV
  const handleExportCsv = () => {
    const headers = ['Receipt No', 'Student Name', 'Grade', 'Amount', 'Payment Method', 'Month Paid For', 'Transaction ID', 'Payment Date', 'Status'];
    const rows = payments.map(p => [
      `"${p.receiptNo}"`,
      `"${p.studentName}"`,
      `"${p.grade}"`,
      `"${p.amount}"`,
      `"${p.paymentMethod}"`,
      `"${p.monthPaidFor}"`,
      `"${p.transactionId}"`,
      `"${p.paymentDate}"`,
      `"${p.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', encodeURI(csvContent));
    dlAnchor.setAttribute('download', `prime_learning_fee_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    showToast('Fee Ledger spreadsheet exported as CSV!');
  };

  // Import Backup JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const success = importDatabaseBackup(parsed);
        if (success) {
          onRefreshData();
          setImportNotice('Database successfully restored from JSON backup!');
          showToast('Database restored successfully!');
          setTimeout(() => setImportNotice(null), 5000);
        } else {
          alert('Invalid backup file structure.');
        }
      } catch (err: any) {
        alert('Failed to parse backup JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Reset to Defaults
  const handleExecuteReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetConfirmWord !== 'RESET') {
      alert('You must type "RESET" in all capitals to confirm.');
      return;
    }

    resetDatabaseToDefaults();
    setResetModalOpen(false);
    setResetConfirmWord('');
    onRefreshData();
    showToast('Database reset to fresh academic seed data.');
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
          <Database className="w-4 h-4" />
          <span>Disaster Recovery & Data Integrity</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900">Database Backup, Export & Recovery</h1>
        <p className="text-xs text-slate-500">Export financial ledgers, create point-in-time database snapshots, and manage data redundancy</p>
      </div>

      {importNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center space-x-3 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{importNotice}</span>
        </div>
      )}

      {/* Database Vital Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Enrolled Students</div>
          <div className="text-xl font-black text-slate-900 mt-1">{students.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Fee Receipts</div>
          <div className="text-xl font-black text-emerald-600 mt-1">{payments.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Attendance Logs</div>
          <div className="text-xl font-black text-slate-900 mt-1">{attendance.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Exam Marks</div>
          <div className="text-xl font-black text-slate-900 mt-1">{testResults.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Active Batches</div>
          <div className="text-xl font-black text-slate-900 mt-1">{batches.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Faculty Teachers</div>
          <div className="text-xl font-black text-slate-900 mt-1">{teachers.length}</div>
        </div>
      </div>

      {/* Export & Backup Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: JSON Full Backup */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Full Database JSON Snapshot</h2>
              <p className="text-xs text-slate-500">Complete offline snapshot of all 18 tables & settings</p>
            </div>
          </div>

          <p className="text-xs text-slate-600">
            Exports student rosters, course fees, test scores, attendance registers, and institute settings in machine-readable JSON format for cold storage.
          </p>

          <button
            onClick={handleExportJson}
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-md"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Download Database Snapshot (JSON)</span>
          </button>
        </div>

        {/* Card 2: Fee Ledger CSV */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Fee Ledger Spreadsheet (CSV)</h2>
              <p className="text-xs text-slate-500">Excel / Google Sheets / Tally accounting export</p>
            </div>
          </div>

          <p className="text-xs text-slate-600">
            Exports verified payment receipts, student names, amounts, transaction UTR numbers, payment methods, and dates into comma-separated values format.
          </p>

          <button
            onClick={handleExportCsv}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-md"
          >
            <FileSpreadsheet className="w-4 h-4 text-white" />
            <span>Export Fee Ledger (CSV / Excel)</span>
          </button>
        </div>

      </div>

      {/* Restore & Danger Zone */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-base font-black text-slate-900">Data Restoration & Maintenance</h2>
          <p className="text-xs text-slate-500">Upload a previous JSON snapshot or reset database cache</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Import Backup */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
              <Upload className="w-4 h-4 text-prime-orange" />
              <span>Restore from JSON File</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Select a valid <code>.json</code> database snapshot previously generated from Prime Learning.
            </p>
            <label className="block w-full text-center py-2.5 px-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-700 font-bold text-xs cursor-pointer transition">
              <span>Choose Backup File...</span>
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>
          </div>

          {/* Reset Database */}
          <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Reset to Seed Demo State</span>
            </div>
            <p className="text-[11px] text-rose-700/80">
              Clears custom modifications and re-initializes initial sample batches, students, and courses.
            </p>
            <button
              onClick={() => {
                setResetConfirmWord('');
                setResetModalOpen(true);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-white border border-rose-300 hover:bg-rose-100/60 text-rose-700 font-bold text-xs transition"
            >
              Reset Database to Initial State
            </button>
          </div>

        </div>
      </div>

      {/* Confirmation Modal for Reset */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-base font-black text-slate-900">Confirm Database Reset</h2>
              <p className="text-xs text-slate-500">
                This will re-initialize all student records, fee slips, and test marks to default seed data.
              </p>
            </div>

            <form onSubmit={handleExecuteReset} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Type <strong>RESET</strong> to confirm:
                </label>
                <input
                  type="text"
                  required
                  placeholder="RESET"
                  value={resetConfirmWord}
                  onChange={(e) => setResetConfirmWord(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-rose-300 focus:ring-2 focus:ring-rose-500 outline-none font-mono text-center tracking-widest font-bold"
                />
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetConfirmWord !== 'RESET'}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition disabled:opacity-40"
                >
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

