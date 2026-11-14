import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sun, Moon, Palette, Check, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { mode, toggleMode, accent, setAccent, themes, addTheme } = useTheme();

  // "Add a theme; submit it" dialog state
  const [showAddThemeDialog, setShowAddThemeDialog] = useState(false);
  const [newThemeName, setNewThemeName] = useState("");
  const [newThemeColor, setNewThemeColor] = useState("#0d8a4a");
  const [newThemeDesc, setNewThemeDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThemeName.trim()) {
      toast.error("Please enter a theme name");
      return;
    }
    setIsSubmitting(true);
    try {
      await addTheme({
        label: newThemeName.trim(),
        hex: newThemeColor,
        description: newThemeDesc.trim() || undefined,
      });
      toast.success(`Theme "${newThemeName}" submitted and applied!`);
      setNewThemeName("");
      setNewThemeDesc("");
      setShowAddThemeDialog(false);
    } catch {
      toast.error("Could not save theme");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size={compact ? "icon" : "sm"}
        onClick={toggleMode}
        className="rounded-full shadow-sm hover:border-primary/50 transition-colors"
        aria-label="Toggle theme"
      >
        {mode === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        {!compact && <span className="ml-2 text-xs font-semibold">{mode === "dark" ? "Light" : "Dark"}</span>}
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size={compact ? "icon" : "sm"}
            className="rounded-full gap-2 shadow-sm hover:border-primary/50 transition-colors"
            aria-label="Change accent color"
          >
            <span
              className="w-4 h-4 rounded-full border border-border shadow-sm ring-1 ring-white/20"
              style={{ background: accent }}
            />
            {!compact && <span className="text-xs font-semibold">Themes</span>}
            <Palette className="w-3.5 h-3.5 opacity-70" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4 space-y-4 shadow-xl rounded-2xl border-border" align="end">
          <div className="flex items-center justify-between border-b pb-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-primary" /> School Themes
            </Label>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs font-bold gap-1 text-primary hover:bg-primary/10"
              onClick={() => setShowAddThemeDialog(true)}
            >
              <Plus className="w-3.5 h-3.5" /> Add Theme
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {themes.map((p) => {
              const isActive = accent.toLowerCase() === p.hex.toLowerCase();
              return (
                <button
                  key={p.id || p.hex}
                  onClick={() => setAccent(p.hex)}
                  title={`${p.label}${p.description ? ` · ${p.description}` : ""}`}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl border border-transparent hover:border-border hover:bg-muted/40 transition-all text-center group"
                >
                  <div
                    className="relative w-8 h-8 rounded-full border-2 transition-transform group-hover:scale-110 shadow-sm"
                    style={{
                      background: p.hex,
                      borderColor: isActive ? "hsl(var(--foreground))" : "transparent",
                    }}
                  >
                    {isActive && (
                      <Check className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow-md" />
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-foreground truncate max-w-full">
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="border-t pt-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
              Custom Hex Color
            </Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="h-9 w-12 rounded-lg border border-border cursor-pointer bg-transparent"
              />
              <Input
                value={accent}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) setAccent(v);
                }}
                placeholder="#0d8a4a"
                className="font-mono text-xs uppercase"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* "Add a theme; submit it" Dialog */}
      {showAddThemeDialog && (
        <Dialog open={showAddThemeDialog} onOpenChange={setShowAddThemeDialog}>
          <DialogContent className="max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Sparkles className="w-5 h-5 text-primary" /> Add & Submit School Theme
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateTheme} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Theme Name</Label>
                <Input
                  placeholder="e.g. Kenya Savannah Sunset, Cyber Indigo..."
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Primary Theme Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newThemeColor}
                    onChange={(e) => setNewThemeColor(e.target.value)}
                    className="h-10 w-16 rounded-xl border border-border cursor-pointer"
                  />
                  <Input
                    value={newThemeColor}
                    onChange={(e) => setNewThemeColor(e.target.value)}
                    className="font-mono text-xs uppercase"
                    required
                  />
                  <div
                    className="w-10 h-10 rounded-xl border border-border shrink-0 shadow-inner"
                    style={{ background: newThemeColor }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Description (Optional)</Label>
                <Input
                  placeholder="e.g. Commemorative theme for Term 2 reading challenge"
                  value={newThemeDesc}
                  onChange={(e) => setNewThemeDesc(e.target.value)}
                />
              </div>

              {/* Live Preview Card */}
              <div className="p-3 rounded-xl border border-border bg-card space-y-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Theme Preview</p>
                <div className="flex items-center gap-2">
                  <div
                    className="px-3 py-1.5 rounded-lg text-white font-bold text-xs shadow-sm"
                    style={{ background: newThemeColor }}
                  >
                    Active Button
                  </div>
                  <div
                    className="px-3 py-1.5 rounded-lg border font-bold text-xs"
                    style={{ borderColor: newThemeColor, color: newThemeColor }}
                  >
                    Outlined Tag
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAddThemeDialog(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !newThemeName.trim()}
                  className="font-bold text-white border-0"
                  style={{ background: newThemeColor }}
                >
                  {isSubmitting ? "Submitting..." : "Submit & Apply Theme"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
