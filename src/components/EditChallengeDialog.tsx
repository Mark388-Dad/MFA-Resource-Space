import React, { useState, useEffect } from "react";
import { Challenge, useChallenges, ChallengeCategoryItem } from "@/contexts/ChallengeContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Check, Sparkles, FolderUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditChallengeDialogProps {
  challenge: Challenge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const EditChallengeDialog: React.FC<EditChallengeDialogProps> = ({
  challenge,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { updateChallenge, deleteChallenge } = useChallenges();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    challenge_type: "individual",
    status: "open" as "open" | "locked" | "closed",
    target_books: 15,
    points_per_book: 3,
    points_reward: 100,
    min_reflection_chars: 50,
    max_books_per_category: 4,
    start_date: "",
    end_date: "",
    badge_name: "Reading Champion",
    badge_icon: "🏆",
    logo_url: "/school-badge.png",
    accent_color: "var(--v-emerald)",
    submission_type: "book" as "book" | "poem" | "essay" | "art" | "audio" | "custom",
    submission_guidelines: "",
    features: ["require_enrolment", "file_upload", "ai_coach", "auto_certificate"] as string[],
    certificate_signatory_name: "David O. Oloo",
    certificate_signatory_title: "Director of Teaching & Learning",
    certificate_release_policy: "on_close_only" as "on_close_only" | "immediate",
  });

  const [categories, setCategories] = useState<ChallengeCategoryItem[]>([]);

  useEffect(() => {
    if (!challenge) return;
    setForm({
      title: challenge.title || "",
      description: challenge.description || "",
      challenge_type: challenge.challenge_type || "individual",
      status: challenge.status || (challenge.is_active ? "open" : "closed"),
      target_books: challenge.target_books || 15,
      points_per_book: challenge.points_per_book || 3,
      points_reward: challenge.points_reward || 100,
      min_reflection_chars: challenge.min_reflection_chars || 50,
      max_books_per_category: challenge.max_books_per_category || 4,
      start_date: challenge.start_date || new Date().toISOString().slice(0, 10),
      end_date: challenge.end_date || new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
      badge_name: challenge.badge_name || "Scholar",
      badge_icon: challenge.badge_icon || "🏆",
      logo_url: challenge.logo_url || "/school-badge.png",
      accent_color: challenge.accent_color || "var(--v-emerald)",
      submission_type: (challenge.submission_type as any) || "book",
      submission_guidelines: challenge.submission_guidelines || "",
      features: challenge.features || ["require_enrolment", "file_upload", "ai_coach", "auto_certificate"],
      certificate_signatory_name: challenge.certificate_signatory_name || "David O. Oloo",
      certificate_signatory_title: challenge.certificate_signatory_title || "Director of Teaching & Learning",
      certificate_release_policy: challenge.certificate_release_policy || "on_close_only",
    });

    setCategories(
      challenge.categories && challenge.categories.length > 0
        ? challenge.categories.map((c, i) => ({
            id: c.id ?? i + 1,
            name: c.name || `Category ${i + 1}`,
            realm: c.realm || "",
            prompt: c.prompt || "",
            max_books: c.max_books || challenge.max_books_per_category || 4,
          }))
        : [
            {
              id: 1,
              name: "General Reading",
              realm: "Discovery Realm",
              prompt: "Reflect on core character motivations and thematic insights.",
              max_books: 4,
            },
          ]
    );
  }, [challenge]);

  const addCategory = () => {
    const nextId = categories.length ? Math.max(...categories.map((c) => c.id)) + 1 : 1;
    setCategories((prev) => [
      ...prev,
      {
        id: nextId,
        name: `Category ${nextId}`,
        realm: `Realm ${nextId}`,
        prompt: "Reflect on 3 significant takeaways and character insights.",
        max_books: form.max_books_per_category || 4,
      },
    ]);
  };

  const removeCategory = (id: number) => {
    if (categories.length <= 1) {
      toast.error("A challenge must have at least 1 category");
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCategory = (id: number, key: keyof ChallengeCategoryItem, val: any) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [key]: val } : c))
    );
  };

  const toggleFeature = (featId: string) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.includes(featId)
        ? prev.features.filter((f) => f !== featId)
        : [...prev.features, featId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) return;
    if (!form.title.trim()) {
      toast.error("Challenge title is required");
      return;
    }
    if (categories.length === 0) {
      toast.error("At least one category is required");
      return;
    }

    setSaving(true);
    try {
      await updateChallenge(challenge.id, {
        title: form.title.trim(),
        description: form.description.trim(),
        challenge_type: form.challenge_type,
        status: form.status,
        is_active: form.status === "open",
        target_books: form.target_books,
        points_per_book: form.points_per_book,
        points_reward: form.points_reward,
        min_reflection_chars: form.min_reflection_chars,
        max_books_per_category: form.max_books_per_category,
        start_date: form.start_date,
        end_date: form.end_date,
        badge_name: form.badge_name.trim(),
        badge_icon: form.badge_icon.trim(),
        logo_url: form.logo_url || undefined,
        submission_type: form.submission_type,
        submission_guidelines: form.submission_guidelines.trim(),
        features: form.features,
        categories: categories,
        certificate_signatory_name: form.certificate_signatory_name,
        certificate_signatory_title: form.certificate_signatory_title,
        certificate_release_policy: form.certificate_release_policy,
      });

      toast.success(`"${form.title}" updated successfully! Changes are live across the academy.`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Could not update challenge");
    } finally {
      setSaving(false);
    }
  };

  if (!challenge) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader className="pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Pencil className="w-5 h-5 text-primary" />
            Edit Challenge Workspace: {challenge.title}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Modify any aspect of this reading challenge. Updates apply instantly across student dashboards and leaderboards.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* SECTION 1: Identity & Status */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> 1. Challenge Identity & Status
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">Challenge Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Active Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v: any) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">🟢 Open (Active entries)</SelectItem>
                    <SelectItem value="locked">🔒 Locked (Temporarily paused)</SelectItem>
                    <SelectItem value="closed">🏆 Closed (Certificates sealed)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-3 space-y-1.5">
                <Label className="text-xs font-semibold">Description & Theme Narrative</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Scope</Label>
                <Select
                  value={form.challenge_type}
                  onValueChange={(v) => setForm({ ...form, challenge_type: v })}
                >
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual Scholar</SelectItem>
                    <SelectItem value="house">Inter-House Championship</SelectItem>
                    <SelectItem value="class">Classroom Reading Sprint</SelectItem>
                    <SelectItem value="year_group">Year Group Quest</SelectItem>
                    <SelectItem value="specialty">Specialty Marathon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Badge Icon</Label>
                <Input
                  value={form.badge_icon}
                  onChange={(e) => setForm({ ...form, badge_icon: e.target.value })}
                  className="text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Badge Award Title</Label>
                <Input
                  value={form.badge_name}
                  onChange={(e) => setForm({ ...form, badge_name: e.target.value })}
                  className="text-xs"
                />
              </div>

              {/* Challenge Logo / Emblem Upload */}
              <div className="space-y-1.5 sm:col-span-3 p-3.5 rounded-2xl bg-muted/40 border border-border">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Challenge Logo / Crest Image
                  </Label>
                  {form.logo_url && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, logo_url: "" })}
                      className="text-[11px] text-destructive hover:underline font-semibold"
                    >
                      Clear Logo
                    </button>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                  {form.logo_url ? (
                    <div className="w-13 h-13 rounded-2xl border-2 border-primary/40 p-1 bg-background flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                      <img
                        src={form.logo_url}
                        alt="Challenge Logo"
                        className="w-full h-full object-contain"
                        onError={() => toast.error("Could not load logo preview")}
                      />
                    </div>
                  ) : (
                    <div className="w-13 h-13 rounded-2xl border border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0 text-muted-foreground bg-muted/20 text-xs">
                      No logo
                    </div>
                  )}
                  <div className="flex-1 w-full space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Input
                        value={form.logo_url}
                        onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                        placeholder="e.g. /school-badge.png or image URL"
                        className="text-xs font-mono"
                      />
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                        <FolderUp className="w-3.5 h-3.5" />
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 3 * 1024 * 1024) {
                              toast.error("Logo file size must be under 3MB");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const res = event.target?.result as string;
                              if (res) {
                                setForm({ ...form, logo_url: res });
                                toast.success("Challenge logo uploaded!");
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>Presets:</span>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, logo_url: "/school-badge.png" })}
                        className="text-primary hover:underline font-semibold"
                      >
                        Academy Crest
                      </button>
                      <span>&bull;</span>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, logo_url: "/assets/school-logo.png" })}
                        className="text-primary hover:underline font-semibold"
                      >
                        Gold Seal
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Submission Format & Features */}
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="text-xs font-bold text-primary uppercase tracking-wider">
              2. Submission Format & Workspace Capabilities
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Accepted Submission Format</Label>
                <Select
                  value={form.submission_type}
                  onValueChange={(v: any) => setForm({ ...form, submission_type: v })}
                >
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="book">📚 Books & Reading Reflections</SelectItem>
                    <SelectItem value="poem">✍️ Poetry, Verses & Stanzas</SelectItem>
                    <SelectItem value="essay">📝 Critical Essays & Analytical Articles</SelectItem>
                    <SelectItem value="art">🎨 Creative Artwork & Visuals</SelectItem>
                    <SelectItem value="audio">🎙️ Spoken Audio Reviews & Podcasts</SelectItem>
                    <SelectItem value="custom">🌟 Multimedia & Custom Submissions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">Submission Guidelines / Criteria</Label>
                <Input
                  value={form.submission_guidelines}
                  onChange={(e) => setForm({ ...form, submission_guidelines: e.target.value })}
                  placeholder="e.g. Include at least 3 stanzas for poetry, or citation of 2 sources."
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold">Feature Toggles</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {[
                  { id: "require_enrolment", label: "Require Registration", desc: "Only registered scholars can submit" },
                  { id: "file_upload", label: "File & PDF Upload", desc: "Allow attaching poems or essays" },
                  { id: "ai_coach", label: "AI Reflection Coach", desc: "Interactive writing feedback" },
                  { id: "tutor_signoff", label: "Tutor Sign-Off", desc: "Teacher approval required" },
                  { id: "auto_certificate", label: "Auto Certificates", desc: "Generate cert on goal completion" },
                ].map((feat) => {
                  const checked = form.features.includes(feat.id);
                  return (
                    <button
                      key={feat.id}
                      type="button"
                      onClick={() => toggleFeature(feat.id)}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all flex items-start gap-2",
                        checked
                          ? "bg-primary/10 border-primary/40 text-foreground"
                          : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      <div
                        className={cn(
                          "w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-colors",
                          checked ? "bg-primary border-primary text-white" : "border-muted-foreground/40 bg-background"
                        )}
                      >
                        {checked && <Check className="w-3 h-3 text-primary-foreground stroke-[3]" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-foreground">{feat.label}</div>
                        <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{feat.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 3: Targets & Points */}
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="text-xs font-bold text-primary uppercase tracking-wider">
              3. Targets, Points & Timeline
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Target Goal (Entries)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.target_books}
                  onChange={(e) => setForm({ ...form, target_books: +e.target.value })}
                  className="text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Points Per Entry</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.points_per_book}
                  onChange={(e) => setForm({ ...form, points_per_book: +e.target.value })}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Completion Bonus Pts</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.points_reward}
                  onChange={(e) => setForm({ ...form, points_reward: +e.target.value })}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Max per Category</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.max_books_per_category}
                  onChange={(e) => setForm({ ...form, max_books_per_category: +e.target.value })}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Start Date</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">End Date</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold">Min Reflection Chars</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.min_reflection_chars}
                  onChange={(e) => setForm({ ...form, min_reflection_chars: +e.target.value })}
                  className="text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Categories & Prompts */}
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-primary uppercase tracking-wider">
                4. Categories & Reflection Prompts ({categories.length})
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addCategory} className="text-xs h-7 gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Category
              </Button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {categories.map((cat, idx) => (
                <div key={cat.id} className="p-3 rounded-2xl border border-border bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </span>
                      <Input
                        value={cat.name}
                        onChange={(e) => updateCategory(cat.id, "name", e.target.value)}
                        placeholder="Category Title"
                        className="text-xs font-bold h-7"
                      />
                      <Input
                        value={cat.realm || ""}
                        onChange={(e) => updateCategory(cat.id, "realm", e.target.value)}
                        placeholder="Realm Tag"
                        className="text-xs h-7 sm:w-40 shrink-0"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                        <span>Max:</span>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={cat.max_books || form.max_books_per_category}
                          onChange={(e) => updateCategory(cat.id, "max_books", +e.target.value)}
                          className="w-12 h-7 text-xs font-mono text-center"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                        onClick={() => removeCategory(cat.id)}
                        title="Remove category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Textarea
                      value={cat.prompt}
                      onChange={(e) => updateCategory(cat.id, "prompt", e.target.value)}
                      rows={2}
                      className="text-xs font-normal"
                      placeholder="Enter reflection prompt for this category..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 5: Certificate Details */}
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="text-xs font-bold text-primary uppercase tracking-wider">
              5. Certificate & Signatory Details
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Signatory Name</Label>
                <Input
                  value={form.certificate_signatory_name}
                  onChange={(e) => setForm({ ...form, certificate_signatory_name: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Signatory Title</Label>
                <Input
                  value={form.certificate_signatory_title}
                  onChange={(e) => setForm({ ...form, certificate_signatory_title: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Release Policy</Label>
                <Select
                  value={form.certificate_release_policy}
                  onValueChange={(v: any) => setForm({ ...form, certificate_release_policy: v })}
                >
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_close_only">🔒 Sealed until Challenge Ends</SelectItem>
                    <SelectItem value="immediate">⚡ Immediate on Goal Attainment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-border flex items-center justify-between gap-3">
            <div>
              {challenge?.id && challenge.id !== "all" && (
                confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={deleting}
                      onClick={async () => {
                        setDeleting(true);
                        const ok = await deleteChallenge(challenge.id);
                        setDeleting(false);
                        if (ok) {
                          onOpenChange(false);
                          onSuccess?.();
                        }
                      }}
                      className="text-xs font-semibold gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {deleting ? "Deleting…" : "Confirm Delete"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmDelete(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmDelete(true)}
                    className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Challenge
                  </Button>
                )
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="text-xs font-semibold text-white px-5 shadow-sm"
                style={{ background: "linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))" }}
              >
                {saving ? "Saving Changes…" : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditChallengeDialog;
