class Node<T> {
  key: string;
  value: T;
  expiresAt: number;
  prev: Node<T> | null;
  next: Node<T> | null;
  heapIndex: number;

  constructor(key: string, value: T, expiresAt: number) {
    this.key = key;
    this.value = value;
    this.expiresAt = expiresAt;
    this.prev = null;
    this.next = null;
    this.heapIndex = -1; // Track position in heap
  }
}

class MinHeap<T> {
  private heap: Node<T>[];

  constructor() {
    this.heap = [];
  }

  size(): number {
    return this.heap.length;
  }

  peek(): Node<T> | undefined {
    return this.heap[0];
  }

  insert(node: Node<T>): void {
    this.heap.push(node);
    node.heapIndex = this.heap.length - 1;
    this.bubbleUp(this.heap.length - 1);
  }

  remove(node: Node<T>): void {
    const idx = node.heapIndex;
    if (idx === -1 || idx >= this.heap.length) return;

    const lastIdx = this.heap.length - 1;
    if (idx === lastIdx) {
      this.heap.pop();
      node.heapIndex = -1;
      return;
    }

    // Swap with last element
    this.swap(idx, lastIdx);
    this.heap.pop();
    node.heapIndex = -1;

    // Reheapify from swapped position
    if (idx < this.heap.length) {
      this.bubbleUp(idx);
      this.bubbleDown(idx);
    }
  }

  extractMin(): Node<T> | null {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) {
      const node = this.heap.pop()!;
      node.heapIndex = -1;
      return node;
    }

    const min = this.heap[0];
    min.heapIndex = -1;

    const last = this.heap.pop()!;
    this.heap[0] = last;
    last.heapIndex = 0;
    this.bubbleDown(0);

    return min;
  }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      if (this.heap[idx].expiresAt >= this.heap[parentIdx].expiresAt) break;
      this.swap(idx, parentIdx);
      idx = parentIdx;
    }
  }

  private bubbleDown(idx: number): void {
    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;

      if (
        left < this.heap.length &&
        this.heap[left].expiresAt < this.heap[smallest].expiresAt
      ) {
        smallest = left;
      }
      if (
        right < this.heap.length &&
        this.heap[right].expiresAt < this.heap[smallest].expiresAt
      ) {
        smallest = right;
      }

      if (smallest === idx) break;

      this.swap(idx, smallest);
      idx = smallest;
    }
  }

  private swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    this.heap[i].heapIndex = i;
    this.heap[j].heapIndex = j;
  }
}

interface LRUCacheOptions {
  cleanupInterval?: number;
  autoCleanup?: boolean;
}

export class LRUCache<T> {
  private maxSize: number;
  private cache: Map<string, Node<T>>;
  private head: Node<T> | null;
  private tail: Node<T> | null;
  private expiryHeap: MinHeap<T>;
  private cleanupInterval: number;
  private cleanupTimer: NodeJS.Timeout | null;
  private autoCleanup: boolean;

  constructor(maxSize: number, options: LRUCacheOptions = {}) {
    if (!Number.isFinite(maxSize) || maxSize <= 0) {
      throw new Error("maxSize must be a positive finite number");
    }

    this.maxSize = Math.floor(maxSize);
    this.cache = new Map();
    this.head = null; // Most recently used
    this.tail = null; // Least recently used
    this.expiryHeap = new MinHeap<T>();

    // Background cleanup options
    this.cleanupInterval = options.cleanupInterval || 60000; // 1 minute default
    this.cleanupTimer = null;
    this.autoCleanup = options.autoCleanup !== false; // enabled by default

    if (this.autoCleanup) {
      this.startBackgroundCleanup();
    }
  }

  get(key: string): T | null {
    const node = this.cache.get(key);
    if (!node) return null;

    const now = Date.now();

    // Check if expired
    if (now >= node.expiresAt) {
      this.removeNode(node);
      return null;
    }

    // Move to front (most recently used)
    this.moveToFront(node);

    return node.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    if (typeof key !== "string" || key.length === 0) {
      throw new Error("key must be a non-empty string");
    }
    
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
      throw new Error("ttlMs must be a positive finite number");
    }

    const now = Date.now();
    const expiresAt = now + ttlMs;

    // If key exists, update it
    if (this.cache.has(key)) {
      const node = this.cache.get(key)!;
      node.value = value;

      // Update expiry in heap
      this.expiryHeap.remove(node);
      node.expiresAt = expiresAt;
      this.expiryHeap.insert(node);

      this.moveToFront(node);
      return;
    }

    // Clean expired items first
    this.cleanExpired(now);

    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evict(now);
    }

    // Create new node
    const node = new Node<T>(key, value, expiresAt);
    this.cache.set(key, node);
    this.expiryHeap.insert(node);
    this.addToFront(node);
  }

  delete(key: string): boolean {
    const node = this.cache.get(key);
    if (node) {
      this.removeNode(node);
      return true;
    }
    return false;
  }

  cleanExpired(now: number = Date.now()): number {
    let cleanedCount = 0;

    // Remove all expired items from heap
    while (this.expiryHeap.size() > 0) {
      const node = this.expiryHeap.peek();
      if (!node || node.expiresAt > now) break;

      this.expiryHeap.extractMin();
      this.removeFromList(node);
      this.cache.delete(node.key);
      cleanedCount++;
    }

    return cleanedCount;
  }

  private startBackgroundCleanup(): void {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      this.cleanExpired();

      // If next item expires soon, schedule next cleanup for that time
      if (this.expiryHeap.size() > 0) {
        const nextExpiry = this.expiryHeap.peek()?.expiresAt;
        if (nextExpiry) {
          const timeUntilExpiry = nextExpiry - Date.now();

          // If something expires before next scheduled cleanup, reschedule
          if (timeUntilExpiry > 0 && timeUntilExpiry < this.cleanupInterval) {
            this.scheduleNextCleanup(timeUntilExpiry + 10); // +10ms buffer
          }
        }
      }
    }, this.cleanupInterval);

    // Don't prevent Node.js from exiting
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  private scheduleNextCleanup(delayMs: number): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.cleanupTimer = setTimeout(() => {
      this.cleanExpired();
      this.startBackgroundCleanup(); // Resume regular interval
    }, delayMs);

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

  private evict(now: number = Date.now()): void {
    // Strategy: Try expired first, then closest to expiry, then LRU

    // Check if there are expired items
    const peek = this.expiryHeap.peek();
    if (this.expiryHeap.size() > 0 && peek && peek.expiresAt <= now) {
      const node = this.expiryHeap.extractMin();
      if (node) {
        this.removeFromList(node);
        this.cache.delete(node.key);
      }
      return;
    }

    // Otherwise evict closest to expiry (for time-sensitive caches)
    // OR evict LRU (for access-pattern caches)
    // Choose based on your use case:

    // Option 1: Evict closest to expiry
    if (this.expiryHeap.size() > 0) {
      const node = this.expiryHeap.extractMin();
      if (node) {
        this.removeFromList(node);
        this.cache.delete(node.key);
      }
      return;
    }
  }

  private removeNode(node: Node<T>): void {
    this.expiryHeap.remove(node);
    this.removeFromList(node);
    this.cache.delete(node.key);
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
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.expiryHeap = new MinHeap<T>();
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
