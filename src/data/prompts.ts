/** Per-customer prompt flavor text. Evaluation still uses the stage order definition. */
export const promptVariantsByOrderId: Record<string, string[]> = {
  o01: [
    "냥이 한 장요",
    "집고양이 부탁해요",
    "고양이 초안만",
    "우리 고양이 그려줘요",
    "고양이 그림 하나",
    "냥이 스케치 부탁",
  ],
  o02: [
    "어린이책 삽화로",
    "옛이야기 표지 느낌으로",
    "동화책 안에 넣을 그림",
    "이야기책 삽화 톤으로",
    "잠자리 동화 분위기",
    "그림책 속 고양이처럼",
  ],
  o03: [
    "장식 없이 단정하게",
    "악세서리 뺀 민짜로",
    "맨머리 느낌으로",
    "꾸밈 없는 고양이",
    "치장 없이 담백하게",
    "장신구는 빼 주세요",
  ],
  o04: [
    "주인공처럼 가운데",
    "프레임 정중앙에",
    "화면 한복판에 세워줘",
    "시선이 가운데로",
    "정면 중앙 배치로",
    "딱 가운데 세워 주세요",
  ],
  o05: [
    "초점 살아서",
    "뿌연 느낌 말고",
    "디테일 살아 있게",
    "흐릿한 건 싫어요",
    "윤곽이 또렷하게",
    "안개 낀 느낌 없이",
  ],
  o06: [
    "출고 전 체크까지",
    "QC 도장 찍힌 걸로",
    "검수 마친 완성본",
    "납품 전 확인 부탁",
    "최종 점검 통과본으로",
    "검수 스탬프 있는 걸로",
  ],
};

export function pickPromptForOrder(orderId: string, salt = 0): string {
  const variants = promptVariantsByOrderId[orderId] ?? promptVariantsByOrderId.o01;
  return variants[Math.abs(salt) % variants.length]!;
}
