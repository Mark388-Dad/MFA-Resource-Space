import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, Type } from "lucide-react";
import { toast } from "sonner";
import { getLookPrefs, saveLookPrefs, LookPrefs, TextSize } from "@/lib/lookPrefs";

type NotifPrefs = {
  email_broadcasts: boolean;
  email_account_alerts: boolean;
  desktop_notifications: boolean;
};
const DEFAULT_NOTIF: NotifPrefs = {
  email_broadcasts: true,
  email_account_alerts: true,
  desktop_notifications: false,
};

const Row = ({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
    <div>
      <Label className="text-sm font-semibold">{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export default function PreferencesSettings() {
  const { user } = useAuth();
  const [look, setLook] = useState<LookPrefs>(getLookPrefs());
  const [notif, setNotif] = useState<NotifPrefs>(DEFAULT_NOTIF);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_preferences" as any).select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setNotif({ ...DEFAULT_NOTIF, ...(data as any) }); });
  }, [user]);

  const updateLook = (p: Partial<LookPrefs>) => {
    const next = { ...look, ...p };
    setLook(next);
    saveLookPrefs(next);
  };

  const updateNotif = async (p: Partial<NotifPrefs>) => {
    if (!user) return;
    if (p.desktop_notifications && "Notification" in window && Notification.permission !== "granted") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { toast.error("Your browser blocked notifications."); return; }
    }
    const next = { ...notif, ...p };
    setNotif(next);
    localStorage.setItem("mfa-notif-prefs", JSON.stringify(next));
    const { error } = await supabase.from("user_preferences" as any)
      .upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() } as any);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  const sizes: { v: TextSize; l: string }[] = [
    { v: "sm", l: "Small" }, { v: "md", l: "Normal" }, { v: "lg", l: "Large" }, { v: "xl", l: "Extra large" },
  ];

  return (
    <>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Type className="w-5 h-5 text-primary" /> Look & Feel</CardTitle>
          <CardDescription>Text size, motion and spacing. Saved on this device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">Text size</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {sizes.map((s) => (
                <Button key={s.v} variant={look.textSize === s.v ? "default" : "outline"} size="sm" onClick={() => updateLook({ textSize: s.v })}>
                  {s.l}
                </Button>
              ))}
            </div>
          </div>
          <Row label="Reduce motion" hint="Turn off animations and moving effects." checked={look.reducedMotion} onChange={(v) => updateLook({ reducedMotion: v })} />
          <Row label="Compact layout" hint="Tighter spacing to fit more on screen." checked={look.compact} onChange={(v) => updateLook({ compact: v })} />
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Bell className="w-5 h-5 text-primary" /> Notifications</CardTitle>
          <CardDescription>Choose what you hear about and how.</CardDescription>
        </CardHeader>
        <CardContent>
          <Row label="Announcement emails" hint="Broadcasts from the librarian and staff." checked={notif.email_broadcasts} onChange={(v) => updateNotif({ email_broadcasts: v })} />
          <Row label="Account emails" hint="Password resets and security alerts." checked={notif.email_account_alerts} onChange={(v) => updateNotif({ email_account_alerts: v })} />
          <Row label="Desktop notifications" hint="Pop-up alerts from your browser." checked={notif.desktop_notifications} onChange={(v) => updateNotif({ desktop_notifications: v })} />
        </CardContent>
      </Card>
    </>
  );
}
