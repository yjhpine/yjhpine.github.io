import type { FactoryGraph } from "./FactoryGraph";

export interface ConnectionValidation { valid: boolean; reason?: string; }

export class ConnectionValidator {
  static validate(graph: FactoryGraph, fromInstanceId: string, fromPortId: string, toInstanceId: string, toPortId: string): ConnectionValidation {
    const from = graph.getPort(fromInstanceId, fromPortId);
    const to = graph.getPort(toInstanceId, toPortId);
    if (!from || !to) return { valid: false, reason: "연결할 포트를 찾을 수 없습니다." };
    if (fromInstanceId === toInstanceId) return { valid: false, reason: "장치는 자기 자신에게 연결할 수 없습니다." };
    if (from.direction !== "output" || to.direction !== "input") return { valid: false, reason: "출력 포트에서 입력 포트로만 연결할 수 있습니다." };
    if (from.dataType !== to.dataType) return { valid: false, reason: "서로 다른 모양의 데이터는 연결할 수 없습니다." };
    if (graph.hasPath(toInstanceId, fromInstanceId)) return { valid: false, reason: "순환하는 생산 라인은 만들 수 없습니다." };
    if (graph.connections.some((connection) => connection.toInstanceId === toInstanceId && connection.toPortId === toPortId)) return { valid: false, reason: "이 입력 포트에는 이미 연결이 있습니다." };
    return { valid: true };
  }
}
