const STEPS = [
  "リサーチ・ネタ発掘中",
  "企画・スケジューリング中",
  "原稿執筆・素材ディレクション中",
  "コンプライアンス確認中",
];

export default function AgentPipelineStatus({ activeStep }: { activeStep: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-sm font-semibold text-gray-700 mb-3">AI編集会議 進行中...</p>
      <ol className="space-y-2">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-2 text-sm">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                i < activeStep
                  ? "bg-green-500 text-white"
                  : i === activeStep
                    ? "bg-blue-500 text-white animate-pulse"
                    : "bg-gray-200 text-gray-500"
              }`}
            >
              {i < activeStep ? "✓" : i + 1}
            </span>
            <span className={i <= activeStep ? "text-gray-800" : "text-gray-400"}>
              {step}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
