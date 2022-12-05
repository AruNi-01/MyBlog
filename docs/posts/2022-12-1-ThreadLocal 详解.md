---
title: ThreadLocal 详解
subtitle: 吃透 ThreadLocal「Tag - Java 并发」
author: AruNi_Lu
date: 2022-12-1
tags:
- Java 并发
- Java

layout: Post
useHeaderImage: true
headerImage: https://aruni-01-github-io.oss-cn-beijing.aliyuncs.com/posts/ThreadLocal_1.jpg
headerMask: rgba(40, 57, 101, .4)
catalog: true
---

Java 并发系列 —— ThreadLocal 详解

<!-- more --> 

## 1. 什么是 ThreadLocal？

ThreadLocal 叫做本地线程变量，顾名思义，ThreadLocal 中存放的是 **当前线程的变量**，该变量对其他线程而言是 **隔离** 的。对于 ThreadLocal 存放的变量，在每个线程中都有一份自己的 **副本变量**，多个线程互不干扰。

下面使用一个简单的例子来展示 ThreadLocal 的线程隔离：

```java
public class Demo01 {
    private static final ThreadLocal<User> localUser = new ThreadLocal<>();

    public static void main(String[] args) {
        // 线程1 先启动，往 ThreadLocal 中添加 User 对象
        new Thread(() -> {
            localUser.set(new User("张三", 17));
            try {
                Thread.sleep(3000);
            } catch (InterruptedException e) {
                throw new RuntimeException(e);
            }
            User user = localUser.get();
            System.out.println("线程1 获取的 User：" + user);
        }, "线程1").start();

        // 主线程获取 ThreadLocal 中的变量
        User user = localUser.get();
        System.out.println("main线程 获取的 User：" + user);
    }
}

class User {
    String name;
    int age;

    // 构造方法、toString() 略
}
```

输出：

```text
main线程 获取的 User：null
线程1 获取的 User：User{name='张三', age=17}

Process finished with exit code 0
```

可以发现，线程1中添加的 ThreadLocal 变量，只有线程1自己能获取到，main 线程是获取不到的，因此对于这个 ThreadLocal 变量来说，线程之间是隔离的。

我们还可以在 main 线程中添加属于它的 ThreadLocal 变量，如下：

```java
	// ......

	// main 线程添加自己的 ThreadLocal 变量
    localUser.set(new User("李四", 18));
    User user = localUser.get();
    System.out.println("main线程 获取的 User：" + user);

    // .......
```

输出：

```text
main线程 获取的 User：User{name='李四', age=18}
线程1 获取的 User：User{name='张三', age=17}

Process finished with exit code 0
```



## 2. ThreadLocal 内部设计

想要知道 ThreadLocal 为什么能实现线程隔离，就要翻开 ThreadLocal 的源码，看看它是如何实现的。

### 2.1 早期设计

在 JDK 最早期的设计中，ThreadLocal 是这样设计的：

每个 ThreadLocal 都创建一个 Map（ThreadLocalMap），当前线程作为 key，要存储的变量作为 value，这样能达到各个线程的变量互相隔离的效果。如下图：

![image-20221201164134241](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212011641956.png)

从上面的设计中很容易看出一个缺点：**每创建一个线程都要添加一个 Entry**，即使这个线程根本就没有用到 ThreadLocal。

所以在 JDK 1.8 中，弃用了这种设计。

### 2.2 JDK 1.8 的设计

在 JDK 1.8 中，ThreadLocal 的设计是：

**每个 Thread 维护一个 Map（ThreadLocalMap），这个 Map 的 key 为 ThreadLocal 实例本身，value 为要存储的变量**。

![image-20221201171027198](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212011710278.png)

可以发现，此设计的 ThreadLocal 和 Thread 刚好和早期的设计是相反的，这样设计有如下 **优点**：

- 每创建一个线程不一定会增加一个 Entry，当前线程不使用 ThreadLocal 时，Map 就为 null。所以 **每个 Map 存储的 Entry 数量就会减少**，往往线程的数量要大于 ThreadLocal 的数量。
- 当 Thread 销毁后，对应的 ThreadLocalMap 也随之销毁，**减少内存占用**。
- 当并发量较大时，因为所有的 Entry 在一个 Map 中，**所有线程对同一个 ThreadLocal 变量的操作都在同一个 Map 中（Map 中一个线程对应一个 key），导致访问性能下降**。而现在的设计每个线程自己有一个 Map，访问自己的效率更高。

::: info Thread 是怎么拥有 ThreadLocalMap 的呢？
🤔
:::

在 Thread 类中有一个类型为 `ThreadLocal.ThreadLocalMap` 的实例变量 `threadLocals`，默认值为 null。所以当创建线程时，每个线程都有一个自己的 ThreadLocalMap。

```java
public class Thread implements Runnable {
    // ......
    
    /* ThreadLocal values pertaining to this thread. This map is maintained
     * by the ThreadLocal class. */
    ThreadLocal.ThreadLocalMap threadLocals = null;
    
    // ......
}
```

当对 ThreadLocal 进行 `set()` 时，就会先获取当前线程的 ThreadLocalMap，如果为 null 就会创建 ThreadLocalMap：

```java
    public void set(T value) {
        Thread t = Thread.currentThread();
        // getMap(t) 直接返回当前线程的 threadLocals 变量（ThreadLocalMap 类型）
        ThreadLocalMap map = getMap(t);
        if (map != null) {
            map.set(this, value);
        } else {
            createMap(t, value);
        }
    }

    ThreadLocalMap getMap(Thread t) {
        return t.threadLocals;
    }
```



### 2.3 ThreadLocalMap 的实现

ThreadLocalMap 是 ThreadLocal 的静态内部类，它有自己的独立实现。

ThreadLocalMap 中用于存储 kv 对的是 Entry 类型的数组，这个 Entry 是 ThreadLocalMap 的静态内部类，它继承了 WeakReference 类，在构造方法中，对 key 的构造使用了父类 WeakReference 的构造方法，所以 **key 是一个弱引用，而不是 ThreadLocal 本身**。

ThreadLocal 部分源码如下：

```java
public class ThreadLocal<T> {
    // ......
    static class ThreadLocalMap {
	// ......
        static class Entry extends WeakReference<ThreadLocal<?>> {
            /** The value associated with this ThreadLocal. */
            Object value;

            Entry(ThreadLocal<?> k, Object v) {
                super(k);
                value = v;
            }
        }

        /**
         * The table, resized as necessary.
         * table.length MUST always be a power of two.
         */
        private Entry[] table;
    
        // ......
}
```

### 2.4 ThreadLocal 会发生内存泄漏吗？

先简单的了解下什么是内存泄漏以及 Java 的四种引用类型。

::: info 什么是内存泄漏？
🤔
:::

内存泄漏就是已经不再使用得内存得不到释放，让这块内存空间白白的被占有，一旦内存泄漏出现的次数多了，就可能导致 OOM。

::: info Java 的四种引用类型
🤔
:::

Java 的四种引用类型如下：

- **强引用**：通常 new 出来的对象就是强引用类型（把一个对象赋给一个引用变量，这个引用变量就是一个强引用）。只要强引用的存在，对象没有被置为 null，垃圾回收器将 **永远不会回收被引用的对象，哪怕内存不足的时候**。
- **软引用**：使用 SoftReference 修饰的对象被称为软引用，软引用指向的对象在 **内存要溢出的时候被回收**。
- **弱引用**：使用 WeakReference 修饰的对象被称为弱引用，**只要发生垃圾回收**，若这个对象 **只被弱引用指向，那么就会被回收**。
- **虚引用**：虚引用是最弱的引用，在 Java 中使用 PhantomReference 进行定义。虚引用中唯一的作用就是 **用队列接收对象即将死亡的通知**。

::: info ThreadLocal 内存泄漏分析
🤔
:::

根据 ThreadLocal 的内部实现原理，每个 Thread 维护了一个 ThreadLocalMap，key 为使用 **弱引用** 的ThreadLocal，value 为我们要存储的对象。

这些对象之间的引用关系如下（实线 - 强引用，虚线 - 弱引用）。可以看出，ThreadLocal 被两种引用指向：

- 强引用：`ThreadLocalRef -> ThreadLocal`；

- 弱引用：`key -> ThreadLocal`；

![image-20221201205530538](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212012055668.png)

根据上图进行分析：

**如果一个 ThreadLocal 不存在外部强引用时（外界把 ThreadLocal 变量置为 null），key 势必会被 GC 回收，这样就会导致 ThreadLocalMap 中的 key 为 null，而 value 不为 null**，只有 Thread 线程销毁后，ThreadLocalMap 才会随之销毁，value 的强引用链条才会断掉。

但是如果 **线程迟迟不关闭（比如使用线程池），这些 key 为 null 对应的 value 就会一直存在 Entry 中**，占用内存空间，又无法回收，就造成了 **内存泄漏**。

所以，为了避免内存泄漏，我们通常在使用完 ThreadLocal 后，需要 **主动调用 remove() 方法**，释放掉当前线程占用的 Entry。这样即使线程不被销毁，内存空间也得到释放了。

### 2.5 key 为什么设计成弱引用？

既然把 key 设置成弱引用会有内存泄漏的风险，为什么 JDK 团队还要这样做呢？先来看看下面这个问题。

::: info ThreadLocal 的 key 是弱引用，发生 GC 后 key 是否为 null 呢？
🤔
:::

还是用上面的图来分析：

![image-20221201205530538](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212012055668.png)



从上图可知，ThreadLocal 被两种引用指向：

- 强引用：`ThreadLocalRef -> ThreadLocal`；
- 弱引用：`ThreadLocalMap key -> ThreadLocal`；

所以，即使把 key 设置成了弱引用，**只要 ThreadLocal 没被回收（强引用存在），那 ThreadLocalMap 中 key 指向 ThreadLocal 的弱引用就不会在 GC 时被回收**，不会被置为 null。

而外界是通过 ThreadLocal 来对 ThreadLocalMap 进行操作的，**假设外界使用的 ThreadLocal 对象被置为 null 了，如果 key 指向 ThreadLocal 的引用是强引用，也就是 key 的强引用指向 null，而这个强引用无论什么情况都不会被 GC 回收**，此时的内存泄漏岂不是更糟糕吗？

所以，**key 设计成弱引用反而可以预防大多数内存泄漏的情况**。毕竟被回收后，下一次调用 set/get/remove 方法时，都会进行一次 null key 的清理。（清理内容在后面）

### 2.5 value 为什么不设计成弱引用呢？

首先我们得知道，**value 除了指向 Object 外，没有任何引用指向它**。所以如果 value 被设计成弱引用，那么它 **肯定会被 GC 回收**，那再调用 ThreadLocal.get() 时，得到的就是一个 null 值。

所以，value 是绝对不可以设计成弱引用的。

## 3. ThreadLocal 应用场景

### 3.1 维护数据库连接对象 Connection

在多线程场景下，可能一个线程要处理多个客户端请求，如果每个客户端都需要连接相同的数据库，此时使用 ThreadLocal 再合适不过了。

若不使用 ThreadLocal，同一个线程处理多个客户端时，需要为每一个客户端都创建一次数据库连接，而数据库的创建和关闭都是需要耗时的。

此时你可能会说，定义一个全局的 Connection 变量，所有线程都共用一个连接。但是这样有一个问题，你何时关闭这个连接呢？若关闭后后面又来了一个线程要使用连接怎么办。

所以使用 ThreadLocal 的话，一个线程只需要创建一个数据库连接，这个线程处理其他客户端时就可以直接复用此连接，避免了创建连接的消耗。同时若此线程处理完了所有请求，就关闭自己的连接即可，不会影响到其他线程的连接。

### 3.2 保存用户信息

ThreadLocal 最常用的场景就是在项目中保存用户的信息，这样就方便同一个线程执行不同方法时，获取到该用户的信息。

通常是在拦截器中将已经登录的用户存入 ThreadLocal 中，这样在这个线程处理用户的请求时，便可以在不同方法中通过 ThreadLocal 快速获取该登录用户的信息。

### 3.3 保存线程不安全的工具类

若某个工具类在并发的场景下会有线程不安全的情况，那么可以使用 ThreadLocal。

常见的线程不安全工具类有 Random、SimpleDateFormat，下面使用 SimpleDateFormat 来举例。

假设我们需要对 1000 个时间进行格式化，为了提高效率，我们采用 10 个线程对这 1000 个时间进行格式化。如果不采取任何同步措施，会出现上一个线程还在使用 SimpleDateFormat 时，这个线程也去使用，这样返回格式化后的时间可能存在一个线程把另一个线程格式化完的时间覆盖了，最后这 1000 个时间里会有一些时间没被格式化到。

利用上面的例子，我们先来看看不适用 ThreadLocal，使用一个全局变量来格式化这些时间：

```java
public class Demo2 {
    public static void main(String[] args) {
        ExecutorService executorService = Executors.newFixedThreadPool(10);
        
        SimpleDateFormat dateFormat = new SimpleDateFormat("mm:ss");

        for (int i = 0; i < 1000; i++) {
            int tmp = i;
            executorService.execute(() -> {
                // 10 个线程都共用同一个 SimpleDateFormat 对象进行格式化
                String date = dateFormat.format(new Date(1000 * tmp));
                System.out.println(date);
            });
        }
        executorService.shutdown();
    }
}
```

输出：

```text
00:04
00:04
00:02
00:04
00:07
00:04
00:06
00:09
00:05
00:10
......
```

从前几个就可以看出，有好几个时间格式化成了 00:04，这说明多个线程使用了同一个 SimpleDateFormat 对象，出现了并发问题。

使用 ThreadLocal 后，这 10 个线程，每个线程都会有一个自己的 SimpleDateformat 副本：

```java
public class Demo2 {
    private static final ThreadLocal<SimpleDateFormat> THREAD_LOCAL =
            ThreadLocal.withInitial(() -> new SimpleDateFormat("mm:ss"));

    public static void main(String[] args) {
        ExecutorService executorService = Executors.newFixedThreadPool(10);

//        SimpleDateFormat dateFormat = new SimpleDateFormat("mm:ss");

        for (int i = 0; i < 1000; i++) {
            int tmp = i;
            executorService.execute(() -> {
                SimpleDateFormat dateFormat = THREAD_LOCAL.get();
                String date = dateFormat.format(new Date(1000 * tmp));
                System.out.println(date);
            });
        }
        executorService.shutdown();
    }
}
```

输出的结果中没有重复的时间：

```text
......
16:36
16:35
16:34
16:33
16:32
16:31
16:30
16:39

Process finished with exit code 0
```

## 4. ThreadLocal 源码初探

ThreadLocal 中的 set 方法很简单：

1. 获取当前线程的 ThreadLocalMap 实例；
2. 判断 ThreadLocalMap 是否存在：
    - 存在：调用 ThreadLocalMap 的 set 方法；
    - 不存在：创建 ThreadLocalMap；

源码如下：

![image-20221202153601534](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212021536350.png)

所以核心逻辑主要是在 ThreadLocalMap 中的 set 方法。

## 5. ThreadLocalMap 源码剖析

当调用 ThreadLocal 的 set 方法时，如果当前线程的 ThreadLocalMap 不为 null，则会调用 `ThreadLocalMap.set(this, value)` 来设置值，会先计算 key 在 Entry 数组中的下标（槽位）。

所以先来看看 ThreadLocalMap 的槽位是怎么计算的。

### 5.1 ThreadLocalMap Hash 算法

ThreadLocalMap 肯定也是一个 Map 结构，它实现了自己的 hash 算法。和 HashMap 的 hash 算法相似，用当前 key 的 HashCode 与 (len - 1) 取余，所以 ThreadLocalMap 的 Entry 数组长度也必须为 2 的幂次方（初始容量为 16，扩容倍数为 2）。

![image-20221202164251887](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212021642240.png)

再来看看这个 `key.threadLocalHashCode` 值是如何计算的，ThreadLocal 中有一个常量 **HASH_INCREMENT** = 0x61c88647。每当 **创建一个 ThreadLocal 对象** ，这个 `ThreadLocal.nextHashCode` 的值就会 **增长 0x61c88647**。

![image-20221204153016353](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212041532226.png)

HASH_INCREMENT = 0x61c88647 这个值很特殊，它是斐波那契数，也叫黄金分割数。hash 增量为这个数字，带来的好处就是 **hash 分布非常均匀**。我们自己可以尝试下：

![image-20221204153217638](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212041532689.png)

虽然 ThreadLocalMap 中使用了黄金分割数来作为 hash 计算因子，大大减少了 Hash 冲突的概率，但是仍然会存在冲突。

ThreadLocalMap 中解决哈希冲突的方法比较直接简单，就是 **向后探测**，找到空槽位即可。

在向后探测的过程中，可能会遇到 key 为 null 的 Entry，这时候会进行一轮 **探测式清理** 工作，后面会讲到。

### 5.2 ThreadLocalMap.set() 详解

前面我们也提到过，ThreadLocal 的 set 方法的主要逻辑在 ThreadLocalMap 的 set 方法中，接下来就详细分析一下。

往 ThreadLocalMap 中 set 数据（新增或修改）时，分为好几种情况，先浏览一下源码，看看大致的流程：

```java
public class ThreadLocal<T> {
    // ......
    static class ThreadLocalMap {
        // ......
        
        private void set(ThreadLocal<?> key, Object value) {
            Entry[] tab = table;
            int len = tab.length;
            // 1. 获取该 key 在散列表中的槽位
            int i = key.threadLocalHashCode & (len-1);

            // 2. 从该槽位开始，找到可用的位置
            for (Entry e = tab[i]; e != null; e = tab[i = nextIndex(i, len)]) {
                
                // 2.1 Entry 的引用对象指向该 key，说明是更新数据，则改完 value 返回即可
                if (e.refersTo(key)) {
                    e.value = value;
                    return;
                }

                // 2.2 引用对象指向 null，说明遇到过期数据，执行替换过期数据的方法，占用该过期数据的槽位
                if (e.refersTo(null)) {
                    replaceStaleEntry(key, value, i);
                    return;
                }
            }

            // 3. for 循环结束，说明遇到了空槽位，在空槽位添加该 Entry 即可
            tab[i] = new Entry(key, value);
            int sz = ++size;
            
            // 4. 先执行一次启发式清理，清理散列表中过期的数据，
            // 若未清理掉任何数据 且 数据大小到达 threshold，则进行 rehash 操作
            if (!cleanSomeSlots(i, sz) && sz >= threshold)
                rehash();
        }
        
    }
}
```

通过上面的分析，set 方法的流程如下：

1. 通过该 key 的 `threadLocalHashCode` 和 Entry 数组的长度 `len` 计算出槽位 `i`；
2. 从槽位 `i` 开始遍历 Entry 数组，在遍历过程中：
    1. 该 Entry 的引用指向该 key，说明是更新数据，执行更新逻辑，直接退出方法；
    2. 该 Entry 的引用指向 null，说明遇到了过期数据，则执行替换逻辑，占用该过期数据的槽位，直接退出方法；
3. 查找过程中，遇到空槽位，直接使用该槽位即可；
4. 执行一次启发式清理，清理散列表中过期的数据：
    - 若清理到了数据，则方法结束；
    - 若没清理到数据，则会看当前的数据大小是否已达到 threshold（`threshold = len * 2/3`），是则进行 rehash 操作；

流程图如下：

![image-20221204182930626](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212041829971.png)

对过期键的清理过程比较复杂，我们重点来看看替换过期数据的 `replaceStaleEntry()` 方法。

::: info replaceStaleEntry() 方法解读
🤔
:::

在执行 set 方法的时候，如果往后探测的过程中遇到了过期的数据（null key），则会执行替换过期数据的方法 `replaceStaleEntry()`，这个方法的源码如下：

说明：

- `slotToExpunge` 记录清理工作的开始下标，`staleSlot` 是当前过期数据的下标；

- `prevIndex(idx, len)` 和 `nextIndex(idx, len)` 是将下标向前/向后移动，只不过在越界时，会自动移动到尾部/首部，相当于是一个 **循环数组**。

```java
private void replaceStaleEntry(ThreadLocal<?> key, Object value, int staleSlot) {
    Entry[] tab = table;
    int len = tab.length;
    Entry e;

    // 初始化 slotToExpunge 位置
    int slotToExpunge = staleSlot;
    
    // 向前查找过期的数据，遇到了就更新 slotToExpunge 的位置
    for (int i = prevIndex(staleSlot, len); (e = tab[i]) != null; i = prevIndex(i, len))
        if (e.refersTo(null))
            slotToExpunge = i;

    // 向后查找
    for (int i = nextIndex(staleSlot, len); (e = tab[i]) != null; i = nextIndex(i, len)) {
        
        // 若碰到引用对象指向该 key，说明是更新数据
        if (e.refersTo(key)) {
            e.value = value;
	    
            // 更新完 value 后，将该 Entry位置 与 staleSlot位置 进行交换
            tab[i] = tab[staleSlot];
            tab[staleSlot] = e;

            // 如果之前向前查找没有过期的数据，向后查找也没找到过期数据（下面）
            // 则将 slotToExpunge 更新为现在的位置
            if (slotToExpunge == staleSlot)
                slotToExpunge = i;
            
            // 清理逻辑：先进行探测式清理，再进行启发式清理
            cleanSomeSlots(expungeStaleEntry(slotToExpunge), len);
            return;
        }

       // 遇到过期数据，而且向前查找没有过期的数据，则将 slotToExpunge 更新为现在的位置
        if (e.refersTo(null) && slotToExpunge == staleSlot)
            slotToExpunge = i;
    }

    // 走到这说明不是更新数据，遇到 Entry 为 null了，则将新数据放在过期数据的槽位
    tab[staleSlot].value = null;
    tab[staleSlot] = new Entry(key, value);

    // 如果在之前的向前、前后查找过程中，遇到了其他的过期数据，则开启清理逻辑
    if (slotToExpunge != staleSlot)
        cleanSomeSlots(expungeStaleEntry(slotToExpunge), len);
}
```

通过上面的源码解读，`replaceStaleEntry()` 的执行流程图如下：

![image-20221205003414069](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212050034295.png)

下面列举一下向前查找没有找到过期数据，向后查找遇到更新数据，且在这之前也没有找到过期数据的情况：

![image-20221205010122302](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212050101357.png)

其他情况就不画图分析了，都大差不差。现在我们基本上把 `ThreadLocalMap.set()` 解析完了，还剩下清理工作的逻辑没分析。

### 5.3 清理逻辑

通过上面的分析，可以发现 ThreadLocalMap 对过期数据的清理主要有两种方式：

- 探测式清理 `expungeStaleEntry(int staleSlot)`；
- 启发式清理 `cleanSomeSlots(int i, int n)`；

接下来我们就分别分析一下这两种清理方式。

#### (1) 探测式清理

先浏览一遍探测式清理 `expungeStaleEntry(int staleSlot)` 的源码：

```java
private int expungeStaleEntry(int staleSlot) {
    Entry[] tab = table;
    int len = tab.length;

    // 清理 staleSlot 位置（将槽位置为 null）
    tab[staleSlot].value = null;
    tab[staleSlot] = null;
    size--;

    Entry e;
    int i;
    // 循环进行探测式清理，知道遇到 null 的 Entry
    for (i = nextIndex(staleSlot, len); (e = tab[i]) != null; i = nextIndex(i, len)) {
        ThreadLocal<?> k = e.get();
        // 遇到过期数据，将该槽位置为 null
        if (k == null) {
            e.value = null;
            tab[i] = null;
            size--;
        } else {    
            // 不是过期数据，先计算出该数据的槽位
            int h = k.threadLocalHashCode & (len - 1);
            
            // 如果数据不在该槽位上，说明该数据原来发生了哈希冲突，被放在后面去了
            // 则会找到离正确槽位最近的空位置，将该数据重新放置，使其更靠近正确槽位
            if (h != i) {
                tab[i] = null;
                while (tab[h] != null)
                    h = nextIndex(h, len);
                tab[h] = e;
            }
        }
    }
    return i;
}
```

从源码中可以看出，探测式清理在清理完 `staleSlot` 位置后，还会向后查找，遇到过期数据就清理。遇到正常数据会将 **产生了哈希冲突的数据重新定位（相当于 rehash），让它离正确的槽位更近**，这样有利于提高查询效率。

流程图如下：

![image-20221205140752004](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212051408230.png)

下面列举一个将正常数据重新定位的情况。

进入 `expungeStaleEntry()` 方法时，`staleSlot = 2`，然后 Entry[5] 经过哈希计算的正确槽位是 4，因为发生了哈希碰撞，所以被放置在了槽位为 5 的位置上：

![image-20221205144546177](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212051445585.png)

进入 `expungeStaleEntry()` 方法：

- 先将清理 `staleSlot` 位置，接着向后遍历，槽位为 3 的位置是正常数据且槽位位置正确；
- 继续遍历，遇到槽位为 4 的过期数据，清理掉该数据，将槽位置为空；

![image-20221205145658252](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212051456192.png)

继续遍历，遇到槽位为 5 的正常数据，计算得槽位为 4，但现在在 5 号槽位：

- 先把现在的槽位（5号）置空，接着从 4 号槽位开始，向后遍历，找到空位置；
- 恰好 4 号槽位刚刚被清理了，所以就把该数据放在 4 号槽位上；

![image-20221205145950289](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212051459263.png)

继续遍历到 6 号槽位，该槽位为空，则该方法结束，返回 6。

探测式清理就是这么回事儿，接下来看看更简单的启发式清理。

#### (2) 启发式清理

只有两个方法会调用到 `cleanSomeSlots(int i, int n)`，分别是 `set` 和 `replaceStaleEntry`：

- 当在 **set** 方法中调用时，传入的参数 `n` **是元素的数量 `size`**；
- 当在 **replaceStaleEntry** 方法中调用时，传入的参数 `n` **是 Entry 数组的长度 `len`**；

启发式清理 `cleanSomeSlots(int i, int n)` 的源码分析如下：

```java
private boolean cleanSomeSlots(int i, int n) {
    // 是否清理到了数据的标志
    boolean removed = false;
    Entry[] tab = table;
    int len = tab.length;
    do {
        i = nextIndex(i, len);
        Entry e = tab[i];
        
        // 遇到过期数据需要清理，此时会重置 n 为 len，然后执行探测式清理方法清理过期数据
        if (e != null && e.refersTo(null)) {
            n = len;
            removed = true;
            i = expungeStaleEntry(i);
        }
    } while ( (n >>>= 1) != 0);        // 如果没有遇到过期数据，则每次将 n 变为原来的一半
    return removed;
}
```

所以启发式清理的流程图如下：

![image-20221205152840486](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212051528880.png)

示例如下：

![image-20221205154830182](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212051548294.png)

::: info replaceStaleEntry 为什么进行探测式清理后还要进行一次启发式清理呢？
🤔
:::

我们知道，探测式清理在遇到 Entry 为 null 时就会停止清理，所以为了清理到后面的一些槽位，就再进行一次启发式清理。这样可以尽可能的清理到更多的过期数据。

### 5.4 扩容机制

在 `ThreadLocalMap.set()` 方法的最后，如果执行完 **启发式清理没有清理到数据**，且当前 **散列数组中的 Entry 数量（元素数量）已经达到了扩容阈值 threshold**（threshold = len * 2/3），就开始执行 **rehash()** 逻辑。

```java
if (!cleanSomeSlots(i, sz) && sz >= threshold)
    rehash();
```

注意：**此时还没有执行扩容，具体需不需要扩容在 rehash() 方法中判断**。

rehash() 的具体实现如下：

```java
private void rehash() {
    // 先进行一轮全局的探测式清理
    expungeStaleEntries();

    // 若清理后的 size 还是 >= threshold * 3/4，则执行 resize() 进行扩容
    if (size >= threshold - threshold / 4)
        resize();
}
```

全局的探测式清理 `expungeStaleEntries()` 其实就是从 Entry 数组的 **起始位置开始往后清理**，遇到过期数据还是调用探测式清理 `expungeStaleEntry(int staleSlot)` 来清理数据。

因为探测式清理会 **将正常且不在正确槽位的数据重新放置**，这个重新放置的过程其实就相当于 rehash，所以这个方法叫做 `rehash()`。

全局的探测式清理方法如下：

```java
private void expungeStaleEntries() {
    Entry[] tab = table;
    int len = tab.length;
    for (int j = 0; j < len; j++) {
        Entry e = tab[j];
        if (e != null && e.refersTo(null))
            expungeStaleEntry(j);
    }
}
```

在全局的探测式清理后，如果 `size` 还是大于等于 `threshold * 3/4`，因为 `threshold = len * 2/3`，所以扩容的 **最终条件** 是：`size >= len * 2/3 * 3/4 = len * 1/2`，也就是 **元素数量达到了 Entry 数组大小的一半** 时，才进行 `resize()` 扩容。

```java
        private int threshold; // Default to 0

        private void setThreshold(int len) {
            threshold = len * 2 / 3;
        }
```

::: info resize() 扩容流程
🤔
:::

真正的扩容函数是 `resize()`，源码如下：

```java
private void resize() {
    Entry[] oldTab = table;
    int oldLen = oldTab.length;
    // 扩容到原来的 2 倍
    int newLen = oldLen * 2;
    // 新定义一个散列表
    Entry[] newTab = new Entry[newLen];
    int count = 0;

    // 遍历旧的散列表
    for (Entry e : oldTab) {
        if (e != null) {
            ThreadLocal<?> k = e.get();
            // 若遇到过期数据，则将 value 也置为 null，以便 GC 回收
            if (k == null) {
                e.value = null; // Help the GC
            } else {
                // 计算元素在新散列表中的槽位
                int h = k.threadLocalHashCode & (newLen - 1);
                // 发生哈希冲突时，线性探测
                while (newTab[h] != null)
                    h = nextIndex(h, newLen);
                newTab[h] = e;
                count++;
            }
        }
    }

    // 设置新的扩容阈值
    setThreshold(newLen);
    size = count;
    table = newTab;
}
```

`resize()` 方法主要就是将旧散列表中的数据倒入新的散列表，**遇到过期数据则将 value 的引用置为 null**，方便 GC 回收掉。

ThreadLocalMap 扩容过程的流程图如下：

![image-20221205182123973](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212051821004.png)

### 5.5 ThreadLocalMap.get() 分析

ThreadLocal 调用 get() 方法，和 set() 方法有些类似，都是通过先通过当前线程获取到 ThreadLocalMap。

```java
public class ThreadLocal<T> {
    // ......
    public T get() {
        Thread t = Thread.currentThread();
        ThreadLocalMap map = getMap(t);
        if (map != null) {
            ThreadLocalMap.Entry e = map.getEntry(this);
            if (e != null) {
                @SuppressWarnings("unchecked")
                T result = (T)e.value;
                return result;
            }
        }
        return setInitialValue();
    }
    
}
```

通过上面的源码可以看出：

- ThreadLocalMap 不为空时，会先调用 `getEntry(this)` 获取到当前 key 对应的 Entry，若 Entry 不为 null，则返回该 Entry 的 value 值。若 **Entry 为 null**，则会走下面的  **`setInitialValue()` 方法**。

- 当 **ThreadLocalMap 为空时**，则调用 **`setInitialValue()` 方法**。

::: info setInitialValue()
🤔
:::

先来看看 `setInitialValue()` 方法，从上面的分析可知，有两种情况会走此方法：

- ThreadLocalMap 为 null，说明当前线程还未创建 Map；
- 当前 Entry 为 null，说明当前 Map 中还没有该 key 对应的 Entry；

```java
private T setInitialValue() {
    T value = initialValue();    // initialValue() 返回 null
    Thread t = Thread.currentThread();
    ThreadLocalMap map = getMap(t);
    // map 不为 null，说明是当前 Entry 为 null 走到此方法的
    if (map != null) {
        map.set(this, value);        // 调用 set 方法
    } else {
        // map 为 null，则创建 Map，将该 ThreadLocal 的 value 设为 null
        createMap(t, value);
    }
    if (this instanceof TerminatingThreadLocal) {
        TerminatingThreadLocal.register((TerminatingThreadLocal<?>) this);
    }
    return value;
}
```

看完源码后可能会发现，为什么 map 不为空，当前 entry 为空时，要调用 `set` 方法呢？

答案其实都在 `set` 方法里，可能会进行 **探测式清理** 操作、**rehash()** 等。

::: info getEntry(ThreadLocal key)
🤔
:::

在 ThreadLocalMap 不为 null 时，就会调用 `getEntry(ThreadLocal<?> key)` 来获取当前 ThreadLocal 对应的 Entry，源码如下：

```java
private Entry getEntry(ThreadLocal<?> key) {
    int i = key.threadLocalHashCode & (table.length - 1);
    Entry e = table[i];
    // 若计算出来的槽位刚好是要 get 元素的位置时，直接返回该 Entry
    if (e != null && e.refersTo(key))
        return e;
    else
        // 没有直接命中，调用 getEntryAfterMiss() 方法
        return getEntryAfterMiss(key, i, e);
}
```

在该方法中，若计算出来的槽位刚好是要获取的元素的槽位时，说明刚好命中，则直接返回该 Entry。

否则，说明没有直接命中，可能存在哈希冲突（因为还有此元素不存在的情况），则会调用 `getEntryAfterMiss(ThreadLocal<?> key, int i, Entry e)` 方法。

`getEntryAfterMiss()` 方法的源码如下：

```java
private Entry getEntryAfterMiss(ThreadLocal<?> key, int i, Entry e) {
    Entry[] tab = table;
    int len = tab.length;

    // 当 entry 不为 null 时，向后查找
    while (e != null) {
        // 找到该 key 对应的 entry 了，直接返回
        if (e.refersTo(key))
            return e;
        // 遇到过期数据，执行探测式清理
        if (e.refersTo(null))
            expungeStaleEntry(i);
        else
            i = nextIndex(i, len);
        e = tab[i];
    }
    // 向后查找到空 entry，都没找到，说明不存在该元素，返回 null
    return null;
}
```

可以看到，在向后查找时，若遇到过期数据，会执行探测式清理，探测式清理除了会清理掉过期数据，还会进行 rehash（槽位重置），所以清理完后继续从该位置开始遍历。

::: info 总结
🤔
:::

当调用 `ThreadLocal.get()` 方法时，流程如下：

![image-20221205192838651](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212051928666.png)

`setInitialValue()` 方法流程如下：

![image-20221205195213343](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212051952372.png)

`getEntry()` 方法流程如下：

![image-20221205193246822](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212051932953.png)

`getEntryAfterMiss()` 方法流程如下：

![image-20221205194548986](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212051945423.png)

## 6. InheritableThreadLocal 类

ThreadLocal 是线程隔离的，那如果我想在子线程中获取到父线程中的元素怎么办呢？

这就需要使用 InheritableThreadLocal（可继承的 ThreadLocal）了，它继承了 ThreadLocal，主要功能就是 **对于 InheritableThreadLocal 类型变量的值，在子线程中可以获取到**。

通过下面的示例来说明：

```java
public class InheritableThreadLocalTest {
    public static void main(String[] args) {
        ThreadLocal<String> threadLocal = new ThreadLocal<>();
        ThreadLocal<String> inheritableThreadLocal = new InheritableThreadLocal<>();

        // 在 main 线程中设置变量值
        threadLocal.set("ThreadLocal Data");
        inheritableThreadLocal.set("InheritableThreadLocal Data");

        // 子线程中分别获取两个变量
        new Thread(() -> {
            System.out.println("ThreadLocal Data: " + threadLocal.get());
            System.out.println("InheritableThreadLocal Data: " + inheritableThreadLocal.get());
        }).start();
    }
}

/*
输出：
ThreadLocal Data: null
InheritableThreadLocal Data: InheritableThreadLocal Data

Process finished with exit code 0
 */
```

通过前面对 ThreadLocal 的理解，在 Thread 中有一个 ThreadLocalMap，以 ThreadLocal 类型的变量作为 key，我们 set 的值作为 value。在子线程中执行 get 方法自然是获取子线程的 ThreadLocalMap，很显然，子线程中的 ThreadLocalMap 并没有进行设置，所以初始值 null 被读了出来。

那么，InheritableThreadLocal 类型变量的值，为什么子线程能够读取到呢？

### 6.1 原理分析

在 Thread 类中，有一个 `ThreadLocal.ThreadLocalMap` 类型的变量 `inheritableThreadLocals`，有没有发现很熟悉？这不就是和 Thread 类中的 `threadLocals` 变量一样嘛？

![image-20221205211230191](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212052112277.png)

在 JDK 1.8 中，Thread 的构造方法中有一个 `init()` 方法，这个 `init()` 方法是所有的 Thread 对象创建的必经之路：

![image-20221205220149328](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212052201704.png)

这个带 Runnable 参数的 init 方法，内部会调用另一个重载的 init 方法，默认把 `inheritThreadLocals` 参数设为 true：

![image-20221205221706365](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212052217570.png)

可以看到，在方法中如果判断父线程的 `inheritableThreadLocals` 不为 null，则会 **通过 `createInheritedMap()` 方法创建当前子线程的 `inheritableThreadLocals`**。

来看看 ThreadLocal 的 `createInheritedMap(ThreadLocalMap parentMap)` 方法，可以发现，**传入的参数是父线程的 Map**（`parent.inheritableThreadLocals`），这个方法其实就是 **根据父线程的 ThreadLocalMap，拷贝里面的数据给子线程的 ThreadLocalMap**：

![image-20221205223112365](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212052231389.png)

从上面的这个方法可以很清晰的看得到，如果 parent 的 `inheritableThreadLocals` 不是 null，
那么就会将当前子线程的 `inheritableThreadLocals` 设置为 parent 的 `inheritableThreadLocals`。

所以借助于 `inheritableThreadLocals`，可以实现创建线程向被创建线程进行数据的传递。

::: info InheritableThreadLocal 的缺陷
🤔
:::

InheritableThreadLocal 仍然有缺陷，一般我们做异步化处理都是使用的线程池，线程池是线程复用的逻辑，而 InheritableThreadLocal 是在 Thread 构造方法中的 `init()` 方法给赋值的，所以这里会存在问题。

`JDK` 的 `InheritableThreadLocal` 类可以完成父线程到子线程的值传递。但对于使用线程池等会池化复用线程的执行组件的情况，线程由线程池创建好，并且线程是池化起来反复使用的；这时父子线程关系的 `ThreadLocal` 值传递已经没有意义，应用需要的实际上是把 **任务提交给线程池时** 的 `ThreadLocal` 值传递到 **任务执行时** 使用。

阿里开源了一个 [TransmittableThreadLocal](https://github.com/alibaba/transmittable-thread-local) 组件，可以解决这个问题。

## 7. ThreadLocal 使用注意事项

### 7.1 避免线程复用（线程池）时的脏数据

在使用线程池的情况下，会有线程复用的情况，一个线程可能会处理多个任务。

由于线程池会复用 Thread 对象，因此 Thread 类的成员变量 threadLocals（ThreadLocalMap）也会被复用。

如果在一个线程处理完当前任务后，**忘记将 threadlocals 进行清理 `remove()`**，并且这个线程在处理下一个任务时，
**不调用 `set()` 设置初始值**（调用 `set()` 会将之前 ThreadLocal key 对应的 value 修改掉），那么这时也能获取到这个 threadlocals。

例如，thread-1 在处理下一个任务时，能获取到上一个任务中 ThreadLocal 的值：

![image-20221205235551233](https://run-notes.oss-cn-beijing.aliyuncs.com/notes/202212052355780.png)

所以，在线程复用的情况下，一定要注意及时进行 threadlocals 的清理工作。

### 7.2 内存泄漏问题

在一开始也讲到过，**如果一个 ThreadLocal 不存在外部强引用时（外界把 ThreadLocal 变量置为 null），key 势必会被 GC 回收，这样就会导致 ThreadLocalMap 中的 key 为 null，而 value 不为 null**，只有 Thread 线程销毁后，ThreadLocalMap 才会随之销毁，value 的强引用链条才会断掉。

但是如果 **线程迟迟不关闭（比如使用线程池），这些 key 为 null 对应的 value 就会一直存在 Entry 中**，占用内存空间，又无法回收，就造成了 **内存泄漏**。

其实，ThreadLocalMap 的设计中已经考虑到这种情况，也加上了一些防护措施：

- 在 ThreadLocal 的 `get()`，`set()`，`remove()` 的时候都会清除掉 ThreadLocalMap 里一些 key 为 null 的 entry；

解决以上问题的办法很简单，就是在每次用完 ThreadLocal 后，及时调用 `remove()` 方法清理即可。

## 8. 参考文章

::: link {https://p3-passport.byteimg.com/img/user-avatar/c1667361ccd80c62a71cf23a648bcdbe~100x100.awebp} [一枝花算不算浪漫](https://juejin.cn/post/6844904151567040519)
面试官：小伙子，听说你看过 ThreadLocal 源码？（万字图文深度解析 ThreadLocal）
:::