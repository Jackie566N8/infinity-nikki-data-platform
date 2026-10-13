# 纪念山地截图替换 · 2026-10-13

用户提供的游戏截图替代原主背景SVG占位；保留九份SVG作为图片失败时的回退。

## 文件与来源

- 原件：`data/assets/region-banners/memorial-mountains-original.jpg`，1179×649，按原字节保留。
- 展示版：`src/assets/region-banners/memorial-mountains.png`，1983×793，约2.5:1宽幅；使用内置imagegen裁剪、清理压缩痕迹和适度细节修复。
- 网站使用 `object-position: 50% 0%` 优先保留雕像上部和雪山顶部，标题遮罩由网页CSS绘制。
- 来源显示“用户提供截图 · 画质修复”，不将其计为已找到官网宣传图；8份官网素材、1份用户截图修复版、0份主背景占位。
- AI修复图仅作装饰，不作为像素精确的地理/路线证据；原件、处理方式、日期和前后哈希保留在 `data/input/region-banners.json`。

素材保存至项目目录，网站不依赖桌面或生成工具默认目录。游戏内容保留原有权利，不随代码MIT许可重新授权。

## 内置工具使用的完整提示词

```text
Edit target: the supplied exact Infinity Nikki Memorial Mountains screenshot. Prepare a faithful, high-quality panoramic website region banner. Conservatively clean JPEG compression, mildly improve fine stone and plant detail and clarity, and upscale. Crop ONLY some of the lowest foreground water/stone, making a wide horizontal composition approximately 2.5:1 (around 2000 x 800). Preserve the entire snowy mountain peak near the upper right, the statue slightly left of center, the stone arch colonnade, central pink flower terraces, steps, trees and sky exactly as photographed. Preserve original architecture count, statue silhouette, landscape geometry, camera perspective, natural game colors and sunlight. Do not redesign, reconstruct a different place, add, remove or relocate scene objects, invent scenery outside the input bounds, exaggerate sharpening, saturate heavily, apply artistic style, add text, logos or watermark. This is quality restoration and crop of a user-provided game screenshot, NOT generation of new scenery. Keep usable darkenable lower-left area for webpage title overlay (do not draw overlay or title into the image). Save the edited image as a project asset; preservation of scene identity is the highest priority.
```

使用内置imagegen模式，未使用CLI或另行配置API密钥。
