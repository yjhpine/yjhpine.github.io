import type { GenerationIssue, GenerationResult, OrderDefinition, OrderEvaluation, QualityScores } from "../types";

const scoreLabels: Record<keyof QualityScores, string> = { subjectAccuracy: "대상 정확도", styleMatch: "스타일", composition: "구도", sharpness: "선명도" };

export class OrderEvaluator {
  evaluate(order: OrderDefinition, result: GenerationResult): OrderEvaluation {
    const issues: GenerationIssue[] = [];
    if (!result.hasDelivery) issues.push(issue("missing-delivery", "완성품이 출구까지 나오지 않았습니다.", undefined, "생산을 다시 실행해 보세요."));
    for (const tag of order.requiredTags) if (!result.appliedTags.includes(tag)) issues.push(tagIssue(tag));
    for (const [score, minimum] of Object.entries(order.minimumScores) as [keyof QualityScores, number][]) {
      if (result[score] < minimum) issues.push(issue(`low-${score}`, `${scoreLabels[score]}가 납품 기준보다 낮습니다.`, recommendationForScore(score), `${scoreLabels[score]} ${result[score]} / 목표 ${minimum}`));
    }
    if (result.processingTime > order.maximumProcessingTime) issues.push(issue("slow", "현재 생산 시간이 납품 기준보다 깁니다.", undefined, `처리 시간 ${result.processingTime}초 / 목표 ${order.maximumProcessingTime}초`));
    const displayedIssues = result.hasInspection ? issues : issues.slice(0, 2).map((item) => ({ ...item, detail: "품질 검사기 칩을 꽂으면 자세한 분석을 볼 수 있습니다." }));
    result.issues = displayedIssues;
    return { passed: issues.length === 0, issues: displayedIssues, summary: issues.length === 0 ? "주문 조건을 만족했습니다. 손님에게 전달하세요." : displayedIssues[0]?.message ?? "모듈 칩 조합을 확인해 주세요." };
  }
}

function issue(id: string, message: string, recommendationModuleId: string | undefined, detail: string): GenerationIssue { return { id, message, recommendationModuleId, detail }; }

function tagIssue(tag: string): GenerationIssue {
  const messages: Record<string, GenerationIssue> = {
    generator: issue("missing-generator", "그림 제작기가 주문서를 처리하지 못했습니다.", "image-maker", "그림 제작기 칩을 슬롯에 꽂으세요."),
    "style-fairytale": issue("missing-style", "요청한 동화책 스타일이 적용되지 않았습니다.", "style-processor", "스타일 가공기 칩을 슬롯에 꽂으세요."),
    "no-hat": issue("missing-ban-list", "금지된 모자가 결과에 포함되었습니다.", "ban-list", "금지 목록 칩을 슬롯에 꽂으세요."),
    "centered-composition": issue("missing-composition", "주인공이 화면 중앙에서 벗어났습니다.", "composition-planner", "구도 설계기 칩을 슬롯에 꽂으세요."),
    sharpness: issue("missing-sharpness", "이미지가 너무 흐립니다.", "sharpener", "선명화 칩을 슬롯에 꽂으세요."),
    "quality-inspection": issue("missing-inspection", "품질 검사를 거친 완성품이 아닙니다.", "quality-checker", "품질 검사기 칩을 슬롯에 꽂으세요."),
  };
  return messages[tag] ?? issue("missing-tag", "주문 조건이 적용되지 않았습니다.", undefined, "생산 라인을 확인하세요.");
}

function recommendationForScore(score: keyof QualityScores): string | undefined {
  return ({ styleMatch: "style-processor", composition: "composition-planner", sharpness: "sharpener" } as Partial<Record<keyof QualityScores, string>>)[score];
}
