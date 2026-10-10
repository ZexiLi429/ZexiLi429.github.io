# 工作室墙面展区

## 蓝色地图卷轴版本

详情已改为蓝色卷轴：上下卷轴、网格地图、罗盘、可切换的三个路线节点。`src/components/exhibit-map.tsx` 负责当前界面。技术摘要依据 LangGraph、vLLM、LeRobot 官方文档整理，清楚标注为技术导览；个人项目按钮全部指向 `https://github.com/ZexiLi429`，官方资料仅位于“技术参考与来源”内。

墙面 hover／focus 提示已从 DOM 整框改为场景内半透明细线，启用深度遮挡，不会覆盖人物与家具。展板纹理为 1536×1920，标题加粗、增加对比度并启用各向异性采样；章节阅读停稳时关闭背景景深模糊。

展开界面不再额外移动镜头，身体截断面统一放在桌下 0.73。`scripts/atlas-check.cjs` 验证节点交互、三类 GitHub 去向、资料来源以及展开／关闭前后镜头一致；gallery 与 chair-side 检查也通过。

参考资料（2026-10-09）：

- https://docs.langchain.com/oss/python/langgraph/overview
- https://docs.vllm.ai/en/latest/
- https://huggingface.co/docs/lerobot/index

以下为首版实现记录，卷轴样式及技术摘要以上述版本为准。

三个入口：AI 智能体、AI Infra、具身智能。分类与暂定展示结构统一维护在 `src/lib/exhibits.ts`。主题安排是展区规划，不是已完成项目或个人成果。

墙面展板使用随镜头投影定位的原生按钮，鼠标／触屏点击通过 Three.js 射线确认命中真实展板，避免透过人物及家具打开展区。键盘可直接激活按钮。阅读卡片在按钮之上；移动端和 3D 加载失败时仍可使用项目区的三个入口。

详情使用全屏原生 dialog，保留焦点约束及 Esc 操作。三个展区各有摘要、图形、暂定主题和待补充资料区域，保留原 GitHub 地址。URL 参数 `exhibit` 支持直接打开与分享，无需服务器路由配置；原章节 hash 和滚动位置保留。首次打开 pushState，展区切换 replaceState，返回工作室或浏览器返回关闭界面。

`scripts/gallery-check.cjs` 实际验证墙面鼠标点击、全部分类入口、键盘激活／退出、焦点恢复、滚动恢复、浏览器返回／前进、手机减少动画直达链接与无横向溢出。截图和结果记录在 `preview-artifacts/`。

本次修改前副本位于 `backup-original-before-gallery-*`。仅本地实现与预览，没有部署或推送。
