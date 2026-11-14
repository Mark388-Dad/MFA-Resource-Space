import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ExportRow = Record<string, string | number>;

const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportCSV = (rows: ExportRow[], filename: string) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
};

export const exportPDF = (
  rows: ExportRow[],
  filename: string,
  title: string,
  subtitle?: string
) => {
  if (!rows.length) return;
  const doc = new jsPDF({ orientation: "landscape" });
  const headers = Object.keys(rows[0]);

  doc.setFontSize(16);
  doc.text(title, 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    [subtitle, `Generated ${new Date().toLocaleString()}`].filter(Boolean).join("  •  "),
    14,
    22
  );

  autoTable(doc, {
    startY: 28,
    head: [headers],
    body: rows.map((r) => headers.map((h) => String(r[h] ?? ""))),
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [24, 32, 56], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 252] },
  });

  doc.save(`${filename}.pdf`);
};

export interface SchoolWideReportData {
  challengeTitle: string;
  totalBooks: number;
  totalReaders: number;
  houses: { house: string; color: string; books: number; readers: number; points: number }[];
  yearGroups: { year: string; books: number; readers: number; points: number }[];
  classes: { className: string; books: number; readers: number; points: number }[];
  topStudents: { rank: number; name: string; house: string; yearGroup: string; className: string; books: number; points: number }[];
}

/**
 * Exports a high-fidelity formatted School-Wide Report PDF for offline record-keeping
 */
export const exportSchoolWideReportPDF = (data: SchoolWideReportData, filename?: string) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(11, 29, 58); // #0B1D3A Academy Navy
  doc.rect(0, 0, pageWidth, 85, "F");

  // Gold accent rule
  doc.setFillColor(212, 175, 55); // #D4AF37 Pure Gold
  doc.rect(0, 85, pageWidth, 4, "F");

  // Title & Metadata
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("MPESA FOUNDATION ACADEMY", 30, 36);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(212, 175, 55);
  doc.text(`Official School-Wide Reading Report — ${data.challengeTitle}`, 30, 54);

  doc.setFontSize(9);
  doc.setTextColor(190, 200, 215);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}  •  Confidential Academic Record`, 30, 72);

  // Executive KPI summary boxes
  let y = 105;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(11, 29, 58);
  doc.text("Executive Summary", 30, y);

  y += 12;
  const kpiWidth = (pageWidth - 60 - 24) / 3;

  // Box 1: Total Books
  doc.setFillColor(243, 246, 252);
  doc.roundedRect(30, y, kpiWidth, 48, 6, 6, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 110, 130);
  doc.text("TOTAL BOOKS LOGGED", 42, y + 18);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(11, 29, 58);
  doc.text(String(data.totalBooks), 42, y + 40);

  // Box 2: Total Readers
  doc.setFillColor(243, 246, 252);
  doc.roundedRect(30 + kpiWidth + 12, y, kpiWidth, 48, 6, 6, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 110, 130);
  doc.text("ACTIVE STUDENT READERS", 42 + kpiWidth + 12, y + 18);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(13, 138, 74);
  doc.text(String(data.totalReaders), 42 + kpiWidth + 12, y + 40);

  // Box 3: Total Houses
  doc.setFillColor(243, 246, 252);
  doc.roundedRect(30 + (kpiWidth + 12) * 2, y, kpiWidth, 48, 6, 6, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 110, 130);
  doc.text("PARTICIPATING HOUSES", 42 + (kpiWidth + 12) * 2, y + 18);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(212, 175, 55);
  doc.text("4 Houses (Kenya, Longonot, ...)", 42 + (kpiWidth + 12) * 2, y + 40);

  y += 62;

  // Table 1: House Standings
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(11, 29, 58);
  doc.text("1. House Performance & Standings", 30, y);

  autoTable(doc, {
    startY: y + 8,
    head: [["Rank", "House Name", "House Color", "Books Read", "Active Readers", "House Points"]],
    body: data.houses.map((h, i) => [
      `#${i + 1}`,
      h.house,
      h.color,
      h.books,
      h.readers,
      `${h.points} pts`,
    ]),
    margin: { left: 30, right: 30 },
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [11, 29, 58], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 254] },
  });

  const lastTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  y = lastTable ? lastTable.finalY + 22 : y + 120;

  // Table 2: Year Group Breakdown
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(11, 29, 58);
  doc.text("2. Academic Cohort / Year Group Breakdown", 30, y);

  autoTable(doc, {
    startY: y + 8,
    head: [["Academic Cohort", "Total Books", "Active Students", "Total Points"]],
    body: data.yearGroups.map((yg) => [
      yg.year,
      yg.books,
      yg.readers,
      `${yg.points} pts`,
    ]),
    margin: { left: 30, right: 30 },
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [27, 73, 101], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 254] },
  });

  // Page 2: Top Students Leaderboard
  doc.addPage();
  y = 40;

  // Header Page 2
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(11, 29, 58);
  doc.text("3. Top Scholar Reading Leaderboard", 30, y);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 110, 130);
  doc.text("Official ranking of scholar readers across all houses and year groups.", 30, y + 14);

  autoTable(doc, {
    startY: y + 24,
    head: [["Rank", "Scholar Name", "House", "Year Group", "Class", "Books Read", "Points Earned"]],
    body: data.topStudents.map((st) => [
      `#${st.rank}`,
      st.name,
      st.house,
      st.yearGroup,
      st.className,
      st.books,
      st.points,
    ]),
    margin: { left: 30, right: 30 },
    styles: { fontSize: 8.5, cellPadding: 3.5 },
    headStyles: { fillColor: [11, 29, 58], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 254] },
  });

  // Footer on all pages
  const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(
      `Mpesa Foundation Academy  •  Page ${i} of ${pageCount}  •  Official Record`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" }
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`${filename || `MFA_SchoolWide_Reading_Report_${stamp}`}.pdf`);
};

export interface IndividualStudentReportData {
  studentName: string;
  email: string;
  house: string;
  yearGroup: string;
  className: string;
  overallRank: number;
  booksCount: number;
  totalPoints: number;
  level: string;
  challengeTitle: string;
  submissions: { title: string; author: string; category: string; points: number; dateFinished?: string }[];
}

/**
 * Exports an individual student's formatted official ranking transcript / report PDF
 */
export const exportIndividualStudentRankingPDF = (data: IndividualStudentReportData, filename?: string) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(11, 29, 58);
  doc.rect(0, 0, pageWidth, 85, "F");

  // Gold accent rule
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 85, pageWidth, 4, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("MPESA FOUNDATION ACADEMY", 30, 36);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(212, 175, 55);
  doc.text("Official Scholar Reading Transcript & Ranking Report", 30, 54);

  doc.setFontSize(8.5);
  doc.setTextColor(190, 200, 215);
  doc.text(`Session: 2025–2026 Academic Year  •  Verified Academic Record`, 30, 72);

  // Student Identity Box
  let y = 110;
  doc.setFillColor(245, 248, 254);
  doc.roundedRect(30, y, pageWidth - 60, 80, 8, 8, "F");

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(11, 29, 58);
  doc.text(data.studentName.toUpperCase(), 45, y + 28);

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 90, 110);
  doc.text(`Email: ${data.email || "N/A"}   |   House: ${data.house}   |   Year Group: ${data.yearGroup}   |   Class: ${data.className || "General"}`, 45, y + 46);
  doc.text(`Challenge: ${data.challengeTitle}   |   Achievement Level: ${data.level.toUpperCase()}`, 45, y + 64);

  // Key Metrics Strip
  y += 95;
  const colWidth = (pageWidth - 60 - 24) / 3;

  // Box 1: School Rank
  doc.setFillColor(243, 246, 252);
  doc.roundedRect(30, y, colWidth, 48, 6, 6, "F");
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 110, 130);
  doc.text("OVERALL ACADEMY RANK", 42, y + 16);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(212, 175, 55);
  doc.text(`#${data.overallRank}`, 42, y + 38);

  // Box 2: Books Read
  doc.setFillColor(243, 246, 252);
  doc.roundedRect(30 + colWidth + 12, y, colWidth, 48, 6, 6, "F");
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 110, 130);
  doc.text("BOOKS COMPLETED", 42 + colWidth + 12, y + 16);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(13, 138, 74);
  doc.text(String(data.booksCount), 42 + colWidth + 12, y + 38);

  // Box 3: Total Points
  doc.setFillColor(243, 246, 252);
  doc.roundedRect(30 + (colWidth + 12) * 2, y, colWidth, 48, 6, 6, "F");
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 110, 130);
  doc.text("HOUSE POINTS EARNED", 42 + (colWidth + 12) * 2, y + 16);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(11, 29, 58);
  doc.text(`${data.totalPoints} pts`, 42 + (colWidth + 12) * 2, y + 38);

  y += 65;

  // Table of Submissions
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(11, 29, 58);
  doc.text("Completed Book Logs & Reflections", 30, y);

  autoTable(doc, {
    startY: y + 8,
    head: [["#", "Book Title", "Author", "Category", "Points", "Finished Date"]],
    body: (data.submissions || []).map((sub, i) => [
      String(i + 1),
      sub.title,
      sub.author,
      sub.category,
      `${sub.points} pts`,
      sub.dateFinished || "Verified",
    ]),
    margin: { left: 30, right: 30 },
    styles: { fontSize: 8.5, cellPadding: 3.5 },
    headStyles: { fillColor: [11, 29, 58], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 254] },
  });

  const cleanName = data.studentName.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`${filename || `MFA_Student_Ranking_${cleanName}`}.pdf`);
};
