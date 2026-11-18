# 卡牌生存 · DeepSeek 之手

把《卡牌生存：热带岛屿》接到 DeepSeek Harness 上，让模型可以用截图观察、用鼠标和键盘操作，并把每一次求生写进冒险日志。

## 它提供什么

| 工具 | 作用 |
| --- | --- |
| `csti_observe` | 截取当前游戏画面，返回 PNG 路径和窗口尺寸 |
| `csti_click` / `csti_drag` / `csti_scroll` | 点击、拖拽卡牌、滚动背包 |
| `csti_hold_drag` | 带悬停的拖拽，用于卡牌合成（游戏只在悬停到合法目标时显示组合动作） |
| `csti_key` / `csti_type` | 按键、粘贴文字（命名和确认界面） |
| `csti_note` / `csti_journal` | 追加并回读第一人称冒险日志 |

截图保存在 `桌面\ds小视频\play\captures`，日志保存在 `桌面\ds小视频\play\journal.txt` 和 `journal.jsonl`。这些素材之后可以直接进入影片。

## 前置

1. 游戏安装 BepInEx，并加载 `CSTIControl` 插件（本地 HTTP 端口 17890）。
2. 启动游戏，进入可以操作的主界面。
3. 在 DSH 中启用本插件。它不注册客户端界面，所以无需刷新网页。

## 使用

对 DeepSeek 说「用 csti 工具玩一局卡牌生存」即可。推荐节奏：`csti_observe` 截图 → 读图 → `csti_click` 操作 → 重要节点 `csti_note`。坐标是截图像素坐标，桥接插件会自动换算窗口缩放。

## 边界

- 只连接 `127.0.0.1:17890`，不开放外网，也不修改游戏存档。
- 游戏未启动或 CSTIControl 未加载时，观察类工具会返回连接错误。
- 键盘输入依赖 Windows 前台窗口和剪贴板；少数全屏独占模式可能拦截模拟按键。
- `csti_hold_drag` 通过 `SendInput` 在 2560×1600 物理坐标上完成拖拽，绕开 Windows DPI 缩放对模拟鼠标的影响。
