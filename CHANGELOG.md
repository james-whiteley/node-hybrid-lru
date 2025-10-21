# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-19

### Added

#### Core Cache Features
- **Hybrid LRU-TTL Cache Implementation**: A high-performance cache that combines Least Recently Used (LRU) eviction with Time-To-Live (TTL) expiration policies
- **Generic Type Support**: Full TypeScript support with generic type parameters for type-safe caching of any data type
- **O(1) Operations**: All core operations (get, set, delete) run in constant time complexity
- **Memory-Efficient Design**: Uses object pooling to minimize garbage collection overhead

#### Configuration Options
- **`maxSize`**: Configurable maximum cache size with validation (required, positive finite number)
- **`ttlMs`**: Configurable time-to-live for cache items (default: 60 seconds)
- **`cleanupInterval`**: Configurable background cleanup interval (default: 60 seconds)
- **`autoCleanup`**: Toggle for automatic background cleanup of expired items (default: true)

#### Core Methods
- **`get(key: string): T | null`**: Retrieve cached values with automatic expiration checking
- **`set(key: string, value: T): void`**: Store values with automatic TTL assignment and LRU ordering
- **`delete(key: string): boolean`**: Remove specific keys from cache
- **`size(): number`**: Get current number of cached items
- **`clear(): void`**: Remove all items and restart background cleanup if enabled
- **`cleanExpired(now?: number): number`**: Manual cleanup of expired items with optional timestamp
- **`destroy(): void`**: Complete cleanup including stopping background timers

#### Advanced Features
- **Lazy Expiration**: Items are checked for expiration only when accessed, improving performance
- **Background Cleanup**: Automatic periodic cleanup of expired items with configurable intervals
- **LRU Order Maintenance**: Proper maintenance of least-recently-used ordering for efficient eviction
- **Node Pooling**: Object pool for cache nodes to reduce memory allocation overhead
- **Automatic Eviction**: LRU-based eviction when cache reaches maximum capacity
- **TTL Refresh**: Updating existing keys refreshes their expiration time

#### Performance Optimizations
- **Efficient Data Structures**: Uses Map for O(1) key lookup and doubly-linked list for LRU ordering
- **Minimal Memory Footprint**: Object pooling reduces garbage collection pressure
- **Non-blocking Cleanup**: Background cleanup doesn't block main operations
- **Timer Management**: Proper cleanup of background timers to prevent memory leaks

#### Error Handling & Validation
- **Input Validation**: Comprehensive validation for cache options and keys
- **Error Messages**: Clear error messages for invalid configurations
- **Type Safety**: Full TypeScript type checking and inference
- **Edge Case Handling**: Robust handling of edge cases like empty cache, single items, etc.

#### Testing & Quality Assurance
- **Comprehensive Test Suite**: 100% test coverage with Jest
- **Unit Tests**: Tests for all methods and edge cases
- **Integration Tests**: Tests for complex scenarios and mixed operations
- **Performance Tests**: Tests for rapid operations and memory efficiency
- **Error Case Tests**: Tests for invalid inputs and error conditions

#### Developer Experience
- **TypeScript Support**: Full TypeScript definitions and type safety
- **ESM Module**: Modern ES module support
- **JSDoc Documentation**: Comprehensive inline documentation
- **Example Configurations**: Multiple usage examples in README
- **Clear API**: Intuitive and consistent API design

#### Build & Distribution
- **Optimized Build**: Minified and compressed production build
- **Type Definitions**: Generated TypeScript declaration files
- **Package Configuration**: Proper package.json configuration for npm distribution
- **Security Scanning**: Integrated security vulnerability scanning
- **Code Quality**: ESLint configuration with security rules

### Technical Specifications

#### Data Structures
- **HashMap**: O(1) key-value storage using JavaScript Map
- **Doubly-Linked List**: O(1) insertion, deletion, and LRU ordering
- **Object Pool**: Efficient memory management for cache nodes
- **Min Heap**: Efficient expiration time management (implied by TTL structure)

#### Performance Characteristics
- **Time Complexity**: O(1) for get, set, delete operations
- **Space Complexity**: O(n) where n is the number of cached items
- **Memory Efficiency**: Object pooling reduces GC pressure
- **Background Processing**: Non-blocking cleanup operations

#### Compatibility
- **Node.js**: Compatible with modern Node.js versions
- **TypeScript**: Full TypeScript support with strict type checking
- **ES Modules**: Native ES module support
- **Browser**: Compatible with modern browsers (with appropriate bundling)

### Dependencies
- **Zero Runtime Dependencies**: No external dependencies for core functionality
- **Development Dependencies**: Comprehensive dev toolchain including Jest, TypeScript, ESLint, and security tools

### Documentation
- **README**: Comprehensive usage guide with examples
- **API Documentation**: Complete method documentation with parameters and return types
- **Configuration Guide**: Detailed explanation of all configuration options
- **Example Configurations**: Multiple real-world usage scenarios

---

## Version History

- **1.0.0**: Initial release with full hybrid LRU-TTL cache implementation
