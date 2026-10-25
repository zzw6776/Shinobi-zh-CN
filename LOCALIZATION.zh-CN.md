# Shinobi 简体中文私有构建

本仓库从 Shinobi Systems 的 `dev` 分支同步，仅供仓库所有者个人部署使用。Shinobi Pro 使用自定义许可证，不是 MIT、Apache 或 GPL 等标准开源许可证；不要把本仓库或生成的容器镜像改为公开可见，也不要移除上游版权声明。

## 中文文件

`languages/zh.json` 与 `languages/en_CA.json` 的键完全对齐。执行下面的命令可基于英文文件重新生成简体中文，并应用项目内置术语表：

```bash
node tools/buildChineseLanguage.mjs
```

自动翻译只用于生成完整初稿。术语和人工审校结果保存在 `tools/buildChineseLanguage.mjs` 的人工覆盖表中，不能只修改生成后的 `languages/zh.json`，否则下次生成时会丢失。

生成后必须运行审计：

```bash
node tools/auditChineseLanguage.mjs
```

审计会检查 2490 个词条的键覆盖、空值、HTML 标签、链接、`class` 属性、`<code>` 技术内容、变量占位符、品牌误译和核心术语。GitHub Actions 会在构建镜像前执行同一审计，审计失败时不会发布镜像。

## 自动构建

推送 `dev` 分支中与中文镜像相关的文件后，GitHub Actions 会构建并发布私有镜像：

```text
ghcr.io/zzw6776/shinobi-zh-cn:latest
ghcr.io/zzw6776/shinobi-zh-cn:sha-<commit>
```

镜像基于已经验证的官方 ShinobiDocker v2 固定摘要，只覆盖完整中文文件，并保留当前服务器要求的 MySQL TLS、默认中文和启动日志密码脱敏配置。
