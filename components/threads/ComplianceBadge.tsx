import { ComplianceResult } from "@/lib/threads-types";

export default function ComplianceBadge({
  compliance,
}: {
  compliance?: ComplianceResult;
}) {
  if (!compliance) {
    return (
      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
        未チェック
      </span>
    );
  }

  const { riskScore } = compliance;
  const color =
    riskScore >= 60
      ? "bg-red-100 text-red-700"
      : riskScore >= 30
        ? "bg-yellow-100 text-yellow-700"
        : "bg-green-100 text-green-700";

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
      Risk {riskScore}/100
    </span>
  );
}
