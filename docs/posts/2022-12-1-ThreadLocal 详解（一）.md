---
title: ThreadLocal 详解（一）
subtitle: ThreadLocal 详解「Tag - Java 并发」
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

Java 并发系列 —— ThreadLocal

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

::: info
Thread 是怎么拥有 ThreadLocalMap 的呢？
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

::: info
什么是内存泄漏？
:::

内存泄漏就是已经不再使用得内存得不到释放，让这块内存空间白白的被占有，一旦内存泄漏出现的次数多了，就可能导致 OOM。

::: info
Java 的四种引用类型
:::

Java 的四种引用类型如下：

- **强引用**：通常 new 出来的对象就是强引用类型（把一个对象赋给一个引用变量，这个引用变量就是一个强引用）。只要强引用的存在，对象没有被置为 null，垃圾回收器将 **永远不会回收被引用的对象，哪怕内存不足的时候**。
- **软引用**：使用 SoftReference 修饰的对象被称为软引用，软引用指向的对象在 **内存要溢出的时候被回收**。
- **弱引用**：使用 WeakReference 修饰的对象被称为弱引用，**只要发生垃圾回收**，若这个对象 **只被弱引用指向，那么就会被回收**。
- **虚引用**：虚引用是最弱的引用，在 Java 中使用 PhantomReference 进行定义。虚引用中唯一的作用就是 **用队列接收对象即将死亡的通知**。

::: info
ThreadLocal 内存泄漏分析
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

::: info
ThreadLocal 的 key 是弱引用，发生 GC 后 key 是否为 null 呢？
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

使用 ThreadLocal 后，这 10 个线程，每个线程都会有一个自己的 SimpleDateformat：

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



::: info
有关 set/get/remove 的底层解读在第二篇文章！
:::