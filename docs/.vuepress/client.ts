// 添加图标，https://oh-vue-icons.js.org/cn 网站上
// 使用时首字母小写，其余大写字母用 '-' 代替

import { defineClientConfig } from "@vuepress/client";
import { addIcons } from "oh-vue-icons";
import {
    FaLink,
    HiSolidHome,
    FaTag,
    CoGithub,
    CoLeetcode,
    CoAboutMe,
    CoTencentQq,
    BiArchive,
    CoGrav,
} from "oh-vue-icons/icons";

addIcons(
    FaLink,
    HiSolidHome,
    FaTag,
    CoGithub,
    CoLeetcode,
    CoAboutMe,
    CoTencentQq,
    BiArchive,
    CoGrav,
);

export default defineClientConfig({});
