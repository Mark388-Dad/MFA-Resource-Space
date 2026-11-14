import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  size?: number;
  className?: string;
}

const AvatarUpload = ({ size = 36, className }: Props) => {
  const { user, profile, refreshProfile } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const avatarUrl = (profile as unknown as { avatar_url?: string | null })?.avatar_url || null;

  const onPick = async (file?: File | null) => {
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setBusy(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setBusy(false);
      toast.error(upErr.message);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: data.publicUrl })
      .eq("user_id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    toast.success("Profile picture updated");
  };

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      title="Change profile picture"
      className={cn(
        "relative group rounded-full overflow-hidden bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0",
        className
      )}
      style={{ width: size, height: size }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={profile?.full_name || "Profile picture"} className="w-full h-full object-cover" />
      ) : (
        <span>{profile?.full_name?.[0] || "U"}</span>
      )}
      <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Camera className="w-3.5 h-3.5 text-white" />}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </button>
  );
};

export default AvatarUpload;
