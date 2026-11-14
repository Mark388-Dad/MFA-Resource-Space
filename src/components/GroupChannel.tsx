import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Home as HomeIcon,
  GraduationCap,
  BookOpen,
  Sparkles,
  Trophy,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { HOUSES, isYearGroupMatch, getHouseColor } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type GroupScopeKind = "all" | "house" | "year_group" | "class" | "club" | "librarian" | "challenge";

export interface GroupChat {
  id: string;
  title: string;
  description: string;
  kind: "group" | "direct" | "broadcast";
  scope_kind: GroupScopeKind;
  scope_value: string | null;
  selected_member_ids?: string[];
  selected_member_names?: string[];
  member_count?: number;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count?: number;
  created_at?: string;
  created_by?: string;
  icon?: string;
  is_system?: boolean;
}

export interface UserProfileLike {
  role?: string | null;
  house?: string | null;
  year_group?: string | null;
  class_name?: string | null;
  full_name?: string | null;
  email?: string | null;
}

/**
 * Core RBAC filtering logic:
 * - Admins and librarians have unrestricted oversight across all groups.
 * - Other staff can view groups matching their cohort or all groups.
 * - Students strictly see ONLY:
 *     1. Scope 'all' (Whole-school lounge, 45-book quest)
 *     2. Scope 'librarian' (Librarian desk)
 *     3. Scope 'house' matching their assigned house (e.g. Kenya students only see Kenya)
 *     4. Scope 'year_group' matching their assigned year group
 *     5. Scope 'class' matching their assigned homeroom stream
 *     6. Open student book clubs
 * Students CANNOT see or access groups they do not belong to!
 */
export function canStudentAccessGroup(group: GroupChat, profile: UserProfileLike | null | undefined): boolean {
  if (!profile) return false;
  const isLibrarianOrAdmin = profile.role === "librarian" || profile.role === "admin";
  if (isLibrarianOrAdmin) return true;

  const isStaff = Boolean(profile.role && profile.role !== "student");
  if (isStaff) {
    // Staff can view whole-school, their assigned cohort, or all groups if designated leader
    if (group.scope_kind === "all" || group.scope_kind === "librarian" || group.scope_kind === "challenge") return true;
    if (profile.role === "head_of_year") {
      if (group.scope_kind === "year_group") {
        return !profile.year_group || isYearGroupMatch(group.scope_value, profile.year_group);
      }
      return true;
    }
    if (profile.role === "house_patron") {
      if (group.scope_kind === "house") {
        return !profile.house || group.scope_value?.toLowerCase() === profile.house?.toLowerCase();
      }
      return true;
    }
    if (profile.role === "homeroom_tutor") {
      if (group.scope_kind === "class") {
        return !profile.class_name || group.scope_value?.toLowerCase() === profile.class_name?.toLowerCase();
      }
      return true;
    }
    return true;
  }

  // If group has specific selected scholars chosen by staff:
  if (Array.isArray(group.selected_member_ids) && group.selected_member_ids.length > 0) {
    const studentUid = (profile as any).user_id || (profile as any).id;
    if (studentUid && group.selected_member_ids.includes(studentUid)) {
      return true;
    }
  }

  // Student strict filtering:
  if (group.scope_kind === "all" || group.scope_kind === "librarian" || group.scope_kind === "challenge") {
    return true;
  }

  if (group.scope_kind === "house") {
    if (!profile.house || !group.scope_value) return false;
    return group.scope_value.trim().toLowerCase() === profile.house.trim().toLowerCase();
  }

  if (group.scope_kind === "year_group") {
    if (!profile.year_group || !group.scope_value) return false;
    return isYearGroupMatch(group.scope_value, profile.year_group);
  }

  if (group.scope_kind === "class") {
    if (!profile.class_name || !group.scope_value) return false;
    return group.scope_value.trim().toLowerCase() === profile.class_name.trim().toLowerCase();
  }

  if (group.scope_kind === "club") {
    return true;
  }

  return false;
}

/**
 * Filter a list of groups based on user profile and role
 */
export function filterGroupsForUser(groups: GroupChat[], profile: UserProfileLike | null | undefined): GroupChat[] {
  return groups.filter((g) => canStudentAccessGroup(g, profile));
}

/**
 * Standard Academy Default Group Channels
 */
export const STANDARD_ACADEMY_GROUPS: GroupChat[] = [
  // Whole-School General
  {
    id: "group-reading-lounge",
    title: "📚 Whole-School Reading Lounge",
    description: "The primary academy reading salon. Scholars and faculty across all houses share current reads, literary opinions, and book recommendations.",
    kind: "group",
    scope_kind: "all",
    scope_value: null,
    member_count: 540,
    icon: "📚",
    is_system: true,
  },
  {
    id: "group-45-quest",
    title: "🏆 45-Book Quest Discussion",
    description: "Dedicated discussion for the premier 45-book challenge across all 15 realms. Exchange realm recommendations and review tips.",
    kind: "group",
    scope_kind: "all",
    scope_value: null,
    member_count: 480,
    icon: "🏆",
    is_system: true,
  },
  {
    id: "group-librarian-desk",
    title: "💬 Academy Librarian Desk",
    description: "Direct assistance with academy librarians who have joined the portal. Catalog requests, challenge questions, and research support.",
    kind: "direct",
    scope_kind: "librarian",
    scope_value: null,
    member_count: 12,
    icon: "💬",
    is_system: true,
  },

  // House Reading Rooms (Only accessible to respective house scholars & all staff)
  {
    id: "group-house-kenya",
    title: "🏠 Kenya House Reading Room",
    description: "Official reading lounge for Kenya House. Log books, collaborate on house reading totals, and support your peers in the house championship.",
    kind: "group",
    scope_kind: "house",
    scope_value: "Kenya",
    member_count: 135,
    icon: "🦁",
    is_system: true,
  },
  {
    id: "group-house-longonot",
    title: "🏠 Longonot House Reading Room",
    description: "Official reading lounge for Longonot House. Log books, collaborate on house reading totals, and support your peers in the house championship.",
    kind: "group",
    scope_kind: "house",
    scope_value: "Longonot",
    member_count: 138,
    icon: "🌋",
    is_system: true,
  },
  {
    id: "group-house-kilimanjaro",
    title: "🏠 Kilimanjaro House Reading Room",
    description: "Official reading lounge for Kilimanjaro House. Log books, collaborate on house reading totals, and support your peers in the house championship.",
    kind: "group",
    scope_kind: "house",
    scope_value: "Kilimanjaro",
    member_count: 132,
    icon: "🏔️",
    is_system: true,
  },
  {
    id: "group-house-elgon",
    title: "🏠 Elgon House Reading Room",
    description: "Official reading lounge for Elgon House. Log books, collaborate on house reading totals, and support your peers in the house championship.",
    kind: "group",
    scope_kind: "house",
    scope_value: "Elgon",
    member_count: 135,
    icon: "🦅",
    is_system: true,
  },

  // Year Groups
  {
    id: "group-year-g10",
    title: "🎓 Grade 10 Readers Circle",
    description: "Grade 10 reading guild. Discuss MYP / IGCSE literature connections, book reflections, and category pacing.",
    kind: "group",
    scope_kind: "year_group",
    scope_value: "Grade 10",
    member_count: 180,
    icon: "🎓",
    is_system: true,
  },
  {
    id: "group-year-g11",
    title: "🎓 Grade 11 Readers Circle",
    description: "Grade 11 reading guild. DP1 literature works, world poetry, and non-fiction scholarship discussions.",
    kind: "group",
    scope_kind: "year_group",
    scope_value: "Grade 11",
    member_count: 175,
    icon: "🎓",
    is_system: true,
  },
  {
    id: "group-year-g12",
    title: "🎓 Grade 12 Readers Circle",
    description: "Grade 12 graduating cohort reading circle. Culminating reading milestones, memoirs, and extended essays.",
    kind: "group",
    scope_kind: "year_group",
    scope_value: "Grade 12",
    member_count: 165,
    icon: "🎓",
    is_system: true,
  },

  // Homeroom Streams
  {
    id: "group-class-swara",
    title: "📖 Swara Homeroom Book Club",
    description: "Swara homeroom community reading lounge and daily reading checks.",
    kind: "group",
    scope_kind: "class",
    scope_value: "Swara",
    member_count: 28,
    icon: "📖",
    is_system: true,
  },
  {
    id: "group-class-chui",
    title: "📖 Chui Homeroom Book Club",
    description: "Chui homeroom community reading lounge and daily reading checks.",
    kind: "group",
    scope_kind: "class",
    scope_value: "Chui",
    member_count: 28,
    icon: "📖",
    is_system: true,
  },
  {
    id: "group-class-duma",
    title: "📖 Duma Homeroom Book Club",
    description: "Duma homeroom community reading lounge and daily reading checks.",
    kind: "group",
    scope_kind: "class",
    scope_value: "Duma",
    member_count: 28,
    icon: "📖",
    is_system: true,
  },
  {
    id: "group-class-nyati",
    title: "📖 Nyati Homeroom Book Club",
    description: "Nyati homeroom community reading lounge and daily reading checks.",
    kind: "group",
    scope_kind: "class",
    scope_value: "Nyati",
    member_count: 28,
    icon: "📖",
    is_system: true,
  },
  {
    id: "group-class-twiga",
    title: "📖 Twiga Homeroom Book Club",
    description: "Twiga homeroom community reading lounge and daily reading checks.",
    kind: "group",
    scope_kind: "class",
    scope_value: "Twiga",
    member_count: 28,
    icon: "📖",
    is_system: true,
  },
  {
    id: "group-class-kifaru",
    title: "📖 Kifaru Homeroom Book Club",
    description: "Kifaru homeroom community reading lounge and daily reading checks.",
    kind: "group",
    scope_kind: "class",
    scope_value: "Kifaru",
    member_count: 28,
    icon: "📖",
    is_system: true,
  },
];

interface GroupChannelProps {
  group: GroupChat;
  currentUserProfile: UserProfileLike | null;
  isActive?: boolean;
  onSelectGroup?: (group: GroupChat) => void;
  showAdminControls?: boolean;
  onEdit?: (group: GroupChat) => void;
  onDelete?: (group: GroupChat) => void;
}

export const GroupChannel: React.FC<GroupChannelProps> = ({
  group,
  currentUserProfile,
  isActive = false,
  onSelectGroup,
  showAdminControls = false,
  onEdit,
  onDelete,
}) => {
  const isAccessible = canStudentAccessGroup(group, currentUserProfile);
  const isStaff = Boolean(currentUserProfile?.role && currentUserProfile.role !== "student");
  const isLibrarian = currentUserProfile?.role === "librarian" || currentUserProfile?.role === "admin";

  // Cohort match badge label
  let membershipLabel: string | null = null;
  if (!isStaff && currentUserProfile) {
    if (group.scope_kind === "house" && group.scope_value?.toLowerCase() === currentUserProfile.house?.toLowerCase()) {
      membershipLabel = `Your House Room (${currentUserProfile.house})`;
    } else if (group.scope_kind === "year_group" && isYearGroupMatch(group.scope_value, currentUserProfile.year_group)) {
      membershipLabel = `Your Year Group (${currentUserProfile.year_group})`;
    } else if (group.scope_kind === "class" && group.scope_value?.toLowerCase() === currentUserProfile.class_name?.toLowerCase()) {
      membershipLabel = `Your Homeroom (${currentUserProfile.class_name})`;
    } else if (group.scope_kind === "all") {
      membershipLabel = "Whole School (All Welcome)";
    } else if (group.scope_kind === "librarian") {
      membershipLabel = "Direct Help Desk";
    }
  } else if (isStaff) {
    membershipLabel = isLibrarian ? "Admin Oversight" : "Staff Leadership";
  }

  const renderScopeIcon = () => {
    switch (group.scope_kind) {
      case "house":
        return <HomeIcon className="w-3.5 h-3.5 text-amber-500" />;
      case "year_group":
        return <GraduationCap className="w-3.5 h-3.5 text-blue-500" />;
      case "class":
        return <BookOpen className="w-3.5 h-3.5 text-emerald-500" />;
      case "club":
        return <Sparkles className="w-3.5 h-3.5 text-fuchsia-500" />;
      case "challenge":
        return <Trophy className="w-3.5 h-3.5 text-yellow-500" />;
      case "librarian":
        return <MessageCircle className="w-3.5 h-3.5 text-cyan-500" />;
      default:
        return <Users className="w-3.5 h-3.5 text-primary" />;
    }
  };

  const getScopeBadgeStyle = () => {
    if (group.scope_kind === "house") {
      const houseColor = getHouseColor(group.scope_value);
      return houseColor
        ? { borderColor: houseColor.hex, color: houseColor.hex, background: `${houseColor.hex}15` }
        : {};
    }
    return {};
  };

  return (
    <div
      onClick={() => isAccessible && onSelectGroup?.(group)}
      className={cn(
        "group relative p-4 rounded-2xl border transition-all text-left",
        isAccessible ? "cursor-pointer hover:border-primary/50 hover:shadow-md" : "opacity-60 cursor-not-allowed bg-muted/40",
        isActive
          ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md"
          : "border-border bg-card/80 hover:bg-card"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Avatar icon */}
          <div className="w-11 h-11 rounded-2xl bg-muted border border-border/80 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform shadow-xs">
            {group.icon || "📖"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="font-display font-bold text-sm text-foreground truncate">
                {group.title}
              </span>
              {group.scope_kind && (
                <Badge
                  variant="outline"
                  style={getScopeBadgeStyle()}
                  className="text-[10px] font-semibold gap-1 px-2 py-0 h-5"
                >
                  {renderScopeIcon()}
                  <span className="capitalize">
                    {group.scope_kind === "year_group"
                      ? group.scope_value || "Year"
                      : group.scope_kind === "class"
                      ? `Class ${group.scope_value}`
                      : group.scope_kind === "house"
                      ? `${group.scope_value} House`
                      : group.scope_kind === "all"
                      ? "Whole School"
                      : group.scope_kind}
                  </span>
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {group.description}
            </p>

            {/* Membership & cohort indicator */}
            <div className="flex items-center gap-3 mt-2.5 text-[11px] text-muted-foreground flex-wrap">
              {membershipLabel && (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {membershipLabel}
                </span>
              )}
              {typeof group.member_count === "number" && (
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {group.member_count} members
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-1 shrink-0">
          {isAccessible ? (
            <Button
              size="sm"
              variant={isActive ? "default" : "outline"}
              className="text-xs font-semibold gap-1 rounded-xl h-8"
              onClick={(e) => {
                e.stopPropagation();
                onSelectGroup?.(group);
              }}
            >
              <span>{isActive ? "Active" : "Open Chat"}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Badge variant="outline" className="text-[10px] text-muted-foreground border-border gap-1 py-1">
              <Lock className="w-3 h-3 text-muted-foreground" />
              <span>Restricted</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Admin specific controls if enabled */}
      {showAdminControls && !group.is_system && (
        <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-end gap-2 text-xs">
          {onEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(group);
              }}
              className="h-7 text-xs"
            >
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(group);
              }}
              className="h-7 text-xs text-destructive hover:bg-destructive/10"
            >
              Archive
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default GroupChannel;
