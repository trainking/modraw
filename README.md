# Modraw

Modraw is a desktop hand-drawn style whiteboard app inspired by Excalidraw. It is built with Electron, React, Vite, Zustand, and Rough.js.

Modraw 是一个受 Excalidraw 启发的桌面端手绘风格白板应用，基于 Electron、React、Vite、Zustand 和 Rough.js 构建。

## Features / 功能

- Hand-drawn style canvas rendering / 手绘风格画布渲染
- Rectangle, diamond, ellipse, arrow, line, free draw, text, image, eraser, select, and hand tools / 支持矩形、菱形、圆形、箭头、线条、自由绘制、文本、图片、橡皮擦、选择和抓手工具
- Tool lock mode: keep the selected drawing tool after creating an element / 工具锁定模式：绘制后保持当前工具
- Live move, resize, rotate, and point editing interactions / 支持移动、缩放、旋转和编辑点的即时交互
- Property panels for shapes, arrows, lines, free draw, and text / 支持图形、箭头、线条、自由绘制和文本的属性调整浮层
- Arrow and line editable points, with right-click point insertion / 箭头和线条支持编辑点，并可通过右键添加编辑点
- Image import from local files / 支持从本地导入图片
- Save and open `.mdr` canvas files / 支持保存和打开 `.mdr` 画布文件
- Export to PNG and SVG / 支持导出 PNG 和 SVG
- Reset canvas with confirmation / 支持确认后重置画布
- English and Simplified Chinese UI switching / 支持英文和简体中文界面切换

## Getting Started / 快速开始

Install dependencies / 安装依赖：

```bash
npm install
```

Run in development mode / 启动开发模式：

```bash
npm run dev
```

Build production output / 构建生产版本：

```bash
npm run build
```

Preview the built app / 预览构建结果：

```bash
npm run preview
```

## Usage / 使用说明

- Use the top toolbar to select drawing tools. / 使用顶部工具栏选择绘图工具。
- Use the lock button at the beginning of the toolbar to decide whether the current tool should remain active after drawing. / 使用工具栏最前面的锁按钮控制绘制后是否保持当前工具。
- Select an element to show its property panel. / 选中元素后会显示对应的属性调整面板。
- Right-click arrows or lines to add an editable point. / 右键点击箭头或线条可添加编辑点。
- Use the Modraw menu to create, open, save, reset, export, or return to the home screen. / 使用 Modraw 菜单进行新建、打开、保存、重置、导出或返回首页。
- Use the language selector in the top bar to switch between English and Simplified Chinese. / 使用顶部栏的语言选择器在英文和简体中文之间切换。

## Keyboard Shortcuts / 快捷键

| Shortcut / 快捷键 | Action / 操作 |
| --- | --- |
| `V` | Select / 选择 |
| `R` | Rectangle / 矩形 |
| `D` | Diamond / 菱形 |
| `E` | Ellipse / 圆形 |
| `A` | Arrow / 箭头 |
| `L` | Line / 线条 |
| `P` | Free draw / 自由绘制 |
| `T` | Text / 文本 |
| `I` | Image / 图片 |
| `X` | Eraser / 橡皮擦 |
| `H` | Hand / 抓手 |
| `Space` | Temporary hand tool / 临时抓手工具 |
| `Delete` / `Backspace` | Delete selected elements / 删除选中元素 |
| `Esc` | Clear selection / 取消选择 |
| `Ctrl/Cmd + Z` | Undo / 撤销 |
| `Ctrl/Cmd + Shift + Z` | Redo / 重做 |
| `Ctrl/Cmd + N` | New canvas / 新建画布 |
| `Ctrl/Cmd + =` | Zoom in / 放大 |
| `Ctrl/Cmd + -` | Zoom out / 缩小 |
| `Ctrl/Cmd + 0` | Reset zoom / 重置缩放 |

## Project Structure / 项目结构

```text
src/
  main/       Electron main process / Electron 主进程
  preload/    Electron preload bridge / Electron 预加载桥接层
  renderer/   React renderer app / React 渲染进程应用
```

Important renderer folders / 重要渲染层目录：

- `components/`: UI components such as canvas, top bar, footer, and property panels / 画布、顶部栏、底部栏和属性面板等 UI 组件
- `core/`: rendering, hit testing, export, persistence, and `.mdr` file helpers / 渲染、命中检测、导出、持久化和 `.mdr` 文件工具
- `stores/`: Zustand app and scene state / Zustand 应用状态和场景状态
- `types/`: shared TypeScript types / 共享 TypeScript 类型
- `i18n.ts`: English and Simplified Chinese translation dictionary / 英文和简体中文翻译字典

## Tech Stack / 技术栈

- Electron
- React
- Vite / electron-vite
- TypeScript
- Zustand
- Rough.js
- Tailwind CSS

## File Format / 文件格式

Modraw saves canvases as `.mdr` files. The file stores the current scene data in JSON format so it can be reopened later for continued editing.

Modraw 使用 `.mdr` 文件保存画布。该文件以 JSON 格式存储当前场景数据，之后可以重新打开并继续编辑。

## Version Status / 版本状态

This README describes the first development version. The app is usable for local desktop drawing workflows, but packaging, collaboration, cloud sync, and advanced document management are not included yet.

本文档描述第一个开发版本。当前版本可用于本地桌面绘图流程，但暂未包含安装包打包、协作、云同步和高级文档管理等能力。
