/**
 * @local/dsh-frugal — always-on token discipline.
 *
 * Registers one system-prompt section that:
 *  - caps reply length and forbids step-by-step narration,
 *  - sets a per-turn screenshot budget and a "reuse known coordinates" rule,
 *  - embeds a compact coordinate cheat-sheet so a screenshot is usually unnecessary.
 */

export const name = 'dsh-frugal'
export const inject = ['systemPrompt']

const DEFAULTS = { enabled: true, replyMaxLines: 12, imageBudget: 2, coords: '' }

const CSTI_COORDS = `CSTI 2560x1599 常用落点（直接用，不要截图确认）:
- 手牌槽 1..5 x = 803 / 1113 / 1415 / 1725 / 2036, y = 1288
- 桌面槽 x ≈ 600 / 830 / 1060 / 1290 / 1520 / 1750 / 2150, y = 747
- 时间卡 239,239 | 制作卡 278,461 | 制作-基地页 660,239 | 制作-工具页 883,239
- 消磨时间: 休息 1065,827 | 小憩 1702,827 | 睡觉 2012,827
- 探索: 逛逛/探索 1519,771 | 确认 1519,771 | 面板关闭 2401,194
- 合成一律用 hold-drag（停 1.5 秒再松手），快速拖拽会静默失败`

function buildText(cfg) {
  const lines = [
    '## 输出纪律（常驻，优先级高于风格偏好）',
    `- 一次回复最多 ${cfg.replyMaxLines} 行；先给结论，再给必要细节。`,
    '- 不要逐步解说工具调用，不要复述工具输出，不要汇报“我先看看/让我再试一次”。',
    '- 结论式表达：做了什么 → 结果 → 下一步。没有新信息就不写。',
    '- 只在被要求时才贴完整代码或长表格；否则给路径 + 一句话说明。',
    '',
    '## 截图纪律',
    `- 每轮最多 ${cfg.imageBudget} 张截图；超过就先靠已知坐标操作。`,
    '- 先查下面坐标表；只有场景确实变化（换地形、开面板、结果未知）才截图。',
    '- 能一次脚本跑多步，就不要每步截一次图核对。',
    '',
    '## 已缓存坐标',
    CSTI_COORDS,
  ]
  if (cfg.coords && cfg.coords.trim()) lines.push('', cfg.coords.trim())
  return lines.join('\n')
}

export function apply(ctx, config = {}) {
  const cfg = { ...DEFAULTS, ...config }
  if (!cfg.enabled) return

  ctx.systemPrompt.section({
    name: 'dsh-frugal.discipline',
    order: 733,
    text: () => buildText(cfg),
  })
}
