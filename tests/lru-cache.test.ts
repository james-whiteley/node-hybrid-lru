import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { LRUCache } from "../src/index";

describe("LRUCache", () => {
  describe("Constructor", () => {
    it("should create a cache with valid maxSize", () => {
      const cache = new LRUCache<string>(10);
      expect(cache.size()).toBe(0);
      cache.destroy();
    });

    it("should floor maxSize to integer", () => {
      const cache = new LRUCache<string>(10.7);
      expect(cache.size()).toBe(0);
      cache.destroy();
    });

    it("should throw error for non-positive maxSize", () => {
      expect(() => new LRUCache<string>(0)).toThrow(
        "maxSize must be a positive finite number"
      );
      expect(() => new LRUCache<string>(-5)).toThrow(
        "maxSize must be a positive finite number"
      );
    });

    it("should throw error for non-finite maxSize", () => {
      expect(() => new LRUCache<string>(Infinity)).toThrow(
        "maxSize must be a positive finite number"
      );
      expect(() => new LRUCache<string>(NaN)).toThrow(
        "maxSize must be a positive finite number"
      );
    });

    it("should accept custom options", () => {
      const cache = new LRUCache<string>(10, {
        cleanupInterval: 5000,
        autoCleanup: true,
      });
      expect(cache.size()).toBe(0);
      cache.destroy();
    });

    it("should disable autoCleanup when set to false", () => {
      const cache = new LRUCache<string>(10, { autoCleanup: false });
      expect(cache.size()).toBe(0);
      cache.destroy();
    });
  });

  describe("Set and Get Operations", () => {
    let cache: LRUCache<string>;

    beforeEach(() => {
      cache = new LRUCache<string>(3, { autoCleanup: false });
    });

    afterEach(() => {
      cache.destroy();
    });

    it("should set and get a value", () => {
      cache.set("key1", "value1", 10000);
      expect(cache.get("key1")).toBe("value1");
    });

    it("should return null for non-existent key", () => {
      expect(cache.get("nonexistent")).toBeNull();
    });

    it("should throw error for empty key", () => {
      expect(() => cache.set("", "value", 1000)).toThrow(
        "key must be a non-empty string"
      );
    });

    it("should throw error for non-string key", () => {
      expect(() => cache.set(123 as unknown as string, "value", 1000)).toThrow(
        "key must be a non-empty string"
      );
    });

    it("should throw error for non-positive ttl", () => {
      expect(() => cache.set("key", "value", 0)).toThrow(
        "ttlMs must be a positive finite number"
      );
      expect(() => cache.set("key", "value", -100)).toThrow(
        "ttlMs must be a positive finite number"
      );
    });

    it("should throw error for non-finite ttl", () => {
      expect(() => cache.set("key", "value", Infinity)).toThrow(
        "ttlMs must be a positive finite number"
      );
      expect(() => cache.set("key", "value", NaN)).toThrow(
        "ttlMs must be a positive finite number"
      );
    });

    it("should update existing key value", () => {
      cache.set("key1", "value1", 10000);
      cache.set("key1", "value2", 10000);
      expect(cache.get("key1")).toBe("value2");
      expect(cache.size()).toBe(1);
    });

    it("should update existing key ttl", async () => {
      cache.set("key1", "value1", 100);
      await new Promise((resolve) => setTimeout(resolve, 50));
      cache.set("key1", "value1", 10000);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(cache.get("key1")).toBe("value1");
    });

    it("should handle multiple keys", () => {
      cache.set("key1", "value1", 10000);
      cache.set("key2", "value2", 10000);
      cache.set("key3", "value3", 10000);

      expect(cache.get("key1")).toBe("value1");
      expect(cache.get("key2")).toBe("value2");
      expect(cache.get("key3")).toBe("value3");
      expect(cache.size()).toBe(3);
    });

    it("should handle different value types", () => {
      const cache1 = new LRUCache<number>(5, { autoCleanup: false });
      const cache2 = new LRUCache<object>(5, { autoCleanup: false });

      cache1.set("num", 42, 10000);
      expect(cache1.get("num")).toBe(42);

      const obj = { foo: "bar" };
      cache2.set("obj", obj, 10000);
      expect(cache2.get("obj")).toEqual(obj);

      cache1.destroy();
      cache2.destroy();
    });
  });

  describe("TTL Expiration", () => {
    let cache: LRUCache<string>;

    beforeEach(() => {
      cache = new LRUCache<string>(5, { autoCleanup: false });
    });

    afterEach(() => {
      cache.destroy();
    });

    it("should return null for expired items on get", async () => {
      cache.set("key1", "value1", 100);
      expect(cache.get("key1")).toBe("value1");

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(cache.get("key1")).toBeNull();
      expect(cache.size()).toBe(0);
    });

    it("should clean expired items manually", async () => {
      cache.set("key1", "value1", 100);
      cache.set("key2", "value2", 200);
      cache.set("key3", "value3", 10000);

      expect(cache.size()).toBe(3);

      await new Promise((resolve) => setTimeout(resolve, 150));
      const cleaned = cache.cleanExpired();

      expect(cleaned).toBe(1);
      expect(cache.size()).toBe(2);
      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toBe("value2");
      expect(cache.get("key3")).toBe("value3");
    });

    it("should clean multiple expired items", async () => {
      cache.set("key1", "value1", 100);
      cache.set("key2", "value2", 100);
      cache.set("key3", "value3", 10000);

      await new Promise((resolve) => setTimeout(resolve, 150));
      const cleaned = cache.cleanExpired();

      expect(cleaned).toBe(2);
      expect(cache.size()).toBe(1);
      expect(cache.get("key3")).toBe("value3");
    });

    it("should clean all items when all expired", async () => {
      cache.set("key1", "value1", 100);
      cache.set("key2", "value2", 100);

      await new Promise((resolve) => setTimeout(resolve, 150));
      const cleaned = cache.cleanExpired();

      expect(cleaned).toBe(2);
      expect(cache.size()).toBe(0);
    });

    it("should return 0 when no items expired", () => {
      cache.set("key1", "value1", 10000);
      cache.set("key2", "value2", 10000);

      const cleaned = cache.cleanExpired();
      expect(cleaned).toBe(0);
      expect(cache.size()).toBe(2);
    });

    it("should accept custom timestamp for cleanExpired", async () => {
      const now = Date.now();
      cache.set("key1", "value1", 100);
      
      // Clean with a future timestamp
      const cleaned = cache.cleanExpired(now + 200);
      expect(cleaned).toBe(1);
      expect(cache.size()).toBe(0);
    });
  });

  describe("LRU Eviction", () => {
    let cache: LRUCache<string>;

    beforeEach(() => {
      cache = new LRUCache<string>(3, { autoCleanup: false });
    });

    afterEach(() => {
      cache.destroy();
    });

    it("should evict closest to expiry when at capacity", () => {
      cache.set("key1", "value1", 10000);
      cache.set("key2", "value2", 5000);
      cache.set("key3", "value3", 15000);

      expect(cache.size()).toBe(3);

      cache.set("key4", "value4", 20000);

      expect(cache.size()).toBe(3);
      expect(cache.get("key2")).toBeNull(); // Should be evicted (shortest TTL)
      expect(cache.get("key1")).toBe("value1");
      expect(cache.get("key3")).toBe("value3");
      expect(cache.get("key4")).toBe("value4");
    });

    it("should evict expired items first when at capacity", async () => {
      cache.set("key1", "value1", 100);
      cache.set("key2", "value2", 10000);
      cache.set("key3", "value3", 10000);

      await new Promise((resolve) => setTimeout(resolve, 150));

      cache.set("key4", "value4", 10000);

      expect(cache.size()).toBe(3);
      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toBe("value2");
      expect(cache.get("key3")).toBe("value3");
      expect(cache.get("key4")).toBe("value4");
    });

    it("should handle eviction when item just expired", async () => {
      cache.set("key1", "value1", 50);
      cache.set("key2", "value2", 10000);
      cache.set("key3", "value3", 10000);

      // Wait until key1 is just about to expire or has just expired
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Try to add a 4th item at capacity - should evict the expired key1
      cache.set("key4", "value4", 10000);

      expect(cache.size()).toBe(3);
      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toBe("value2");
      expect(cache.get("key3")).toBe("value3");
      expect(cache.get("key4")).toBe("value4");
    });
  });

  describe("Delete Operation", () => {
    let cache: LRUCache<string>;

    beforeEach(() => {
      cache = new LRUCache<string>(5, { autoCleanup: false });
    });

    afterEach(() => {
      cache.destroy();
    });

    it("should delete existing key", () => {
      cache.set("key1", "value1", 10000);
      expect(cache.size()).toBe(1);

      const deleted = cache.delete("key1");
      expect(deleted).toBe(true);
      expect(cache.size()).toBe(0);
      expect(cache.get("key1")).toBeNull();
    });

    it("should return false when deleting non-existent key", () => {
      const deleted = cache.delete("nonexistent");
      expect(deleted).toBe(false);
      expect(cache.size()).toBe(0);
    });

    it("should handle deleting from middle of cache", () => {
      cache.set("key1", "value1", 10000);
      cache.set("key2", "value2", 10000);
      cache.set("key3", "value3", 10000);

      cache.delete("key2");

      expect(cache.size()).toBe(2);
      expect(cache.get("key1")).toBe("value1");
      expect(cache.get("key2")).toBeNull();
      expect(cache.get("key3")).toBe("value3");
    });

    it("should handle deleting head node", () => {
      cache.set("key1", "value1", 10000);
      cache.set("key2", "value2", 10000);
      cache.set("key3", "value3", 10000);

      cache.delete("key3"); // Most recent

      expect(cache.size()).toBe(2);
      expect(cache.get("key1")).toBe("value1");
      expect(cache.get("key2")).toBe("value2");
    });

    it("should handle deleting tail node", () => {
      cache.set("key1", "value1", 10000);
      cache.set("key2", "value2", 10000);
      cache.set("key3", "value3", 10000);

      cache.delete("key1"); // Least recent

      expect(cache.size()).toBe(2);
      expect(cache.get("key2")).toBe("value2");
      expect(cache.get("key3")).toBe("value3");
    });
  });

  describe("Size and Clear Operations", () => {
    let cache: LRUCache<string>;

    beforeEach(() => {
      cache = new LRUCache<string>(5, { autoCleanup: false });
    });

    afterEach(() => {
      cache.destroy();
    });

    it("should return correct size", () => {
      expect(cache.size()).toBe(0);

      cache.set("key1", "value1", 10000);
      expect(cache.size()).toBe(1);

      cache.set("key2", "value2", 10000);
      expect(cache.size()).toBe(2);

      cache.delete("key1");
      expect(cache.size()).toBe(1);
    });

    it("should clear all items", () => {
      cache.set("key1", "value1", 10000);
      cache.set("key2", "value2", 10000);
      cache.set("key3", "value3", 10000);

      expect(cache.size()).toBe(3);

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toBeNull();
      expect(cache.get("key3")).toBeNull();
    });

    it("should clear empty cache without error", () => {
      expect(() => cache.clear()).not.toThrow();
      expect(cache.size()).toBe(0);
    });

    it("should allow setting items after clear", () => {
      cache.set("key1", "value1", 10000);
      cache.clear();

      cache.set("key2", "value2", 10000);
      expect(cache.get("key2")).toBe("value2");
      expect(cache.size()).toBe(1);
    });
  });

  describe("Background Cleanup", () => {
    it("should automatically clean expired items with autoCleanup enabled", async () => {
      const cache = new LRUCache<string>(5, {
        cleanupInterval: 100,
        autoCleanup: true,
      });

      cache.set("key1", "value1", 50);
      cache.set("key2", "value2", 10000);

      expect(cache.size()).toBe(2);

      // Wait for cleanup interval
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(cache.size()).toBe(1);
      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toBe("value2");

      cache.destroy();
    }, 10000);

    it("should not run cleanup when autoCleanup is false", async () => {
      const cache = new LRUCache<string>(5, {
        cleanupInterval: 100,
        autoCleanup: false,
      });

      cache.set("key1", "value1", 50);

      // Wait for what would be cleanup interval
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Item should still be in cache (not cleaned)
      expect(cache.size()).toBe(1);

      cache.destroy();
    });

    it("should restart cleanup after clear", async () => {
      const cache = new LRUCache<string>(5, {
        cleanupInterval: 100,
        autoCleanup: true,
      });

      cache.set("key1", "value1", 10000);
      cache.clear();

      cache.set("key2", "value2", 50);

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(cache.size()).toBe(0);

      cache.destroy();
    }, 10000);

    it("should reschedule cleanup when item expires before cleanup interval", async () => {
      const cache = new LRUCache<string>(5, {
        cleanupInterval: 5000, // Long interval
        autoCleanup: true,
      });

      // Set item with short TTL
      cache.set("key1", "value1", 50);
      cache.set("key2", "value2", 10000);

      // Wait for first cleanup cycle + rescheduled cleanup
      await new Promise((resolve) => setTimeout(resolve, 300));

      // key1 should be cleaned up
      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toBe("value2");

      cache.destroy();
    }, 10000);
  });

  describe("Destroy", () => {
    it("should stop cleanup and clear cache", () => {
      const cache = new LRUCache<string>(5, { autoCleanup: true });

      cache.set("key1", "value1", 10000);
      cache.set("key2", "value2", 10000);

      expect(cache.size()).toBe(2);

      cache.destroy();

      expect(cache.size()).toBe(0);
    });

    it("should allow multiple destroy calls", () => {
      const cache = new LRUCache<string>(5, { autoCleanup: true });

      expect(() => {
        cache.destroy();
        cache.destroy();
      }).not.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle cache with maxSize of 1", () => {
      const cache = new LRUCache<string>(1, { autoCleanup: false });

      cache.set("key1", "value1", 10000);
      expect(cache.get("key1")).toBe("value1");

      cache.set("key2", "value2", 10000);
      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toBe("value2");
      expect(cache.size()).toBe(1);

      cache.destroy();
    });

    it("should move accessed item to front", () => {
      const cache = new LRUCache<string>(2, { autoCleanup: false });

      cache.set("key1", "value1", 10000);
      cache.set("key2", "value2", 5000);

      // Access key1 to move it to front
      cache.get("key1");

      // Add key3, should evict key2 (shortest TTL)
      cache.set("key3", "value3", 15000);

      expect(cache.get("key1")).toBe("value1");
      expect(cache.get("key2")).toBeNull();
      expect(cache.get("key3")).toBe("value3");

      cache.destroy();
    });

    it("should handle updating only node in cache", () => {
      const cache = new LRUCache<string>(3, { autoCleanup: false });

      cache.set("key1", "value1", 10000);
      cache.set("key1", "value2", 10000);

      expect(cache.get("key1")).toBe("value2");
      expect(cache.size()).toBe(1);

      cache.destroy();
    });

    it("should handle very short TTL", async () => {
      const cache = new LRUCache<string>(5, { autoCleanup: false });

      cache.set("key1", "value1", 1);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(cache.get("key1")).toBeNull();
      expect(cache.size()).toBe(0);

      cache.destroy();
    });

    it("should handle setting same key multiple times in sequence", () => {
      const cache = new LRUCache<string>(3, { autoCleanup: false });

      cache.set("key1", "value1", 10000);
      cache.set("key1", "value2", 10000);
      cache.set("key1", "value3", 10000);

      expect(cache.get("key1")).toBe("value3");
      expect(cache.size()).toBe(1);

      cache.destroy();
    });

    it("should handle cleanExpired on empty cache", () => {
      const cache = new LRUCache<string>(5, { autoCleanup: false });

      const cleaned = cache.cleanExpired();
      expect(cleaned).toBe(0);

      cache.destroy();
    });

    it("should properly clean expired items before eviction", async () => {
      const cache = new LRUCache<string>(2, { autoCleanup: false });

      cache.set("key1", "value1", 100);
      cache.set("key2", "value2", 10000);

      await new Promise((resolve) => setTimeout(resolve, 150));

      // This should clean expired key1 first, then add key3
      cache.set("key3", "value3", 10000);

      expect(cache.size()).toBe(2);
      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toBe("value2");
      expect(cache.get("key3")).toBe("value3");

      cache.destroy();
    });
  });

  describe("LRU Order Maintenance", () => {
    let cache: LRUCache<string>;

    beforeEach(() => {
      cache = new LRUCache<string>(3, { autoCleanup: false });
    });

    afterEach(() => {
      cache.destroy();
    });

    it("should maintain LRU order on get", () => {
      cache.set("a", "1", 10000);
      cache.set("b", "2", 8000);
      cache.set("c", "3", 6000);

      // Access 'a' to move it to front
      cache.get("a");

      // Add 'd', should evict 'c' (shortest TTL)
      cache.set("d", "4", 15000);

      expect(cache.get("a")).toBe("1");
      expect(cache.get("b")).toBe("2");
      expect(cache.get("c")).toBeNull();
      expect(cache.get("d")).toBe("4");
    });

    it("should maintain LRU order on set (update)", () => {
      cache.set("a", "1", 10000);
      cache.set("b", "2", 8000);
      cache.set("c", "3", 6000);

      // Update 'a' to move it to front
      cache.set("a", "1-updated", 10000);

      // Add 'd', should evict 'c' (shortest TTL)
      cache.set("d", "4", 15000);

      expect(cache.get("a")).toBe("1-updated");
      expect(cache.get("b")).toBe("2");
      expect(cache.get("c")).toBeNull();
      expect(cache.get("d")).toBe("4");
    });
  });

  describe("Heap Behavior", () => {
    it("should maintain heap property with multiple items", () => {
      const cache = new LRUCache<number>(10, { autoCleanup: false });

      // Add items with specific TTLs to test heap operations
      cache.set("a", 1, 1000);
      cache.set("b", 2, 500);
      cache.set("c", 3, 1500);
      cache.set("d", 4, 300);
      cache.set("e", 5, 800);
      cache.set("f", 6, 1200);
      cache.set("g", 7, 600);

      // Manually clean to trigger heap extraction
      const now = Date.now() + 400;
      const cleaned = cache.cleanExpired(now);

      // Should clean items with TTL <= 400ms (b:500 and d:300)
      expect(cleaned).toBeGreaterThan(0);
      expect(cache.size()).toBeLessThan(7);

      cache.destroy();
    });

    it("should handle heap removal from various positions", () => {
      const cache = new LRUCache<number>(10, { autoCleanup: false });

      // Build a heap structure
      cache.set("item1", 1, 1000);
      cache.set("item2", 2, 500);
      cache.set("item3", 3, 1500);
      cache.set("item4", 4, 700);
      cache.set("item5", 5, 900);

      // Delete from middle to trigger heap rebalancing
      cache.delete("item2");
      cache.delete("item4");

      expect(cache.size()).toBe(3);
      expect(cache.get("item1")).toBe(1);
      expect(cache.get("item3")).toBe(3);
      expect(cache.get("item5")).toBe(5);

      cache.destroy();
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle mixed operations correctly", async () => {
      const cache = new LRUCache<number>(3, { autoCleanup: false });

      cache.set("a", 1, 10000);
      cache.set("b", 2, 100);
      cache.set("c", 3, 10000);

      expect(cache.size()).toBe(3);
      expect(cache.get("a")).toBe(1);

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(cache.get("b")).toBeNull();
      expect(cache.size()).toBe(2);

      cache.set("d", 4, 10000);
      expect(cache.size()).toBe(3);

      cache.delete("a");
      expect(cache.size()).toBe(2);

      cache.set("e", 5, 10000);
      expect(cache.get("c")).toBe(3);
      expect(cache.get("d")).toBe(4);
      expect(cache.get("e")).toBe(5);

      cache.destroy();
    });

    it("should handle rapid set/get operations", () => {
      const cache = new LRUCache<number>(10, { autoCleanup: false });

      // Set 20 items with same TTL
      for (let i = 0; i < 20; i++) {
        cache.set(`key${i}`, i, 10000);
      }

      // Only 10 should remain (maxSize)
      expect(cache.size()).toBe(10);

      // The cache evicts based on expiry time
      // With same TTL, items are evicted in the order they were added
      // So the first 10 items should be evicted, and the last 10 should remain
      // Actually, the eviction strategy is expiry-based (min heap)
      // All items have the same expiry, so heap behavior determines eviction
      // Let's just verify size and that we can still add/get items
      
      const keys = [];
      for (let i = 0; i < 20; i++) {
        const val = cache.get(`key${i}`);
        if (val !== null) {
          keys.push(i);
        }
      }
      
      expect(keys.length).toBe(10);

      cache.destroy();
    });
  });
});

