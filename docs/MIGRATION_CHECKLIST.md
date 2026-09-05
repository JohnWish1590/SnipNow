# SnipNow 1.0 — 逐项改造清单（Rename & Migration Checklist）

> 源码基线：`D:\SynologyDrive\CODING\Mouse4\main.pyw`，commit `c3340bc`（main 分支），1904 行 / 94 KB
> 本清单 A–F 节的行号以该基线为准（2026-09-05 已完成，行号不再更新，作为历史记录保留）。
> 目标目录：`D:\SynologyDrive\CODING\snipnow`（本地 git，**不配置任何 remote**）

## 进度

| 阶段 | 状态 | 说明 |
|---|---|---|
| P0 基线 | ✅ 完成 | 本地 git 建仓（无 remote）+ 主干源码 + pre worktree；原样构建通过（1分23秒） |
| P1 品牌 + 英文 | ✅ 完成 | 运行时标识、注册表、文件名前缀、打包名全改；用户可见中文清零（67 处） |
| P1 注释英文化 | ✅ 完成 | 134 行中文注释/docstring 全部翻译为英文；修复 2 处 docstring 闭合结构错误（原 L1152/L1577）；`py_compile` 通过，中文残留 0，Mouse4 残留 0 |
| P2 i18n | ⬜ 未开始 | 建 `i18n/en.json` + `tr()`，把 P1 的英文抽成 key |
| P3 licensing 核心 | ⬜ 未开始 | 含试用期倒计时与硬锁 |
| P4 试用 + License UI | ⬜ 未开始 | Settings 常驻入口 + 到期弹一次 |
| P5 加固 | ⬜ 未开始 | DPAPI、HTTPS 超时、日志掩码、时钟回拨 |
| P6 真实 provider | ⬜ 未开始 | 等支付平台确定 |
| P7 发布 | 🟡 安装包完成 | **Inno Setup 6 安装包已落地**：`installer\snipnow.iss`（per-user 免提权、lzma2/max、可选桌面图标+开机自启 HKCU）；打包链 onedir（spec 加 COLLECT，弃 onefile——59MB 每次启动解压与轻快定位矛盾）→ `dist\SnipNow-Setup-1.0.0.exe`（41.3MB）。**端到端冒烟已验证**：静默安装→进程拉起→卸载器杀运行中实例→卸载干净。签名 / GitHub Release 待做 |

---

## 0. 已确认的决策（不要再改）

| 项 | 决定 |
|---|---|
| 源码仓库 | 本地 `D:\SynologyDrive\CODING\snipnow`，`git init`，**无 remote**，靠 SynologyDrive + 本地 git 历史备份 |
| `JohnWish1590/SnipNow` | Public，只放产品文档/官网/隐私/条款/CHANGELOG/Issues，**不放任何源码** |
| `JohnWish1590/Mouse4` | 转 Private 后冻结归档，不再提交新代码 |
| 重构粒度 | **小步**：`main.pyw` 主体不动，只新增 `i18n/` 和 `licensing/` 两个包 |
| 版本划分 | **没有 Free/Pro 之分**，只有两种状态：未激活（试用）与已激活 |
| 未激活策略 | **试用 N 天后硬锁**（默认 14 天，可配置参数，不写死常量）。不做部分免费层 |
| License 入口 | Settings 常驻 + 试用临近/到期时启动弹一次（可关闭，不反复打扰） |
| 支付平台 | 未定。先做 Mock provider，主程序只依赖抽象层 |
| 窗口吸附/智能选区 | 冻结，`mouse4-window-snap-pre` 分支及 `docs/SMART_WINDOW_SELECTION_ANALYSIS.md` 不带入 1.0 |

---

## A. 运行时标识常量（main.pyw）

| 行号 | 当前 | 改为 | 说明 |
|---|---|---|---|
| 2 | `"""Mouse4 V2.0 - 正式版跨屏截图与快速标注"""` | SnipNow 1.0 英文 docstring | 模块头注释 |
| 24 | 注释里提 Mouse4 | 英文注释 | — |
| 27 | `APPDATA_FOLDER = 'Mouse4-PRE' if PRE_VARIANT else 'Mouse4'` | `'SnipNow-PRE'` / `'SnipNow'` | 配置目录 `%APPDATA%\SnipNow` |
| 28 | `CAPTURE_FOLDER = 'Mouse4Captures'` | `'SnipNow Captures'`（若空格有麻烦用 `SnipNowCaptures`） | 默认 `~\Pictures\SnipNow Captures` |
| 29 | `SINGLE_INSTANCE_NAME = 'Mouse4_SingleInstance_JohnWish'` | `'SnipNow_SingleInstance_JohnWish'` | **必须与旧版不同**，否则新旧同时运行时互相顶掉 |
| 297 | `PRE_SHUTDOWN_EVENT = 'Mouse4_RequestExit_JohnWish'` | `'SnipNow_RequestExit_JohnWish'` | 同上 |
| 1772 / 1787 / 1837 | `WM_MOUSE4_RECONFIGURE_HOTKEY = 0x8001` | `WM_SNIPNOW_RECONFIGURE_HOTKEY` | 3 处引用，内部消息 ID |
| 347 | `filename.startswith('mouse4-pre')` | `filename.startswith('snipnow-pre')` | PRE 变体 exe 名匹配 |
| 206 | `f"=== Mouse4 V2.0 Started role=..."` | `=== SnipNow 1.0 Started role=` | 日志启动 banner |

---

## B. 注册表右键菜单（**含历史遗留品牌名，最容易被漏掉**）

| 行号 | 当前 | 改为 | 说明 |
|---|---|---|---|
| 497 | `reg_key_name = "GeekPaste"` | `"SnipNowPaste"` | ⚠️ 这是 **Mouse4 之前** 的品牌名 GeekPaste，一直没改。注册表键：`HKCU\Software\Classes\Directory\Background\shell\GeekPaste` |
| 496 | `context_menu_text = "粘贴刚才的截图 (Mouse4)"` | `"Paste last screenshot (SnipNow)"` | Explorer 空白处右键菜单显示名（i18n key 建议 `explorer.paste_last`） |
| 1511 | `key_path` f-string | 自动跟随 `reg_key_name` | 无需单独改 |
| 1517 | `winreg.SetValue(..., config.context_menu_text)` | 走 i18n | 见风险 R1 |
| 495 | `github_url = "https://github.com/JohnWish1590/Mouse4"` | `https://github.com/JohnWish1590/SnipNow` | About / 帮助里的链接 |

---

## C. 用户可见中文 → 英文 + i18n key

> 共约 **30 条**。迁移顺序：先替换为英文，再抽到 `i18n/en.json`（P1 做完英文，P2 再抽 key）。

### C1. 标注工具栏（872–890）

| 行号 | 中文 | 建议英文 | i18n key |
|---|---|---|---|
| 872 | 矩形 / 圆形 / 箭头 | Rectangle / Ellipse / Arrow | `tool.rect` `tool.ellipse` `tool.arrow` |
| 873 | 画笔 / 文字 / 打码 | Pen / Text / Mosaic | `tool.pen` `tool.text` `tool.mosaic` |
| 881 | 撤销 | Undo | `tool.undo` |
| 887 | 贴到桌面 | Pin to desktop | `tool.pin` |
| 889 | 保存并复制 | Save and copy | `tool.save_copy` |
| 890 | 取消 | Cancel | `common.cancel` |

### C2. 贴图右键菜单（978–990）

| 行号 | 中文 | 建议英文 | i18n key |
|---|---|---|---|
| 978 | 复制 | Copy | `capture.copy` |
| 979 | 保存... | Save As… | `capture.save_as` |
| 981 | 关闭 | Close | `pin.close` |
| 985 | `'保存贴图'`（对话框标题）+ `'Mouse4_Pinned.png'`（默认名）+ `'PNG 图片 (*.png)'` | `Save Pin` + `SnipNow_Pinned.png` + `PNG image (*.png)` | `pin.save_title` / `pin.default_name` / `file.png_filter` |
| 990 | `'Mouse4'`（标题）+ `'保存贴图失败。'` | `SnipNow` + `Failed to save the pin.` | `app.name` / `pin.save_failed` |

### C3. 托盘菜单（1747–1753, 1797）

| 行号 | 中文 | 建议英文 | i18n key |
|---|---|---|---|
| 1747 | `立即截图 ({config.hotkey})` | `Capture now ({hotkey})` | `tray.capture_now` |
| 1748 | 设置... | Settings… | `tray.settings` |
| 1750 | 打开截图文件夹 | Open Screenshots Folder | `tray.open_folder` |
| 1752 | 关于 Mouse4 | About SnipNow | `tray.about` |
| 1753 | 退出 Mouse4 | Exit SnipNow | `tray.exit` |
| 1797 | `立即截图 ({binding[2]})` | 同 1747，动态刷新 | `tray.capture_now` |

### C4. 设置窗口（1664–1738）

| 行号 | 中文 | 建议英文 | i18n key |
|---|---|---|---|
| 1664 | `Mouse4 设置`（窗口标题） | `SnipNow Settings` | `app.settings` |
| 1671 | 截图快捷键 | Capture hotkey | `settings.hotkey_label` |
| 1673 | 点击后按下新组合键，例如 Ctrl+Shift+1 或 F8 | Click here, then press the new shortcut, e.g. Ctrl+Shift+1 or F8 | `settings.hotkey_placeholder` |
| 1675 | 保存后立即生效；若被 Windows 或其他程序占用，会保留原快捷键。 | Takes effect immediately after saving. If the shortcut is already used by Windows or another app, the previous one is kept. | `settings.hotkey_hint` |
| 1678 | 截图保存目录 | Screenshot folder | `settings.folder_label` |
| 1681 | 选择... | Browse… | `settings.browse` |
| 1686 | 恢复默认设置 | Restore defaults | `settings.restore` |
| 1688 | 取消 | Cancel | `common.cancel` |
| 1689 | 保存 | Save | `common.save` |
| 1694 | 选择截图保存目录（目录对话框） | Choose screenshot folder | `settings.folder_dialog` |
| 1701 | 请输入有效快捷键，例如 Ctrl+Shift+1 或 F8。 | Enter a valid shortcut, e.g. Ctrl+Shift+1 or F8. | `settings.err_hotkey` |
| 1706 | `detail`（注册失败详情） | 英文 | `settings.err_hotkey_detail` |
| 1710 | 请选择截图保存目录。 | Choose a screenshot folder. | `settings.err_folder` |
| 1718 | `detail` | 英文 | `settings.err_save_detail` |
| 1723 | 已恢复默认设置。 | Default settings restored. | `settings.restored` |
| 1735 | 无法打开截图文件夹。 | Could not open the screenshots folder. | `settings.err_open_folder` |
| 1738 | `关于 Mouse4` + `Mouse4 V2.0\n轻快的 Windows 鼠标与截图增强工具。` | `About SnipNow` + `SnipNow 1.0\nA fast, lightweight screenshot tool for Windows.` | `about.title` / `about.body` |

### C5. 快捷键反馈（1779–1853）

| 行号 | 中文 | 建议英文 | i18n key |
|---|---|---|---|
| 1779 | 快捷键格式无效。 | Invalid shortcut format. | `hotkey.err_format` |
| 1781 | 快捷键服务尚未就绪，请稍后重试。 | Hotkey service is not ready. Please try again later. | `hotkey.err_not_ready` |
| 1785 | 快捷键正在更新，请稍后重试。 | Updating hotkey. Please try again later. | `hotkey.err_busy` |
| 1790 | 无法联系快捷键服务。 | Cannot reach the hotkey service. | `hotkey.err_no_service` |
| 1792 | 快捷键服务响应超时。 | Hotkey service timed out. | `hotkey.err_timeout` |
| 1799 / 1853 | 该快捷键无法注册，请更换其他组合键。 | This shortcut could not be registered. Try a different combination. | `hotkey.err_register` |

### C6. 崩溃与错误提示（469–480）

| 行号 | 中文 | 建议英文 | i18n key |
|---|---|---|---|
| 469–470 | `Mouse4 主线程发生致命错误…` + 标题 `Mouse4 崩溃拦截报告` | `SnipNow hit a fatal error and has stopped.` + `SnipNow Crash Report` | `crash.main_body` / `crash.main_title` |
| 479–480 | `Mouse4 后台线程 ({name}) 发生崩溃！…` + 标题 `Mouse4 线程警告` | `A background thread in SnipNow crashed. Some features may stop working.` + `SnipNow Thread Warning` | `crash.thread_body` / `crash.thread_title` |

### C7. 其他（1523–1622）

| 行号 | 中文 | 建议英文 | i18n key |
|---|---|---|---|
| 1523 / 1529 / 1530 | 注册成功！/ 已移除。/ 未安装。 | Installed. / Removed. / Not installed. | `registry.installed` 等（右键菜单注册回执） |
| 1619 / 1622 | `选择截图保存目录` + `截图将保存到:\n{d}` | `Choose screenshot folder` + `Screenshots will be saved to:\n{d}` | `settings.folder_dialog` / `settings.saved_to` |

---

## D. 文件名与自动清理

| 行号 | 当前 | 改为 |
|---|---|---|
| 1438 | `f"Mouse4_{now:%Y%m%d_%H%M%S}_{ms:03d}.png"` | `SnipNow_...` |
| 1539 | docstring `删除…Mouse4_*.png` | 英文 |
| 1552 | `name.startswith('Mouse4_')` | `startswith('SnipNow_')` |
| 1554 | `stem = name[len('Mouse4_'):-len('.png')]` | `len('SnipNow_')` |

> 影响：旧的 `Mouse4Captures` 目录与 `Mouse4_*.png` 不会被新逻辑清理。因为是干净新产品，可接受；若要干净，install 时提示一次即可。

---

## E. 构建与打包

| 文件 | 当前 | 改为 |
|---|---|---|
| `main.spec` | `name='main'`（生成 `main.exe`） | `name='SnipNow'`，必须改，否则用户下载的是 main.exe |
| `main.spec` | `icon=['logo.ico']` | 需要新的 SnipNow 图标 |
| `mouse4.spec` / `mouse4_onedir.spec` | 旧品牌名 | 重命名为 `snipnow.spec` / `snipnow_onedir.spec`，或只保留一个 |
| `.github/workflows/build.yml` | 含 Mouse4 逻辑 | 源码不建远端 → **不迁移 workflow**；如需 CI，改为本地脚本 |
| `logo.ico` | Mouse4 图标 | **需要新设计**（海外品牌，建议浅色底 + 剪刀/取景框语义） |
| `logo.ico.bak`（270 KB） | 备份 | 不迁移 |
| `wechat_qr.png`（171 KB） | 微信二维码 | 不迁移（海外产品用不上） |

---

## F. 文件迁移取舍（复制到 snipnow 时）

**复制**：`main.pyw`、`config.json`、`requirements.txt`、`requirements-lock.txt`、`logo.ico`（临时占位）、`_diag.py`（诊断脚本，内部用）、`.gitignore`

**不复制**：`build/`、`dist/`、`release/`、`__pycache__/`、`pre/`、`logo.ico.bak`、`wechat_qr.png`、`docs/`、`README.md`、`CHANGELOG.md`、`HANDOFF.md`、`PRIVACY.md`、`STORE_GUIDE.md`、`RELEASE_NOTE.md`

> 文档不复制：SnipNow 是英文新产品，README/隐私/条款全部在公开仓库里重新用英文写，旧中文文档留在 Mouse4 仓库做历史。
> `pre/` 不复制：它是嵌套 git worktree（内含 `pre/.git`），复制容易踩坑。改用本地 git 分支做 PRE 变体。

---

## G. 风险点（必须提前知道）

**R1. 注册表菜单文本是静态写入的**
`context_menu_text` 只在安装右键菜单时写一次注册表。用户切语言后菜单文本不会自动更新。
→ 建议：安装时按当前 UI 语言写入；Settings 里提供 "Repair Explorer menu" 按钮重新写一次。

**R2. 旧注册表键成为垃圾**
`reg_key_name` 从 `GeekPaste` 改成 `SnipNowPaste` 后，老键 `HKCU\Software\Classes\Directory\Background\shell\GeekPaste` 不会自动删除，会残留在用户系统里。
→ 建议：install 时顺手尝试删除 `GeekPaste` 和 `Mouse4Paste` 两个历史键（失败静默）。

**R3. 单实例互斥体必须真改**
`SINGLE_INSTANCE_NAME` / `PRE_SHUTDOWN_EVENT` 若与旧版重名，SnipNow 和 Mouse4 会互相把对方顶掉，表现为"装了 SnipNow 后 Mouse4 起不来"或反之。改名后必须实际同时启动两个版本验证互不干扰。

**R4. onefile 启动速度 vs 产品卖点**
现在用 PyInstaller **onefile**，每次启动要把整个包解压到临时目录，冷启动明显偏慢。SnipNow 卖点是"极轻极快"，海外竞品（如 ShareX / Snipaste）启动都在 1 秒内。
→ 建议：P7 阶段评估 **onedir + 安装包**，而不是 onefile 单 exe。这是体验项，可以后做，但别在 1.0 就锁死 onefile。

**R5. `sys.executable` 在开发环境 vs 冻结环境**
L1514 `exe_path = sys.executable`：直接跑 Python 时指向 python.exe，写进注册表会出问题；冻结后才是 SnipNow.exe。现有逻辑应该已经处理，回归时要在**冻结版**上验一遍右键菜单注册，不能只在源码环境验。

---

## H. 执行顺序（每阶段过回归才进下一步）

| 阶段 | 内容 | 放行条件 |
|---|---|---|
| **P0 基线** | Mouse4 转 Private → snipnow 目录 `git init`（无 remote）→ 复制源码 → **原样构建 + 冒烟** | 复制过来的源码能原样跑起来 |
| **P1 品牌+英文** | A/B/C/D 四节全部改完 | 界面无中文；跨屏截图/标注/贴图/热键/双击返回/托盘全部回归通过 |
| **P2 i18n** | 新建 `i18n/en.json` + `tr()`；把 P1 的英文逐条抽成 key | 删掉任意条目能安全回退英文；回归通过 |
| **P3 licensing 核心** | `licensing/license_manager.py` + `providers/base.py` + `providers/mock.py` + 状态机 | Mock 的 activate/validate/deactivate 全通（先不接 UI） |
| **P4 License UI** | Settings 加 License 区（Buy / Key / Activate / Deactivate / Status） | Mock 全流程通；重启后状态保持 |
| **P5 加固** | DPAPI 存凭据、HTTPS 超时、日志掩码、grace period | 断网不卡 UI；日志无明文 key |
| **P6 真实 provider** | 支付平台定了之后接真实 adapter / webhook | 换 provider 不碰 UI |
| **P7 发布** | 构建、安装包、签名、Release、公开仓库英文文档 | 满足需求文档第 13 节 DoD |

---

---

## I. 试用与激活机制设计（2026-09-05 与产品方确认）

**没有 Free/Pro。只有两种状态：未激活（试用）与已激活。**

| 状态 | UI 表现 | 程序行为 |
|---|---|---|
| TRIAL | Settings 显示剩余天数 | 全功能，从首次启动日倒计时 |
| TRIAL_EXPIRED | 启动弹激活窗 | **硬锁**，程序不可用，直到输入有效 key |
| ACTIVATED | SnipNow / Lifetime License / Activated on this device | 全功能，本地缓存激活凭据 |
| OFFLINE_GRACE | 不打扰用户 | 保持激活，后台等下次校验 |

### 试用期实现要点

- 首次启动时间写入 **DPAPI 保护存储**，不放在 `config.json`（改个文件就能续期，等于没有试用）
- 每次启动记录 last-seen 时间；若当前系统时间早于 last-seen（时钟回拨），试用期按 last-seen 推进并记日志
- **绝不因为时钟异常锁死已激活用户**——以上规则只作用于试用期
- 不联网校时。离线启动不得依赖网络
- 认了这一条：虚拟机 + 改系统时间的用户能绕过。检查保持简单便宜，**不要为防破解把诚实用户的程序搞崩**

### 待你定

1. **试用期到底几天**：文档与代码占位按 **14 天** 写的，作为参数可配，你说了算
2. 到期硬锁时，是否给一次"导出截图 / 备份配置"的出口（善意设计，避免用户数据被锁死引发差评）

### UI 文案（全文不得出现 Pro）

- `Not activated` / `Activated`
- `{n} days left in your trial`
- `Your trial has ended. Activate SnipNow to keep using it.`
- `Buy SnipNow`（不是 Buy SnipNow Pro）

---

*生成时间：2026-09-05 | 基线 commit：Mouse4@main c3340bc | 最后更新：2026-09-05 P1 完成*
