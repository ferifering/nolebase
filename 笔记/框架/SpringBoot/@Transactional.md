
## 一、`@Transactional` 是什么

`@Transactional` 是 Spring 提供的 **声明式事务管理注解**，它的作用是让方法在一个事务上下文中执行，保证数据库操作的原子性、一致性、隔离性、持久性（ACID）。

- **声明式**：你只需在方法/类上加注解，Spring 自动通过 AOP 代理帮你处理事务开启/提交/回滚。
- **底层依赖**：最终是调用 `PlatformTransactionManager`（事务管理器）来控制数据库连接（Connection）的事务。

---

## 二、工作原理

1. **代理拦截**
    
    - 启动时 `@EnableTransactionManagement` 注册 `TransactionInterceptor`，为 `@Transactional` 方法生成 AOP 代理。
        
    - 方法调用时，不直接执行目标方法，而是先进入 `TransactionInterceptor`。
        
2. **获取事务属性**
    
    - 读取注解里的传播行为、隔离级别、只读、超时等属性，生成 `TransactionAttribute`。
        
3. **事务开启**
    
    - `TransactionInterceptor` 调用事务管理器（`PlatformTransactionManager`），执行 `getTransaction(definition)`：
        
        - 如果当前线程已有事务 → 根据传播属性决定是否复用、挂起或新建。
            
        - 如果没有 → 新建事务，把连接和事务状态存入 `TransactionSynchronizationManager`（ThreadLocal）。
            
4. **执行业务方法**
    
    - 执行目标方法逻辑。
        
5. **提交或回滚**
    
    - 方法正常返回 → `commit()` 提交事务。
        
    - 方法抛出异常 → 根据回滚规则决定是 `rollback()` 还是 `commit()`。
        

---

## 三、关键组件

- **TransactionInterceptor**：事务拦截器（AOP 切面），拦截方法调用。
    
- **TransactionAspectSupport**：事务逻辑核心，封装事务开启/提交/回滚。
    
- **PlatformTransactionManager**：事务管理器接口（统一抽象）。
    
    - `DataSourceTransactionManager`（JDBC/MyBatis）
        
    - `JpaTransactionManager`（JPA/Hibernate）
        
    - `JtaTransactionManager`（分布式事务）
        
- **TransactionSynchronizationManager**：事务上下文存储，基于 ThreadLocal，保存连接和同步器。
    
- **TransactionDefinition**：事务定义（传播、隔离、超时、只读）。
    
- **TransactionStatus**：事务状态（是否新建、是否完成、是否回滚）。
    

---

## 四、事务传播机制（Propagation）

传播机制决定了 **当前线程调用一个事务方法时，是否加入已有事务，还是新建/挂起事务**。

|传播属性|行为|
|---|---|
|**REQUIRED**（默认）|有事务 → 加入，没有 → 新建事务|
|**REQUIRES_NEW**|挂起当前事务，新建新事务|
|**NESTED**|有事务 → 创建 savepoint（保存点），出错可回滚到保存点；无事务 → 新建事务|
|**SUPPORTS**|有事务 → 加入，无事务 → 非事务方式执行|
|**NOT_SUPPORTED**|有事务 → 挂起事务，非事务方式执行|
|**MANDATORY**|必须在事务中执行，否则抛异常|
|**NEVER**|必须在非事务中执行，否则抛异常|

Spring 在进入方法时，检查当前线程的 `ThreadLocal` 是否已有事务上下文，并根据传播属性做不同处理：复用、挂起/恢复、savepoint。

---

## 五、事务隔离级别（Isolation）

对应数据库事务隔离，控制并发读写问题：

| 隔离级别                          | 脏读  | 不可重复读 | 幻读  |
| ----------------------------- | --- | ----- | --- |
| **READ_UNCOMMITTED**          | 可能  | 可能    | 可能  |
| **READ_COMMITTED**            | 否   | 可能    | 可能  |
| **REPEATABLE_READ**（MySQL 默认） | 否   | 否     | 可能  |
| **SERIALIZABLE**              | 否   | 否     | 否   |

Spring 的注解示例：

```java
@Transactional(isolation = Isolation.REPEATABLE_READ)
```

---

## 六、回滚规则

默认情况下：

- **运行时异常（RuntimeException）和 Error** → 自动回滚
    
- **受检异常（Checked Exception）** → 不回滚
    

可以通过配置控制：

```java
@Transactional(rollbackFor = Exception.class, noRollbackFor = CustomException.class)
```

---

## 七、常见属性

```java
@Transactional(
    propagation = Propagation.REQUIRED,    // 事务传播
    isolation = Isolation.READ_COMMITTED,  // 隔离级别
    rollbackFor = Exception.class,         // 指定回滚异常
    noRollbackFor = {IllegalArgumentException.class}, // 不回滚异常
    timeout = 30,                          // 超时时间（秒）
    readOnly = true                        // 只读事务
)
```

- **propagation**：事务传播方式
    
- **isolation**：事务隔离级别
    
- **timeout**：事务超时时间
    
- **readOnly**：只读优化（避免 flush、提升性能）
    

---

## 八、线程内事务传播过程

Spring 的事务信息存在 `ThreadLocal`：

- 方法进入时，代理检查 `TransactionSynchronizationManager`。
    
- 决定是否使用当前事务、挂起/恢复事务，或新建事务。
    
- 整个线程执行链上都能感知这个事务（除非新建/挂起）。
    

⚠️ **多线程不传播**：

- `@Transactional` 的事务上下文只在当前线程有效，子线程不会自动继承父线程事务。
    
- 如果要多线程事务，要么重构逻辑避免跨线程事务，要么用 MQ/事件解耦。
    

---

## 九、常见坑

1. **自调用失效**
    
    - 同类内部 `this.method()` 调用不会走代理，事务不生效。
        
    - 解决：通过代理对象调用或方法拆分到其他 Bean。
        
2. **方法不是 public**
    
    - 默认只代理 public 方法，private/protected 不生效。
        
3. **异常被捕获**
    
    - 如果你 catch 掉异常且不再抛出，事务不会回滚。
        
4. **Checked 异常不回滚**
    
    - 默认只回滚 RuntimeException，要指定 `rollbackFor`。
        
5. **多线程问题**
    
    - 事务上下文绑定线程，跨线程事务失效。
        
6. **事务超时**
    
    - 长事务容易超时或锁表，要合理设置 timeout。
        

---

## 十、最佳实践

- 把事务放在 **Service 层**，不要放在 Controller/DAO 层。
    
- 方法尽量保持 **原子性、短事务**，避免大事务锁表。
    
- 避免在事务中进行 **长时间操作（IO、RPC、sleep）**。
    
- 明确回滚规则，不要依赖默认行为。
    
- 不要随意使用 `REQUIRES_NEW`，否则会频繁挂起/恢复事务，影响性能。
    
- 使用 **只读事务** 提升性能（适用于查询方法）。
    
- 对并发冲突敏感的业务（如库存扣减），选择合适隔离级别或加乐观/悲观锁。
    

---

## 十一、执行流程图（简化）

```
调用方法
   ↓
代理拦截（TransactionInterceptor）
   ↓
获取事务属性（propagation、isolation...）
   ↓
PlatformTransactionManager.getTransaction()
   ↓
检查当前线程的 ThreadLocal 是否已有事务
   ├── 有事务 → 根据传播属性复用/挂起/新建
   └── 无事务 → 新建事务，绑定到 ThreadLocal
   ↓
执行业务逻辑
   ↓
方法返回
   ├── 正常 → commit()
   └── 异常 → rollback()
   ↓
解绑事务 / 恢复挂起事务
```

---

✅ **一句话总结：**  
`@Transactional` 的核心是 **AOP 代理 + PlatformTransactionManager + ThreadLocal 事务上下文**。  
它通过代理拦截方法调用，在进入时检查并绑定事务、退出时提交或回滚事务，从而保证方法执行的事务性。

---

要不要我帮你再画一张 **“事务传播（REQUIRED vs REQUIRES_NEW vs NESTED）时 ThreadLocal 上事务的变化图”**，这样你能直观看到事务是怎么在一个线程里切换和恢复的？