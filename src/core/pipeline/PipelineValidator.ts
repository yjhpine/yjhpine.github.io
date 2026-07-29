import type { FactoryGraph } from "../graph/FactoryGraph";

export interface PipelineValidationResult {
  valid: boolean;
  reason?: string;
  executionOrder: string[];
}

export class PipelineValidator {
  validate(graph: FactoryGraph): PipelineValidationResult {
    for (const connection of graph.connections) {
      const check = validateConnectionShape(graph, connection);
      if (!check.valid) return { valid: false, reason: check.reason, executionOrder: [] };
    }
    const starts = graph.modules.filter((module) => module.moduleId === "order-input").map((module) => module.instanceId);
    if (!starts.length) return { valid: false, reason: "주문서 입력기를 공장에 배치해 주세요.", executionOrder: [] };
    const forward = walkForward(graph, starts);
    const deliveries = graph.modules.filter((module) => module.moduleId === "delivery-bay" && forward.has(module.instanceId));
    if (!deliveries.length) return { valid: false, reason: "배송대까지 연결된 완전한 생산 경로가 없습니다.", executionOrder: [] };
    const selectedDelivery = deliveries[0];
    const backward = walkBackward(graph, [selectedDelivery.instanceId]);
    const route = graph.modules.filter((module) => forward.has(module.instanceId) && backward.has(module.instanceId)).map((module) => module.instanceId);
    const executionOrder = topologicalOrder(graph, route);
    if (!executionOrder.length || !starts.some((start) => executionOrder.includes(start))) return { valid: false, reason: "주문서부터 배송대까지 이어지는 경로가 없습니다.", executionOrder: [] };
    return { valid: true, executionOrder };
  }
}

function validateConnectionShape(graph: FactoryGraph, connection: { fromInstanceId: string; fromPortId: string; toInstanceId: string; toPortId: string }): { valid: boolean; reason?: string } {
  const from = graph.getPort(connection.fromInstanceId, connection.fromPortId);
  const to = graph.getPort(connection.toInstanceId, connection.toPortId);
  if (!from || !to || from.direction !== "output" || to.direction !== "input" || from.dataType !== to.dataType) return { valid: false, reason: "유효하지 않은 연결이 포함되어 있습니다." };
  const duplicates = graph.connections.filter((item) => item.toInstanceId === connection.toInstanceId && item.toPortId === connection.toPortId);
  if (duplicates.length > 1) return { valid: false, reason: "하나의 입력 포트에 연결이 여러 개입니다." };
  return { valid: true };
}

function walkForward(graph: FactoryGraph, roots: string[]): Set<string> {
  const seen = new Set<string>(); const queue = [...roots];
  while (queue.length) { const current = queue.shift()!; if (seen.has(current)) continue; seen.add(current); for (const edge of graph.outgoing(current)) queue.push(edge.toInstanceId); }
  return seen;
}

function walkBackward(graph: FactoryGraph, roots: string[]): Set<string> {
  const seen = new Set<string>(); const queue = [...roots];
  while (queue.length) { const current = queue.shift()!; if (seen.has(current)) continue; seen.add(current); for (const edge of graph.incoming(current)) queue.push(edge.fromInstanceId); }
  return seen;
}

function topologicalOrder(graph: FactoryGraph, route: string[]): string[] {
  const routeSet = new Set(route); const indegree = new Map(route.map((id) => [id, 0]));
  for (const edge of graph.connections) if (routeSet.has(edge.fromInstanceId) && routeSet.has(edge.toInstanceId)) indegree.set(edge.toInstanceId, (indegree.get(edge.toInstanceId) ?? 0) + 1);
  const queue = route.filter((id) => indegree.get(id) === 0); const result: string[] = [];
  while (queue.length) { const current = queue.shift()!; result.push(current); for (const edge of graph.outgoing(current)) if (routeSet.has(edge.toInstanceId)) { const next = (indegree.get(edge.toInstanceId) ?? 1) - 1; indegree.set(edge.toInstanceId, next); if (next === 0) queue.push(edge.toInstanceId); } }
  return result.length === route.length ? result : [];
}
