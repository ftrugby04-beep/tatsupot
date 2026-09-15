"use client";

import { useEffect, useRef, useState } from "react";
import { TranscriptSegment } from "@/lib/types";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  [index: number]: { transcript: string };
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: SpeechRecognitionResultLike[] }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export default function RecordingPanel({
  onTranscriptChange,
  onRecordingStateChange,
}: {
  onTranscriptChange: (segments: TranscriptSegment[]) => void;
  onRecordingStateChange?: (recording: boolean) => void;
}) {
  const [supported] = useState(
    () => typeof window !== "undefined" && !!(window.SpeechRecognition ?? window.webkitSpeechRecognition)
  );
  const [recording, setRecording] = useState(false);
  const [speakers, setSpeakers] = useState<string[]>(["自分", "参加者A"]);
  const [currentSpeaker, setCurrentSpeaker] = useState("自分");
  const [newSpeaker, setNewSpeaker] = useState("");
  const [interim, setInterim] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const shouldListenRef = useRef(false);
  const currentSpeakerRef = useRef(currentSpeaker);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    currentSpeakerRef.current = currentSpeaker;
  }, [currentSpeaker]);

  const appendSegment = (text: string) => {
    const seg: TranscriptSegment = {
      speaker: currentSpeakerRef.current,
      text,
      timestamp: Date.now() - startTimeRef.current,
    };
    setSegments((prev) => {
      const next = [...prev, seg];
      onTranscriptChange(next);
      return next;
    });
  };

  const startRecognition = () => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = "ja-JP";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          appendSegment(text.trim());
        } else {
          interimText += text;
        }
      }
      setInterim(interimText);
    };
    recognition.onerror = () => {
      // ignore transient errors (e.g. no-speech); onend will trigger restart if still listening
    };
    recognition.onend = () => {
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch {
          // already started
        }
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
    } catch {
      alert("マイクへのアクセスが許可されませんでした。");
      return;
    }

    startTimeRef.current = Date.now();
    shouldListenRef.current = true;
    setRecording(true);
    onRecordingStateChange?.(true);
    startRecognition();

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  };

  const handleStop = () => {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    setInterim("");
    onRecordingStateChange?.(false);
  };

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const addSpeaker = () => {
    const name = newSpeaker.trim();
    if (!name || speakers.includes(name)) return;
    setSpeakers([...speakers, name]);
    setNewSpeaker("");
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (!supported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        お使いのブラウザはリアルタイム音声認識(Web Speech API)に対応していません。Google
        Chromeでの利用を推奨します。下の「テキストで入力」から議事録テキストを直接貼り付けることもできます。
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={recording ? handleStop : handleStart}
            className={`px-5 py-2.5 rounded-xl font-semibold text-white ${
              recording ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {recording ? "■ 録音を停止" : "🎙️ 録音を開始"}
          </button>
          {recording && (
            <span className="flex items-center gap-1.5 text-red-600 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              録音中 {formatTime(elapsed)}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">
          雑音除去・エコーキャンセル ON / ノイズ抑制 ON
        </span>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">発言者を選択（クリックで切り替え）</p>
        <div className="flex flex-wrap gap-2">
          {speakers.map((sp) => (
            <button
              key={sp}
              onClick={() => setCurrentSpeaker(sp)}
              className={`px-3 py-1.5 rounded-full text-sm border ${
                currentSpeaker === sp
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
              }`}
            >
              {sp}
            </button>
          ))}
          <input
            value={newSpeaker}
            onChange={(e) => setNewSpeaker(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSpeaker()}
            placeholder="+参加者を追加"
            className="px-3 py-1.5 rounded-full text-sm border border-dashed border-gray-300 w-32 focus:outline-none"
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          ※ 現在は話者の自動識別（ダイアライゼーション）は未対応のため、手動切り替えで発言者を記録します。
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 h-56 overflow-y-auto text-sm space-y-1.5">
        {segments.length === 0 && !interim && (
          <p className="text-gray-400">録音を開始すると、ここに文字起こしが表示されます。</p>
        )}
        {segments.map((s, i) => (
          <p key={i}>
            <span className="font-semibold text-blue-700">{s.speaker}: </span>
            <span className="text-gray-800">{s.text}</span>
          </p>
        ))}
        {interim && (
          <p className="text-gray-400 italic">
            <span className="font-semibold">{currentSpeaker}: </span>
            {interim}
          </p>
        )}
      </div>
    </div>
  );
}
