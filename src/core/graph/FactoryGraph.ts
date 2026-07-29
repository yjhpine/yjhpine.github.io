import { modulesById } from "../../data/modules";
import type { FactorySnapshot, ModuleConnection, ModuleDefinition, ModuleInstance, PortDefinition } from "../types";

export class FactoryGraph {
  private instanceSequence = 0;
  private connectionSequence = 0;
  private readonly moduleMap = new Map<string, ModuleInstance>();
  private readonly connectionMap = new Map<string, ModuleConnection>();

  get modules(): ModuleInstance[] { return [...this.moduleMap.values()]; }
  get connections(): ModuleConnection[] { return [...this.connectionMap.values()]; }

  addModule(moduleId: string, x: number, y: number): ModuleInstance {
    if (!modulesById.has(moduleId)) throw new Error(`Unknown module: ${moduleId}`);
    const instance: ModuleInstance = { instanceId: `${moduleId}-${++this.instanceSequence}`, moduleId, x, y };
    this.moduleMap.set(instance.instanceId, instance);
    return instance;
  }

  moveModule(instanceId: string, x: number, y: number): boolean {
    const instance = this.moduleMap.get(instanceId);
    if (!instance) return false;
    instance.x = x;
    instance.y = y;
    return true;
  }

  removeModule(instanceId: string): boolean {
    if (!this.moduleMap.delete(instanceId)) return false;
    for (const connection of this.connections) {
      if (connection.fromInstanceId === instanceId || connection.toInstanceId === instanceId) this.connectionMap.delete(connection.id);
    }
    return true;
  }

  addConnection(fromInstanceId: string, fromPortId: string, toInstanceId: string, toPortId: string): ModuleConnection {
    const connection: ModuleConnection = { id: `connection-${++this.connectionSequence}`, fromInstanceId, fromPortId, toInstanceId, toPortId };
    this.connectionMap.set(connection.id, connection);
    return connection;
  }

  removeConnection(connectionId: string): boolean { return this.connectionMap.delete(connectionId); }

  getInstance(instanceId: string): ModuleInstance | undefined { return this.moduleMap.get(instanceId); }

  getDefinition(instanceId: string): ModuleDefinition | undefined {
    const instance = this.getInstance(instanceId);
    return instance ? modulesById.get(instance.moduleId) : undefined;
  }

  getPort(instanceId: string, portId: string): PortDefinition | undefined {
    const definition = this.getDefinition(instanceId);
    return definition ? [...definition.inputPorts, ...definition.outputPorts].find((port) => port.id === portId) : undefined;
  }

  incoming(instanceId: string): ModuleConnection[] { return this.connections.filter((connection) => connection.toInstanceId === instanceId); }
  outgoing(instanceId: string): ModuleConnection[] { return this.connections.filter((connection) => connection.fromInstanceId === instanceId); }

  hasPath(fromInstanceId: string, toInstanceId: string): boolean {
    const pending = [fromInstanceId];
    const visited = new Set<string>();
    while (pending.length) {
      const current = pending.pop()!;
      if (current === toInstanceId) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const connection of this.outgoing(current)) pending.push(connection.toInstanceId);
    }
    return false;
  }

  clear(): void { this.moduleMap.clear(); this.connectionMap.clear(); this.instanceSequence = 0; this.connectionSequence = 0; }

  snapshot(): FactorySnapshot {
    return { modules: this.modules.map((module) => ({ ...module })), connections: this.connections.map((connection) => ({ ...connection })) };
  }

  restore(snapshot: FactorySnapshot): void {
    this.clear();
    for (const module of snapshot.modules) {
      if (!modulesById.has(module.moduleId)) continue;
      this.moduleMap.set(module.instanceId, { ...module });
      this.instanceSequence = Math.max(this.instanceSequence, numericSuffix(module.instanceId));
    }
    for (const connection of snapshot.connections) {
      if (!this.moduleMap.has(connection.fromInstanceId) || !this.moduleMap.has(connection.toInstanceId)) continue;
      this.connectionMap.set(connection.id, { ...connection });
      this.connectionSequence = Math.max(this.connectionSequence, numericSuffix(connection.id));
    }
  }
}

function numericSuffix(value: string): number {
  const suffix = Number(value.match(/(\d+)$/)?.[1]);
  return Number.isFinite(suffix) ? suffix : 0;
}
