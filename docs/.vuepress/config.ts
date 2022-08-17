import { viteBundler } from "@vuepress/bundler-vite";
import { webpackBundler } from "@vuepress/bundler-webpack";
import { docsearchPlugin } from "@vuepress/plugin-docsearch";
import { defineUserConfig } from "vuepress";
import { gungnirTheme, i18n } from "vuepress-theme-gungnir";
import { navbar, sidebar } from "./configs";

const isProd = process.env.NODE_ENV === "production";

const { baiduTongjiPlugin } = require("@renovamen/vuepress-plugin-baidu-tongji");

const { path } = require("@vuepress/utils");

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
      avatar: "/img/avatar.png",
      description: "The most regretful thing in life is that I could have.",
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
        path: "/img/home-bg/1.jpg",
        mask: "rgba(40, 57, 101, .4)"
      },
      {
        path: "/img/home-bg/2.jpg",
        mask: "rgba(40, 57, 101, .4)"
      },
      {
        path: "/img/home-bg/3.jpg",
        mask: "rgba(40, 57, 101, .4)"
      }
    ],

    // other pages
    pages: {
      tags: {
        subtitle: "Here are all the tags and timelines.",
        bgImage: {
          path: "/img/pages/tags.jpg",
          mask: "rgba(3,0,0,0.55)"
        }
      },
      links: {
        subtitle:
          "Here are some websites that I think are good.",
        bgImage: {
          path: "/img/pages/links.jpg",
          mask: "rgba(3,0,0,0.17)"
        }
      }
    },

    // theme-level locales config
    locales: {
      /**
       * English locale config
       * As the default locale is English, we don't need to set all of the locale fields
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
    [
      'player',
      {
        //网易云单个歌曲id
        songIds: ['29723011','1887893189','1421069053'],
        //网易云歌单
        playlist: '7431764777',
        showPlaylist: false,
        //是否禁用网易云音乐，如果你选择禁用，那么就将使用本地的歌曲，请传入链接
        disabledNetEaseMusic: true,
        disableSpace: false,    // 空格暂停/播放

        //请求接口的baseURL
        serverUrl: 'https://netease-cloud-music-api-teal-eight.vercel.app/',

        //本地歌曲
        localSongs: {
          coverUrl: '/music/cover/changes.jpg',
          songs: [
            {
              path: '/music/songs/王OK - Shadow Of The Sun.flac',
              songName: '王OK - Shadow Of The Sun',
              cover: '/music/cover/Shadow Of The Sun.jpg'
            },
            // {
            //   path: '/music/songs/',
            //   songName: '',
            //   cover: '/music/cover/'
            // },
          ]
        }
      }
    ],
  ]
});
