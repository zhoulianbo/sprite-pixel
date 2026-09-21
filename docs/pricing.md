## 积分锚点
**2 Credit = 1 次标准 1K 图片生成** 定死，然后所有价格围绕这个单位设计。

先说成本基准：`gpt-image-2` 当前图像输出价格是 **$15 / 100万 image tokens**；1024×1024 的 Medium 质量约消耗 1056 个输出 token，即仅输出成本约 **$0.01584/张**。如果包含文本输入、参考图输入等，我建议内部按 **$0.022 / Credit** 做保守成本预算。High 质量的 1024×1024 约 4160 个输出 token，成本接近 Medium 的 4 倍，所以不能也按 1 Credit 计算。

## 一、订阅计划

我建议保留 `Free / Indie / Pro` 三档，其中真正付费计划是 Indie、Pro 两级。

|                          |   Free |        Indie |           Pro |
| ------------------------ | -----: | -----------: | ------------: |
| 月付                      |     $0 |    **$12/月**（热门） |     **$24/月** |
| 月付积分单价                |     $0 |    **$0.1** |     **$0.092** |
| 年付                      |      — |    **$100/年** |    **$188/年**（性价比） |
| 年付积分单价                |      — |    **$0.069** |    **$0.06** |
| 年付折扣                   |      — |    **省约30%** |     **省约35%** |
| 月付 Credits              | 10 /月 |     **120/月** |     **260/月** |
| 年付 Credits              |      — | **1440 一次到账** | **3120 一次到账** |
| 项目数                    |      1 |           10 |            不限 |
| 资产权限                   | **公开** |       **私有** |        **私有** |
| 商业使用                   |      × |            ✓ |             ✓ |
| 下载                      |      ✓ |            ✓ |             ✓ |
| 每日免费积分                |      × |            ✓ |             ✓ |
| 邮件支持                   |      × |            ✓ |             ✓ |
| 生成优先级                 |     标准 |           标准 |        **优先** |

---

## 二、积分包

积分包一定要比订阅的单位积分价格贵，否则用户会绕过订阅。

| Pack           |         价格 | Credits | 有效期 | 定位          |  积分单价  |
| -------------- | ---------: | ------: | --- | ----------- |  ----------- |
| **Quick Pack** |  **$4.99** |  **40** | 7天  | 首次体验 / 临时项目 | **$0.125** |
| **Power Pack** | **$15.99** | **150** | 1年  | 中等规模一次性项目   | **$0.1066** |
| **Power Pack** | **$29.99** | **320** | 1年  | 中等规模一次性项目   | **$0.093** |

这里有一个关键规则：

> **积分包只增加 Credits，不解锁订阅权益。**

也就是说，购买 `$15.99` Flex Pack 的 Free 用户，资产仍然默认公开。

否则 `$15.99` 买一个有效期一年的积分包，就等于顺便买了一年“私有资产”，会严重削弱 `$12/月` Indie 的价值。

所以 pricing 页建议不要写“付费用户默认私有”，而写成：

> **Subscribers get private assets by default.**

即：

**订阅用户默认私有，免费/积分包用户默认公开。**

---

# 三、Credits 消耗规则

建议直接在 `/pricing` 展示成一张非常简单的表：

| 操作                       | Credits |
| ------------------------ | ------: |
| 标准图片生成         |   **2** |
| 一张动作 Sprite Sheet 生成     |   **3** |
| 批量 Game Icons 生成         |   **3** |
| 单个 Icon 重新生成             |   **2** |
| 去背景 / 自动切图               |  **免费** |
| Resize / Sprite Sheet 拼接 |  **免费** |
| ZIP / PNG / JSON 导出      |  **免费** |

---

# 四、`/pricing` 页面布局

建议按照这个顺序：

### ① Pricing Hero

**H1**

> Simple Pricing for Indie Game Creators

描述：

> Generate game characters, icons, sprites and assets with flexible credits. Subscribe for the best value or buy credits whenever you need them.

价格tab：
`包月` / `包年 · Save up to 35%` / ` 按次付费`
默认选中包年

---

### ② Plans

三张卡：

```text
FREE        INDIE ★ Most Popular       PRO

$0          $12/mo                     $24/mo
10 Credits  120 Credits/mo             260 Credits/mo

            $99/year                   $189/year
            1440 upfront                3120 upfront
```

默认突出 **Indie**。

---

### ③ Credit Packs

标题：

> Need Extra Credits?

描述：

> No subscription required. Buy credits whenever you need extra generations.

三张卡：

`Quick $4.99 / Flex $15.99 / Power $29.99`

---

### ④ Compare Plans

重点比较：

`Credits / Private Assets / Projects / Commercial Use / Export / Batch Generation / Queue Priority`

其中最重要的一行建议视觉突出：

```text
Asset Privacy

Free      Public by default
Indie     Private by default
Pro       Private by default
```

---

### ⑤ How Credits Work

标题：

> One Credit, One Generation

核心文案可以直接写：

> 1 Credit generates one standard 1K image. A batch of up to 9 game icons generated in one sheet still costs only 1 Credit.

下面放刚才那张积分消耗表。

---

### ⑥ Credit & Billing Rules

建议说明：

**Monthly plans**
Credits refresh each billing cycle and unused subscription credits do not roll over.

**Annual plans**
All annual Credits are added immediately and remain valid for the full subscription year.

**Credit packs**
Quick Pack expires after 7 days. Flex and Power Packs expire after 1 year.

**Credit usage order**
Automatically consume Credits that expire soonest.

**Cancellation**
Subscriptions can be canceled anytime. Current benefits remain active until the end of the paid billing period.

**Privacy**
Assets created under an active Indie or Pro subscription are private by default. Free and credit-pack-only accounts create public assets by default.