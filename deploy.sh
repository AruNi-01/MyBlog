#!/usr/bin/env sh
# 部署在 GitHub Pages 上
# Win 无法运行 Linux 的 shell 文件，可以通过 git bush 终端切换到该项目目录下执行 bash deploy.sh

# 确保脚本抛出遇到的错误
set -e

# 生成静态文件
pnpm docs:build

# 进入生成的文件夹
cd docs/.vuepress/dist

# 如果是发布到自定义域名
# echo 'www.example.com' > CNAME

git init
git add -A
git commit -m 'deploy'

# 如果发布到 https://<USERNAME>.github.io
git push -f git@github.com:AruNi-01/AruNi-01.github.io.git master:gh-pages
cd -
