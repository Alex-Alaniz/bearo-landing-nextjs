// Admin utilities for managing waitlist
// Run in browser console for quick access

import { exportWaitlist, getWaitlistCount } from './waitlist';

// Get all waitlist entries
export function viewWaitlist() {
  const entries = exportWaitlist();
  console.table(entries);
  console.log(`Total entries: ${entries.length}`);
  console.log(`Total count (with base): ${getWaitlistCount()}`);
  return entries;
}

// Export as CSV
export function exportAsCSV() {
  const entries = exportWaitlist();
  
  const csvHeader = 'Email,Timestamp,Date,UserID\n';
  const csvRows = entries.map(entry => {
    const date = new Date(entry.timestamp).toISOString();
    return `${entry.email},${entry.timestamp},"${date}",${entry.userId || ''}`;
  }).join('\n');
  
  const csv = csvHeader + csvRows;
  
  // Create download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bearo-waitlist-${Date.now()}.csv`;
  a.click();
  
  console.log('✅ Waitlist exported as CSV');
  return csv;
}

// Get statistics
export function getStats() {
  const entries = exportWaitlist();
  
  const stats = {
    totalSignups: entries.length,
    totalWithBase: getWaitlistCount(),
    firstSignup: entries.length > 0 ? new Date(entries[0].timestamp) : null,
    lastSignup: entries.length > 0 ? new Date(entries[entries.length - 1].timestamp) : null,
    uniqueEmails: new Set(entries.map(e => e.email)).size,
  };
  
  console.log('📊 Waitlist Statistics:');
  console.table(stats);
  return stats;
}

// Clear waitlist (use with caution!)
export function clearWaitlist(confirm: boolean = false) {
  if (!confirm) {
    console.warn('⚠️  To clear waitlist, call: clearWaitlist(true)');
    return;
  }
  
  localStorage.removeItem('bearo_waitlist');
  console.log('🗑️  Waitlist cleared');
}

// Backup waitlist to JSON
export function backupWaitlist() {
  const entries = exportWaitlist();
  const backup = {
    timestamp: Date.now(),
    date: new Date().toISOString(),
    entries,
    count: entries.length,
  };
  
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bearo-waitlist-backup-${Date.now()}.json`;
  a.click();
  
  console.log('✅ Waitlist backed up as JSON');
  return backup;
}

// Make available in window for console access
if (typeof window !== 'undefined') {
  (window as any).bearoAdmin = {
    viewWaitlist,
    exportAsCSV,
    getStats,
    clearWaitlist,
    backupWaitlist,
  };
  
  console.log('🐻 Bearo Admin tools loaded. Use: window.bearoAdmin');
}

