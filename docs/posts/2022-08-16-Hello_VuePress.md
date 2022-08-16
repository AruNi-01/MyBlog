---
title: Hello VuePress
subtitle: First Post「Tag - 随笔记」
author: AruNi_Lu
date: 2022-08-16
tags:
- 随笔记

layout: Post
useHeaderImage: true
headerImage: /img/header/2022-8-16-Hello_VuePress.png
headerMask: rgba(40, 57, 101, .4)
catalog: true
---

Today, my blog was born.

<!-- more --> 

## 为什么选择 VuePress ？

还记得第一次学习 `Vue.js` 的时候，首先吸引我的是 `Vue` 的官网 —— 简约、大方。`Vue` 的网站就是使用 VitePress（VuePress 小兄弟） 静态生成的，它是一个由 Vue 驱动的静态站点生成器。

VuePress 的优点：
- 简洁至上，以 Markdown 为中心的项目结构，以最少的配置帮助你专注于写作；
- Vue 驱动，享受 Vue + webpack 的开发体验，可以在 Markdown 中使用 Vue 组件，又可以使用 Vue 来开发自定义主题；
- 高性能，VuePress 会为每个页面预渲染生成静态的 HTML，同时，每个页面被加载的时候，将作为 SPA 运行；
- 易部署，VuePress 有很多种部署方式，且都相对较简单。

## 为什么要搭建博客 ？

搭建一个简单的博客，不需要花费大量时间，平时有兴致的时候可以有个小地方记录生活、记录日常。它并不是必须的，但确可以提高个人满足感。当你写满一篇又一篇文章时，或多或少会有些许成就感。


## 一些语法糖

### Code 代码

#### Code Blocks 代码块

```java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}
```

#### Code Groups 代码组

<CodeGroup>
<CodeGroupItem title="YARN" active>

```bash
yarn add -D vuepress-theme-gungnir@next
```

</CodeGroupItem>

<CodeGroupItem title="NPM">

```bash
npm install -D vuepress-theme-gungnir@next
```

</CodeGroupItem>
</CodeGroup>


### Table 表格

| Name | Info |
|------|------|
| vuepress-theme-gungnir | Gungnir is a blog theme for Vuepress 2. |

### Badges 佩戴徽章

提示<Badge text="tip" />、警告<Badge text="warning" type="warning" />、危险<Badge text="danger" type="danger" />、提示（中间位置）<Badge text="tip middle" vertical="middle" />


### Containers 容器用法

::: link {/img/links/javaguide.png} [JavaGuide](https://javaguide.cn/)
Java 学习+面试指南
:::


::: info
This is an info message.
:::

::: tip
This is a tip message.
:::

::: warning
This is a warning message.
:::

::: danger
This is a dangerous warning message.
:::
