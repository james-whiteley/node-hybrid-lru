# Hybrid LRU

A cache object that combines LRU and TTL eviction policies.

## Installation

```bash
npm install @james-whiteley/hybrid-lru
```

## Usage

```javascript
import { Cache } from '@james-whiteley/hybrid-lru'

const cache = new Cache({
    maxSize: 1000,
    ttlMs: 60000,
    cleanupInterval: 60000,
    autoCleanup: true
})
```

## Cache Options

The `Cache` constructor accepts an options object with the following properties:

### `maxSize` (required)
- **Type**: `number`
- **Default**: `1000`
- **Description**: Maximum number of items the cache can hold
- **Must be**: A positive finite number
- **Example**: `1000`

### `cleanupInterval` (optional)
- **Type**: `number`
- **Default**: `60000` (60 seconds)
- **Description**: Interval in milliseconds for background cleanup of expired items
- **Must be**: A positive finite number
- **Example**: `30000` (30 seconds)

### `ttlMs` (optional)
- **Type**: `number`
- **Default**: `60000` (60 seconds)
- **Description**: Time-to-live in milliseconds for cache items
- **Must be**: A positive finite number
- **Example**: `30000` (30 seconds)

### `autoCleanup` (optional)
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Whether to automatically run background cleanup of expired items
- **When `true`**: Expired items are automatically removed at the specified interval
- **When `false`**: Manual cleanup is required using the `cleanExpired()` method
- **Example**: `false`

## Cache Methods

### `get(key: string): T | null`
- **Description**: Retrieves a value from the cache by key
- **Parameters**: `key` - The cache key (must be a non-empty string)
- **Returns**: The cached value or `null` if not found or expired
- **Example**: `const value = cache.get('user:123')`

### `set(key: string, value: T): void`
- **Description**: Stores a value in the cache with the configured TTL
- **Parameters**: 
  - `key` - The cache key (must be a non-empty string)
  - `value` - The value to cache
- **Example**: `cache.set('user:123', userData)`

### `delete(key: string): boolean`
- **Description**: Removes a specific key from the cache
- **Parameters**: `key` - The cache key to remove
- **Returns**: `true` if the key existed and was removed, `false` otherwise
- **Example**: `const removed = cache.delete('user:123')`

### `size(): number`
- **Description**: Returns the current number of items in the cache
- **Returns**: The number of cached items
- **Example**: `const count = cache.size()`

### `clear(): void`
- **Description**: Removes all items from the cache and restarts background cleanup if enabled
- **Example**: `cache.clear()`

### `cleanExpired(now?: number): number`
- **Description**: Manually removes all expired items from the cache
- **Parameters**: `now` - Optional timestamp to use for expiration check (defaults to current time)
- **Returns**: The number of expired items that were removed
- **Example**: `const cleaned = cache.cleanExpired()`

### `destroy(): void`
- **Description**: Stops background cleanup and clears all cache data. Use this when the cache is no longer needed.
- **Example**: `cache.destroy()`

## Example Configurations

### Basic Cache
```javascript
const cache = new Cache({ maxSize: 500 })
// Uses default TTL of 60 seconds
```

### Short-Lived Cache
```javascript
const cache = new Cache({
    maxSize: 1000,
    ttlMs: 30000, // 30 seconds
    cleanupInterval: 15000, // 15 seconds
    autoCleanup: true
})
```

### High-Frequency Cache with Frequent Cleanup
```javascript
const cache = new Cache({
    maxSize: 10000,
    ttlMs: 120000, // 2 minutes
    cleanupInterval: 10000, // 10 seconds
    autoCleanup: true
})
```

### Manual Cleanup Cache
```javascript
const cache = new Cache({
    maxSize: 2000,
    ttlMs: 300000, // 5 minutes
    autoCleanup: false
})

// Manually clean expired items when needed
cache.cleanExpired()
```

### Long-Lived Cache
```javascript
const cache = new Cache({
    maxSize: 5000,
    ttlMs: 3600000, // 1 hour
    cleanupInterval: 300000, // 5 minutes
    autoCleanup: true
})
```

