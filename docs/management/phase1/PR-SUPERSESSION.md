# 旧 PR 与 PR21 的内容覆盖关系

核对对象：master `18f5352070910a867b9729b031aa2e3951785e01`，保留候选 `a712685c1645d9a924dcb0931c98d917da919ced`。二者 tree 均为 `a4b1cf782f6e5f2aaa90c955cfffb629ee5231ba`。原 worker PR head 都是保留候选的真实祖先；候选来源 manifest 明确列出它们。squash 后它们不是 master 祖先，不意味着代码未集成。

逐文件 source/master blob、变化路径及后续集成提交见 [完整证据](PR-SUPERSESSION.json)。检查使用真实 Git 对象/merge-base/diff/log；未对当前来源分支 reset/cherry-pick/rewrite。

| PR | 准确源 | 源变化路径 | 与master完全相同blob | 处置 |
| --- | --- | --- | --- | --- |
| #20 | `919505b45572916a3868ecf355691fb09fa1e2c3` | 81 | 32 | SUPERSEDED_BY_PR21；保留源分支/证据，不重复merge |
| #19 | `b5d429c7a4a4dc05843d6233288d546596285879` | 9 | 2 | SUPERSEDED_BY_PR21；保留源分支/证据，不重复merge |
| #18 | `8afb96e4671b2ace5e59c99617c79b4bdca5b627` | 47 | 39 | SUPERSEDED_BY_PR21；保留源分支/证据，不重复merge |
| #17 | `77e2fe623326314c62ebe331d6357e6444aa58b1` | 50 | 35 | SUPERSEDED_BY_PR21；保留源分支/证据，不重复merge |
| #16 | `1645c590f3d5508338af03e83fee22bf6d263bd1` | 25 | 17 | SUPERSEDED_BY_PR21；保留源分支/证据，不重复merge |
| #15 | `8be566b0c405ddf32ad7cd9886810b8dda23007e` | 12 | 4 | SUPERSEDED_BY_PR21；保留源分支/证据，不重复merge |

## 后续变更的语义核对

- #18：39个源路径原样保留；后续差异是现行部署模板/检验、明确factory管理员不能控制Owner的测试，以及经理证据/生成物/package汇总。核心合约与发布ABI保留02最终实现；增加的test和参数变更已进入PR21实际121 Solidity/20 Python与hosted合约gate。
- #17：35个源路径原样保留；后续runtime-status/initial-sync错误隔离阻止陈旧投影，同时保持UI及直接Owner退出可用。客户端增添严格operation-evidence解析和模拟接口。对应startup/UI回归在master完整591项中执行。源分支的完整历史保留，不能用旧adapter覆盖这些集成修正。
- #16：17个源路径原样保留；实际应用/测试后续差异为提交前模拟与session复核衔接、closed Vault 禁用存取/关闭/无效授权，以及反例测试。warm UI并未回退。合法post-close rescue及发行转账第一阶段缺口在PH1-09/10继续，不能因旧PR关闭而视为完成。
- #15/#19：任务登记在后续M3/06及本轮新登记中向前演进；原bootstrap/spec与历史QA证据保留。旧登记PR不应再覆盖更新的registry。#19的接受条件未被关闭动作豁免。
- #20：基础统一候选及其原作者图完整进入PR21，之后消费02/03/04实际最终实现并修正身份/恢复/产品边界。旧基础QA仅保留对旧候选的范围，不升级为当前独立最终安全结论。

此处“superseded”只结束重复合并候选；不关闭GOV-001/SUPPLY-001、真实Testnet或第一阶段缺口，也不代表新一轮QA完成。

## 其他开放PR

Dependabot #12/#13仍有独特CodeQL 4.38.0升级diff，当前保留manual legacy 4.37.9，不能说已被PR21覆盖。由01/06资格核验后单列处置；不盲目升级固定工具、不重复启用已替代的必需服务。它们不改变现有Semgrep/OSV/Gitleaks/Slither的主门禁结论。
