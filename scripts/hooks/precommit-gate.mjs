/**
 * @author Harriol
 * 质量门禁 hook：拦截 git commit，校验「标记文件（AI 语义审查结果）+ 直跑自动化检查」。
 * Claude Code 通过 stdin 传入 JSON，本脚本据此判断是否为 git commit，并在需要时输出阻断 JSON。
 *
 * 注意：stdout 只允许输出「阻断 JSON」或为空（Claude Code 会解析 stdout），
 * 其余调试信息一律写 stderr。
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

let raw = '';
process.stdin.on('data', (chunk) => {
  raw += chunk;
});
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0); // 非 JSON 输入，放行
  }

  // 只拦截 Bash 的 git commit；其它工具 / 命令一律放行
  if (input.tool_name !== 'Bash') process.exit(0);
  const command = input.tool_input && input.tool_input.command ? input.tool_input.command : '';
  // 仅匹配「命令以 git commit 开头」，避免误拦 echo/printf 等字符串里含 "git commit" 的命令
  if (!/^git\s+commit\b/.test(command.trim())) process.exit(0);

  const gate = runGate();
  if (!gate.ok) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: gate.reason,
      },
    }));
  }
  process.exit(0);
});

// 计算当前工作区状态哈希（与 agent 写标记时口径一致）
function currentStateHash() {
  return execSync('node scripts/hooks/git-state-hash.mjs', { encoding: 'utf8' }).trim();
}

// 执行一个自动化检查命令，输出写到 stderr，返回是否成功
function runCheck(cmd, args) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: true });
  if (res.stdout) process.stderr.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  return res.status === 0;
}

function runGate() {
  const gateDir = join(process.cwd(), '.claude', 'quality-gate');
  const hash = currentStateHash();

  // 1. 校验两个标记文件：存在 + 通过 + 状态哈希新鲜
  const markers = [
    { file: 'test.json', label: '单元测试' },
    { file: 'quality.json', label: '质量检查' },
  ];
  for (const m of markers) {
    const path = join(gateDir, m.file);
    if (!existsSync(path)) {
      return { ok: false, reason: `${m.label}标记缺失：请先运行 gitcommit-agent 通过质量门禁后再提交` };
    }
    let marker;
    try {
      marker = JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      return { ok: false, reason: `${m.label}标记文件损坏，请重新运行质量门禁` };
    }
    if (!marker.passed) {
      return { ok: false, reason: `${m.label}未通过：${marker.summary || '见检查报告'}` };
    }
    if (marker.stateHash !== hash) {
      return { ok: false, reason: `${m.label}标记已过期（检查通过后代码被修改），请重新运行质量门禁` };
    }
  }

  // 2. 直跑自动化检查兜底（永远新鲜，防标记伪造 / 过期）
  if (!runCheck('npm', ['test'])) {
    return { ok: false, reason: '单元测试未通过，禁止提交' };
  }
  if (!runCheck('npx', ['eslint', '.'])) {
    return { ok: false, reason: 'ESLint 检查未通过，禁止提交' };
  }

  return { ok: true, reason: '' };
}
