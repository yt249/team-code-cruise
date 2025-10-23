## 快速说明（给 AI 编码代理）

这是为仓库中 AI 编码代理准备的精简操作手册。仓库当前没有源代码或配置文件。本文件列出代理在打开仓库后应该立即执行的可验证步骤、寻找关键线索的位置、以及常见后端工程的具体命令示例。请根据仓库实际文件逐条执行并把发现记录在提交或 PR 摘要中。

### 目标（Inputs / Outputs / 成功标准）
- 输入：仓库根目录下的文件集合（例如 `package.json`, `pyproject.toml`, `Dockerfile`, `Makefile`, `src/`, `tests/`, `.github/workflows/`）
- 输出：可运行的本地构建/测试命令、短的架构总结（3-6 行）、需要人工确认的变更建议以及可直接应用的补丁/PR
- 成功标准：能识别主语言和启动命令，能运行一个快速 smoke 测试（如 `npm test`、`pytest`、或 `go test`），并生成一个合并友好的 `.github/copilot-instructions.md` 更新

### 第一步：自动化扫描（必须执行）
1. 在根目录寻找以下文件并记录是否存在：
   - `package.json`, `yarn.lock`, `pnpm-lock.yaml` (Node.js)
   - `pyproject.toml`, `requirements.txt`, `Pipfile` (Python)
   - `go.mod` (Go)
   - `pom.xml`, `build.gradle` (Java)
   - `Dockerfile`, `Makefile`, `README.md`, `.github/workflows/*`
2. 打开并解析：`package.json` 的 `scripts`、`pyproject.toml` 的 `tool.poetry.scripts`/`[tool.pytest]`、`go.mod` 的模块名
3. 如果发现 CI/workflow，记录 CI 中的 build/test 命令作为优先运行的命令

### 常见堆栈启动示例（在检测到对应文件后执行）
- Node.js (有 `package.json`):
```bash
npm install
npm test    # 或者 package.json 中的 test 脚本
```
- Python (有 `pyproject.toml` 或 `requirements.txt`):
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt || pip install -e .
pytest -q
```
- Go:
```bash
go test ./...
```

### 架构侦测提示（在哪里找“为什么是这样”）
- 查找 `src/`、`cmd/`、`internal/`、`pkg/`（Go 风格）或 `services/`、`api/`、`worker/`（微服务分层）目录以理解边界。
- 查阅 `Dockerfile` 与 `.github/workflows/*` 来理解部署和 CI 的真实流程（往往比 README 更可靠）。
- 在 `config/`、`env.example`、`.env` 示例中找运行时依赖（数据库、消息队列、外部 API）。

### 项目约定与可验规则（仅记录可被文件证实的约定）
- 日志与配置：若存在 `config/*.yaml` 或 `config/*.json`，优先以这些文件为单一事实来源；不要假设环境变量名称，除非在 `.env` 或 README 中列出。
- 测试：如果仓库使用 `pytest`、`jest`、或 `go test`，把它作为代理的“健康检查”。失败时只提交最小修复或测试跳过建议。
- 数据库迁移：若存在 `migrations/`、`alembic.ini`、`prisma/`，记录迁移命令并不要在无迁移测试环境下自动执行写操作。

### 修改 / 合并策略（如果 `.github/copilot-instructions.md` 已存在）
- 载入现有文件，保留其中有价值的项目说明（architecture、scripts、特殊约定），将本文件中自动检测到的具体命令和扫描步骤合并为“发现清单”。
- 始终在 PR 描述中附上“我做了什么/我发现了什么/需要人工确认”的简短列表。

### 例子（如果仓库里有文件可参考）
- 如果 `package.json` 含有 `"start": "node src/index.js"`，说明入口位于 `src/index.js`，并把 `node src/index.js` 作为本地运行示例。
- 如果存在 `services/auth/` 与 `services/api/` 两个目录，说明存在内部服务边界；优先搜索 `services/*/README.md` 或 `services/*/Dockerfile` 来确认部署单元。

### 安全与副作用约束（强制遵守）
- 不要在运行任何迁移、删除或生产写入命令之前创建 issue/PR 并等待人工确认。
- 不要自动提交含有秘密（.env 值、API keys）的更改；如果在 repo 或 CI 日志中发现秘密，立即报告并 redact 示例。

### 结束语 — 需要你确认的地方
- 仓库当前为空；若你希望我针对已存在的语言/框架写更具体的规则，请把项目代码或常用文件推送到仓库根目录，然后反馈我将马上合并并缩短本文件为针对性高的 20-30 行说明。

---
（自动生成模板：将根据仓库文件精化，并在下一次提交中汇入发现的具体命令与入口点。）
