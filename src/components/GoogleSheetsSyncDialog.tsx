import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  RefreshCw,
  Download,
  Link as LinkIcon,
  CheckCircle2,
  Table,
  Layers,
  Building,
  Users,
  ExternalLink,
  Copy,
} from "lucide-react";
import {
  getGoogleSheetsWebhookUrl,
  setGoogleSheetsWebhookUrl,
  downloadGoogleSheetsMasterCSV,
  fetchFullSchoolSheetsData,
  copyChallengeDataToClipboardForSheet,
} from "@/lib/googleSheetsService";
import { HOUSE_COLORS } from "@/lib/constants";

interface GoogleSheetsSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoogleSheetsSyncDialog({ open, onOpenChange }: GoogleSheetsSyncDialogProps) {
  const [webhookUrl, setWebhookUrl] = useState(() => getGoogleSheetsWebhookUrl());
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (open) {
      loadStats();
    }
  }, [open]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await fetchFullSchoolSheetsData();
      setStats(data);
    } catch (e) {
      console.warn("Could not load sheets stats:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWebhook = () => {
    setGoogleSheetsWebhookUrl(webhookUrl);
    toast.success("Google Sheets connection configured! New submissions will automatically sync.");
  };

  const handleExportCSV = async () => {
    try {
      const filename = await downloadGoogleSheetsMasterCSV();
      toast.success(`Exported ${filename}! Import directly into Google Sheets (File > Import).`);
    } catch (e: any) {
      toast.error(e.message || "Failed to export");
    }
  };

  const handleCopyClipboard = async () => {
    try {
      const res = await copyChallengeDataToClipboardForSheet("all", "All Academy Submissions");
      toast.success(`Copied ${res.count} records to clipboard! In your Google Sheet, click cell A1 and press Ctrl+V.`);
    } catch (e: any) {
      toast.error(e.message || "Failed to copy records");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                Google Sheets Live Sync &amp; Dashboard
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  Real-Time Sync
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Synchronize all student submissions, book titles, reflections, houses, classes, and year groups directly to Google Sheets.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Quick Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="rounded-2xl border-border bg-muted/30">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold font-display text-foreground">
                  {stats?.totalSchoolBooks || 0}
                </div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">
                  Total Submissions
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border bg-muted/30">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400">
                  {Object.keys(stats?.classStats || {}).length}
                </div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">
                  Classes Active
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border bg-muted/30">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold font-display text-blue-600 dark:text-blue-400">
                  4
                </div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">
                  Houses Synced
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border bg-muted/30">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold font-display text-amber-500">
                  {Object.keys(stats?.yearStats || {}).length}
                </div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">
                  Year Groups
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Master Google Sheet Export */}
          <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Master Google Sheet Download
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Includes full submissions (student name, email, class, house, year group, book title, author, reflection, points) plus live summary tables for houses, classes, and year groups.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Button
                  onClick={handleCopyClipboard}
                  variant="outline"
                  className="font-bold text-xs gap-1.5 shadow-sm text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                >
                  <Copy className="w-4 h-4" /> Copy Rows (Paste A1)
                </Button>
                <Button
                  onClick={handleExportCSV}
                  className="text-white border-0 font-bold text-xs gap-1.5 shadow-sm"
                  style={{ background: "linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))" }}
                >
                  <Download className="w-4 h-4" /> Export for Google Sheets
                </Button>
              </div>
            </div>
          </div>

          {/* Webhook Configuration for Automatic Push */}
          <div className="space-y-2 p-4 rounded-2xl border border-border bg-card">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5" /> Optional: Live Google Apps Script Webhook URL
            </div>
            <p className="text-xs text-muted-foreground">
              Paste your Google Apps Script web app URL to automatically push every submission in real-time as students read.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="https://script.google.com/macros/s/.../exec"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="text-xs font-mono"
              />
              <Button size="sm" onClick={handleSaveWebhook} className="shrink-0 text-xs font-semibold">
                Save &amp; Connect
              </Button>
            </div>
          </div>

          {/* Live Breakdown Preview */}
          {stats && (
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Live Data Preview (Synced to Sheet):
              </div>

              {/* Houses */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(stats.houseStats || {}).map(([house, hData]: [string, any]) => {
                  const info = (HOUSE_COLORS as any)[house];
                  return (
                    <div
                      key={house}
                      className="p-3 rounded-xl border flex flex-col justify-between"
                      style={{ borderColor: `${info?.hex || "#ccc"}40`, background: `${info?.hex || "#ccc"}10` }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: info?.hex || "#ccc" }} />
                        <span className="font-bold text-xs truncate text-foreground">{house}</span>
                      </div>
                      <div className="mt-2 text-lg font-bold font-display" style={{ color: info?.hex || "#333" }}>
                        {hData.books} books
                      </div>
                      <div className="text-[10px] text-muted-foreground">{hData.readers.size} readers</div>
                    </div>
                  );
                })}
              </div>

              {/* Year Groups */}
              <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-1.5">
                <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" /> Year Groups Breakdown:
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(stats.yearStats || {}).map(([yg, yData]: [string, any]) => (
                    <Badge key={yg} variant="secondary" className="gap-1 py-1 px-2.5 text-xs">
                      <span className="font-semibold">{yg}:</span>
                      <span>{yData.books} books ({yData.readers.size} students)</span>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
