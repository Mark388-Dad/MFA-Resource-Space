import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Palette,
  Layout,
  Plus,
  Trash2,
  Check,
  Save,
  RotateCcw,
  Sparkles,
  Eye,
  UserPlus,
  Layers,
  Sliders,
  Settings2,
  Lock,
  ArrowRight,
  ShieldCheck,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AuthPageConfig,
  CustomAuthField,
  DEFAULT_AUTH_CONFIG,
  getAuthPageConfig,
  saveAuthPageConfig,
} from "@/lib/authPageConfig";

const COLOR_PRESETS = [
  { name: "MFA Navy", value: "#00205B", preview: "bg-[#00205B]" },
  { name: "Emerald Green", value: "#059669", preview: "bg-emerald-600" },
  { name: "Electric Indigo", value: "#4f46e5", preview: "bg-indigo-600" },
  { name: "Royal Violet", value: "#7c3aed", preview: "bg-purple-600" },
  { name: "Sunset Crimson", value: "#e11d48", preview: "bg-rose-600" },
];

const GRADIENT_PRESETS = [
  {
    name: "Kenya Green to Orange",
    value: "linear-gradient(135deg, hsl(var(--v-green)), hsl(var(--v-orange)))",
  },
  {
    name: "Electric Blue to Mint",
    value: "linear-gradient(135deg, hsl(var(--v-electric-blue)), hsl(var(--v-mint)))",
  },
  {
    name: "Luminous Violet to Rose",
    value: "linear-gradient(135deg, hsl(var(--v-violet)), hsl(var(--v-fuchsia)))",
  },
  {
    name: "Classic Academy Navy",
    value: "linear-gradient(135deg, #00205B, #0A2540)",
  },
];

export const AuthPageCustomizer: React.FC = () => {
  const [config, setConfig] = useState<AuthPageConfig>(getAuthPageConfig());
  const [saving, setSaving] = useState(false);
  const [newClassInput, setNewClassInput] = useState("");
  const [newYearGroupInput, setNewYearGroupInput] = useState("");
  const [previewTab, setPreviewTab] = useState<"signin" | "signup">("signup");

  // New custom field form state
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState("");
  const [newFieldType, setNewFieldType] = useState<"text" | "select" | "number">("text");
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldScope, setNewFieldScope] = useState<"all" | "student" | "staff">("student");

  // Quick Add User State
  const [addUserForm, setAddUserForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "student",
    yearGroup: "DP1",
    className: "Swara",
    house: "Kenya",
  });
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    setConfig(getAuthPageConfig());
    const handler = (e: any) => {
      if (e.detail) setConfig(e.detail);
    };
    window.addEventListener("mfa-auth-config-updated", handler);
    return () => window.removeEventListener("mfa-auth-config-updated", handler);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveAuthPageConfig(config);
    setSaving(false);
    if (ok) {
      toast.success("Login & Registration configuration saved! Changes are live on the sign-in portal.");
    } else {
      toast.error("Could not save configuration.");
    }
  };

  const handleReset = () => {
    if (!confirm("Reset login & registration settings back to standard academy defaults?")) return;
    setConfig(DEFAULT_AUTH_CONFIG);
    saveAuthPageConfig(DEFAULT_AUTH_CONFIG);
    toast.info("Settings reset to academy defaults.");
  };

  // Add class option
  const addClassOption = () => {
    const val = newClassInput.trim();
    if (!val) return;
    if (config.classesList.includes(val)) {
      return toast.warning(`Class "${val}" already exists.`);
    }
    const updated = [...config.classesList, val];
    setConfig({ ...config, classesList: updated });
    setNewClassInput("");
    toast.success(`Class "${val}" added!`);
  };

  // Remove class option
  const removeClassOption = (cls: string) => {
    if (config.classesList.length <= 1) {
      return toast.error("At least one class option must remain.");
    }
    const updated = config.classesList.filter((c) => c !== cls);
    setConfig({ ...config, classesList: updated });
  };

  // Add Year Group
  const addYearGroupOption = () => {
    const val = newYearGroupInput.trim().toUpperCase();
    if (!val) return;
    if (config.yearGroupsList.includes(val)) {
      return toast.warning(`Year group "${val}" already exists.`);
    }
    const updated = [...config.yearGroupsList, val];
    setConfig({ ...config, yearGroupsList: updated });
    setNewYearGroupInput("");
    toast.success(`Year group "${val}" added!`);
  };

  // Remove Year Group
  const removeYearGroupOption = (yg: string) => {
    if (config.yearGroupsList.length <= 1) {
      return toast.error("At least one year group must remain.");
    }
    const updated = config.yearGroupsList.filter((y) => y !== yg);
    setConfig({ ...config, yearGroupsList: updated });
  };

  // Add Custom Field
  const handleAddCustomField = () => {
    if (!newFieldLabel.trim()) return toast.error("Field label is required");
    const id = newFieldLabel.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 32);
    const options = newFieldType === "select"
      ? newFieldOptions.split(",").map((o) => o.trim()).filter(Boolean)
      : undefined;

    const newField: CustomAuthField = {
      id: `${id}_${Date.now().toString().slice(-4)}`,
      label: newFieldLabel.trim(),
      placeholder: newFieldPlaceholder.trim() || `Enter ${newFieldLabel.trim()}`,
      type: newFieldType,
      options,
      required: newFieldRequired,
      enabled: true,
      roleScope: newFieldScope,
    };

    setConfig({
      ...config,
      customFields: [...config.customFields, newField],
    });

    setNewFieldLabel("");
    setNewFieldPlaceholder("");
    setNewFieldOptions("");
    setNewFieldRequired(false);
    toast.success(`Field "${newField.label}" added to registration form.`);
  };

  const removeCustomField = (id: string) => {
    setConfig({
      ...config,
      customFields: config.customFields.filter((f) => f.id !== id),
    });
  };

  const toggleFieldRequired = (id: string) => {
    setConfig({
      ...config,
      customFields: config.customFields.map((f) => (f.id === id ? { ...f, required: !f.required } : f)),
    });
  };

  const toggleFieldEnabled = (id: string) => {
    setConfig({
      ...config,
      customFields: config.customFields.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)),
    });
  };

  // Quick Manual Add User Handler
  const handleQuickAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserForm.email || !addUserForm.fullName || !addUserForm.password) {
      return toast.error("Name, email, and password are required");
    }
    setAddingUser(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({
        email: addUserForm.email.trim(),
        password: addUserForm.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: addUserForm.fullName.trim(),
            role: addUserForm.role,
            year_group: addUserForm.role === "student" ? addUserForm.yearGroup : null,
            class_name: addUserForm.role === "student" ? addUserForm.className : null,
            house: addUserForm.role === "student" ? addUserForm.house : null,
          },
        },
      });

      if (error) throw error;
      toast.success(`User "${addUserForm.fullName}" registered successfully!`);
      setAddUserForm({
        fullName: "",
        email: "",
        password: "",
        role: "student",
        yearGroup: config.yearGroupsList[0] || "DP1",
        className: config.classesList[0] || "Swara",
        house: "Kenya",
      });
    } catch (err: any) {
      toast.error(`Could not add user: ${err.message}`);
    } finally {
      setAddingUser(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <Card className="rounded-3xl border-border bg-card shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-primary" />
                <h3 className="font-display text-xl font-bold text-foreground">
                  Login &amp; Registration Portal Builder
                </h3>
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  Live Sync
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Customize dropdown options (classes, cohorts, houses), required fields, portal branding, and visual themes. Changes reflect directly on the sign-in and registration pages.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-xs h-9 gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="text-xs h-9 gap-1.5 font-semibold text-white shadow-md"
                style={{ background: "linear-gradient(120deg, hsl(var(--v-green)), hsl(var(--v-cyan)))" }}
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Publishing..." : "Save & Publish Changes"}
              </Button>
            </div>
          </div>

          {/* Builder Navigation Tabs */}
          <Tabs defaultValue="dropdowns" className="mt-6 space-y-6">
            <TabsList className="bg-muted/60 p-1 rounded-2xl flex-wrap h-auto">
              <TabsTrigger value="dropdowns" className="text-xs gap-1.5 rounded-xl">
                <Layers className="w-3.5 h-3.5" /> Classes &amp; Cohort Dropdowns
              </TabsTrigger>
              <TabsTrigger value="fields" className="text-xs gap-1.5 rounded-xl">
                <Settings2 className="w-3.5 h-3.5" /> Custom Registration Fields
              </TabsTrigger>
              <TabsTrigger value="branding" className="text-xs gap-1.5 rounded-xl">
                <Palette className="w-3.5 h-3.5" /> Branding &amp; Colors
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs gap-1.5 rounded-xl">
                <Eye className="w-3.5 h-3.5" /> Live Portal Preview
              </TabsTrigger>
              <TabsTrigger value="addUser" className="text-xs gap-1.5 rounded-xl">
                <UserPlus className="w-3.5 h-3.5" /> Manually Add User
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: DROPDOWN OPTIONS MANAGEMENT */}
            <TabsContent value="dropdowns" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Classes Dropdown Options */}
                <Card className="rounded-2xl border-border bg-card/60">
                  <CardHeader className="py-4 px-5 border-b border-border">
                    <CardTitle className="text-sm font-bold flex items-center justify-between">
                      <span>Class Dropdown Options ({config.classesList.length})</span>
                      <Badge variant="outline" className="text-[10px]">Registration Dropdown</Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Classes available for students to select during account registration.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex flex-wrap gap-2 min-h-[60px] p-3 rounded-xl bg-muted/40 border border-border">
                      {config.classesList.map((cls) => (
                        <Badge
                          key={cls}
                          variant="secondary"
                          className="text-xs py-1 px-2.5 gap-1.5 bg-background border border-border shadow-2xs font-semibold"
                        >
                          <span>{cls}</span>
                          <button
                            type="button"
                            onClick={() => removeClassOption(cls)}
                            className="hover:text-destructive transition-colors ml-1"
                            title={`Remove ${cls}`}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Add new class (e.g. DP1 North, G10 Alpha)"
                        value={newClassInput}
                        onChange={(e) => setNewClassInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addClassOption()}
                        className="text-xs h-9"
                      />
                      <Button size="sm" onClick={addClassOption} className="text-xs h-9 gap-1 shrink-0">
                        <Plus className="w-3.5 h-3.5" /> Add Class
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Year Groups Dropdown Options */}
                <Card className="rounded-2xl border-border bg-card/60">
                  <CardHeader className="py-4 px-5 border-b border-border">
                    <CardTitle className="text-sm font-bold flex items-center justify-between">
                      <span>Year Groups / Cohorts ({config.yearGroupsList.length})</span>
                      <Badge variant="outline" className="text-[10px]">Academic Levels</Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Academic cohorts offered at the academy.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex flex-wrap gap-2 min-h-[60px] p-3 rounded-xl bg-muted/40 border border-border">
                      {config.yearGroupsList.map((yg) => (
                        <Badge
                          key={yg}
                          variant="secondary"
                          className="text-xs py-1 px-2.5 gap-1.5 bg-background border border-border shadow-2xs font-semibold"
                        >
                          <span>{yg}</span>
                          <button
                            type="button"
                            onClick={() => removeYearGroupOption(yg)}
                            className="hover:text-destructive transition-colors ml-1"
                            title={`Remove ${yg}`}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Add year group (e.g. DP3, MYP5)"
                        value={newYearGroupInput}
                        onChange={(e) => setNewYearGroupInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addYearGroupOption()}
                        className="text-xs h-9 uppercase"
                      />
                      <Button size="sm" onClick={addYearGroupOption} className="text-xs h-9 gap-1 shrink-0">
                        <Plus className="w-3.5 h-3.5" /> Add Cohort
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 2: CUSTOM REGISTRATION FIELDS */}
            <TabsContent value="fields" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form to Add New Field */}
                <Card className="rounded-2xl border-border bg-card">
                  <CardHeader className="py-4 px-5 border-b border-border">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Plus className="w-4 h-4 text-primary" /> Add New Registration Field
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4 text-xs">
                    <div className="space-y-1.5">
                      <Label>Field Label</Label>
                      <Input
                        placeholder="e.g. Admission Number, Parent Email"
                        value={newFieldLabel}
                        onChange={(e) => setNewFieldLabel(e.target.value)}
                        className="text-xs h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Placeholder Text</Label>
                      <Input
                        placeholder="e.g. Enter student admission number"
                        value={newFieldPlaceholder}
                        onChange={(e) => setNewFieldPlaceholder(e.target.value)}
                        className="text-xs h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Field Type</Label>
                      <Select value={newFieldType} onValueChange={(v: any) => setNewFieldType(v)}>
                        <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text Input</SelectItem>
                          <SelectItem value="number">Numeric Input</SelectItem>
                          <SelectItem value="select">Dropdown Menu</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {newFieldType === "select" && (
                      <div className="space-y-1.5">
                        <Label>Dropdown Options (comma-separated)</Label>
                        <Input
                          placeholder="Option 1, Option 2, Option 3"
                          value={newFieldOptions}
                          onChange={(e) => setNewFieldOptions(e.target.value)}
                          className="text-xs h-9"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label>Role Applicability</Label>
                      <Select value={newFieldScope} onValueChange={(v: any) => setNewFieldScope(v)}>
                        <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Students Only</SelectItem>
                          <SelectItem value="staff">Staff Only</SelectItem>
                          <SelectItem value="all">Everyone</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Label className="cursor-pointer">Mark as Required?</Label>
                      <Switch checked={newFieldRequired} onCheckedChange={setNewFieldRequired} />
                    </div>

                    <Button onClick={handleAddCustomField} className="w-full text-xs h-9 mt-2 gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Add Field to Form
                    </Button>
                  </CardContent>
                </Card>

                {/* Active Fields List */}
                <Card className="lg:col-span-2 rounded-2xl border-border bg-card">
                  <CardHeader className="py-4 px-5 border-b border-border">
                    <CardTitle className="text-sm font-bold flex items-center justify-between">
                      <span>Configured Registration Fields</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        Toggle requirement or enable/disable
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3">
                    {/* Fixed standard fields info */}
                    <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-foreground">Full Name, Email &amp; Password</div>
                        <div className="text-[11px] text-muted-foreground">Standard core authentication credentials</div>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                        Always Required
                      </Badge>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-foreground">Cohort, Class &amp; House</div>
                        <div className="text-[11px] text-muted-foreground">Governed by the dropdown options configured in Tab 1</div>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                        Required for Students
                      </Badge>
                    </div>

                    {/* Custom fields list */}
                    {config.customFields.map((field) => (
                      <div
                        key={field.id}
                        className="p-3 rounded-xl border border-border bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <span>{field.label}</span>
                            <Badge variant="outline" className="text-[10px] uppercase font-mono">
                              {field.type}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {field.roleScope}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Placeholder: "{field.placeholder}"
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-muted-foreground">Required</span>
                            <Switch
                              checked={field.required}
                              onCheckedChange={() => toggleFieldRequired(field.id)}
                            />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-muted-foreground">Active</span>
                            <Switch
                              checked={field.enabled}
                              onCheckedChange={() => toggleFieldEnabled(field.id)}
                            />
                          </div>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeCustomField(field.id)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            title="Delete field"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 3: BRANDING & THEME COLORS */}
            <TabsContent value="branding" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="rounded-2xl border-border bg-card">
                  <CardHeader className="py-4 px-5 border-b border-border">
                    <CardTitle className="text-sm font-bold">Portal Headings &amp; Messaging</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4 text-xs">
                    <div className="space-y-1.5">
                      <Label>Portal Title</Label>
                      <Input
                        value={config.portalTitle}
                        onChange={(e) => setConfig({ ...config, portalTitle: e.target.value })}
                        className="text-xs h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Tagline</Label>
                      <Input
                        value={config.tagline}
                        onChange={(e) => setConfig({ ...config, tagline: e.target.value })}
                        className="text-xs h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Welcome Heading</Label>
                      <Input
                        value={config.welcomeHeading}
                        onChange={(e) => setConfig({ ...config, welcomeHeading: e.target.value })}
                        className="text-xs h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Welcome Description</Label>
                      <Input
                        value={config.welcomeDescription}
                        onChange={(e) => setConfig({ ...config, welcomeDescription: e.target.value })}
                        className="text-xs h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Login Announcement Notice (Optional)</Label>
                      <Input
                        placeholder="e.g. Challenge registration is now officially open!"
                        value={config.loginNotice}
                        onChange={(e) => setConfig({ ...config, loginNotice: e.target.value })}
                        className="text-xs h-9"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-border bg-card">
                  <CardHeader className="py-4 px-5 border-b border-border">
                    <CardTitle className="text-sm font-bold">Visual Themes &amp; Accent Gradients</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4 text-xs">
                    <div className="space-y-2">
                      <Label>Primary Brand Color</Label>
                      <div className="flex flex-wrap gap-2">
                        {COLOR_PRESETS.map((color) => (
                          <button
                            key={color.name}
                            type="button"
                            onClick={() => setConfig({ ...config, themeColor: color.value })}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all ${
                              config.themeColor === color.value
                                ? "border-primary ring-2 ring-primary/30"
                                : "border-border hover:bg-muted"
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-full ${color.preview}`} />
                            <span>{color.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-border">
                      <Label>Sign-In Card Accent Gradient</Label>
                      <div className="space-y-2">
                        {GRADIENT_PRESETS.map((g) => (
                          <button
                            key={g.name}
                            type="button"
                            onClick={() => setConfig({ ...config, gradientPreset: g.value })}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all ${
                              config.gradientPreset === g.value
                                ? "border-primary ring-2 ring-primary/30"
                                : "border-border hover:bg-muted"
                            }`}
                          >
                            <span>{g.name}</span>
                            <div className="w-16 h-4 rounded-md shadow-inner" style={{ background: g.value }} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 4: LIVE PORTAL PREVIEW */}
            <TabsContent value="preview" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Interactive simulation of how the login &amp; registration portal looks to students and staff.
                </div>
                <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
                  <Button
                    size="sm"
                    variant={previewTab === "signin" ? "default" : "ghost"}
                    onClick={() => setPreviewTab("signin")}
                    className="text-xs h-7"
                  >
                    Sign In Preview
                  </Button>
                  <Button
                    size="sm"
                    variant={previewTab === "signup" ? "default" : "ghost"}
                    onClick={() => setPreviewTab("signup")}
                    className="text-xs h-7"
                  >
                    Registration Preview
                  </Button>
                </div>
              </div>

              {/* Mockup Card */}
              <div className="max-w-md mx-auto p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 space-y-4">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-white text-xl shadow-md" style={{ background: config.themeColor }}>
                    📚
                  </div>
                  <h4 className="font-display text-lg font-bold text-foreground">
                    {config.portalTitle}
                  </h4>
                  <p className="text-xs text-muted-foreground">{config.tagline}</p>
                </div>

                {config.loginNotice && (
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs text-center font-medium">
                    📢 {config.loginNotice}
                  </div>
                )}

                {previewTab === "signin" ? (
                  <div className="space-y-3 pt-2 text-xs">
                    <div className="space-y-1">
                      <Label>Email</Label>
                      <Input placeholder="student@mpesafoundationacademy.ac.ke" disabled className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label>Password</Label>
                      <Input type="password" value="••••••••" disabled className="h-9" />
                    </div>
                    <Button className="w-full text-white text-xs h-10 font-semibold shadow-md mt-2" style={{ background: config.gradientPreset }}>
                      Sign In
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2 text-xs">
                    <div className="space-y-1">
                      <Label>Full Name</Label>
                      <Input placeholder="Enter your full name" disabled className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label>Email</Label>
                      <Input placeholder="your.name@mpesafoundationacademy.ac.ke" disabled className="h-9" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label>Year Group</Label>
                        <Select disabled defaultValue={config.yearGroupsList[0]}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {config.yearGroupsList.map((y) => (<SelectItem key={y} value={y}>{y}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Class</Label>
                        <Select disabled defaultValue={config.classesList[0]}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {config.classesList.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Custom fields in preview */}
                    {config.customFields.filter((f) => f.enabled).map((f) => (
                      <div key={f.id} className="space-y-1">
                        <Label className="flex items-center gap-1">
                          <span>{f.label}</span>
                          {f.required && <span className="text-destructive">*</span>}
                        </Label>
                        <Input placeholder={f.placeholder} disabled className="h-9" />
                      </div>
                    ))}

                    <div className="space-y-1">
                      <Label>Access Code</Label>
                      <Input placeholder="e.g. STU-DP1 or KENYA-2026" disabled className="h-9 font-mono" />
                    </div>

                    <Button className="w-full text-white text-xs h-10 font-semibold shadow-md mt-2" style={{ background: config.gradientPreset }}>
                      Create Account
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 5: MANUALLY ADD USER DIRECTLY */}
            <TabsContent value="addUser" className="space-y-4">
              <Card className="max-w-2xl mx-auto rounded-2xl border-border bg-card">
                <CardHeader className="py-4 px-6 border-b border-border">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-primary" /> Manually Register Scholar or Staff
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Create a user directly using current cohort and class definitions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleQuickAddUser} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Full Name *</Label>
                        <Input
                          placeholder="e.g. Zawadi Mwangi"
                          value={addUserForm.fullName}
                          onChange={(e) => setAddUserForm({ ...addUserForm, fullName: e.target.value })}
                          required
                          className="text-xs h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Email Address *</Label>
                        <Input
                          type="email"
                          placeholder="zawadi.mwangi@mpesafoundationacademy.ac.ke"
                          value={addUserForm.email}
                          onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })}
                          required
                          className="text-xs h-9"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Temporary Password *</Label>
                        <Input
                          type="password"
                          placeholder="Min 6 characters"
                          value={addUserForm.password}
                          onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })}
                          required
                          className="text-xs h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Role</Label>
                        <Select
                          value={addUserForm.role}
                          onValueChange={(val) => setAddUserForm({ ...addUserForm, role: val })}
                        >
                          <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="homeroom_tutor">Homeroom Tutor</SelectItem>
                            <SelectItem value="head_of_year">Head of Year</SelectItem>
                            <SelectItem value="house_patron">House Patron</SelectItem>
                            <SelectItem value="librarian">Librarian Staff</SelectItem>
                            <SelectItem value="staff">Other Faculty / Staff</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {addUserForm.role === "student" && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
                        <div className="space-y-1.5">
                          <Label>Year Group</Label>
                          <Select
                            value={addUserForm.yearGroup}
                            onValueChange={(val) => setAddUserForm({ ...addUserForm, yearGroup: val })}
                          >
                            <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {config.yearGroupsList.map((yg) => (
                                <SelectItem key={yg} value={yg}>{yg}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label>Class</Label>
                          <Select
                            value={addUserForm.className}
                            onValueChange={(val) => setAddUserForm({ ...addUserForm, className: val })}
                          >
                            <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {config.classesList.map((cls) => (
                                <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label>House</Label>
                          <Select
                            value={addUserForm.house}
                            onValueChange={(val) => setAddUserForm({ ...addUserForm, house: val })}
                          >
                            <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {config.housesList.map((h) => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    <Button type="submit" disabled={addingUser} className="w-full text-xs h-10 font-semibold gap-1.5 mt-2">
                      <UserPlus className="w-4 h-4" />
                      {addingUser ? "Registering User..." : "Register User in Academy"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
