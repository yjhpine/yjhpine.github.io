/** Per-customer prompt flavor text. Evaluation still uses the stage order definition. */
export const promptVariantsByOrderId: Record<string, string[]> = {
  o01: ["고양이 뽑아줘", "고양이 그림 뽑아줘", "귀여운 고양이 뽑아줘"],
  o02: ["애니메풍 고양이 뽑아줘", "동화책 고양이 뽑아줘", "동화풍으로 고양이 뽑아줘"],
  o03: ["모자 없는 고양이 뽑아줘", "모자 쓰지 않은 고양이 뽑아줘", "고양이만 뽑아줘. 모자는 빼"],
  o04: ["고양이 중앙에 뽑아줘", "화면 한가운데 고양이 뽑아줘", "중앙 구도로 고양이 뽑아줘"],
  o05: ["선명한 고양이 뽑아줘", "또렷한 고양이 이미지 뽑아줘", "흐릿하지 않게 고양이 뽑아줘"],
  o06: ["검사 끝난 고양이 뽑아줘", "품질 검사 통과한 고양이 뽑아줘", "검수 완료 고양이 뽑아줘"],
};

export function pickPromptForOrder(orderId: string, salt = 0): string {
  const variants = promptVariantsByOrderId[orderId] ?? promptVariantsByOrderId.o01;
  return variants[Math.abs(salt) % variants.length]!;
}
