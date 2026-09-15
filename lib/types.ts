export type TranscriptSegment = {
  speaker: string;
  text: string;
  timestamp: number; // ms from meeting start
};

export type ActionItemStatus = "todo" | "doing" | "done";

export type ActionItem = {
  id: string;
  who: string;
  what: string;
  when: string; // free text due date, e.g. "金曜まで"
  whenISO?: string | null; // best-effort parsed ISO date, for reminders/calendar
  status: ActionItemStatus;
};

export type QAItem = {
  question: string;
  answer: string;
};

export type DealCoachResult = {
  score: number; // 0-100
  good: string[];
  improve: string[];
  interestLevel: string; // e.g. "高" / "中" / "低"
  winProbability: number; // 0-100
  nextActions: string[];
};

export type MinutesResult = {
  summary: string;
  decisions: string[];
  actionItems: ActionItem[];
  openIssues: string[];
  questions: QAItem[];
  keywords: string[];
  nextAgenda: string[];
  dealCoach?: DealCoachResult;
  discrepancies?: string[];
  generatedAt: string;
};

export type MeetingDocument = {
  id: string;
  name: string;
  text: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type Meeting = {
  id: string;
  title: string;
  company: string;
  createdAt: string;
  transcript: TranscriptSegment[];
  documents: MeetingDocument[];
  minutes?: MinutesResult;
  chatHistory: ChatMessage[];
  slackWebhookUrl?: string;
  isDealMeeting: boolean;
};

export function transcriptToText(transcript: TranscriptSegment[]): string {
  return transcript.map((s) => `${s.speaker}: ${s.text}`).join("\n");
}
