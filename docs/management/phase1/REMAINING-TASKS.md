# 第一阶段全量剩余任务矩阵

BASE_SHA：`18f5352070910a867b9729b031aa2e3951785e01`。此矩阵依据当前用户范围；不能与旧 roadmap 的 P1 等同。`65%finish` 仅为既有里程碑标签，不是测试覆盖率或实际完成率。

受保护 master 基线和既有证据保持历史绑定。经理已在独立工作树正常集成 PR24/26/27/25 的已发布来源；恢复后的中间版本全量测试 670/670、类型/静态/格式检查通过，尚未发布或冻结为最终候选。03 共享 Pass 路由、04 Vault 选择和关键分支覆盖率整改继续进行。独立最终安全复核、外部治理、未来 PR 审批与真实测试网仍不满足。原临时日志已不可用，不冒充当前验收。详见 [恢复与当前回执](Macbeth01-RESUMPTION.md)；完整13字段见 [JSON矩阵](remaining-tasks.json)。

| 子项 | 来源 | 目标 | 当前真实状态 | Owner / 协作者 | 依赖 | 交付物/验收 | 证据 | 阻塞/需用户 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PH1-01 | 当前用户第1/2/7节；PR21 | 固定基线、登记、文档/路线图/状态板同步 | IN_PROGRESS | 01 / 02–06 | 无 | 矩阵、登记、当前状态与 C/R/S；所有来源映射；真实 ACK；无旧状态冒充当前 | ASSIGNMENTS.md；PR21；本轮 PR | NONE / 否 |
| PH1-02 | 当前用户02；CON-001/SPEC-001/SPEC-002/ABI-001 | Pass 固定供应、策略绑定、完整权限/事件/ABI；只补缺 | DELIVERED_PENDING_INDEPENDENT_RETEST | 02 / 03/04/05 | base ABI | 覆盖表、必要修复和 ABI handoff；25 Vault selectors/7 topics 等完整 compiler equality；发行/转账精度及异常 token 回归 | PR24 a130529；Macbeth02-COVERAGE.md；05 缺固定合约工具，02 正提供可核验恢复步骤 | TOOLCHAIN_AND_INDEPENDENT_ACCEPTANCE / 否 |
| PH1-03 | DRYRUN-001/SEC-002；用户02 | 可重建构建、constructor/immutables/bytecode 清单和本地 VM 演练 | DELIVERED_PENDING_INDEPENDENT_RETEST | 02 / 03/05/06 | PH1-02 | 构建清单、离线参数、local VM 演练；干净重建一致；重复运行不覆盖；明确无外部链广播 | PR24 a130529；8-contract schema2 artifact、20 immutable groups / 86 locations；本地 VM 非 Testnet | TOOLCHAIN_AND_INDEPENDENT_ACCEPTANCE / 否 |
| PH1-04 | 用户03；CONFIG-001/ASSET-001/ADAPTER-001/RPC-001 | manifest、地址/字节码/ABI、三方链身份与调用目标校验 | REMEDIATION_IN_PROGRESS | 03 / 02/04/05 | base；接口变化依赖PH1-02 | 配置/适配回归与接入说明；错链/错地址/错ABI/错owner失败关闭；真实参数缺失保持 NOT_DEPLOYED | PR26 67b7d48 已集成；05 关键链/API 分支覆盖不足，03 补真实负例 | IMPLEMENTATION_EVIDENCE / 否 |
| PH1-05 | 用户03；TX-001/WALLET-001 | 拒签/revert/replaced/dropped/断线/模糊提交/重复回调恢复 | DELIVERED_PENDING_FINAL_ACCEPTANCE | 03 / 04/05 | PH1-04 | 状态机/持久化及钱包交接；SUBMISSION_AMBIGUOUS 不自动重发；刷新恢复不重复经济动作 | PR26 67b7d48；最终共享 Pass / Vault 选择候选仍待复测 | CANDIDATE_DEPENDENCY / 否 |
| PH1-06 | 用户03；INDEX-001 | 有界 catch-up、重组、跨进程所有权和多实体隔离 | REMEDIATION_IN_PROGRESS | 03 / 05 | base索引实现 | 重启/竞争/多Vault多钱包多策略回归；同块多操作不丢失；无共同祖先保留证据且持久degraded | PR26 67b7d48；共享 StrategyPass 的多 Vault 路由修复进行中 | IMPLEMENTATION / 否 |
| PH1-07 | DATA-001/OBS-001/IR-001；用户03 | 数据库迁移、备份恢复、健康/故障说明和演练 | DELIVERED_PENDING_FINAL_ACCEPTANCE | 03 / 01/05 | PH1-06 | 备份恢复工具/说明与可重现演练；备份一致且不覆盖原库；恢复后身份和索引对账；实际 RPO/RTO | PR26 67b7d48 三次 local recovery drills；仅本地确定性夹具，不是生产 SLA | CANDIDATE_DEPENDENCY / 否 |
| PH1-08 | 用户04；产品入口实查 | 暖色英文实际入口、六页信息和数据来源标签 | DELIVERED_PENDING_FINAL_ACCEPTANCE | 04 / 01/05 | apps/web/index.html 加载 product-ui.ts 与 user-ui.js | 产品状态/来源缺口修复、浏览器证据；主页/市场/详情/账户/用户论坛/排名准确；不改未使用React入口 | PR27 332549c；05 新定向125/125 与 typecheck PASS，尚非最终统一候选 | CANDIDATE_DEPENDENCY / 否 |
| PH1-09 | 用户04；Pass/Vault端到端 | 发行/分配或获取 Pass、自由转账、创建/选择 Vault 操作入口 | REMEDIATION_IN_PROGRESS | 04 / 02/03/05 | PH1-02/04；PH1-16已明确仅首发分配与转账 | 操作闭环、精确接口和浏览器用例；1 PASS容量不等于价格；转账18位；创建或选择 Vault；受审 allowlist 选择满足产品路径，创建保留显式 Owner 部署流程；切换废弃旧意图/模拟 | PR27 332549c 已交付转账等；allowlisted Vault 选择和切换隔离由04补齐 | IMPLEMENTATION / 否 |
| PH1-10 | 用户04；已冻结D1 | 有限授权、模拟/会话复核、存入/提款/close/post-close rescue | DELIVERED_PENDING_FINAL_ACCEPTANCE | 04 / 02/03/05 | PH1-04/05 | 完整受支持动作UI与浏览器回归；关闭后禁用存取/close和无效approve；合法Owner rescue可执行；金额不舍入 | PR27 332549c；新候选切换失效/Owner隔离仍待验证 | CANDIDATE_DEPENDENCY / 否 |
| PH1-11 | 用户03/04；退出不依赖平台健康 | API/index degraded 下 canonical 直接读和Owner退出 | DELIVERED_PENDING_FINAL_ACCEPTANCE | 04 / 03/05 | PH1-04/10 | 直接读取、提款/关闭/救援路径证据；API失败不显示陈旧READY；链/Owner可验证时退出仍可用 | PR26/27；共享 Pass / Vault 选择完成后，复验直接退出与 degraded 情景 | CANDIDATE_DEPENDENCY / 否 |
| PH1-12 | 用户05；DoD覆盖率 | 功能验收矩阵、准确覆盖率与跨层独立复测 | REMEDIATION_IN_PROGRESS | 05 / 02/03/04 | 起点base；最终统一候选 | 独立功能复测/覆盖率/缺陷及修复SHA；测量总体90%目标和关键授权会计100%分支要求；不足仍FAIL/BLOCKED，不拿数量替代 | 05 新 PR26 617/617；13关键文件 lines96.44% / branches88.98% / functions98.52%；P1-001 OPEN；总体及浏览器 NOT_MEASURED | COVERAGE_AND_CANDIDATE_DEPENDENCY / 否 |
| PH1-13 | 用户05/SEC-002；历史服务拒绝 | 独立最终安全复核 | BLOCKED_EXTERNAL_REVIEW | 05 / 用户/外部合格复核者 | 允许的验证主体、最终候选 | 有范围的真实安全结论；服务限制未解除不得重试规避；普通功能复测不能代替；无伪造通过 | 05 2026-09-19服务失败；新05状态报告 | EXTERNAL_REVIEW / 是 |
| PH1-14 | 用户06；CI-GATES/SECRET-001/SUPPLY-001 | 7必需CI、附加任务、合约/scanner覆盖和证据真实性 | IN_PROGRESS | 06 / 01/05 | base；每个准确候选 | 六项分列结论和run/job/step证据；9jobs每关键步骤实际执行；错误失败关闭；旧CI失败不改写 | 06 最小元数据已回传；正文传输/发布未授权；当前公开 PR CI 持续核验，最终候选未冻结 | CANDIDATE_DEPENDENCY / 否 |
| PH1-15 | GOV-001/SUPPLY-001/TRUST-001 | 仓库外不可被受检diff替换的治理验证与独立身份 | BLOCKED_EXTERNAL_AUTHORITY | 01 / 06/用户/独立管理者 | 指定外部provider/管理员/复核主体及授权 | 具体实施方案、受保护验证入口、tamper负例和真实身份验收；不可仅改JSON verified；外部修订/摘要/强制规则/失败样本均可验证 | docs/security/SUPPLY-CHAIN.md；组织准备方案 | EXTERNAL_DEPENDENCY_AND_AUTHORIZATION / 是 |
| PH1-16 | 用户第3C节；先前规范未冻结交易机制 | 首发分配与转账纳入；付费销售和真实Buy/Sell由用户明确移出第一阶段 | USER_DECIDED_OUT_OF_PHASE_FOR_PAID_TRADING | 用户 / 01/02/04 | 无；2026-09-20 用户已决定 | 落实分配/转账及诚实Mock标识；不实现付费机制；不重复询问已确认范围 | docs/management/phase1/DECISIONS.md；用户本轮异步答复 | NONE / 否 |
| PH1-17 | PR21 squash；用户第2节 | 旧PR15–20覆盖与superseded关系；Dependabot12/13单列 | SOURCE_RECONCILED | 01 / 02/03/04/05/06 | master及原始source refs | 逐文件来源/语义覆盖证据、PR整理；不凭非祖先判断缺失；不重复merge；不删除来源refs；未覆盖差异保留任务 | PR-SUPERSESSION.json / PR-SUPERSESSION.md；PR15–20 已按准确来源覆盖证据关闭，原 refs 保留 | NONE / 否 |
| PH1-18 | 用户第6/7节；管理collector | 4项合约NOT_RUN采集边界 | ASSESS_AND_COMPLETE_IF_REQUIRED | 01 / 02/05/06 | 现有collector与独立contract job | 真实接通的采集或准确单独证据索引；不得手填PASS；若阶段硬门槛则真实解决；否则明确两套证据覆盖 | tools/management-dashboard/checks.mjs；contract job | SCOPE_EVIDENCE / 否 |
| PH1-19 | 用户第8/9节；RELEASE-001/DOC-001/DEMO-001 | 统一候选、干净环境复现、演示/恢复和交付包 | MUST_COMPLETE | 01 / 02–06 | PH1-02至18适用项 | 准确候选及可复现交付包；实现/本地/CI/QA/review/merge/testnet各状态分列；所有限制留存 | 本轮最终PR/交付报告 | DEPENDENCIES / 否 |
| PH1-20 | 用户第3B/6节；本轮无普通merge授权 | 正常PR审批与本轮合并 | WAITING_APPROVAL_AND_AUTHORIZATION | 01 / 用户/独立GitHub reviewer/06 | 最终候选、全CI、真实review及适用授权 | 具体PR/SHA/门禁预览后用户决定；不复用21例外、不降规则；实际merge后master验证 | ruleset22507334；本轮最终PR | GITHUB_REVIEW_AND_MERGE_AUTHORIZATION / 是 |
| PH1-21 | 此前用户选择完成Robinhood Testnet版本；本轮第3A/6节 | 真实部署参数、Owner/Creator/策略、资产与交易清单 | PREPARE_THEN_REQUEST_AUTHORIZATION | 01 / 02/03/04/用户 | PH1-03/13/15/19；用户提供公开地址/身份参数 | 逐交易目标/数据/值/nonce/预算/预期结果及安全失败步骤；先完整方案再批准；不向聊天索要私钥助记词；无自动重发 | 新02部署方案；新03smoke；01审批包 | DEPLOYMENT_PARAMETERS_AND_AUTHORIZATION / 是 |
| PH1-22 | 用户第6/8节；DEPLOY/VERIFY/E2E-001 | 真实Testnet发行/分配/转账/Vault授权存提款关闭验收 | NOT_RUN | 01 / 02/03/04/05/06 | PH1-21明确授权及所有适用发布门槛 | 链上地址/交易/块/构建manifest/浏览器账本核对；local VM/mock非testnet；仅批准交易；未知结果先查链 | 尚无真实链证据 | EXTERNAL_CHAIN_AUTHORIZATION / 是 |

## 全部41个旧roadmap条目的去向

不机械重做旧目标，不改其验收/风险政策；本轮以明确批准的部分上链约束覆盖不适用的策略运行/双签/角色迁移方案，独立复核和外部信任要求保持。旧条目状态与本轮实际证据分开。

| 旧Task | 旧记录状态 | 本轮去向 |
| --- | --- | --- |
| BASE-001 | done | PH1-01/19 |
| NET-001 | done | PH1-04/21 |
| LEDGER-001 | done | PH1-02/12 |
| PERMIT-001 | done | PH1-15（旧策略许可为历史，策略运行明确暂缓） |
| LOCAL-001 | done | PH1-08/12 |
| CI-001 | done | PH1-14 |
| GOV-001 | blocked | PH1-15 |
| THREAT-001 | backlog | PH1-13/15 |
| CONFIG-001 | backlog | PH1-04 |
| ASSET-001 | backlog | PH1-04/21 |
| TRUST-001 | backlog | PH1-15（旧执行签名不新增到直接Owner操作） |
| PRIV-001 | backlog | PH1-04/15（直接Owner，无新增relay角色） |
| TOOL-001 | ready | PH1-03/14 |
| SPEC-001 | backlog | PH1-02 |
| SPEC-002 | backlog | PH1-02 |
| ABI-001 | backlog | PH1-02/04 |
| SUPPLY-001 | in_progress | PH1-14/15 |
| CON-001 | backlog | PH1-02 |
| CON-002 | backlog | PH1-02/11（旧策略暂停语义不强加于当前Owner-only Vault） |
| TST-001 | backlog | PH1-02/12 |
| TST-002 | backlog | PH1-02/12/14 |
| SEC-002 | backlog | PH1-03/12/13 |
| WALLET-001 | backlog | PH1-05/09/10 |
| ADAPTER-001 | backlog | PH1-04 |
| TX-001 | backlog | PH1-05 |
| INDEX-001 | backlog | PH1-06 |
| DATA-001 | ready | PH1-07 |
| BACKEND-001 | backlog | PH1-04/07（无服务器代签；完整登录明确暂缓） |
| RPC-001 | ready | PH1-04/06 |
| WEBSEC-001 | ready | PH1-08/10/13 |
| KEY-001 | backlog | PH1-21 |
| SECRET-001 | ready | PH1-14/21 |
| DRYRUN-001 | backlog | PH1-03/21 |
| DEPLOY-001 | backlog | PH1-22 |
| VERIFY-001 | backlog | PH1-22 |
| OBS-001 | backlog | PH1-07/11 |
| IR-001 | backlog | PH1-07/19 |
| E2E-001 | backlog | PH1-12/22 |
| DOC-001 | ready | PH1-01/19 |
| DEMO-001 | backlog | PH1-19/22 |
| RELEASE-001 | backlog | PH1-19/20/22 |

仅已由用户明确排除的完整策略执行、完整交易所/新AMM、完整账户登录、多钱包控制权迁移、Owner迁移、主网/真实资金不实施。用户已明确将付费销售和真实 Buy/Sell 移出第一阶段；首发分配与转账仍必须完成。见 DECISIONS.md。
