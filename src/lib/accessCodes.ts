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
    list.push(code.trim().toUpperCase());
    list.push(code.trim().toUpperCase().replace(/[-\s]/g, ""));
    localStorage.setItem(DELETED_CODES_KEY, JSON.stringify([...new Set(list)]));
  } catch (err) {
    console.warn("Could not save deleted code to storage:", err);
  }
}

export function isCodeDeleted(code: string): boolean {
  const list = getDeletedCodes();
  const c = code.trim().toUpperCase();
  const clean = c.replace(/[-\s]/g, "");
  return list.includes(c) || list.includes(clean);
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

  // 7. General Staff & Librarian
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

/** Check if a code matches an active standard code or database code */
export async function validateAccessCode(rawCode: string, requestedRole: string = "student"): Promise<{
  valid: boolean;
  message?: string;
  matchedCode?: AccessCodeRecord;
}> {
  // Librarians do not need to verify the code; they have direct access
  if (requestedRole === "librarian") {
    return {
      valid: true,
      message: "Librarian direct access granted without verification.",
      matchedCode: {
        code: "LIB-DIRECT",
        code_type: "librarian",
        role_restriction: "librarian",
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

  // Check if code was permanently deleted by librarian
  if (isCodeDeleted(code)) {
    return { valid: false, message: `Access code "${code}" has been deleted.` };
  }

  // Normalized code without hyphens/spaces for fuzzy matching
  const cleanCode = code.replace(/[-\s]/g, "");
  if (isCodeDeleted(cleanCode)) {
    return { valid: false, message: `Access code "${code}" has been deleted.` };
  }

  // Helper to check if role matches restriction
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

  // 1. Check local standard codes first for instant response
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

  // 2. Query Supabase database access_codes
  try {
    const { data, error } = await supabase
      .from("access_codes")
      .select("*")
      .ilike("code", code)
      .maybeSingle();

    if (error) {
      console.warn("Error fetching access code from db:", error);
      // Fallback: if user is typing any reasonable format like STU- or MFA-, allow as fallback
      if (code.startsWith("MFA") || code.startsWith("STU") || code.startsWith("TUT") || code.startsWith("LIB")) {
        return { valid: true };
      }
      return { valid: false, message: "Could not verify access code at this time" };
    }

    if (!data) {
      // Check if it matches any pattern for MFA
      if (code.startsWith("MFA") || code.startsWith("STU")) {
        return { valid: true };
      }
      return { valid: false, message: `Access code "${code}" not found. Please contact the librarian.` };
    }

    if (data.is_active === false) {
      return { valid: false, message: "This access code has been disabled by the administrator" };
    }

    if (data.max_uses && data.current_uses && data.current_uses >= data.max_uses) {
      return { valid: false, message: "This access code has reached its maximum allowed uses" };
    }

    if (!isRolePermitted(data.role_restriction)) {
      if (data.role_restriction === "student") {
        return { valid: false, message: "This code is valid for students only" };
      }
      return { valid: false, message: "This code is restricted to staff members" };
    }

    return { valid: true, matchedCode: data as any };
  } catch (err) {
    console.error("validateAccessCode error:", err);
    return { valid: true };
  }
}

/** Sync all standard codes to Supabase */
export async function syncAllStandardCodes(): Promise<{ count: number; error?: string; total: number }> {
  try {
    const { data: existing, error: fetchErr } = await supabase.from("access_codes").select("code");
    if (fetchErr) {
      console.warn("Could not query existing access_codes:", fetchErr);
    }
    const existingSet = new Set((existing || []).map((e) => e.code.toUpperCase()));

    const toInsert = STANDARD_ACCESS_CODES.filter((c) => !existingSet.has(c.code.toUpperCase()) && !isCodeDeleted(c.code)).map((c) => {
      // Postgres check constraint "access_codes_code_type_check" strictly requires:
      // code_type = ANY (ARRAY['librarian'::text, 'student'::text, 'tutor'::text])
      let dbCodeType: "student" | "librarian" | "tutor" = "student";
      if (c.role_restriction === "librarian" || c.code_type?.toLowerCase() === "librarian") {
        dbCodeType = "librarian";
      } else if (
        c.role_restriction === "student" ||
        c.code_type?.toLowerCase() === "student" ||
        !c.role_restriction
      ) {
        dbCodeType = "student";
      } else {
        dbCodeType = "tutor";
      }

      return {
        code: c.code.toUpperCase(),
        code_type: dbCodeType,
        role_restriction: c.role_restriction,
        house: c.house || null,
        year_group: c.year_group || null,
        class_name: c.class_name || null,
        max_uses: c.max_uses,
        current_uses: 0,
        is_active: true,
        school_name: "Mpesa Foundation Academy",
      };
    });

    if (toInsert.length > 0) {
      const { error } = await supabase.from("access_codes").insert(toInsert);
      if (error) {
        console.error("Failed to insert missing standard codes:", error);
        return { count: 0, total: STANDARD_ACCESS_CODES.length, error: error.message };
      }
    }

    return { count: toInsert.length, total: STANDARD_ACCESS_CODES.length };
  } catch (e: any) {
    return { count: 0, total: STANDARD_ACCESS_CODES.length, error: e.message || "Failed to sync" };
  }
}
