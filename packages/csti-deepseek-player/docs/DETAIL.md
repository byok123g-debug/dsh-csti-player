# 卡牌生存 · DeepSeek 之手

## 定位

这是一个 Host-only 的 DSH 插件包，把游戏内的 `CSTIControl` 本地 HTTP 桥接成八个模型工具。它不是游戏模组本身：游戏的 BepInEx 端只负责截图与注入鼠标事件，本包负责让 DeepSeek 在会话里真正「看见并行动」。

## 工作方式

- `csti_observe` 调用 `/screen` 和 `/screenshot`，把 PNG 写入 `桌面\ds小视频\play\captures`，返回路径。模型用图像阅读器查看后再决定下一步。
- `csti_click`、`csti_drag`、`csti_scroll` 代理到 17890 端口，由游戏插件把截图坐标换算成真实窗口坐标。
- `csti_key`、`csti_type` 由 `send.ps1` 激活游戏窗口后发送按键；文字通过剪贴板加 Ctrl+V 输入。
- `csti_note` 同时追加 JSONL 与 TXT 日志，供最后撰写故事和剪片使用。

## 已验证的使用方式

先截图确认主界面，再逐步操作。坐标必须以 2560×1600 的截图空间为准，而不是 Windows 显示器逻辑坐标。游戏启动较慢（大量模组），先轮询健康检查再截图。

## 限制

- 依赖 Windows 前台窗口，不能在被其他程序独占输入时盲发按键。
- 不读写存档文件，不提供作弊或资源修改。
- HTTP 桥接只监听本机；它不是安全的远程控制服务。
