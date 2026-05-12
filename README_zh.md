<p align="center">
  <img src="./build/icon.png" alt="Modraw 图标" width="96" height="96" />
</p>

# Modraw

[English](./README.md) | 简体中文

Modraw 是一个受 Excalidraw 启发的桌面端手绘风格白板应用，基于 Electron、React、Vite、Zustand、Rough.js 和 Tailwind CSS 构建。

## 功能

- 全画布编辑界面，控件以浮层形式显示
- 左上角浮层 Modraw 菜单
- 顶部居中的浮层工作栏
- 左下角浮层缩放、撤销和重做控件
- 支持矩形、菱形、圆形、箭头、线条、自由绘制、文本、图片和画框工具
- 工具锁定模式：绘制后保持当前工具
- 画框工具：框住内部图形，并在移动画框时整体移动
- 支持移动、缩放、旋转和编辑点的即时交互
- 箭头和线条支持编辑点，并可通过右键添加编辑点
- 支持图形、箭头、线条、自由绘制和文本的属性调整浮层
- 支持白板和网格画布背景切换
- 支持从本地导入图片
- 支持保存和打开 `.mdr` 画布文件
- 支持导出 PNG 和 SVG
- 支持确认后重置画布
- 支持英文和简体中文界面切换
- 已配置自定义应用图标

## 快速开始

安装依赖：

```bash
npm install
```

启动开发模式：

```bash
npm run dev
```

构建生产版本：

```bash
npm run build
```

预览构建结果：

```bash
npm run preview
```

## 打包安装包

Modraw 使用 `electron-builder` 打包桌面安装包，打包产物会输出到 `release/` 目录。

生成未压缩应用目录，用于本地检查：

```bash
npm run pack
```

为当前平台构建默认安装包：

```bash
npm run dist
```

构建 Windows NSIS 安装包：

```bash
npm run dist:win
```

Windows 安装包输出位置：

```text
release/Modraw-1.0.0-Setup-x64.exe
```

打包说明：

- 应用图标使用 `build/icon.ico`。
- `npm run dist:win` 会先执行 `electron-vite build`，再生成安装包。
- 当前版本未配置代码签名，Windows 可能会显示未知发布者提示。
- `package.json` 中已关闭 Windows 可执行文件签名和资源编辑，以避免未签名打包时的本地符号链接权限问题。
- 安装包允许用户选择安装目录，并会创建桌面和开始菜单快捷方式。

## 使用说明

- 使用顶部居中的浮层工作栏选择绘图工具。
- 使用工作栏最前面的锁按钮控制绘制后是否保持当前工具。
- 使用左上角 Modraw 菜单进行新建、打开、保存、重置、导出、切换语言或切换画布背景。
- 选中元素后会显示对应的属性调整面板。
- 右键点击箭头或线条可添加编辑点。
- 绘制画框框住元素后，内部元素会绑定到画框；移动画框时会一起移动。
- 使用左下角浮层控件进行缩放、撤销和重做。

## 快捷键

| 快捷键 | 操作 |
| --- | --- |
| `1` | 选择 |
| `2` | 矩形 |
| `3` | 菱形 |
| `4` | 圆形 |
| `5` | 箭头 |
| `6` | 线条 |
| `7` | 自由绘制 |
| `8` | 文本 |
| `9` | 图片 |
| `F` | 画框 |
| `X` | 橡皮擦 |
| `H` | 抓手 |
| `Space` | 临时抓手工具 |
| `Delete` / `Backspace` | 删除选中元素 |
| `Esc` | 取消选择 |
| `Ctrl/Cmd + Z` | 撤销 |
| `Ctrl/Cmd + Shift + Z` | 重做 |
| `Ctrl/Cmd + N` | 新建画布 |
| `Ctrl/Cmd + =` | 放大 |
| `Ctrl/Cmd + -` | 缩小 |
| `Ctrl/Cmd + 0` | 重置缩放 |

## 项目结构

```text
src/
  main/       Electron 主进程
  preload/    Electron 预加载桥接层
  renderer/   React 渲染进程应用

build/
  icon.ico    Windows 应用图标
  icon.png    运行时窗口图标
  icon.svg    图标源文件

assets/
  icon-concepts/  图标候选稿
```

重要渲染层目录：

- `components/`：画布、浮层工作栏、菜单、控件和属性面板
- `core/`：渲染、命中检测、导出、持久化和 `.mdr` 文件工具
- `stores/`：Zustand 应用状态和场景状态
- `types/`：共享 TypeScript 类型
- `i18n.ts`：英文和简体中文翻译字典

## 技术栈

- Electron
- React
- Vite / electron-vite
- TypeScript
- Zustand
- Rough.js
- Tailwind CSS
- electron-builder

## 文件格式

Modraw 使用 `.mdr` 文件保存画布。该文件以 JSON 格式存储场景数据，之后可以重新打开并继续编辑。

## 版本状态

本文档描述当前第一个版本的桌面应用。当前版本支持本地绘图流程、`.mdr` 保存和打开、图片导入、导出、画框编组、中英文界面、自定义应用图标和 Windows 安装包打包。协作、云同步、代码签名和高级文档管理暂未包含。
