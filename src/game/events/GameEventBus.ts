type Listener<T> = (payload: T) => void;

export class GameEventBus<Events extends object> {
  private readonly listeners = new Map<keyof Events, Set<Listener<never>>>();

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    const list = this.listeners.get(event) ?? new Set<Listener<never>>();
    list.add(listener as Listener<never>);
    this.listeners.set(event, list);
    return () => list.delete(listener as Listener<never>);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.listeners.get(event)?.forEach((listener) => listener(payload as never));
  }
}
