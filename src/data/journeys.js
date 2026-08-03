/* journeys.js
   One entry per journey. This is the file to edit when adding a new journey.

   h is relative motion volume, 0 to 1. It is relative within this journey only:
   a peak here is not the same loudness as a peak in another journey.

   Shape rule: open moderately high, drop to the quietest point while the user
   is working, rise to a single peak where they commit. No tail after the peak.

   match is optional. Words that suggest a frame belongs to this stage.
   Used when there is no API key, and as a hint to Claude when there is one. */

window.JOURNEYS = {
  assistant: {
    name: "AIA+ AI Assistant",
    stages: [
      { id: "Welcome", h: .74, plain: "The assistant introduces itself",
        match: ["welcome", "how can i help", "entry", "home", "intro", "start"] },
      { id: "Ask",     h: .12, plain: "The user gives information",
        match: ["ask", "compose", "input", "keyboard", "type", "prompt"] },
      { id: "Await",   h: .34, plain: "The system is working",
        match: ["think", "process", "loading", "reason", "search"] },
      { id: "Answer",  h: .58, plain: "The result comes back",
        match: ["answer", "response", "result", "summary", "shortlist", "option"] },
      { id: "Confirm", h: 1,   plain: "The user commits and it is done", lead: true,
        match: ["confirm", "submit", "booked", "success", "complete", "done"] }
    ]
  },

  bookDoctorAI: {
    name: "Find and book a doctor, with AI",
    stages: [
      { id: "Welcome",   h: .74, plain: "The assistant offers to help", 
        match: ["how can i help", "ask ai", "assistant", "entry", "welcome"] },
      { id: "Ask",       h: .12, plain: "The user says what they need",
        match: ["compose", "keyboard", "type", "input", "prompt"] },
      { id: "Await",     h: .34, plain: "The assistant searches and reasons",
        match: ["think", "reason", "locating", "evaluating", "identifying", "searching"] },
      { id: "Shortlist", h: .58, plain: "Doctors come back with a map",
        match: ["shortlist", "doctor", "map", "result", "detail", "book doctor"] },
      { id: "Confirm",   h: 1,   plain: "The appointment is booked", lead: true,
        match: ["booked", "confirm", "consultation", "appointment", "success"] }
    ]
  },

  findDoctorManual: {
    name: "Find and book a doctor, manually",
    stages: [
      { id: "Entry",   h: .68, plain: "The user opens find a doctor",
        match: ["welcome", "home", "healthcare", "quick access", "entry"] },
      { id: "Filter",  h: .12, plain: "The user sets what they are looking for",
        match: ["what are you looking for", "filter", "sorting", "select", "location", "search"] },
      { id: "Results", h: .40, plain: "Doctors are listed and mapped",
        match: ["find doctors", "result", "map", "pre-selected", "list"] },
      { id: "Detail",  h: .56, plain: "The user reads one doctor and picks a slot",
        match: ["doctor details", "book doctor", "visit date", "select the visit"] },
      { id: "Confirm", h: 1,   plain: "The booking is confirmed", lead: true,
        match: ["check and confirm", "you've booked", "booked", "confirm", "success"] }
    ]
  },

  claim: {
    name: "Submit a claim",
    stages: [
      { id: "Start",   h: .66, plain: "The user opens the claim form",
        match: ["start", "home", "claim", "entry"] },
      { id: "Fill",    h: .12, plain: "The user enters details",
        match: ["fill", "form", "input", "details", "enter"] },
      { id: "Upload",  h: .32, plain: "The user attaches documents",
        match: ["upload", "attach", "receipt", "document", "photo"] },
      { id: "Review",  h: .56, plain: "The user checks before sending",
        match: ["review", "summary", "check", "before"] },
      { id: "Confirm", h: 1,   plain: "The claim is submitted", lead: true,
        match: ["confirm", "submit", "success", "submitted", "done"] }
    ]
  },

  policy: {
    name: "View policy details",
    stages: [
      { id: "Enter",  h: .68, plain: "The user opens the policy",
        match: ["enter", "home", "policy", "overview"] },
      { id: "Browse", h: .14, plain: "The user scans sections",
        match: ["browse", "list", "sections", "scan"] },
      { id: "Detail", h: .42, plain: "The user opens one section",
        match: ["detail", "coverage", "benefit", "document"] },
      { id: "Act",    h: 1,   plain: "The user does something with it", lead: true,
        match: ["act", "download", "share", "claim", "contact"] }
    ]
  },

  vitality: {
    name: "Vitality assessment",
    stages: [
      { id: "Welcome", h: .72, plain: "The assessment is introduced",
        match: ["welcome", "intro", "start", "begin"] },
      { id: "Assess",  h: .12, plain: "The user answers questions",
        match: ["assess", "question", "step", "answer", "form"] },
      { id: "Await",   h: .36, plain: "The score is calculated",
        match: ["calculat", "loading", "processing", "thinking"] },
      { id: "Result",  h: 1,   plain: "The user sees their score", lead: true,
        match: ["result", "score", "your", "outcome"] }
    ]
  }
};

/* GOALS: how the journey should leave someone feeling. Multi-select. */
window.GOALS = [
  { v: "reassured",  l: "Reassured",  sub: "Nothing went wrong, and they know it" },
  { v: "incontrol",  l: "In control", sub: "They understand what happens next" },
  { v: "relieved",   l: "Relieved",   sub: "Something difficult is now handled" },
  { v: "recognised", l: "Recognised", sub: "Their effort was seen" },
  { v: "confident",  l: "Confident",  sub: "They trust the result is correct" }
];
