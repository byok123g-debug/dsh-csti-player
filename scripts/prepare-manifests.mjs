/**
 * Removes `private: true` and adds license/repository/keywords to each package
 * so the repo is publishable. Idempotent.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const repo = 'https://github.com/byok123g-debug/dsh-plugins'
const root = 'packages'

const targets = [
  ['dsh-frugal', ['deepseek-harness', 'dsh-plugin', 'tokens', 'prompt', 'frugal']],
  ['csti-deepseek-player', ['deepseek-harness', 'dsh-plugin', 'card-survival', 'game-bridge', 'automation']],
]

for (const [dir, keywords] of targets) {
  const p = join(root, dir, 'package.json')
  const j = JSON.parse(readFileSync(p, 'utf8'))
  delete j.private
  j.license = 'MIT'
  j.repository = { type: 'git', url: `git+${repo}.git`, directory: `${root}/${dir}` }
  j.keywords = keywords
  j.author = 'the dsh-plugins contributors'
  writeFileSync(p, JSON.stringify(j, null, 2) + '\n')
  console.log('updated', p)
}

