# Shinobi 简体中文私有构建

本仓库从 Shinobi Systems 的 `dev` 分支同步，仅供仓库所有者个人部署使用。Shinobi Pro 使用自定义许可证，不是 MIT、Apache 或 GPL 等标准开源许可证；不要把本仓库或生成的容器镜像改为公开可见，也不要移除上游版权声明。

## 中文文件

`languages/zh.json` 与 `languages/en_CA.json` 的键完全对齐。执行下面的命令可基于英文文件重新生成简体中文，并应用项目内置术语表：

```bash
node tools/buildChineseLanguage.mjs
```

生成后必须检查 JSON、键完整性和常用界面词，再提交。自动翻译只能作为完整初稿，具体页面发现不自然的表达时应直接修正 `languages/zh.json`。

## 自动构建

推送 `dev` 分支中与中文镜像相关的文件后，GitHub Actions 会构建并发布私有镜像：

```text
ghcr.io/zzw6776/shinobi-zh-cn:latest
ghcr.io/zzw6776/shinobi-zh-cn:sha-<commit>
```

镜像基于已经验证的官方 ShinobiDocker v2 固定摘要，只覆盖完整中文文件，并保留当前服务器要求的 MySQL TLS、默认中文和启动日志密码脱敏配置。
