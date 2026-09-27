# SpritePixel 动作生成与 Sprite Sheet MVP 开发文档 V1.0

## 1. 产品目标

SpritePixel 的动作系统采用：

**角色图 → MiniMax 生成动作视频 → 视频抽帧 → 去背景 → 自动筛帧 → 统一裁剪/对齐 → Sprite Sheet + Atlas JSON**

MVP 目标：

- 用户不需要理解 Prompt。
- 标准动作尽量只需要点选。
- 所有标准 2D 动作统一输出 **朝右（east / right-facing）**。
- 不根据上传角色图判断朝向。
- 视频是主生成资产，Sprite Sheet 是可重复从视频生成的派生资产。
- 默认保留较完整的 Master Frames，再自动推荐适合播放/展示的 Optimized Frames。

---

# 2. 朝向规则

## 2.1 MVP 不做图片朝向识别

无论用户上传的是：

- 正面
- 3/4 视角
- 朝左
- 朝右

标准 2D 动作统一要求视频模型生成：

**side-scroller animation, facing right (east)**

Prompt 固定加入：

```text
Convert the character into a clear side-scroller game-animation view facing right (east).
Keep the character facing right for the entire clip.
Do not turn toward the camera or change facing direction.
```

原因：

1. 不需要额外做图像朝向分类。
2. 所有动作拥有统一方向，Sprite Sheet 更容易管理。
3. 后续需要朝左时，可以直接水平镜像右向 Sprite Sheet。
4. Walk / Run / Attack / Dash 等动作 Prompt 更稳定。

## 2.2 左方向

MVP 不重新调用 AI。

```text
right-facing sprite sheet
        ↓ horizontal flip
left-facing sprite sheet
```

注意：对于左右不对称的武器、盾牌、文字纹理等，镜像会改变左右手语义。后续高级模式可支持独立生成左方向。

## 2.3 后续版本

后续再增加：

- left
- up
- down
- 4-direction
- 8-direction / isometric

MVP Hero 不显示 Direction 参数。

---

# 3. MVP 动作范围

## 3.1 Core Movement

- Idle
- Walk
- Run
- Jump
- Dash

## 3.2 Combat & Skill

- Attack
- Shoot
- Cast
- Hurt
- Death

## 3.3 Interaction

- Pickup
- Wave

---

# 4. 动作编辑规则

## 4.1 无编辑项

直接生成：

- Idle
- Walk
- Run
- Pickup
- Wave

## 4.2 Jump

```text
Jump Type
- In-place（默认）
- Forward
```

## 4.3 Dash

```text
Dash Type
- Forward（默认）
- Backward
- Side

Motion Detail（可选，一句话）
```

例如：

```text
披风剧烈向后摆动，结束时快速停住
```

## 4.4 Attack

```text
Weapon
- Keep Current（默认）
- Unarmed
- Sword
- Axe
- Staff
- Bow
- Dagger
- Spear

Attack Style
- Auto（默认）
- Slash
- Thrust
- Heavy
- Spin

Motion Detail（可选）
```

## 4.5 Shoot

```text
Shoot Type
- Bow
- Gun
- Magic Bolt

Motion Detail（可选）
```

## 4.6 Cast

```text
Cast Type
- Quick Cast
- Charge Cast
- Staff Cast
- Hand Cast

Motion Detail（可选）
```

## 4.7 Hurt

```text
Severity
- Light
- Heavy
```

## 4.8 Death

```text
Death Type
- Collapse
- Fall Back
- Fall Forward
```

---

# 5. 视频生成统一 Prompt

所有标准动作共享以下基础模板。

```text
Animate the provided character as one clean 2D side-scroller game animation clip.
Use the reference image only as the character identity and starting design.

Convert the character into a clear side-scroller view facing right (east).
Keep the character facing right for the entire clip.
Do not turn toward the camera or change facing direction.

Selected action: {ACTION}

User motion notes:
{USER_NOTES}

Motion contract:
{MOTION_CONTRACT}

Motion phases:
{MOTION_PHASES}

Video requirements:
- preserve the exact character identity, hairstyle, clothing, colors, proportions, silhouette, weapon, and art style
- keep the complete body visible throughout the clip
- keep the camera fixed
- keep character scale consistent
- keep the action readable for game animation and sprite extraction
- preserve a stable ground reference for grounded actions
- animate natural secondary motion in hair, clothing, capes, tails, straps, and carried items
- use a plain high-contrast background with no scenery
- no extra characters or unrelated objects
- no cuts, camera movement, zoom, shake, text, labels, borders, or watermark
- perform only the requested action
{ENDING_RULE}
```

说明：

- 不在 Prompt 里要求“第 1 帧、第 2 帧……”，因为视频模型首先需要生成自然连续视频。
- 使用动作阶段（Motion Phases），而不是把最终 Sprite 帧数绑死到视频 Prompt。
- Sprite 帧数由后处理阶段决定。

---

# 6. 各动作 Prompt 配置

## 6.1 Idle

### Motion Contract

```text
action: seamless in-place idle loop
motion: stand naturally in place with subtle breathing, tiny weight shifts, and gentle body sway
intensity: subtle and controlled
restrictions: no walking, running, jumping, attacking, or large gestures
```

### Motion Phases

```text
neutral stance
→ subtle inhale and torso lift
→ small weight shift
→ return toward center
→ subtle exhale
→ opposite weight shift
→ settle naturally
→ connect smoothly back to the beginning
```

### Ending Rule

```text
- end in a pose and motion state that connects seamlessly back to the beginning
```

---

## 6.2 Walk

### Motion Contract

```text
action: seamless in-place walk cycle
motion: walk at one relaxed steady speed with clear alternating left/right support phases
body: torso mostly upright with a small natural vertical bounce
arms: swing naturally opposite to the legs
restrictions: do not accelerate, stop, run, jump, or return to idle
```

### Motion Phases

```text
left-foot contact
→ left support and compression
→ opposite leg passing
→ next contact
→ right-foot contact
→ right support and compression
→ opposite leg passing
→ connect smoothly into the next cycle
```

### Ending Rule

```text
- end in a motion state that connects seamlessly back to the beginning
```

---

## 6.3 Run

### Motion Contract

```text
action: seamless in-place run cycle
motion: run at one steady speed with a slight forward lean, strong alternating strides, and clear airborne phases
arms: swing strongly opposite to the legs with bent elbows
restrictions: do not accelerate, decelerate, stop, walk, or return to idle
```

### Motion Phases

```text
left-foot contact
→ left compression
→ passing phase
→ airborne phase
→ right-foot contact
→ right compression
→ passing phase
→ airborne phase and connect into the next cycle
```

### Ending Rule

```text
- end in a motion state that connects seamlessly back to the beginning
```

---

## 6.4 Jump

### Motion Contract

```text
action: exactly one complete {JUMP_TYPE} jump
motion: clear anticipation, takeoff, ascent, apex, descent, landing, and recovery
restrictions: do not turn, attack, run, or perform multiple jumps
```

`JUMP_TYPE`:

- `in-place vertical`
- `forward`

### Motion Phases

```text
ready stance
→ crouch and anticipation
→ explosive takeoff
→ ascent
→ clear apex
→ descent
→ landing compression
→ stable recovery
```

### Ending Rule

```text
- finish in a stable ready pose after landing
```

---

## 6.5 Dash

### Motion Contract

```text
action: exactly one {DASH_TYPE} dash burst
motion: sharp anticipation, explosive acceleration, brief peak-speed pose, rapid deceleration, and controlled recovery
body: strong directional lean with a compact readable silhouette
restrictions: do not turn this into a running cycle or multiple dashes
```

`DASH_TYPE`:

- `forward`
- `backward`
- `sideways`

### Motion Phases

```text
ready stance
→ sharp anticipation and body compression
→ explosive launch
→ maximum-speed dash pose
→ short continuation with strong secondary motion
→ begin deceleration
→ controlled stop
→ stable recovery
```

### Ending Rule

```text
- finish in a stable recovery pose
```

---

## 6.6 Attack

### Motion Contract

```text
action: exactly ONE attack
weapon: {WEAPON_RULE}
attack style: {ATTACK_STYLE}
motion: clear ready stance, strong anticipation, one decisive strike, readable impact pose, follow-through, and recovery
restrictions: do not perform a combo or multiple attacks
```

`WEAPON_RULE`：

```text
Keep Current:
use only the weapon already carried by the character; if no weapon exists, attack unarmed

Unarmed:
fight bare-handed and do not add a weapon

Sword / Axe / Staff / Bow / Dagger / Spear:
use the selected weapon consistently from the beginning of the clip
```

`ATTACK_STYLE`：

- Auto
- Slash
- Thrust
- Heavy
- Spin

### Motion Phases

```text
ready combat stance
→ anticipation
→ deeper wind-up
→ launch strike
→ peak impact pose
→ follow-through
→ settle after impact
→ recover to a stable ready stance
```

### Ending Rule

```text
- finish in a stable combat-ready recovery pose
```

---

## 6.7 Shoot

### Motion Contract

```text
action: exactly ONE ranged attack
shoot type: {SHOOT_TYPE}
motion: prepare, aim, fire or release once, follow through, then recover
restrictions: do not fire repeatedly and do not change facing direction
```

### Motion Phases

```text
ready stance
→ raise weapon or casting hand
→ aim / draw / charge
→ fire or release once
→ peak firing pose
→ follow-through
→ settle
→ recovery
```

### Ending Rule

```text
- finish in a stable ready pose
```

---

## 6.8 Cast

### Motion Contract

```text
action: exactly ONE spell-casting action
cast type: {CAST_TYPE}
motion: preparation, energy gathering, readable release, follow-through, and recovery
restrictions: do not perform repeated casts
```

### Motion Phases

```text
ready stance
→ begin gathering energy
→ stronger charge or preparation
→ cast release
→ peak casting pose
→ follow-through
→ energy settles
→ recovery
```

### Ending Rule

```text
- finish in a stable ready pose
```

---

## 6.9 Hurt

### Motion Contract

```text
action: exactly ONE {SEVERITY} hurt reaction
motion: sudden readable impact response, recoil, brief pain pose, and partial recovery
restrictions: do not fall into a death animation
```

### Motion Phases

```text
ready pose
→ impact
→ peak recoil
→ hurt pose
→ brief hold
→ begin recovery
→ settle
```

### Ending Rule

```text
- finish in a hurt-settle or partial ready pose
```

---

## 6.10 Death

### Motion Contract

```text
action: exactly ONE death animation
death type: {DEATH_TYPE}
motion: destabilization, loss of control, fall, impact, and final rest
restrictions: do not recover or stand back up
```

### Motion Phases

```text
ready stance
→ destabilize
→ lose balance
→ fall begins
→ full falling motion
→ ground impact
→ settle
→ final motionless pose
```

### Ending Rule

```text
- finish motionless in the final death pose and do not recover
```

---

## 6.11 Pickup

### Motion Contract

```text
action: exactly ONE ground pickup interaction
motion: notice the object area, bend down, reach, grasp, lift, stand back up, and settle
restrictions: do not walk away or perform another action
```

### Motion Phases

```text
ready stance
→ reach downward
→ bend
→ lowest pickup pose
→ grasp and lift
→ stand up
→ settle
→ ready pose
```

### Ending Rule

```text
- finish in a stable ready pose
```

---

## 6.12 Wave

### Motion Contract

```text
action: one friendly wave gesture
motion: raise one hand, perform a clear relaxed wave, then lower the arm naturally
restrictions: do not walk or turn away
```

### Motion Phases

```text
ready stance
→ raise hand
→ wave outward
→ wave inward
→ repeat small wave
→ begin lowering hand
→ settle
→ ready pose
```

### Ending Rule

```text
- finish in a stable ready pose
```

---

# 7. Video → Sprite Sheet 生成流程

## 7.1 核心原则

不要让“用户选择 8 帧”直接控制视频。

视频生成与 Sprite 帧数解耦：

```text
AI Video
   ↓
Master Frames
   ↓
Optimized Frames
   ↓
Sprite Sheet
```

---

# 8. Master Frames

## 8.1 默认数量

MVP：

```text
2 秒视频 → 25 Master Frames
```

如果后续支持更长视频：

```text
< 4 秒 → 25
>= 4 秒 → 64
```

建议不要在 Hero 让用户设置 Master Frame Count。

## 8.2 均匀抽帧

2 秒视频、25 帧：

```text
t[i] = i * duration / 25
i = 0...24
```

Loop 动作不抽取 `duration` 本身，防止最后一帧与第一帧完全重复。

One-shot 动作可保留实际视频最后状态。

## 8.3 FFmpeg

示意：

```text
video
→ decode
→ sample timestamps
→ 25 RGBA/PNG master frames
```

Master Frames 永久与 source video 关联。

以后重新生成不同尺寸/帧数的 Sprite Sheet 时：

**不重新调用视频模型。**

---

# 9. 背景移除

处理顺序：

```text
Master Frame
→ background removal
→ RGBA PNG
```

优先要求视频 Prompt：

```text
plain high-contrast background
no scenery
no shadow
```

降低去背景难度。

每个 Master Frame 都保存透明版本。

---

# 10. 固定裁剪窗口：禁止逐帧单独居中

这是 Sprite Sheet 最重要的规则之一。

错误：

```text
frame 1 → 自动居中
frame 2 → 自动居中
frame 3 → 自动居中
```

这样会破坏：

- Jump 高度
- Hurt 后仰
- Attack 身体位移
- Dash 动势

正确：

### Step 1

计算所有 Master Frames 的 alpha bounding box。

### Step 2

求所有 frame bounding box 的 Union Box：

```text
globalBBox = union(frameBBox[0...N])
```

### Step 3

增加统一 padding：

```text
padding = 8% ~ 12%
```

### Step 4

将 globalBBox 扩展为一个统一的 square crop window。

### Step 5

所有帧使用**完全相同的 crop window**。

这样：

- 相机固定
- 人物运动关系保留
- Jump 的上下位移不会被抹掉
- Attack 武器弧线不会被裁掉

---

# 11. 自动选择 Optimized Frames

## 11.1 为什么不固定 8 帧

视频动作的复杂程度不同。

例如：

- Idle：变化少
- Attack：anticipation / impact / recovery 信息很多
- Death：完整动作跨度较大

因此不固定输出 8 帧。

MVP 默认：

```text
Master Frames = 25
Optimized Frames = 自动 12 ~ 20
```

用户需要时仍然可以导出全部 25 帧。

---

## 11.2 Frame Difference

对相邻透明帧计算：

```text
visualDiff =
  weighted(
    alpha-aware pixel difference,
    silhouette difference,
    perceptual similarity
  )
```

建议实现：

```text
1 - SSIM
+
alpha mask IoU difference
```

不需要在 MVP 引入人体姿态模型。

---

## 11.3 删除近重复帧

如果：

```text
SSIM(frameA, frameB) > duplicateThreshold
```

并且：

```text
alpha IoU > maskThreshold
```

则认为动作变化过小，可以删除其中一帧。

但：

- One-shot 必须保留第一帧和最后一帧
- Attack 必须尽量保留 peak impact
- Jump 必须保留 apex
- Death 必须保留 final rest
- Loop 必须保持完整循环节奏

---

## 11.4 不是简单选“变化最大的帧”

仅保留变化最大帧会导致动作不流畅。

正确方式：

### 计算累计 Motion Distance

```text
D0 = 0
D1 = diff(F0,F1)
D2 = D1 + diff(F1,F2)
...
```

然后沿累计动作距离均匀采样。

例如目标 16 帧：

```text
totalMotion / 15
```

每达到一个 motion interval，就选择最近的 Master Frame。

优点：

- 快动作会获得更多关键帧
- 慢动作不会堆积大量重复帧
- 保持整个动作顺序与节奏

---

# 12. 自动推荐帧数

建议配置：

| Action | 推荐范围 |
|---|---:|
| Idle | 12–16 |
| Walk | 14–18 |
| Run | 14–18 |
| Jump | 14–18 |
| Dash | 12–16 |
| Attack | 14–20 |
| Shoot | 12–16 |
| Cast | 14–20 |
| Hurt | 10–14 |
| Death | 14–20 |
| Pickup | 12–16 |
| Wave | 12–16 |

算法最终结果仍受：

- 去重数量
- visual motion score
- Master Frame Count

影响。

MVP 最小建议：

```text
min = 10
max = 20
```

如果优化后少于 10 帧，则使用均匀采样补足。

---

# 13. Loop 动作处理

Loop：

- Idle
- Walk
- Run

规则：

1. 视频 Prompt 明确要求 seamless cycle。
2. 抽帧时不采样视频终点。
3. 检查最后候选帧与第一帧相似度。
4. 如果过于相似，删除最后候选帧。
5. Atlas：

```json
{
  "loop": true,
  "loopStart": 0,
  "loopEnd": 15
}
```

不要在 Sprite Sheet 中重复一张完全相同的首帧作为末帧。

---

# 14. One-shot 动作处理

包括：

- Jump
- Dash
- Attack
- Shoot
- Cast
- Hurt
- Death
- Pickup
- Wave

默认：

```json
{
  "loop": false
}
```

必须保留：

- 明确起始状态
- 动作 peak
- 明确结束状态

---

# 15. Frame Size

Hero 提供：

```text
64 × 64
128 × 128
256 × 256
```

这是：

**最终单帧尺寸**

不是 AI 视频尺寸。

建议默认：

```text
128 × 128
```

处理：

```text
fixed global crop
→ resize
→ transparent RGBA frame
```

Pixel Art：

```text
Nearest Neighbor
```

非 Pixel Art：

```text
Lanczos / high-quality resize
```

---

# 16. Sprite Sheet Grid

根据最终 frameCount 自动计算。

```text
columns = ceil(sqrt(frameCount))
rows = ceil(frameCount / columns)
```

例：

```text
16 → 4 × 4
20 → 5 × 4
25 → 5 × 5
```

Sprite Sheet：

```text
sheetWidth = columns * frameSize
sheetHeight = rows * frameSize
```

背景：

```text
transparent RGBA
```

顺序：

```text
left → right
top → bottom
```

---

# 17. 输出结构

推荐 ZIP：

```text
run/
├── spritesheet.png
├── atlas.json
└── frames/
    ├── 01.png
    ├── 02.png
    ├── ...
    └── 16.png
```

保留 Source：

```text
source-video.mp4
master-frames/
```

Source Video 和 Master Frames 不一定给用户下载，但后台必须保留。

---

# 18. Atlas JSON

建议：

```json
{
  "animation": "run",
  "direction": "right",
  "frameWidth": 128,
  "frameHeight": 128,
  "frameCount": 16,
  "columns": 4,
  "rows": 4,
  "loop": true,
  "fps": 12,
  "frames": [
    {
      "index": 0,
      "x": 0,
      "y": 0,
      "w": 128,
      "h": 128,
      "durationMs": 83,
      "sourceFrameIndex": 0
    }
  ]
}
```

必须保存：

```text
sourceFrameIndex
```

方便：

- 重新选帧
- 编辑动画
- 调整 smoothness
- 不重新生成视频

---

# 19. Sprite Sheet Regenerate

从已有视频重新生成 Sprite Sheet：

```text
Source Video
   ↓
已有 Master Frames（优先复用）
   ↓
重新选择：
- Frame Size
- Frame Count / Smoothness
- Background Removal
- Sharpen
   ↓
新的 Sprite Sheet
```

**不再次调用 MiniMax，不再次消耗视频生成积分。**

MVP 可提供：

```text
Regenerate Sprite Sheet
```

选项：

```text
Frame Size
- 64
- 128
- 256

Frames
- Auto
- 16
- 25
- All

Sharpen
- None
- Light
- Sharp
```

---

# 20. 数据建议

Animation Version 至少记录：

```text
source_video_file_id
master_frame_count
selected_frame_indexes
frame_count
frame_width
frame_height
fps
loop
columns
background_removal
sharpen
```

`animation_frame`：

```text
version_id
file_id
frame_index
source_frame_index
duration_ms
offset_x
offset_y
```

---

# 21. Hero 区域最终交互

## Tab 1 — Generate Character

```text
Style
Perspective
Character Type

Prompt

Reference Image（可选）

[ Generate Character ]
```

---

## Tab 2 — Generate Motion

不要 Direction。

不要让用户默认填写 Prompt。

### 主区域

```text
Action
[ Idle ] [ Walk ] [ Run ] [ Jump ] [ Dash ] [ Attack ] ...

Frame Size
[ 128 × 128 ]

Character Image
[ Upload ]
```

说明：

```text
Frame count is optimized automatically from the generated animation.
```

---

## 动态编辑

### Jump

```text
Jump Type
[ In-place ] [ Forward ]
```

### Dash

```text
Dash Type
[ Forward ] [ Backward ] [ Side ]

+ Add motion detail
```

### Attack

```text
Weapon
[ Keep Current ] [ Unarmed ] [ Sword ] [ Axe ] ...

Attack Style
[ Auto ] [ Slash ] [ Thrust ] [ Heavy ] [ Spin ]

+ Add motion detail
```

其他动作按第 4 节处理。

---

# 22. Hero 默认体验

最短路径：

```text
用户上传角色
→ 点击 Run
→ 选择 128×128
→ Generate
```

然后系统自动完成：

```text
MiniMax right-facing run video
→ 25 Master Frames
→ Remove Background
→ Global Crop
→ Auto Frame Selection
→ 14~18 optimized frames
→ Sprite Sheet
→ Preview
```

用户不需要选择：

- Direction
- 视频长度
- AI 视频分辨率
- Master Frame Count
- Grid Columns

---

# 23. MVP 默认参数

```ts
const DEFAULTS = {
  direction: "right",
  frameSize: 128,

  video: {
    shortClipMasterFrames: 25,
    longClipMasterFrames: 64,
    longClipThresholdSec: 4,
  },

  optimizedFrames: {
    min: 10,
    max: 20,
  },

  spriteSheet: {
    paddingRatio: 0.10,
    transparent: true,
  },

  preview: {
    fps: 12,
  },
};
```

---

# 24. Codex 实现优先级

## P0

1. MiniMax reference-image → video
2. 标准 Action Prompt Builder
3. 统一 right-facing
4. FFmpeg 抽取 25 Master Frames
5. 背景移除
6. Global Union Crop
7. Auto Frame Selection
8. Resize
9. Sprite Sheet Grid
10. Atlas JSON
11. Preview

## P1

1. Regenerate Sprite Sheet
2. 手工增删某一帧
3. 修改 FPS
4. Sharpen
5. 左方向镜像导出

## P2

1. 4-direction
2. 8-direction
3. 起始/结束 Pose
4. 完整 Custom Animation Builder

---

# 25. 最终架构

```text
Character Asset
      ↓
Animation Generation
      ↓
MiniMax Video
      ↓
Source Video
      ↓
Master Frames (25/64)
      ↓
RGBA Background Removal
      ↓
Global Fixed Crop
      ↓
Adaptive Frame Selection
      ↓
Optimized Frames (10~20)
      ↓
Resize
      ↓
Sprite Sheet
      +
Atlas JSON
      +
Individual PNG Frames
```

最重要的实现原则：

> **视频是生成源，Sprite Sheet 是可重复生成的派生结果。**

因此调整：

- 帧数
- 单帧尺寸
- 锐化
- 压缩
- 去背景质量

都不应该重新调用 MiniMax。
