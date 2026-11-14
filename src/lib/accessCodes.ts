import { supabase } from "@/integrations/supabase/client";

export interface AccessCodeRecord {
  id?: string;
  code: string;
  code_type: string;
  role_restriction: string;
  house?: string | null;
  year_group?: string | null;
  class_name?: string | null;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  school_name?: string;
  description?: string;
}

/** Standard official access codes for Mpesa Foundation Academy */
const DELETED_CODES_KEY = "mfa_deleted_access_codes";
const CUSTOM_CODES_KEY = "mfa_custom_access_codes";
const DISABLED_CODES_KEY = "mfa_disabled_access_codes";

export function getDeletedCodes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(DELETED_CODES_KEY) || "[]");
  } catch {
    return [];
  }
}

export function recordDeletedCode(code: string) {
  if (typeof window === "undefined") return;
  try {
    const list = getDeletedCodes();
    const upper = code.trim().toUpperCase();
    list.push(upper);
    list.push(upper.replace(/[-\s]/g, ""));
    localStorage.setItem(DELETED_CODES_KEY, JSON.stringify([...new Set(list)]));

    const custom = getCustomCodes().filter((c) => c.code.toUpperCase() !== upper);
    localStorage.setItem(CUSTOM_CODES_KEY, JSON.stringify(custom));
    window.dispatchEvent(new CustomEvent("mfa_access_codes_updated"));
  } catch (err) {
    console.warn("Could not save deleted code to storage:", err);
  }
}

export function unrecordDeletedCode(code: string) {
  if (typeof window === "undefined") return;
  try {
    const upper = code.trim().toUpperCase();
    const clean = upper.replace(/[-\s]/g, "");
    const list = getDeletedCodes().filter((c) => c !== upper && c !== clean);
    localStorage.setItem(DELETED_CODES_KEY, JSON.stringify(list));
  } catch {}
}

export function isCodeDeleted(code: string): boolean {
  const list = getDeletedCodes();
  const c = code.trim().toUpperCase();
  const clean = c.replace(/[-\s]/g, "");
  return list.includes(c) || list.includes(clean);
}

export function getDisabledCodes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(DISABLED_CODES_KEY) || "[]");
  } catch {
    return [];
  }
}

export function setCodeDisabledLocal(code: string, disabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    const upper = code.trim().toUpperCase();
    const current = getDisabledCodes().filter((c) => c !== upper);
    if (disabled) current.push(upper);
    localStorage.setItem(DISABLED_CODES_KEY, JSON.stringify(current));

    const custom = getCustomCodes().map((c) =>
      c.code.toUpperCase() === upper ? { ...c, is_active: !disabled } : c
    );
    localStorage.setItem(CUSTOM_CODES_KEY, JSON.stringify(custom));
    window.dispatchEvent(new CustomEvent("mfa_access_codes_updated"));
  } catch {}
}

export function getCustomCodes(): AccessCodeRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(CUSTOM_CODES_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function saveCustomCodeLocal(record: AccessCodeRecord) {
  if (typeof window === "undefined") return;
  try {
    const upper = record.code.trim().toUpperCase();
    unrecordDeletedCode(upper);
    const list = getCustomCodes().filter((c) => c.code.toUpperCase() !== upper);
    list.unshift({ ...record, code: upper });
    localStorage.setItem(CUSTOM_CODES_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("mfa_access_codes_updated"));
  } catch {}
}

export const STANDARD_ACCESS_CODES: AccessCodeRecord[] = [
  // 1. Student Cohort Codes
  {
    code: "STU-DP1",
    code_type: "student",
    role_restriction: "student",
    year_group: "DP1",
    max_uses: 2000,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Official DP1 Student Access Code",
  },
  {
    code: "STU-DP2",
    code_type: "student",
    role_restriction: "student",
    year_group: "DP2",
    max_uses: 2000,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Official DP2 Student Access Code",
  },
  {
    code: "STU-G10",
    code_type: "student",
    role_restriction: "student",
    year_group: "G10",
    max_uses: 2000,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Official Grade 10 Student Access Code",
  },
  {
    code: "STU-G11",
    code_type: "student",
    role_restriction: "student",
    year_group: "Grade 11",
    max_uses: 2000,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Official Grade 11 Student Access Code",
  },
  {
    code: "STU-GRADE11",
    code_type: "student",
    role_restriction: "student",
    year_group: "Grade 11",
    max_uses: 2000,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Official Grade 11 Student Access Code",
  },
  {
    code: "STU-G12",
    code_type: "student",
    role_restriction: "student",
    year_group: "Grade 12",
    max_uses: 2000,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Official Grade 12 Student Access Code",
  },
  {
    code: "STU-GRADE12",
    code_type: "student",
    role_restriction: "student",
    year_group: "Grade 12",
    max_uses: 2000,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Official Grade 12 Student Access Code",
  },

  // 2. Year Group Cohort Codes
  {
    code: "DP1-2026",
    code_type: "student",
    role_restriction: "student",
    year_group: "DP1",
    max_uses: 1000,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "DP1 2026 Cohort Access Code",
  },
  {
    code: "DP2-2026",
    code_type: "student",
    role_restriction: "student",
    year_group: "DP2",
    max_uses: 1000,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "DP2 2026 Cohort Access Code",
  },
  {
    code: "G10-2026",
    code_type: "student",
    role_restriction: "student",
    year_group: "G10",
    max_uses: 1000,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Grade 10 2026 Cohort Access Code",
  },
  {
    code: "G11-2026",
    code_type: "student",
    role_restriction: "student",
    year_group: "Grade 11",
    max_uses: 1000,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Grade 11 2026 Cohort Access Code",
  },
  {
    code: "GRADE11-2026",
    code_type: "student",
    role_restriction: "student",
    year_group: "Grade 11",
    max_uses: 1000,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Grade 11 2026 Cohort Access Code",
  },
  {
    code: "G12-2026",
    code_type: "student",
    role_restriction: "student",
    year_group: "Grade 12",
    max_uses: 1000,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Grade 12 2026 Cohort Access Code",
  },
  {
    code: "GRADE12-2026",
    code_type: "student",
    role_restriction: "student",
    year_group: "Grade 12",
    max_uses: 1000,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Grade 12 2026 Cohort Access Code",
  },

  // 3. House Codes (Kenya, Longonot, Kilimanjaro, Elgon)
  {
    code: "KENYA-2026",
    code_type: "student",
    role_restriction: "student",
    house: "Kenya",
    max_uses: 500,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Kenya House Access Code",
  },
  {
    code: "LONGONOT-2026",
    code_type: "student",
    role_restriction: "student",
    house: "Longonot",
    max_uses: 500,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Longonot House Access Code",
  },
  {
    code: "KILIMANJARO-2026",
    code_type: "student",
    role_restriction: "student",
    house: "Kilimanjaro",
    max_uses: 500,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Kilimanjaro House Access Code",
  },
  {
    code: "ELGON-2026",
    code_type: "student",
    role_restriction: "student",
    house: "Elgon",
    max_uses: 500,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Elgon House Access Code",
  },

  // 4. Homeroom Tutors (differs by year group)
  {
    code: "TUT-DP1-2026",
    code_type: "tutor",
    role_restriction: "homeroom_tutor",
    year_group: "DP1",
    max_uses: 100,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "DP1 Homeroom Tutor Access Code",
  },
  {
    code: "TUT-DP2-2026",
    code_type: "tutor",
    role_restriction: "homeroom_tutor",
    year_group: "DP2",
    max_uses: 100,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "DP2 Homeroom Tutor Access Code",
  },
  {
    code: "TUT-G10-2026",
    code_type: "tutor",
    role_restriction: "homeroom_tutor",
    year_group: "G10",
    max_uses: 100,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Grade 10 Homeroom Tutor Access Code",
  },
  {
    code: "TUT-G11-2026",
    code_type: "tutor",
    role_restriction: "homeroom_tutor",
    year_group: "G11",
    max_uses: 100,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Grade 11 Homeroom Tutor Access Code",
  },
  {
    code: "TUT-G12-2026",
    code_type: "tutor",
    role_restriction: "homeroom_tutor",
    year_group: "G12",
    max_uses: 100,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Grade 12 Homeroom Tutor Access Code",
  },

  // 5. Heads of Year
  {
    code: "HOY-DP1-2026",
    code_type: "tutor",
    role_restriction: "head_of_year",
    year_group: "DP1",
    max_uses: 50,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Head of Year DP1 Access Code",
  },
  {
    code: "HOY-DP2-2026",
    code_type: "tutor",
    role_restriction: "head_of_year",
    year_group: "DP2",
    max_uses: 50,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Head of Year DP2 Access Code",
  },
  {
    code: "HOY-G10-2026",
    code_type: "tutor",
    role_restriction: "head_of_year",
    year_group: "G10",
    max_uses: 50,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Head of Year Grade 10 Access Code",
  },
  {
    code: "HOY-G11-2026",
    code_type: "tutor",
    role_restriction: "head_of_year",
    year_group: "G11",
    max_uses: 50,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Head of Year Grade 11 Access Code",
  },
  {
    code: "HOY-G12-2026",
    code_type: "tutor",
    role_restriction: "head_of_year",
    year_group: "G12",
    max_uses: 50,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Head of Year Grade 12 Access Code",
  },

  // 6. House Patrons
  {
    code: "PATRON-KENYA-2026",
    code_type: "tutor",
    role_restriction: "house_patron",
    house: "Kenya",
    max_uses: 50,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Kenya House Patron Access Code",
  },
  {
    code: "PATRON-LONGONOT-2026",
    code_type: "tutor",
    role_restriction: "house_patron",
    house: "Longonot",
    max_uses: 50,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Longonot House Patron Access Code",
  },
  {
    code: "PATRON-KILIMANJARO-2026",
    code_type: "tutor",
    role_restriction: "house_patron",
    house: "Kilimanjaro",
    max_uses: 50,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Kilimanjaro House Patron Access Code",
  },
  {
    code: "PATRON-ELGON-2026",
    code_type: "tutor",
    role_restriction: "house_patron",
    house: "Elgon",
    max_uses: 50,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Elgon House Patron Access Code",
  },

  // 7. General Staff, Challenge & Librarian
  {
    code: "READ-2026",
    code_type: "student",
    role_restriction: "all",
    max_uses: 5000,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Universal Reading Challenge Entry Code (All Cohorts)",
  },
  {
    code: "STAFF-2026",
    code_type: "tutor",
    role_restriction: "staff",
    max_uses: 500,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "General Academy Staff Access Code",
  },
  {
    code: "LIB-2026",
    code_type: "librarian",
    role_restriction: "librarian",
    max_uses: 100,
    current_uses: 0,
    is_active: true,
    school_name: "Mpesa Foundation Academy",
    description: "Librarian Access Code",
  },
];

/** Increment usage counter cleanly in Supabase & local storage */
export async function recordAccessCodeUse(rawCode: string): Promise<void> {
  const code = (rawCode || "").trim().toUpperCase();
  if (!code || code === "LIB-DIRECT" || code === "ADMIN-DIRECT") return;

  try {
    const custom = getCustomCodes().map((c) =>
      c.code.toUpperCase() === code ? { ...c, current_uses: (c.current_uses || 0) + 1 } : c
    );
    localStorage.setItem(CUSTOM_CODES_KEY, JSON.stringify(custom));
  } catch {}

  try {
    const { data } = await supabase
      .from("access_codes")
      .select("id, current_uses")
      .ilike("code", code)
      .maybeSingle();

    if (data?.id) {
      await supabase
        .from("access_codes")
        .update({ current_uses: (data.current_uses || 0) + 1 })
        .eq("id", data.id);
    }
  } catch {
    // non-blocking usage telemetry
  }
}

/** Check if a code matches an active standard code, custom code, or database code */
export async function validateAccessCode(rawCode: string, requestedRole: string = "student"): Promise<{
  valid: boolean;
  message?: string;
  matchedCode?: AccessCodeRecord;
}> {
  if (requestedRole === "librarian" || requestedRole === "admin") {
    return {
      valid: true,
      message: "Administrator & Librarian direct access granted without verification.",
      matchedCode: {
        code: "LIB-DIRECT",
        code_type: "librarian",
        role_restriction: requestedRole,
        max_uses: 999999,
        current_uses: 0,
        is_active: true,
        school_name: "Mpesa Foundation Academy",
        description: "Official Librarian Direct Access",
      },
    };
  }

  const code = (rawCode || "").trim().toUpperCase();
  if (!code) {
    return { valid: false, message: "Please enter an access code" };
  }

  if (isCodeDeleted(code)) {
    return { valid: false, message: `Access code "${code}" has been deleted by the librarian.` };
  }

  const cleanCode = code.replace(/[-\s]/g, "");
  if (isCodeDeleted(cleanCode)) {
    return { valid: false, message: `Access code "${code}" has been deleted by the librarian.` };
  }

  const disabledList = getDisabledCodes();
  if (disabledList.includes(code)) {
    return { valid: false, message: `Access code "${code}" has been deactivated by the librarian.` };
  }

  const isRolePermitted = (roleRestriction?: string | null) => {
    if (!roleRestriction || roleRestriction === "all") return true;
    const staffRoles = ["homeroom_tutor", "head_of_year", "house_patron", "librarian", "staff", "admin"];
    const isStaffRequested = staffRoles.includes(requestedRole);

    if (roleRestriction === "student") {
      return requestedRole === "student";
    }
    if (roleRestriction === "staff" || roleRestriction === "STAFF") {
      return isStaffRequested;
    }
    if (roleRestriction === "tutor" || roleRestriction === "homeroom_tutor") {
      return requestedRole === "homeroom_tutor" || isStaffRequested;
    }
    if (roleRestriction === "librarian") {
      return requestedRole === "librarian" || isStaffRequested;
    }
    if (roleRestriction === "head_of_year") {
      return requestedRole === "head_of_year" || isStaffRequested;
    }
    if (roleRestriction === "house_patron") {
      return requestedRole === "house_patron" || isStaffRequested;
    }
    return true;
  };

  // 1. Check Supabase database first so deactivated/edited/custom codes in DB take live precedence
  try {
    const { data, error } = await supabase
      .from("access_codes")
      .select("*")
      .ilike("code", code)
      .maybeSingle();

    if (!error && data) {
      if (data.is_active === false) {
        return { valid: false, message: "This access code has been disabled by the administrator" };
      }
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return { valid: false, message: "This access code has expired" };
      }
      if (data.max_uses && data.current_uses && data.current_uses >= data.max_uses) {
        return { valid: false, message: "This access code has reached its maximum allowed uses" };
      }
      if (!isRolePermitted(data.role_restriction)) {
        if (data.role_restriction === "student") {
          return { valid: false, message: "This code is valid for students only" };
        }
        return { valid: false, message: "This code is restricted to academy staff members" };
      }
      return { valid: true, matchedCode: data as unknown as AccessCodeRecord };
    }
  } catch (err) {
    console.warn("validateAccessCode DB check note:", err);
  }

  // 2. Check custom codes created locally/cached in Librarian Command Center
  const customMatch = getCustomCodes().find(
    (c) =>
      c.code.toUpperCase() === code ||
      c.code.toUpperCase().replace(/[-\s]/g, "") === cleanCode
  );
  if (customMatch) {
    if (!customMatch.is_active) {
      return { valid: false, message: "This access code has been deactivated" };
    }
    if (!isRolePermitted(customMatch.role_restriction)) {
      return {
        valid: false,
        message:
          customMatch.role_restriction === "student"
            ? "This code is restricted to student accounts only"
            : "This code is reserved for academy staff/faculty",
      };
    }
    return { valid: true, matchedCode: customMatch };
  }

  // 3. Check built-in standard academy codes
  const standard = STANDARD_ACCESS_CODES.find(
    (c) =>
      c.code.toUpperCase() === code ||
      c.code.toUpperCase().replace(/[-\s]/g, "") === cleanCode
  );
  if (standard) {
    if (!standard.is_active) {
      return { valid: false, message: "This access code has been deactivated" };
    }
    if (!isRolePermitted(standard.role_restriction)) {
      if (standard.role_restriction === "student") {
        return { valid: false, message: "This code is restricted to student accounts only" };
      }
      return { valid: false, message: "This code is reserved for academy staff/faculty" };
    }
    return { valid: true, matchedCode: standard };
  }

  return {
    valid: false,
    message: `Access code "${code}" not found. Ask your librarian or use an active cohort code (e.g. STU-DP1, READ-2026).`,
  };
}

/** Sync all standard & local custom codes to Supabase */
export async function syncAllStandardCodes(): Promise<{ count: number; error?: string; total: number }> {
  try {
    const { data: existing, error: fetchErr } = await supabase.from("access_codes").select("code");
    if (fetchErr) {
      console.warn("Could not query existing access_codes:", fetchErr);
    }
    const existingSet = new Set((existing || []).map((e) => e.code.toUpperCase()));

    const allSourceCodes = [...STANDARD_ACCESS_CODES, ...getCustomCodes()];
    const dedupMap = new Map<string, AccessCodeRecord>();
    allSourceCodes.forEach((c) => {
      const upper = c.code.trim().toUpperCase();
      if (!isCodeDeleted(upper) && !dedupMap.has(upper)) {
        dedupMap.set(upper, { ...c, code: upper });
      }
    });

    const toInsert = Array.from(dedupMap.values())
      .filter((c) => !existingSet.has(c.code))
      .map((c) => {
        let dbCodeType: "student" | "librarian" | "tutor" = "student";
        if (c.role_restriction === "librarian" || c.code_type?.toLowerCase() === "librarian") {
          dbCodeType = "librarian";
        } else if (
          c.role_restriction === "student" ||
          c.role_restriction === "all" ||
          c.code_type?.toLowerCase() === "student" ||
          !c.role_restriction
        ) {
          dbCodeType = "student";
        } else {
          dbCodeType = "tutor";
        }

        return {
          code: c.code,
          code_type: dbCodeType,
          role_restriction: c.role_restriction || "all",
          house: c.house || null,
          year_group: c.year_group || null,
          class_name: c.class_name || null,
          max_uses: c.max_uses || 1000,
          current_uses: c.current_uses || 0,
          is_active: c.is_active !== false,
          school_name: "Mpesa Foundation Academy",
        };
      });

    if (toInsert.length > 0) {
      const { error } = await supabase.from("access_codes").insert(toInsert);
      if (error) {
        console.error("Failed to insert missing standard codes:", error);
        return { count: 0, total: dedupMap.size, error: error.message };
      }
    }

    return { count: toInsert.length, total: dedupMap.size };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to sync";
    return { count: 0, total: STANDARD_ACCESS_CODES.length, error: msg };
  }
}
