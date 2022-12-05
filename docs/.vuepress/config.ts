import { viteBundler } from "@vuepress/bundler-vite";
import { webpackBundler } from "@vuepress/bundler-webpack";
import { defineUserConfig } from "vuepress";
import { gungnirTheme, i18n } from "vuepress-theme-gungnir";
import { navbar, sidebar } from "./configs";

const isProd = process.env.NODE_ENV === "production";

const { baiduTongjiPlugin } = require("@renovamen/vuepress-plugin-baidu-tongji");

export default defineUserConfig({
  head: [
    [
      "link",
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: `/img/logo/favicon-32_32.png`
      }
    ],
    ["link", { rel: "manifest", href: "/manifest.webmanifest" }],
    ["meta", { name: "application-name", content: "AruNi" }],
    ["meta", { name: "apple-mobile-web-app-title", content: "AruNi" }],
    ["meta", { name: "apple-mobile-web-app-status-bar-style", content: "black" }],
    ["link", { rel: "apple-touch-icon", href: `/img/logo/apple-touch-icon.png` }],
    ["meta", { name: "theme-color", content: "#1e2124" }],
    ["meta", { name: "msapplication-TileColor", content: "#1e2124" }]
  ],

  // site-level locales config
  locales: {
    "/": {
      lang: "en-US",
      title: "AruNi",
      description: "AruNi"
    },
    "/zh/": {
      lang: "zh-CN",
      title: "AruNi",
      description: "AruNi"
    }
  },

  // specify bundler via environment variable
  bundler:
    process.env.DOCS_BUNDLER === "webpack" ? webpackBundler() : viteBundler(),

  // configure default theme
  theme: gungnirTheme({
    // navbarTitle: "AruNi's Blog",

    repo: "AruNi-01/github.AruNi.io",
    // docsDir: "docs",

    hitokoto: "https://v1.hitokoto.cn?c=i", // enable hitokoto (一言) or not?

    // personal information
    personalInfo: {
      name: "AruNi_Lu",
      avatar: "https://aruni-01-github-io.oss-cn-beijing.aliyuncs.com/public/avatar.png",
      description: "The last thing I regret in life is that I could have been.",
      sns: {
        github: {
          icon: "co-github",
          link: "https://github.com/AruNi-01"
        },
        leetcode: {
          icon: "co-leetcode",
          link: "https://leetcode.cn/u/aruni_lu/"
        },
        algorithm_records: {
          icon: "bi-archive",
          link: "https://www.wolai.com/aruni-01/fKuL9hqz8MhXqvcHrn31uF",
        },
        about_me: {
          icon: "co-about-me",
          link: "https://www.wolai.com/aruni-01/tURqL5MA7c8U1wxK7MW9eG",
        },
      }
    },

    // header images on home page
    homeHeaderImages: [
      {
        path: "https://aruni-01-github-io.oss-cn-beijing.aliyuncs.com/public/bg1.jpg",
        mask: "rgba(40, 57, 101, .4)"
      },
      {
        path: "https://aruni-01-github-io.oss-cn-beijing.aliyuncs.com/public/bg2.jpg",
        mask: "rgba(40, 57, 101, .4)"
      },
      {
        path: "https://aruni-01-github-io.oss-cn-beijing.aliyuncs.com/public/bg3.jpg",
        mask: "rgba(40, 57, 101, .4)"
      }
    ],

    // other pages
    pages: {
      tags: {
        subtitle: "Here are all the tags and timelines.",
        bgImage: {
          path: "https://aruni-01-github-io.oss-cn-beijing.aliyuncs.com/public/tags.jpg",
          mask: "rgba(3,0,0,0.55)"
        }
      },
      links: {
        subtitle:
          "Here are some websites that I think are good.",
        bgImage: {
          path: "https://aruni-01-github-io.oss-cn-beijing.aliyuncs.com/public/links.jpg",
          mask: "rgba(3,0,0,0.17)"
        }
      }
    },

    // theme-level locales config
    locales: {
      /**
       * English locale config
       * As the default locale is English, we don't need to set all the locale fields
       */
      "/": {
        // navbar
        navbar: navbar.en,
        // sidebar
        sidebar: sidebar.en
      },

      /**
       * Chinese locale config
       */
      "/zh/": {
        // navbar
        navbar: navbar.zh,
        // sidebar
        sidebar: sidebar.zh,
        // i18n
        ...i18n.zh
      }
    },

    themePlugins: {
      // only enable git plugin in production mode
      git: isProd,
      katex: true,
      mermaid: true,
      chartjs: true,
      mdPlus: {
        all: true
      },
      giscus: {
        repo: "AruNi-01/AruNi-01.github.io",
        repoId: "R_kgDOH0r47Q",  // 必须，string，在 Giscus 官网上生成
        category: "Announcements",  // 必须
        categoryId: "DIC_kwDOH0r47c4CQ2RS",  // 必须，string，在 Giscus 官网上生成
        lang: "zh-CN",  // 可选，string，default="auto"（跟随网站语言，如果 Giscus 不支持你的网站的语言，则会使用 "en"）
        lazyLoad: true,
      },
      search: {

      },
      // ga: "G-EE8M2S3MPB",
      // ba: "10b7bc420625758a319d6b23aed4700f",

      pwa: true,
      readingTime: {
        wordsPerMinuteCN: 200,
        wordsPerMinuteEN: 100,
        excludeCodeBlock: true, 
        excludeTexBlock: true
      }
    },

    footer: `
      <a href="https://v2.vuepress.vuejs.org/" target="_blank">VuePress</a> 🤍
      <a href="https://github.com/Renovamen/vuepress-theme-gungnir" target="_blank">Gungnir</a>
      <br>
      Copyright &copy; 2020-2022 <a href="https://github.com/AruNi-01" target="_blank">AruNi_Lu</a>
    `
  }),

  markdown: {
    extractHeaders: {
      level: [2, 3, 4]
    }
  },

  plugins: [
    [
      baiduTongjiPlugin({
        id: "a74d89eb0ac90eeb168fce0e2ebc3073"
      }),
    ],
  ]
});
