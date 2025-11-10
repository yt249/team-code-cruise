# Backend Tests & CI – Step‑by‑Step Dialogue and Guide

> 生成于：**test-back** 分支准备阶段  
> 本文件保留对话要点（step-by-step）并提供可操作的本地测试与 CI 验证指南。

---

## 1) Step‑by‑Step 对话摘要（精简版）

1. **目标**：识别两份核心后端文件，并编写对应的英文测试规格（每文件≥5个函数、每函数≥1条测试）。  
   - 认定的核心文件：
     - `backend/src/core/ride.service.ts`（用户故事 1 的核心）  
     - `backend/src/ad/discount.service.ts`（用户故事 2 的核心）

2. **初版测试规格校验**：发现两条期望与实现不符：  
   - `encodeTime_encodesBase32` 预期应为 `'01GVP35NG0'`（而不是 `'01GZXY7H00'`）  
   - `encodeRandom_usesMathRandom` 预期应为 `'0GZ'`（而不是 `'08Z'`）  
   > 修正后给出**正确**测试规格。

3. **测试框架与运行方式**：最初基于 `node:test`，后改为 **Jest**（便于覆盖率与断言生态）。  
   - 新增 `jest.config.ts`、`tsconfig.spec.json`。  
   - `backend/package.json` 的 `test` 脚本改为 Jest 运行 `*.spec.ts`。

4. **实现 Ride Service 测试**：
   - 覆盖所有函数：`badRequest`, `forbidden`, `createRide`, `getRide`, `cancelRide`, `updateRideStatus`, `startRide`, `completeRide`。  
   - 为了提升覆盖率，补充了**折扣token相关分支**的正反用例（缺 token、token 不匹配、提供多余 token、成功折扣并 `redeem`）。

5. **实现 Discount Service 测试**：
   - 覆盖所有函数：`mintToken`, `validateToken`, `redeemToken`, `fetch`, `httpError`, `generateUlid`, `encodeTime`, `encodeRandom`。  
   - 为便于单测到达内部工具方法，导出 `__discountInternals`（不改变对外行为）。  
   - 增补过期/绑定/用户不匹配等分支用例，覆盖率＞80%。

6. **运行测试与覆盖率**：  
   - 命令：`npm --prefix backend test -- --coverage --verbose`  
   - 结果：2 个测试套件 28/28 通过；`ride.service.ts` 与 `discount.service.ts` 语句/分支/行覆盖率均≥80%。

7. **CI 工作流**：新增 `.github/workflows/run-backend-tests.yml` 实现 **push/PR 自动测试**。  
   - 步骤：Checkout → 设置 Node 20（含 npm 缓存）→ `npm ci` → `npm run prisma:gen` → `npm test`（在 `backend/`）。

8. **README 更新**：补充本地运行测试的先决条件、安装步骤与常用参数（`--verbose`、`--coverage`）。

9. **推送分支**：给出将变更推送到 `test-back` 分支的具体 `git` 命令。

10. **证明 CI 生效**：
    - **最权威方式**：在 GitHub `Actions` 看到 `run-backend-tests` 工作流通过的绿色勾。  
    - **本地演练（可选）**：使用 `act` 触发并模拟 GitHub Actions 运行结果。

---

## 2) 本地运行后端测试的完整指南

### 环境要求（框架与库）
- **Node.js 20+ / npm**（建议通过 `nvm` 安装）  
- **Jest** / **ts-jest**（已在 `backend/package.json` 中声明依赖）  
- **Prisma CLI**（作为 devDependency 调用，无需全局安装）  
- **tsx / TypeScript 配置**（测试时由 Jest + ts-jest 处理）

> 当前测试使用 **内存数据源**（`RB_DATA_MODE=memory`），无需数据库实例。

### 一次性安装
```bash
# 在仓库根目录
npm ci
# 生成 Prisma Client（后端会用到）
npm --prefix backend run prisma:gen
```

### 运行测试
```bash
# 在仓库根目录（推荐）
npm --prefix backend test

# 或者进入 backend 目录执行
cd backend
npm test
```

测试脚本会自动注入：
- `TMPDIR=./.tmp`
- `RB_DATA_MODE=memory`
- `JWT_SECRET=test-secret`

### 常用参数
```bash
# 显示每条测试用例名称
npm --prefix backend test -- --verbose

# 生成覆盖率报告（输出到 backend/coverage/）
npm --prefix backend test -- --coverage

# 同时 verbose + 覆盖率
npm --prefix backend test -- --verbose --coverage
```

---

## 3) 推送到 `test-back` 分支

```bash
# 切换/创建分支
git checkout -b test-back  # 若已存在：git checkout test-back

# 暂存改动（路径按实际变动为准）
git add README.md   backend/tests/*.spec.ts   backend/src/ad/discount.service.ts   .github/workflows/run-backend-tests.yml   backend/jest.config.ts backend/tsconfig.spec.json   backend/package.json

# 提交
git commit -m "Add backend Jest tests, docs, and CI workflow"

# 推送
git push origin test-back
```

---

## 4) 证明 CI 工作流有效

### 方式 A：GitHub Actions 绿色通过（推荐）
1. 推送到 `test-back`（或创建 PR）。  
2. 打开 GitHub 仓库 **Actions** 页面，找到 **run-backend-tests** 工作流。  
3. 确认最新一次运行显示 **绿色通过**（包括完整日志）。

### 方式 B：本地模拟（可选）
使用 [**act**](https://github.com/nektos/act) 在本地模拟 Actions：
```bash
# 安装 act（Mac：brew install act）
act push -W .github/workflows/run-backend-tests.yml
```
成功运行即表明你的工作流脚本能在标准 GitHub runner 环境中执行。

---

## 5) 附录：关键文件与命令

- 测试文件：  
  - `backend/tests/rideService.spec.ts`  
  - `backend/tests/discountService.spec.ts`
- CI 工作流：  
  - `.github/workflows/run-backend-tests.yml`
- 运行命令（根目录）：  
  - `npm --prefix backend run prisma:gen`  
  - `npm --prefix backend test -- --verbose --coverage`

---

## 6) 备注
- 单测中通过 **spy/stub** 覆盖折扣 Token 的异常与成功分支，确保 `ride.service.ts` 与 `discount.service.ts` 的语句/分支覆盖率≥80%。
- 未改变生产代码对外行为：仅为测试暴露了内部工具访问入口（`__discountInternals`）。

> 如需导出完整测试运行日志，可使用：  
> `npm --prefix backend test -- --verbose --coverage > backend-test-log.txt`
