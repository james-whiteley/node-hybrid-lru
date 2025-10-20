class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (item: T) => void;

  constructor(createFn: () => T, resetFn: (item: T) => void) {
    this.createFn = createFn;
    this.resetFn = resetFn;
  }

  get(): T {
    return this.pool.pop() || this.createFn();
  }

  put(item: T): void {
    this.resetFn(item);
    this.pool.push(item);
  }
}

class Node<T> {
  key: string = "";
  value: T | null = null;
  expiresAt: number = 0;
  prev: Node<T> | null = null;
  next: Node<T> | null = null;

  reset(key: string, value: T, expiresAt: number): void {
    this.key = key;
    this.value = value;
    this.expiresAt = expiresAt;
    this.prev = null;
    this.next = null;
  }
}

interface CacheOptions {
  maxSize: number;
  cleanupInterval?: number;
  autoCleanup?: boolean;
  ttlMs?: number;
}

export class Cache<T> {
  private nodePool: ObjectPool<Node<T>>;
  private maxSize: number;
  private cache: Map<string, Node<T>>;
  private head: Node<T> | null;
  private tail: Node<T> | null;
  private cleanupInterval: number;
  private cleanupTimer: NodeJS.Timeout | null;
  private autoCleanup: boolean;
  private ttlMs: number;
  private lastCleanup: number;
  
  constructor(options: CacheOptions = { maxSize: 1000, ttlMs: 60000 }) {
    if (!Number.isFinite(options.maxSize) || options.maxSize <= 0) {
      throw new Error("maxSize must be a positive finite number");
    }

    this.maxSize = Math.floor(options.maxSize);
    this.cache = new Map();
    this.head = null; // Most recently used
    this.tail = null; // Least recently used
    this.ttlMs = options.ttlMs || 60000; // 1 minute default
    this.lastCleanup = Date.now();

    // Background cleanup options
    this.cleanupInterval = options.cleanupInterval || 60000; // 1 minute default
    this.cleanupTimer = null;
    this.autoCleanup = options.autoCleanup !== false; // enabled by default

    if (this.autoCleanup) {
      this.startBackgroundCleanup();
    }

    this.nodePool = new ObjectPool<Node<T>>(
      () => new Node<T>(),
      (node) => node.reset('', null as T, 0)
    );
  }

  get(key: string): T | null {
    const node = this.cache.get(key);
    if (!node) return null;

    const now = Date.now();

    // O(1) lazy expiration check
    if (now >= node.expiresAt) {
      this.removeNode(node);
      return null;
    }

    // Periodic cleanup if needed
    this.maybeCleanup();

    // Move to front (most recently used)
    this.moveToFront(node);

    return node.value;
  }

  set(key: string, value: T): void {
    if (typeof key !== "string" || key.length === 0) {
      throw new Error("key must be a non-empty string");
    }

    const now = Date.now();
    const expiresAt = now + this.ttlMs;

    // If key exists, update it
    const existingNode = this.cache.get(key);
    if (existingNode) {
      existingNode.value = value;
      existingNode.expiresAt = expiresAt;

      this.moveToFront(existingNode);
      return;
    }

    // Create new node
    const node = this.nodePool.get();
    node.reset(key, value, expiresAt);
    this.cache.set(key, node);
    this.addToFront(node);

    // Evict if at capacity
    if (this.cache.size > this.maxSize) {
      this.evict();
    }
  }

  delete(key: string): boolean {
    const node = this.cache.get(key);
    if (node) {
      this.removeNode(node);
      this.nodePool.put(node);
      return true;
    }
    return false;
  }

  cleanExpired(now: number = Date.now()): number {
    let cleanedCount = 0;
    const expiredKeys: string[] = [];

    // Find all expired items
    for (const [key, node] of this.cache.entries()) {
      if (now >= node.expiresAt) {
        expiredKeys.push(key);
      }
    }

    // Remove expired items
    for (const key of expiredKeys) {
      const node = this.cache.get(key);
      if (node) {
        this.removeFromList(node);
        this.cache.delete(key);
        this.nodePool.put(node);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  private maybeCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup > this.cleanupInterval) {
      this.cleanExpired(now);
      this.lastCleanup = now;
    }
  }

  private startBackgroundCleanup(): void {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      this.cleanExpired();
      this.lastCleanup = Date.now();
    }, this.cleanupInterval);

    // Don't prevent Node.js from exiting
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  private stopBackgroundCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  private evict(): void {
    // Simple LRU eviction - remove the least recently used item
    if (this.cache.size > this.maxSize && this.tail) {
      const nodeToEvict = this.tail;
      this.removeFromList(nodeToEvict);
      this.cache.delete(nodeToEvict.key);
      this.nodePool.put(nodeToEvict);
    }
  }

  private removeNode(node: Node<T>): void {
    this.removeFromList(node);
    this.cache.delete(node.key);
    this.nodePool.put(node);
  }

  private moveToFront(node: Node<T>): void {
    this.removeFromList(node);
    this.addToFront(node);
  }

  private addToFront(node: Node<T>): void {
    node.next = this.head;
    node.prev = null;

    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeFromList(node: Node<T>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }

    node.prev = null;
    node.next = null;
  }

  size(): number {
    return this.cache.size;
  }

  clear(): void {
    // Put all nodes back into the node pool
    for (const node of this.cache.values()) {
      this.nodePool.put(node);
    }

    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.lastCleanup = Date.now();
    this.stopBackgroundCleanup();
    if (this.autoCleanup) {
      this.startBackgroundCleanup();
    }
  }

  destroy(): void {
    this.stopBackgroundCleanup();
    this.clear();
  }
}
