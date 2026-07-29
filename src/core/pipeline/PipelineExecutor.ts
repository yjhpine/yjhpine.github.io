import { modulesById } from "../../data/modules";
import { GenerationSimulator } from "../generation/GenerationSimulator";
import { OrderEvaluator } from "../orders/OrderEvaluator";
import type { FactoryGraph } from "../graph/FactoryGraph";
import type { GenerationResult, OrderDefinition, OrderEvaluation } from "../types";
import { PipelineValidator } from "./PipelineValidator";

export interface PipelineExecution {
  valid: boolean;
  reason?: string;
  executionInstanceIds: string[];
  result?: GenerationResult;
  evaluation?: OrderEvaluation;
}

export class PipelineExecutor {
  constructor(private readonly validator = new PipelineValidator(), private readonly simulator = new GenerationSimulator(), private readonly evaluator = new OrderEvaluator()) {}

  execute(graph: FactoryGraph, order: OrderDefinition): PipelineExecution {
    const pipeline = this.validator.validate(graph);
    if (!pipeline.valid) return { valid: false, reason: pipeline.reason, executionInstanceIds: [] };
    const moduleIds = pipeline.executionOrder.map((instanceId) => graph.getInstance(instanceId)?.moduleId).filter((moduleId): moduleId is string => Boolean(moduleId && modulesById.has(moduleId)));
    const result = this.simulator.simulate(order, moduleIds);
    const evaluation = this.evaluator.evaluate(order, result);
    return { valid: true, executionInstanceIds: pipeline.executionOrder, result, evaluation };
  }
}
