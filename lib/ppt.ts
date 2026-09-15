import type PptxGenJS from "pptxgenjs";
import { Meeting } from "./types";

export type PptMode = "proposal" | "review" | "report";

const MODE_LABEL: Record<PptMode, string> = {
  proposal: "提案資料",
  review: "振り返り資料",
  report: "上司報告",
};

export async function generatePptx(meeting: Meeting, mode: PptMode) {
  const pptxgen = (await import("pptxgenjs")).default;
  const pptx = new pptxgen();
  const minutes = meeting.minutes;
  if (!minutes) throw new Error("議事録が未生成です");

  const dateLabel = new Date(meeting.createdAt).toLocaleDateString("ja-JP");

  const title = pptx.addSlide();
  title.addText(meeting.title, { x: 0.5, y: 1.5, w: 9, h: 1, fontSize: 32, bold: true });
  title.addText(`${meeting.company || ""}　${dateLabel}　${MODE_LABEL[mode]}`, {
    x: 0.5,
    y: 2.6,
    w: 9,
    h: 0.5,
    fontSize: 16,
    color: "666666",
  });

  if (mode === "report") {
    // 上司報告モード: 結論・数字・課題中心の1ページ
    const slide = pptx.addSlide();
    slide.addText("結論・要点", { x: 0.4, y: 0.3, w: 9, h: 0.5, fontSize: 22, bold: true });
    slide.addText(minutes.summary, { x: 0.4, y: 0.9, w: 9.2, h: 1.3, fontSize: 14 });

    slide.addText("決定事項", { x: 0.4, y: 2.3, w: 4.4, h: 0.4, fontSize: 16, bold: true, color: "1D4ED8" });
    slide.addText(bulletText(minutes.decisions), { x: 0.4, y: 2.7, w: 4.4, h: 1.8, fontSize: 12 });

    slide.addText("課題・未決事項", { x: 5.0, y: 2.3, w: 4.6, h: 0.4, fontSize: 16, bold: true, color: "B91C1C" });
    slide.addText(bulletText(minutes.openIssues), { x: 5.0, y: 2.7, w: 4.6, h: 1.8, fontSize: 12 });

    slide.addText("キーワード / 数字", { x: 0.4, y: 4.6, w: 9.2, h: 0.4, fontSize: 16, bold: true });
    slide.addText(minutes.keywords.join("　/　"), { x: 0.4, y: 5.0, w: 9.2, h: 0.8, fontSize: 12 });
    return finish(pptx, meeting, mode);
  }

  const summarySlide = pptx.addSlide();
  summarySlide.addText("会議の要約", { x: 0.4, y: 0.3, w: 9, h: 0.5, fontSize: 22, bold: true });
  summarySlide.addText(minutes.summary, { x: 0.4, y: 0.9, w: 9.2, h: 3, fontSize: 16 });

  const decisionsSlide = pptx.addSlide();
  decisionsSlide.addText("決定事項", { x: 0.4, y: 0.3, w: 9, h: 0.5, fontSize: 22, bold: true });
  decisionsSlide.addText(bulletText(minutes.decisions), { x: 0.4, y: 0.9, w: 9.2, h: 4, fontSize: 16 });

  const todoSlide = pptx.addSlide();
  todoSlide.addText("ToDo一覧", { x: 0.4, y: 0.3, w: 9, h: 0.5, fontSize: 22, bold: true });
  if (minutes.actionItems.length > 0) {
    todoSlide.addTable(
      [
        [{ text: "担当", options: { bold: true } }, { text: "内容", options: { bold: true } }, { text: "期限", options: { bold: true } }],
        ...minutes.actionItems.map((a) => [{ text: a.who }, { text: a.what }, { text: a.when }]),
      ],
      { x: 0.4, y: 0.9, w: 9.2, fontSize: 12, autoPage: false }
    );
  } else {
    todoSlide.addText("なし", { x: 0.4, y: 0.9, fontSize: 14 });
  }

  if (mode === "proposal") {
    const proposalSlide = pptx.addSlide();
    proposalSlide.addText("課題と次のご提案", { x: 0.4, y: 0.3, w: 9, h: 0.5, fontSize: 22, bold: true });
    proposalSlide.addText("お伺いした課題", { x: 0.4, y: 0.9, w: 9.2, h: 0.4, fontSize: 16, bold: true });
    proposalSlide.addText(bulletText(minutes.openIssues.length ? minutes.openIssues : minutes.decisions), {
      x: 0.4,
      y: 1.3,
      w: 9.2,
      h: 1.6,
      fontSize: 14,
    });
    proposalSlide.addText("次のご提案", { x: 0.4, y: 3.0, w: 9.2, h: 0.4, fontSize: 16, bold: true, color: "1D4ED8" });
    proposalSlide.addText(
      bulletText(minutes.dealCoach?.nextActions ?? minutes.nextAgenda),
      { x: 0.4, y: 3.4, w: 9.2, h: 1.6, fontSize: 14 }
    );
  }

  if (mode === "review" && minutes.dealCoach) {
    const coachSlide = pptx.addSlide();
    coachSlide.addText(`商談スコア: ${minutes.dealCoach.score} / 100`, {
      x: 0.4,
      y: 0.3,
      w: 9,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: "1D4ED8",
    });
    coachSlide.addText("良かった点", { x: 0.4, y: 1.1, w: 4.4, h: 0.4, fontSize: 16, bold: true });
    coachSlide.addText(bulletText(minutes.dealCoach.good), { x: 0.4, y: 1.5, w: 4.4, h: 2, fontSize: 13 });
    coachSlide.addText("改善点", { x: 5.0, y: 1.1, w: 4.6, h: 0.4, fontSize: 16, bold: true });
    coachSlide.addText(bulletText(minutes.dealCoach.improve), { x: 5.0, y: 1.5, w: 4.6, h: 2, fontSize: 13 });
    coachSlide.addText(
      `顧客の関心度: ${minutes.dealCoach.interestLevel}　/　成約可能性: ${minutes.dealCoach.winProbability}%`,
      { x: 0.4, y: 3.7, w: 9.2, h: 0.5, fontSize: 14 }
    );
  }

  const agendaSlide = pptx.addSlide();
  agendaSlide.addText("次回アジェンダ案", { x: 0.4, y: 0.3, w: 9, h: 0.5, fontSize: 22, bold: true });
  agendaSlide.addText(bulletText(minutes.nextAgenda), { x: 0.4, y: 0.9, w: 9.2, h: 3, fontSize: 16 });

  return finish(pptx, meeting, mode);
}

function bulletText(items: string[]) {
  if (!items || items.length === 0) return "なし";
  return items.map((i) => ({ text: i, options: { bullet: true, breakLine: true } }));
}

async function finish(pptx: PptxGenJS, meeting: Meeting, mode: PptMode) {
  const fileName = `${meeting.title}_${MODE_LABEL[mode]}.pptx`;
  await pptx.writeFile({ fileName });
}
