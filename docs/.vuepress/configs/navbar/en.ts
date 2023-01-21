import type { NavbarConfig } from "vuepress-theme-gungnir";
import { version } from "../meta";

export const en: NavbarConfig = [
  {
    text: "Home",
    link: "/",
    icon: "hi-solid-home"
  },
  {
    text: "Tags",
    link: "/tags/",
    icon: "fa-tag"
  },
  {
    text: "Links",
    link: "/links/",
    icon: "fa-link"
  },
  {
    text: "Docs",
    link: "/docs",
    icon: "hi-solid-document-text"
  }
];
