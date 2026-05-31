// Natural Language Processing for AI Assistant
// Provides intelligent query understanding and context-aware responses

import { storage } from "../storage";
import { timetableEngine } from "../timetable";
import { format, isToday, parseISO, startOfWeek, endOfWeek } from "date-fns";

export interface Intent {
  type:
    | "navigation"
    | "attendance_query"
    | "student_query"
    | "timetable_query"
    | "analytics"
    | "greeting"
    | "help"
    | "action"
    | "settings"
    | "search"
    | "unknown";
  confidence: number;
  entities?: Record<string, any>;
}

export interface AIResponse {
  text: string;
  actions?: { label: string; path?: string }[];
  insights?: string[];
}

/**
 * Analyze user input and determine intent
 */
export function analyzeIntent(input: string): Intent {
  const q = input.toLowerCase().trim();
  const words = q.split(/\s+/);

  // Navigation intents
  if (
    q.match(/\b(open|go to|show|navigate|take me)\b.*(analytics|analysis|stats|statistics)/i)
  ) {
    return { type: "navigation", confidence: 0.95, entities: { target: "analytics" } };
  }
  if (q.match(/\b(open|go to|show|navigate)\b.*(student|list|roster)/i)) {
    return { type: "navigation", confidence: 0.95, entities: { target: "students" } };
  }
  if (q.match(/\b(mark|take|record)\b.*attendance/i) || q.includes("open mark")) {
    return { type: "navigation", confidence: 0.95, entities: { target: "mark" } };
  }
  if (q.match(/\b(timetable|schedule|timing)/i)) {
    return { type: "navigation", confidence: 0.9, entities: { target: "timetable" } };
  }
  if (q.match(/\b(setting|profile|account)/i)) {
    return { type: "navigation", confidence: 0.9, entities: { target: "profile" } };
  }
  if (q.match(/\b(home|dashboard|main)/i)) {
    return { type: "navigation", confidence: 0.85, entities: { target: "home" } };
  }

  // Attendance queries
  if (q.match(/\b(absent|absentee|missing|who.*not|didn't come)/i)) {
    return { type: "attendance_query", confidence: 0.95, entities: { query: "absentees" } };
  }
  if (
    q.match(/\b(low|below|poor|less than).*(attendance|percent)/i) ||
    q.includes("attendance alert")
  ) {
    return { type: "attendance_query", confidence: 0.92, entities: { query: "low_attendance" } };
  }
  if (q.match(/\b(how many|count|total).*(present|came|here)/i)) {
    return { type: "attendance_query", confidence: 0.9, entities: { query: "present_count" } };
  }
  if (q.match(/\b(attendance rate|overall|average|percentage)/i)) {
    return { type: "attendance_query", confidence: 0.88, entities: { query: "attendance_rate" } };
  }
  if (q.match(/\b(best|highest|top|excellent).*(attendance|student)/i)) {
    return { type: "student_query", confidence: 0.9, entities: { query: "best_attendance" } };
  }
  if (q.match(/\b(worst|lowest|bottom|poor).*(attendance|student)/i)) {
    return { type: "student_query", confidence: 0.9, entities: { query: "worst_attendance" } };
  }

  // Student queries
  if (q.match(/\b(total|how many|count).*(student|class strength)/i)) {
    return { type: "student_query", confidence: 0.9, entities: { query: "total_students" } };
  }
  if (q.match(/\b(find|search|look).*(student|name|roll)/i)) {
    const nameMatch = q.match(/(?:find|search|look).*(?:student|name).*?([a-z]+)/i);
    const rollMatch = q.match(/roll.*?(\d+)/i);
    return {
      type: "student_query",
      confidence: 0.85,
      entities: {
        query: "find_student",
        name: nameMatch?.[1],
        roll: rollMatch?.[1],
      },
    };
  }

  // Timetable queries
  if (q.match(/\b(next|upcoming|after).*(class|lecture|period)/i)) {
    return { type: "timetable_query", confidence: 0.95, entities: { query: "next_class" } };
  }
  if (
    q.match(/\b(current|now|ongoing|present|which).*(class|lecture|period)/i) ||
    q.includes("what class")
  ) {
    return { type: "timetable_query", confidence: 0.95, entities: { query: "current_class" } };
  }
  if (q.match(/\b(today|today's).*(class|schedule)/i)) {
    return { type: "timetable_query", confidence: 0.9, entities: { query: "today_schedule" } };
  }
  if (q.match(/\b(free|break|lunch|gap)/i)) {
    return { type: "timetable_query", confidence: 0.85, entities: { query: "free_period" } };
  }

  // Analytics
  if (
    q.match(/\b(report|generate|create|export|pdf|summary)/i) &&
    !q.includes("profile")
  ) {
    return { type: "analytics", confidence: 0.9, entities: { query: "generate_report" } };
  }
  if (q.match(/\b(trend|pattern|analysis|insight)/i)) {
    return { type: "analytics", confidence: 0.85, entities: { query: "trends" } };
  }

  // Greetings
  if (q.match(/^(hi|hello|hey|good morning|good afternoon|good evening|greetings)/i)) {
    return { type: "greeting", confidence: 1.0 };
  }

  // Help
  if (q.match(/\b(help|what can you|capabilities|features|assist)/i)) {
    return { type: "help", confidence: 0.95 };
  }

  // Actions
  if (q.match(/\b(mark all present|mark everyone present|all present)/i)) {
    return { type: "action", confidence: 0.95, entities: { action: "mark_all_present" } };
  }
  if (q.match(/\b(send report|share report|email report)/i)) {
    return { type: "action", confidence: 0.9, entities: { action: "send_report" } };
  }
  if (q.match(/\b(backup|backup data|export data|save data)/i)) {
    return { type: "action", confidence: 0.9, entities: { action: "backup_data" } };
  }
  if (q.match(/\b(open notifications|show notifications|check notifications)/i)) {
    return { type: "action", confidence: 0.9, entities: { action: "open_notifications" } };
  }

  // Settings
  if (q.match(/\b(enable|turn on|activate).*(dark mode|dark theme)/i)) {
    return { type: "settings", confidence: 0.95, entities: { setting: "dark_mode", value: true } };
  }
  if (q.match(/\b(disable|turn off|deactivate).*(dark mode|dark theme|light mode)/i)) {
    return { type: "settings", confidence: 0.95, entities: { setting: "dark_mode", value: false } };
  }
  if (q.match(/\b(enable|turn on|activate).*(voice|voice alerts|tts)/i)) {
    return { type: "settings", confidence: 0.9, entities: { setting: "voice_alerts", value: true } };
  }
  if (q.match(/\b(disable|turn off|deactivate|mute).*(voice|voice alerts|tts)/i)) {
    return { type: "settings", confidence: 0.9, entities: { setting: "voice_alerts", value: false } };
  }
  if (q.match(/\b(enable|turn on).*(sounds|sound effects)/i)) {
    return { type: "settings", confidence: 0.9, entities: { setting: "sounds", value: true } };
  }
  if (q.match(/\b(disable|turn off|mute).*(sounds|sound effects)/i)) {
    return { type: "settings", confidence: 0.9, entities: { setting: "sounds", value: false } };
  }

  // Search
  if (q.match(/\b(search|find|look for).*(student)/i)) {
    const nameMatch = q.match(/(?:search|find|look for).*student.*?([a-z]+)/i);
    return {
      type: "search",
      confidence: 0.85,
      entities: { type: "student", query: nameMatch?.[1] || "" },
    };
  }

  return { type: "unknown", confidence: 0 };
}

/**
 * Generate intelligent, context-aware response
 */
export function generateResponse(input: string, intent: Intent): AIResponse {
  const students = storage.getStudents();
  const attendance = storage.getAttendance();
  const today = format(new Date(), "yyyy-MM-dd");
  const todayAttendance = attendance[today];

  switch (intent.type) {
    case "navigation":
      return handleNavigation(intent.entities?.target);

    case "attendance_query":
      return handleAttendanceQuery(
        intent.entities?.query,
        students,
        attendance,
        todayAttendance
      );

    case "student_query":
      return handleStudentQuery(
        intent.entities?.query,
        students,
        attendance,
        intent.entities
      );

    case "timetable_query":
      return handleTimetableQuery(intent.entities?.query);

    case "analytics":
      return handleAnalytics(intent.entities?.query, students, attendance);

    case "greeting":
      return handleGreeting();

    case "help":
      return handleHelp();

    case "action":
      return handleAction(intent.entities?.action);

    case "settings":
      return handleSettings(intent.entities?.setting, intent.entities?.value);

    case "search":
      return handleSearch(intent.entities?.type, intent.entities?.query, students);

    default:
      return handleUnknown(input);
  }
}

function handleAction(action: string): AIResponse {
  switch (action) {
    case "mark_all_present":
      return {
        text: "📝 To mark all students present, go to the Mark Attendance page and use the 'Mark All Present' button.\n\nThis will mark all students as present for the current period.",
        actions: [{ label: "Mark Attendance", path: "/app/mark" }],
        insights: ["💡 You can also use bulk actions to mark attendance quickly"],
      };

    case "send_report":
      return {
        text: "📊 You can generate and share attendance reports from the Analytics page.\n\nChoose from PDF export or WhatsApp sharing options.",
        actions: [{ label: "Go to Analytics", path: "/app/analytics" }],
      };

    case "backup_data":
      return {
        text: "💾 Backup your data to avoid any loss!\n\nGo to Profile → Data Management → Backup Data to create a backup file.",
        actions: [{ label: "Open Profile", path: "/app/profile" }],
        insights: ["Regular backups ensure your data is safe"],
      };

    case "open_notifications":
      return {
        text: "🔔 Notifications are accessible from the bell icon on your dashboard.",
        insights: ["Check notifications regularly for important alerts"],
      };

    default:
      return { text: "I can help you with various actions. Try asking about marking attendance, sending reports, or backing up data." };
  }
}

function handleSettings(setting: string, value: boolean): AIResponse {
  switch (setting) {
    case "dark_mode":
      return {
        text: `${value ? "🌙" : "☀️"} To ${value ? "enable" : "disable"} dark mode, go to Profile → Appearance → Theme and toggle between Light and Dark modes.`,
        actions: [{ label: "Open Settings", path: "/app/profile" }],
      };

    case "voice_alerts":
      return {
        text: `🔊 To ${value ? "enable" : "disable"} voice alerts, go to Profile → Appearance → Voice Alerts and toggle the switch.`,
        actions: [{ label: "Open Settings", path: "/app/profile" }],
      };

    case "sounds":
      return {
        text: `${value ? "🔊" : "🔇"} To ${value ? "enable" : "disable"} sound effects, go to Profile → Appearance → Sound Effects.`,
        actions: [{ label: "Open Settings", path: "/app/profile" }],
      };

    default:
      return {
        text: "You can adjust various settings from the Profile page, including theme, sounds, haptics, and voice alerts.",
        actions: [{ label: "Open Profile", path: "/app/profile" }],
      };
  }
}

function handleSearch(type: string, query: string, students: any[]): AIResponse {
  if (type === "student") {
    if (!query) {
      return {
        text: "Please specify a student name or roll number to search for.",
        actions: [{ label: "View All Students", path: "/app/students" }],
      };
    }

    const found = students.find(
      (s: any) =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.rollNo?.toString().toLowerCase().includes(query.toLowerCase())
    );

    if (found) {
      const total = (found.present || 0) + (found.absent || 0);
      const pct = total > 0 ? Math.round(((found.present || 0) / total) * 100) : 0;

      return {
        text: `Found: ${found.name}\n🔢 Roll: ${found.rollNo}\n📊 Attendance: ${pct}%\n📧 ${found.email || "No email"}\n📱 ${found.phone || "No phone"}`,
        actions: [{ label: "View Full Profile", path: "/app/students" }],
      };
    }

    return {
      text: `No student found matching "${query}". Try searching from the Students page for more options.`,
      actions: [{ label: "Open Students", path: "/app/students" }],
    };
  }

  return { text: "I can help you search for students. Try asking 'Find student [name]'." };
}

function handleNavigation(target: string): AIResponse {
  const routes: Record<string, { path: string; message: string }> = {
    analytics: {
      path: "/app/analytics",
      message: "Opening Analytics dashboard where you can view detailed attendance reports and trends...",
    },
    students: {
      path: "/app/students",
      message: "Taking you to the Students page to manage your class roster...",
    },
    mark: { path: "/app/mark", message: "Let's mark today's attendance..." },
    timetable: { path: "/app/timetable", message: "Loading your class timetable..." },
    profile: { path: "/app/profile", message: "Opening Profile & Settings..." },
    home: { path: "/app", message: "Returning to Dashboard..." },
  };

  const route = routes[target];
  if (!route) {
    return { text: "I'm not sure where you want to go. Could you be more specific?" };
  }

  return {
    text: route.message,
    actions: [{ label: `Go to ${target.charAt(0).toUpperCase() + target.slice(1)}`, path: route.path }],
  };
}

function handleAttendanceQuery(
  query: string,
  students: any[],
  attendance: any,
  todayAttendance: any
): AIResponse {
  switch (query) {
    case "absentees": {
      if (!todayAttendance?.records?.length) {
        return {
          text: "No attendance has been marked today yet. Would you like to mark it now?",
          actions: [{ label: "Mark Attendance", path: "/app/mark" }],
          insights: ["💡 Regular attendance tracking helps identify patterns early"],
        };
      }

      const absentees = students.filter((s: any) => {
        const rec = todayAttendance.records.find((r: any) => r.studentId === s.id);
        return rec?.status === "absent";
      });

      if (absentees.length === 0) {
        return {
          text: "🎉 Excellent! Full attendance today! All students are present.",
          insights: ["✨ Great achievement! Consider recognizing the class for their dedication."],
        };
      }

      const names = absentees
        .slice(0, 10)
        .map((s: any) => `• ${s.name} (Roll ${s.rollNo})`)
        .join("\n");
      const more = absentees.length > 10 ? `\n...and ${absentees.length - 10} more` : "";

      const absentPercent = Math.round((absentees.length / students.length) * 100);

      return {
        text: `📊 ${absentees.length} student${absentees.length > 1 ? "s" : ""} absent today (${absentPercent}% absence rate):\n\n${names}${more}`,
        insights: absentPercent > 25
          ? ["⚠️ High absence rate detected. Consider investigating if there's a common issue."]
          : [],
        actions: [{ label: "View Details", path: "/app/analytics" }],
      };
    }

    case "low_attendance": {
      const lowStudents = students.filter((s: any) => {
        const total = (s.present || 0) + (s.absent || 0);
        return total > 5 && (s.present || 0) / total < 0.75;
      });

      if (lowStudents.length === 0) {
        return {
          text: "🌟 Great news! All students have attendance above 75%. Your class is performing excellently!",
          insights: ["Keep up the momentum with consistent tracking and positive reinforcement."],
        };
      }

      const list = lowStudents.slice(0, 8).map((s: any) => {
        const total = (s.present || 0) + (s.absent || 0);
        const pct = Math.round(((s.present || 0) / total) * 100);
        return `• ${s.name} — ${pct}% (${s.absent || 0} absences)`;
      }).join("\n");

      return {
        text: `⚠️ Attention needed: ${lowStudents.length} student${lowStudents.length > 1 ? "s" : ""} below 75% threshold:\n\n${list}`,
        insights: [
          "Consider reaching out to these students individually",
          "Check if there are common patterns (same day absences, etc.)",
        ],
        actions: [{ label: "Generate Report", path: "/app/analytics" }],
      };
    }

    case "present_count": {
      if (!todayAttendance?.records?.length) {
        return {
          text: `Total class strength: ${students.length} students.\n\n📝 No attendance marked today yet.`,
          actions: [{ label: "Mark Now", path: "/app/mark" }],
        };
      }

      const presentCount = todayAttendance.records.filter(
        (r: any) => r.status === "present"
      ).length;
      const total = students.length;
      const pct = total > 0 ? Math.round((presentCount / total) * 100) : 0;

      const rating =
        pct >= 90 ? "Excellent 🌟" : pct >= 75 ? "Good 👍" : pct >= 60 ? "Fair ⚠️" : "Needs Attention 🚨";

      return {
        text: `📊 Today's Attendance Summary:\n\n✓ Present: ${presentCount}/${total} students\n📈 Attendance Rate: ${pct}%\n📌 Status: ${rating}`,
        insights:
          pct < 75
            ? ["Below 75% threshold. Consider following up with absentees."]
            : pct >= 95
            ? ["Outstanding attendance! 🎉"]
            : [],
      };
    }

    case "attendance_rate": {
      // Calculate overall class attendance rate
      let totalDays = 0;
      let totalPresent = 0;
      let totalPossible = 0;

      Object.keys(attendance).forEach((date) => {
        if (attendance[date]?.records?.length) {
          totalDays++;
          const present = attendance[date].records.filter((r: any) => r.status === "present")
            .length;
          totalPresent += present;
          totalPossible += students.length;
        }
      });

      if (totalDays === 0) {
        return { text: "No attendance records found yet. Start marking attendance to see trends!" };
      }

      const overallPct = Math.round((totalPresent / totalPossible) * 100);

      return {
        text: `📊 Overall Attendance Analytics:\n\n📅 Days Tracked: ${totalDays}\n✓ Total Present: ${totalPresent}/${totalPossible}\n📈 Average Rate: ${overallPct}%\n\n${overallPct >= 85 ? "🌟 Excellent performance!" : overallPct >= 75 ? "👍 On track!" : "⚠️ Needs improvement"}`,
        actions: [{ label: "View Detailed Analytics", path: "/app/analytics" }],
      };
    }

    default:
      return { text: "I can help you with attendance queries. Try asking about absentees, attendance rates, or students with low attendance." };
  }
}

function handleStudentQuery(
  query: string,
  students: any[],
  attendance: any,
  entities: any
): AIResponse {
  switch (query) {
    case "total_students":
      return {
        text: `Your class has ${students.length} student${students.length !== 1 ? "s" : ""} enrolled.`,
        actions: [{ label: "View All Students", path: "/app/students" }],
      };

    case "best_attendance": {
      const ranked = students
        .map((s: any) => {
          const total = (s.present || 0) + (s.absent || 0);
          const pct = total > 0 ? (s.present || 0) / total : 0;
          return { ...s, pct, total };
        })
        .filter((s) => s.total >= 3)
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 5);

      if (ranked.length === 0) {
        return { text: "Not enough attendance data yet to determine top performers." };
      }

      const list = ranked
        .map(
          (s: any, i: number) =>
            `${i + 1}. ${s.name} — ${Math.round(s.pct * 100)}% (${s.present}/${s.total})`
        )
        .join("\n");

      return {
        text: `🏆 Top ${ranked.length} Students by Attendance:\n\n${list}`,
        insights: ["Consider recognizing these students for their consistency!"],
      };
    }

    case "worst_attendance": {
      const ranked = students
        .map((s: any) => {
          const total = (s.present || 0) + (s.absent || 0);
          const pct = total > 0 ? (s.present || 0) / total : 0;
          return { ...s, pct, total };
        })
        .filter((s) => s.total >= 3)
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 5);

      if (ranked.length === 0) {
        return { text: "Not enough attendance data yet." };
      }

      const list = ranked
        .map(
          (s: any) =>
            `• ${s.name} — ${Math.round(s.pct * 100)}% (${s.absent} absences)`
        )
        .join("\n");

      return {
        text: `⚠️ Students Needing Attention:\n\n${list}`,
        insights: ["Reach out to these students to understand any challenges they might be facing."],
        actions: [{ label: "View Analytics", path: "/app/analytics" }],
      };
    }

    case "find_student": {
      // Simple student search
      const searchTerm = entities.name || entities.roll;
      if (!searchTerm) {
        return { text: "Please specify a student name or roll number to search for." };
      }

      const found = students.find(
        (s: any) =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.rollNo?.toString() === searchTerm
      );

      if (!found) {
        return { text: `No student found matching "${searchTerm}".` };
      }

      const total = (found.present || 0) + (found.absent || 0);
      const pct = total > 0 ? Math.round(((found.present || 0) / total) * 100) : 0;

      return {
        text: `👤 Student: ${found.name}\n🔢 Roll No: ${found.rollNo}\n📊 Attendance: ${pct}% (${found.present}/${total})\n${found.email ? `📧 ${found.email}` : ""}`,
        actions: [{ label: "View Full Profile", path: "/app/students" }],
      };
    }

    default:
      return { text: "I can help you find student information. Try asking about specific students or class statistics." };
  }
}

function handleTimetableQuery(query: string): AIResponse {
  const schedule = timetableEngine.getTodaySchedule();
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  switch (query) {
    case "next_class": {
      const next = schedule.find((p: any) => {
        const [h, m] = (p.startTime || "").split(":").map(Number);
        return h * 60 + m > nowMins;
      });

      if (!next) {
        return {
          text: "🏠 No more classes today! College schedule has ended.\n\nEnjoy your free time!",
        };
      }

      const timeUntil = getTimeUntil(next.startTime);

      return {
        text: `📚 Next Class (${timeUntil}):\n\n${next.subjectName}\n⏰ ${next.startTime} - ${next.endTime}\n👨‍🏫 ${next.facultyName || "TBD"}\n📍 ${next.classroom || "TBD"}`,
        actions: [{ label: "View Full Timetable", path: "/app/timetable" }],
      };
    }

    case "current_class": {
      const current = schedule.find((p: any) => {
        const [sh, sm] = (p.startTime || "").split(":").map(Number);
        const [eh, em] = (p.endTime || "").split(":").map(Number);
        return nowMins >= sh * 60 + sm && nowMins < eh * 60 + em;
      });

      if (!current) {
        return {
          text: "🕐 No class ongoing right now. It might be a break, lunch, or free period.",
          insights: ["Check your timetable for the next scheduled class."],
          actions: [{ label: "View Timetable", path: "/app/timetable" }],
        };
      }

      const timeLeft = getTimeLeft(current.endTime);

      return {
        text: `🎓 Currently Ongoing (${timeLeft} left):\n\n${current.subjectName}\n⏰ ${current.startTime} - ${current.endTime}\n👨‍🏫 ${current.facultyName || "TBD"}\n📍 ${current.classroom || "TBD"}`,
      };
    }

    case "today_schedule": {
      if (schedule.length === 0) {
        return { text: "No classes scheduled for today! It might be a holiday or weekend." };
      }

      const summary = schedule
        .slice(0, 6)
        .map((p: any) => `• ${p.startTime} - ${p.subjectName}`)
        .join("\n");
      const more = schedule.length > 6 ? `\n...and ${schedule.length - 6} more` : "";

      return {
        text: `📅 Today's Schedule (${schedule.length} classes):\n\n${summary}${more}`,
        actions: [{ label: "View Full Timetable", path: "/app/timetable" }],
      };
    }

    case "free_period": {
      const gaps = findGaps(schedule, nowMins);
      if (gaps.length === 0) {
        return { text: "No free periods detected in today's schedule." };
      }

      const gapText = gaps
        .map((g) => `• ${g.start} - ${g.end} (${g.duration} min)`)
        .join("\n");

      return { text: `⏸️ Free Periods Today:\n\n${gapText}` };
    }

    default:
      return {
        text: "I can help with your timetable. Ask about current class, next class, or today's schedule.",
      };
  }
}

function handleAnalytics(query: string, students: any[], attendance: any): AIResponse {
  if (query === "generate_report") {
    return {
      text: "📄 I can help you generate a comprehensive attendance report.\n\nHead to Analytics to export a PDF with full statistics, trends, and student-wise breakdown.",
      actions: [{ label: "Open Analytics", path: "/app/analytics" }],
    };
  }

  if (query === "trends") {
    const dates = Object.keys(attendance).sort();
    if (dates.length < 3) {
      return {
        text: "Not enough data yet to identify trends. Keep marking attendance regularly to see patterns!",
      };
    }

    const recentDates = dates.slice(-7);
    const avgRecent = recentDates.reduce((sum, date) => {
      const present = attendance[date]?.records?.filter((r: any) => r.status === "present")
        .length || 0;
      return sum + (present / students.length) * 100;
    }, 0) / recentDates.length;

    const trend = avgRecent >= 85 ? "📈 Improving" : avgRecent >= 75 ? "➡️ Stable" : "📉 Declining";

    return {
      text: `📊 Attendance Trends:\n\n📅 Last ${recentDates.length} days average: ${Math.round(avgRecent)}%\n📈 Trend: ${trend}`,
      actions: [{ label: "Detailed Analytics", path: "/app/analytics" }],
    };
  }

  return { text: "I can provide analytics and insights. Ask about trends, reports, or specific metrics." };
}

function handleGreeting(): AIResponse {
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return {
    text: `${greet}! 👋\n\nI'm your AI attendance assistant. I can help you with:\n\n📊 Attendance tracking & insights\n👥 Student information\n📅 Timetable queries\n📈 Analytics & reports\n\nWhat would you like to know?`,
  };
}

function handleHelp(): AIResponse {
  return {
    text: `💡 I can assist you with:\n\n📊 **Attendance**\n"Show absentees today"\n"Who has low attendance?"\n"Count present students"\n\n📅 **Timetable**\n"What's my next class?"\n"Current class details"\n"Free periods today"\n\n👥 **Students**\n"Find student [name]"\n"Top performers"\n"Class strength"\n\n📈 **Analytics**\n"Generate report"\n"Attendance trends"\n\nJust ask naturally!`,
  };
}

function handleUnknown(input: string): AIResponse {
  return {
    text: "I'm not sure about that. I can help with:\n• Attendance queries\n• Student information\n• Timetable details\n• Analytics & reports\n\nTry asking something like \"Show absentees\" or \"What's my next class?\"",
    insights: ["💡 Tip: Type 'help' to see all available commands"],
  };
}

// Helper functions
function getTimeUntil(time: string): string {
  const now = new Date();
  const [h, m] = time.split(":").map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0);
  const diff = Math.floor((target.getTime() - now.getTime()) / 60000);

  if (diff < 1) return "starting now";
  if (diff < 60) return `in ${diff} min`;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return `in ${hours}h ${mins}m`;
}

function getTimeLeft(endTime: string): string {
  const now = new Date();
  const [h, m] = endTime.split(":").map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0);
  const diff = Math.floor((target.getTime() - now.getTime()) / 60000);

  if (diff < 1) return "ending soon";
  if (diff < 60) return `${diff} min`;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hours}h ${mins}m`;
}

function findGaps(schedule: any[], nowMins: number): any[] {
  const gaps: any[] = [];
  for (let i = 0; i < schedule.length - 1; i++) {
    const [eh, em] = schedule[i].endTime.split(":").map(Number);
    const [sh, sm] = schedule[i + 1].startTime.split(":").map(Number);
    const gap = sh * 60 + sm - (eh * 60 + em);
    if (gap > 15) {
      gaps.push({
        start: schedule[i].endTime,
        end: schedule[i + 1].startTime,
        duration: gap,
      });
    }
  }
  return gaps;
}
