# 云生小楼微信小程序云数据库设计

本文档面向微信云开发。这里的“表”指云数据库集合；字段为 JSON 文档结构，不使用关系型 SQL。

## 1. 集合概览

| 集合 | 用途 | 主要读写方 |
| --- | --- | --- |
| `hotel_profile` | 民宿基础资料 | 小程序前端、后台 |
| `rooms` | 房型基础信息 | 小程序前端、后台 |
| `room_calendar` | 按日期维护房态、库存和价格 | 云函数、后台 |
| `orders` | 订单主数据 | 云函数、住客、后台 |
| `refund_records` | 经营者人工退款处理记录 | 后台 |
| `admin_users` | 经营者白名单 | 云函数 |

## 2. 集合设计

### 2.1 `hotel_profile`

民宿基础资料。首版只需要 1 条记录。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `_id` | string | 是 | 固定为 `yunsheng` |
| `name` | string | 是 | 云生小楼民宿 |
| `address` | string | 是 | 浙江平阳跳头村358号 |
| `city` | string | 是 | 浙江平阳 |
| `opened` | string | 是 | 开业年份 |
| `roomCount` | number | 是 | 客房数 |
| `rating` | string | 否 | 携程评分 |
| `reviewCount` | number | 否 | 携程点评数 |
| `level` | string | 否 | 民宿定位 |
| `phone` | string | 是 | 联系电话，当前测试数据用占位号 |
| `ctripId` | string | 否 | 携程酒店 ID |
| `ctripUrl` | string | 否 | 携程链接 |
| `tags` | string[] | 否 | 民宿标签 |
| `facilities` | string[] | 否 | 设施 |
| `nearby` | string[] | 否 | 周边地标 |
| `traffic` | string[] | 否 | 交通 |
| `outdoorImages` | string[] | 否 | 外观图路径 |
| `createdAt` | Date | 是 | 创建时间 |
| `updatedAt` | Date | 是 | 更新时间 |

### 2.2 `rooms`

房型基础信息。基础价存这里；节假日价和临时价存 `room_calendar`。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `_id` | string | 是 | 房型 ID |
| `name` | string | 是 | 房型名称 |
| `stock` | number | 是 | 默认库存 |
| `area` | string | 是 | 面积 |
| `bed` | string | 是 | 床型 |
| `capacity` | number | 是 | 可住人数 |
| `basePrice` | number | 是 | 基础价，单位元 |
| `originalPrice` | number | 否 | 划线价，单位元 |
| `position` | string | 否 | 页面定位 |
| `tags` | string[] | 否 | 标签 |
| `cancelPolicy` | object | 是 | 取消规则 |
| `intro` | string | 否 | 简介 |
| `facilities` | string[] | 否 | 房间设施 |
| `notice` | string[] | 否 | 入住须知 |
| `images` | string[] | 是 | 图片路径 |
| `isActive` | boolean | 是 | 是否上架 |
| `sort` | number | 是 | 展示排序 |
| `createdAt` | Date | 是 | 创建时间 |
| `updatedAt` | Date | 是 | 更新时间 |

`cancelPolicy` 结构：

```json
{
  "type": "free_before_18" 或 "non_cancelable",
  "text": "入住当天 18:00 前可免费取消"
}
```

### 2.3 `room_calendar`

按房型 + 日期维护当天价格、库存、是否可订。没有记录时，后端默认使用 `rooms.basePrice` 和 `rooms.stock`。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `_id` | string | 是 | 建议格式：`roomId_YYYY-MM-DD` |
| `roomId` | string | 是 | 房型 ID |
| `date` | string | 是 | 日期，`YYYY-MM-DD` |
| `price` | number | 是 | 当日价格 |
| `stock` | number | 是 | 当日总库存 |
| `remainingStock` | number | 是 | 当日剩余库存 |
| `isBookable` | boolean | 是 | 是否可订 |
| `priceType` | string | 是 | `base`、`holiday`、`manual` |
| `note` | string | 否 | 经营者备注 |
| `updatedBy` | string | 否 | 操作人 openid |
| `createdAt` | Date | 是 | 创建时间 |
| `updatedAt` | Date | 是 | 更新时间 |

建议索引：

- `roomId + date` 唯一索引。
- `date` 普通索引。

### 2.4 `orders`

订单主表。金额、房态和库存以后端计算结果为准。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `_id` | string | 是 | 订单 ID，建议 `YS` + 时间戳 |
| `openid` | string | 是 | 下单用户 openid |
| `roomId` | string | 是 | 房型 ID |
| `roomSnapshot` | object | 是 | 下单时房型快照 |
| `checkIn` | string | 是 | 入住日期 |
| `checkOut` | string | 是 | 离店日期 |
| `nights` | number | 是 | 晚数 |
| `guests` | number | 是 | 入住人数 |
| `contactName` | string | 是 | 联系人 |
| `phone` | string | 是 | 手机号 |
| `remark` | string | 否 | 备注 |
| `dailyPrices` | object[] | 是 | 每日价格明细 |
| `amount` | number | 是 | 订单总价 |
| `payAmount` | number | 是 | 实付金额，模拟支付时等于总价 |
| `status` | string | 是 | `pending`、`paid`、`cancelled`、`completed`、`refunded` |
| `paymentStatus` | string | 是 | `待支付`、`已支付`、`未支付`、`已退款` |
| `paymentMode` | string | 是 | `mock` 或 `wechat` |
| `cancelReason` | string | 否 | 取消原因 |
| `refundStatus` | string | 否 | `none`、`requested`、`processed` |
| `createdAt` | Date | 是 | 创建时间 |
| `createdAtMs` | number | 是 | 创建时间戳，用于 30 分钟超时 |
| `paidAt` | Date | 否 | 支付时间 |
| `cancelledAt` | Date | 否 | 取消时间 |
| `updatedAt` | Date | 是 | 更新时间 |

`roomSnapshot` 结构：

```json
{
  "name": "Loft亲子海景套房309",
  "cover": "/images/hotel/room309/db6cdfeef09cba086aa55aa508cf79bd.jpg",
  "bed": "1 张大床 + 1 张榻榻米",
  "capacity": 4,
  "cancelRule": "预订后不可取消"
}
```

`dailyPrices` 结构：

```json
[
  {
    "date": "2026-07-02",
    "price": 622,
    "priceType": "base"
  }
]
```
建议索引：

- `openid + createdAt` 普通索引。
- `status + createdAt` 普通索引。
- `roomId + checkIn` 普通索引。

### 2.5 `refund_records`

退款由经营者人工处理。首版只记录处理结果，不做用户自助退款入口。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `_id` | string | 是 | 退款记录 ID |
| `orderId` | string | 是 | 订单 ID |
| `openid` | string | 是 | 用户 openid |
| `amount` | number | 是 | 退款金额 |
| `status` | string | 是 | `processed`、`rejected` |
| `reason` | string | 否 | 退款原因 |
| `operatorOpenid` | string | 是 | 经营者 openid |
| `operatorName` | string | 否 | 经营者名称 |
| `note` | string | 否 | 处理备注 |
| `createdAt` | Date | 是 | 创建时间 |

### 2.6 `admin_users`

轻量后台白名单。只有这里启用的 openid 可以调用后台接口。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `_id` | string | 是 | openid 或系统生成 ID |
| `openid` | string | 是 | 经营者 openid |
| `name` | string | 是 | 名称 |
| `role` | string | 是 | `owner`、`operator` |
| `enabled` | boolean | 是 | 是否启用 |
| `createdAt` | Date | 是 | 创建时间 |
| `updatedAt` | Date | 是 | 更新时间 |

## 3. 测试数据

以下数据用于云数据库初始化。`createdAt`、`updatedAt` 可在导入后由初始化脚本补为 `new Date()`。

### 3.1 `hotel_profile`

```json
[
  {
    "_id": "yunsheng",
    "name": "云生小楼民宿",
    "address": "浙江平阳跳头村358号",
    "city": "浙江平阳",
    "opened": "2024",
    "roomCount": 9,
    "rating": "4.4",
    "reviewCount": 23,
    "level": "海景精品民宿",
    "phone": "13800000000",
    "ctripId": "119754462",
    "ctripUrl": "https://hotels.ctrip.com/hotels/119754462.html?cityid=7533",
    "tags": ["海景房", "复式 Loft", "亲子套房", "榻榻米", "泳池", "花园"],
    "facilities": ["棋牌室", "花园", "泳池", "公用区 wifi", "电梯", "灭火器", "烟雾报警器"],
    "nearby": ["西湾金沙滩", "横舟岛风景区", "龙潭三瀑"],
    "traffic": ["温州龙湾国际机场", "平阳站", "瑞安站"],
    "outdoorImages": [
      "/images/hotel/outdoor/43bd32ce2660929c96d7af7eedf35495.jpg",
      "/images/hotel/outdoor/53f171408fa7a70b9e4b1e8f5930a1fa.jpg",
      "/images/hotel/outdoor/66be15bf25b968cea8129330bc71ee13.jpg"
    ]
  }
]
```

### 3.2 `rooms`

```json
[
  {
    "_id": "room309",
    "name": "Loft亲子海景套房309",
    "stock": 1,
    "area": "58 平",
    "bed": "1 张大床 + 1 张榻榻米",
    "capacity": 4,
    "basePrice": 622,
    "originalPrice": 759,
    "position": "主推房型",
    "tags": ["Loft", "亲子", "海景"],
    "cancelPolicy": { "type": "non_cancelable", "text": "预订后不可取消" },
    "intro": "复式空间适合亲子或朋友同住，海景与榻榻米区域兼顾休息和活动。",
    "facilities": ["海景窗", "Loft 空间", "独立卫浴", "空调", "wifi"],
    "notice": ["14:00 后入住，12:00 前退房", "入住需携带有效身份证件"],
    "images": [
      "/images/hotel/room309/db6cdfeef09cba086aa55aa508cf79bd.jpg",
      "/images/hotel/room309/e5d2372e0a8a3ebc07cbef29ee019daf.jpg",
      "/images/hotel/room309/88cde66e7a689aa31c00a23b4784416f.jpg",
      "/images/hotel/room309/ee58199d4cf9e579f152cb8ecaf7022c.jpg"
    ],
    "isActive": true,
    "sort": 10
  },
  {
    "_id": "room311",
    "name": "Loft亲子海景套房311",
    "stock": 1,
    "area": "58 平",
    "bed": "1 张大床 + 1 张榻榻米",
    "capacity": 4,
    "basePrice": 556,
    "originalPrice": 689,
    "position": "主推房型",
    "tags": ["Loft", "亲子", "海景"],
    "cancelPolicy": { "type": "free_before_18", "text": "入住当天 18:00 前可免费取消" },
    "intro": "明亮复式套房，适合家庭短住，兼顾海景、活动区与睡眠区。",
    "facilities": ["海景窗", "榻榻米", "独立卫浴", "空调", "wifi"],
    "notice": ["14:00 后入住，12:00 前退房", "请提前确认同行儿童人数"],
    "images": [
      "/images/hotel/room311/008360c2beb89fd2a95d720c53690f2f.jpg",
      "/images/hotel/room311/50c3ff7873be4e396bb0e34db15e2cd9.jpg",
      "/images/hotel/room311/ca427f9bfb62eb72b2c645df17214919.jpg",
      "/images/hotel/room311/956e05f96a72ff122d3cdb18bce7c8db.jpg"
    ],
    "isActive": true,
    "sort": 20
  },
  {
    "_id": "room310",
    "name": "Loft海景大床套房310",
    "stock": 1,
    "area": "58 平",
    "bed": "1 张 1.8 米大床",
    "capacity": 2,
    "basePrice": 556,
    "originalPrice": 669,
    "position": "情侣/双人出行推荐",
    "tags": ["Loft", "海景", "大床"],
    "cancelPolicy": { "type": "free_before_18", "text": "入住当天 18:00 前可免费取消" },
    "intro": "面向情侣和双人出行的海景大床套房，空间安静、视野开阔。",
    "facilities": ["海景窗", "1.8 米大床", "独立卫浴", "空调", "wifi"],
    "notice": ["14:00 后入住，12:00 前退房", "不可携带大型宠物入住"],
    "images": [
      "/images/hotel/room310/855fd51a12c5b6664db9baa32a4993ab.jpg",
      "/images/hotel/room310/f46f69254a6006052c1421fe4f493b58.jpg",
      "/images/hotel/room310/1aa914bb50f16a1b1b99563b904cd586.jpg"
    ],
    "isActive": true,
    "sort": 30
  },
  {
    "_id": "room201",
    "name": "亲子海景套房201",
    "stock": 1,
    "area": "55 平",
    "bed": "2 张单人床 + 1 张大床",
    "capacity": 4,
    "basePrice": 584,
    "originalPrice": 719,
    "position": "家庭出行推荐",
    "tags": ["亲子", "海景", "套房"],
    "cancelPolicy": { "type": "free_before_18", "text": "入住当天 18:00 前可免费取消" },
    "intro": "适合家庭入住的套房配置，多床型组合减少同行安排成本。",
    "facilities": ["多床型", "海景窗", "独立卫浴", "空调", "wifi"],
    "notice": ["14:00 后入住，12:00 前退房", "如需儿童用品请提前备注"],
    "images": [
      "/images/hotel/room201/650212834b67498f95ef72941ca4276f.jpg",
      "/images/hotel/room201/82db31309e7e311ee40804d6506317ee.jpg",
      "/images/hotel/room201/d503263daf425e5049034395ad0d7b20.jpg"
    ],
    "isActive": true,
    "sort": 40
  },
  {
    "_id": "queen",
    "name": "大床房",
    "stock": 2,
    "area": "28 平",
    "bed": "1 张 1.8 米榻榻米",
    "capacity": 2,
    "basePrice": 352,
    "originalPrice": 429,
    "position": "基础房型",
    "tags": ["大床", "简洁", "性价比"],
    "cancelPolicy": { "type": "free_before_18", "text": "入住当天 18:00 前可免费取消" },
    "intro": "基础大床房，适合轻行短住，价格更友好。",
    "facilities": ["榻榻米大床", "独立卫浴", "空调", "wifi"],
    "notice": ["14:00 后入住，12:00 前退房"],
    "images": [
      "/images/hotel/queen/01a68e99b2af6f3f026d52f8fd5f94fe.jpg",
      "/images/hotel/queen/807d1c33e4389a8e9e8a05d94244f47a.jpg",
      "/images/hotel/queen/10d1504db2d8f05c2c185fda556c64b9.jpg"
    ],
    "isActive": true,
    "sort": 50
  },
  {
    "_id": "tatami",
    "name": "榻榻米房",
    "stock": 2,
    "area": "22 平",
    "bed": "1 张 1.51 米榻榻米",
    "capacity": 2,
    "basePrice": 234,
    "originalPrice": 299,
    "position": "特色房型",
    "tags": ["榻榻米", "休闲", "家庭/朋友"],
    "cancelPolicy": { "type": "free_before_18", "text": "入住当天 18:00 前可免费取消" },
    "intro": "小而舒适的榻榻米房，适合轻松休息或朋友结伴短住。",
    "facilities": ["榻榻米", "独立卫浴", "空调", "wifi"],
    "notice": ["14:00 后入住，12:00 前退房", "当前素材少于 3 张，待补图"],
    "images": [
      "/images/hotel/tatami/8d1152120c6a31cd5f08cd13bc93e90a.jpg",
      "/images/hotel/tatami/3578ba50ca8025f5740a385e8e6eda1e.jpg"
    ],
    "isActive": true,
    "sort": 60
  }
]
```

### 3.3 `room_calendar`

示例包含基础价、节假日价、手动关闭房态。

```json
[
  {
    "_id": "room309_2026-07-01",
    "roomId": "room309",
    "date": "2026-07-01",
    "price": 622,
    "stock": 1,
    "remainingStock": 1,
    "isBookable": true,
    "priceType": "base",
    "note": "平日价"
  },
  {
    "_id": "room309_2026-10-01",
    "roomId": "room309",
    "date": "2026-10-01",
    "price": 888,
    "stock": 1,
    "remainingStock": 1,
    "isBookable": true,
    "priceType": "holiday",
    "note": "国庆节假日价，测试数据"
  },
  {
    "_id": "tatami_2026-07-02",
    "roomId": "tatami",
    "date": "2026-07-02",
    "price": 234,
    "stock": 2,
    "remainingStock": 0,
    "isBookable": false,
    "priceType": "manual",
    "note": "测试：当天不可订"
  }
]
```

### 3.4 `orders`

```json
[
  {
    "_id": "YS-DEMO-PENDING",
    "openid": "test_openid_user_001",
    "roomId": "room309",
    "roomSnapshot": {
      "name": "Loft亲子海景套房309",
      "cover": "/images/hotel/room309/db6cdfeef09cba086aa55aa508cf79bd.jpg",
      "bed": "1 张大床 + 1 张榻榻米",
      "capacity": 4,
      "cancelRule": "预订后不可取消"
    },
    "checkIn": "2026-07-01",
    "checkOut": "2026-07-02",
    "nights": 1,
    "guests": 4,
    "contactName": "测试住客",
    "phone": "13800000000",
    "remark": "晚到",
    "dailyPrices": [{ "date": "2026-07-01", "price": 622, "priceType": "base" }],
    "amount": 622,
    "payAmount": 622,
    "status": "pending",
    "paymentStatus": "待支付",
    "paymentMode": "mock",
    "refundStatus": "none",
    "createdAtMs": 1782890400000
  },
  {
    "_id": "YS-DEMO-PAID",
    "openid": "test_openid_user_001",
    "roomId": "queen",
    "roomSnapshot": {
      "name": "大床房",
      "cover": "/images/hotel/queen/01a68e99b2af6f3f026d52f8fd5f94fe.jpg",
      "bed": "1 张 1.8 米榻榻米",
      "capacity": 2,
      "cancelRule": "入住当天 18:00 前可免费取消"
    },
    "checkIn": "2026-07-03",
    "checkOut": "2026-07-04",
    "nights": 1,
    "guests": 2,
    "contactName": "测试住客",
    "phone": "13800000000",
    "remark": "",
    "dailyPrices": [{ "date": "2026-07-03", "price": 352, "priceType": "base" }],
    "amount": 352,
    "payAmount": 352,
    "status": "paid",
    "paymentStatus": "已支付",
    "paymentMode": "mock",
    "refundStatus": "none",
    "createdAtMs": 1783063200000
  }
]
```

### 3.5 `refund_records`

```json
[
  {
    "_id": "RF-DEMO-001",
    "orderId": "YS-DEMO-PAID",
    "openid": "test_openid_user_001",
    "amount": 352,
    "status": "processed",
    "reason": "测试退款记录",
    "operatorOpenid": "test_admin_openid_001",
    "operatorName": "经营者",
    "note": "经营者人工处理退款，测试数据"
  }
]
```

### 3.6 `admin_users`

```json
[
  {
    "_id": "test_admin_openid_001",
    "openid": "test_admin_openid_001",
    "name": "经营者",
    "role": "owner",
    "enabled": true
  }
]
```
