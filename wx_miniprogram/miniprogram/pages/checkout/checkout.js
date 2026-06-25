const { getRoom, hotel } = require("../../data/hotel");

Page({
  data: {
    room: null,
    checkIn: "",
    checkOut: "",
    guests: 1,
    nights: 0,
    total: 0,
    contactName: "",
    phone: "",
    remark: "",
  },

  onLoad(query) {
    const room = getRoom(query.id);
    const checkIn = query.checkIn || "2026-07-01";
    const checkOut = query.checkOut || "2026-07-02";
    const guests = Number(query.guests || 1);
    const nights = this.getNights(checkIn, checkOut);

    this.setData({
      room,
      checkIn,
      checkOut,
      guests,
      nights,
      total: nights * room.price,
    });
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  submitOrder() {
    const error = this.validate();
    if (error) {
      wx.showToast({ title: error, icon: "none" });
      return;
    }

    const order = {
      id: `YS${Date.now()}`,
      roomId: this.data.room.id,
      roomName: this.data.room.name,
      cover: this.data.room.images[0],
      checkIn: this.data.checkIn,
      checkOut: this.data.checkOut,
      nights: this.data.nights,
      guests: this.data.guests,
      contactName: this.data.contactName,
      phone: this.data.phone,
      remark: this.data.remark,
      amount: this.data.total,
      status: "pending",
      paymentStatus: "待支付",
      cancelRule: this.data.room.cancelRule,
      address: hotel.address,
      createdAt: this.formatNow(),
    };

    const orders = wx.getStorageSync("orders") || [];
    wx.setStorageSync("orders", [order, ...orders]);

    wx.showModal({
      title: "订单已创建",
      content: "开发环境将使用模拟支付；生产环境需接入后端微信支付签名接口。",
      confirmText: "去支付",
      cancelText: "稍后",
      success: (res) => {
        if (res.confirm) {
          this.pay(order.id);
        } else {
          wx.switchTab({ url: "/pages/orders/orders" });
        }
      },
    });
  },

  pay(orderId) {
    const orders = wx.getStorageSync("orders") || [];
    const updated = orders.map((order) =>
      order.id === orderId
        ? { ...order, status: "paid", paymentStatus: "已支付", paidAt: this.formatNow() }
        : order
    );
    wx.setStorageSync("orders", updated);
    wx.redirectTo({ url: `/pages/order-detail/order-detail?id=${orderId}` });
  },

  validate() {
    if (this.data.nights < 1) return "离店日期需晚于入住日期";
    if (this.data.guests > this.data.room.capacity) return "入住人数超过房型上限";
    if (!this.data.contactName.trim()) return "请填写联系人姓名";
    if (!/^1[3-9]\d{9}$/.test(this.data.phone)) return "请填写正确手机号";
    return "";
  },

  getNights(checkIn, checkOut) {
    const start = new Date(checkIn).getTime();
    const end = new Date(checkOut).getTime();
    return Math.max(0, Math.ceil((end - start) / 86400000));
  },

  formatNow() {
    const date = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  },
});
