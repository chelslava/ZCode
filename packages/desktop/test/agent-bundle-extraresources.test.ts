import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const builderConfigPath = resolve(import.meta.dirname, "../electron-builder.config.js");
const builderConfig = readFileSync(builderConfigPath, "utf8");

const stageAgentBundlePath = resolve(import.meta.dirname, "../scripts/stage-agent-bundle.mjs");
const stageAgentBundleSource = readFileSync(stageAgentBundlePath, "utf8");

// electron-builder 会跳过 extraResources from 根目录下的 node_modules（见 cua-helper 拆分映射）。
// 独立 CLI（ELECTRON_RUN_AS_NODE 起 zcode.cjs）对 enc:v2:os 凭据的 @napi-rs/keyring 只能从
// resources/glm/node_modules 解析——漏映射时安装包里该目录为空，全部凭据操作报
// “System credential storage is unavailable”（zai-org/feedback#1490，2026-11 实机回归）。
describe("agent bundle extraResources 映射", () => {
  it("glm 主树映射必须过滤根 node_modules 并单独映射 glm/node_modules", () => {
    expect(builderConfig).toContain("from: `bundled-agents/${targetPlatform.key}/glm`");
    expect(builderConfig).toContain('to: "glm"');
    // 主树过滤根 node_modules（与 cua-helper 的 filter 写法一致）。
    expect(builderConfig).toContain('"!node_modules{,/**/*}"');
    // node_modules 单独映射，保证 stageCredentialKeyring 的产物进入安装包。
    expect(builderConfig).toContain("from: `bundled-agents/${targetPlatform.key}/glm/node_modules`");
    expect(builderConfig).toContain('to: "glm/node_modules"');
  });

  it("stage-agent-bundle 必须把 keyring stage 到 glm 根 node_modules（CLI 的解析根）", () => {
    expect(stageAgentBundleSource).toContain("stageCredentialKeyring({");
    expect(stageAgentBundleSource).toContain("targetRoot: glmDir");
  });
});
