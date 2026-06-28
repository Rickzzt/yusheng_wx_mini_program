const api = require("../../services/api");

Page({
  data: {
    room: null,
    checkIn: "",
    checkOut: "",
    guests: 1,
    nights: 0,
    total: 0,
    contactName: "",
    idNo: "",
    phone: "",
    remark: "",
  },

  async onLoad(query) {
    try {
      const room = await api.getRoomDetail({
        roomId: query.id,
        checkIn: query.checkIn || "2026-07-01",
        checkOut: query.checkOut || "2026-07-02",
      });
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
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    }
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  async submitOrder() {
    const error = this.validate();
    if (error) {
      wx.showToast({ title: error, icon: "none" });
      return;
    }

    let order;
    try {
      order = await api.createOrder({
        roomId: this.data.room.id,
        checkIn: this.data.checkIn,
        checkOut: this.data.checkOut,
        guests: this.data.guests,
        contactName: this.data.contactName,
        idNo: this.data.idNo,
        phone: this.data.phone,
        remark: this.data.remark,
      });
    } catch (apiError) {
      wx.showToast({ title: apiError.message, icon: "none" });
      return;
    }

    wx.showModal({
      title: "订单已创建",
      content: "开发环境将使用模拟支付；生产环境需接入后端微信支付签名接口。",
      confirmText: "去支付",
      cancelText: "稍后",
      success: (res) => {
        if (res.confirm) {
          this.pay(order.orderId);
        } else {
          wx.switchTab({ url: "/pages/orders/orders" });
        }
      },
    });
  },

  async pay(orderId) {
    try {
      await api.mockPayOrder(orderId);
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
      return;
    }
    wx.redirectTo({ url: `/pages/order-detail/order-detail?id=${orderId}` });
  },

  validate() {
    if (this.data.nights < 1) return "离店日期需晚于入住日期";
    if (this.data.guests > this.data.room.capacity) return "入住人数超过房型上限";
    if (!this.data.contactName.trim()) return "请填写联系人姓名";
    if (!/^[\u4e00-\u9fa5·]{2,20}$/.test(this.data.contactName.trim())) return "真实姓名只能填写中文";
    if (!/^\d{17}[\dXx]$/.test(this.data.idNo)) return "请填写正确身份证号";
    if (!/^1[3-9]\d{9}$/.test(this.data.phone)) return "请填写正确手机号";
    return "";
  },

  getNights(checkIn, checkOut) {
    const start = new Date(checkIn).getTime();
    const end = new Date(checkOut).getTime();
    return Math.max(0, Math.ceil((end - start) / 86400000));
  },

});
