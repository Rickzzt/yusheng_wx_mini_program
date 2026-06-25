const { getRoom } = require("../../data/hotel");

Page({
  data: {
    room: null,
    checkIn: "2026-07-01",
    checkOut: "2026-07-02",
    guests: 2,
    guestOptions: [1, 2, 3, 4],
    nights: 1,
    total: 0,
  },

  onLoad(query) {
    const room = getRoom(query.id);
    const guests = Math.min(2, room.capacity);
    const guestOptions = Array.from({ length: room.capacity }, (_, index) => index + 1);
    this.setData({ room, guests, guestOptions }, this.refreshTotal);
  },

  onDateChange(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value }, this.refreshTotal);
  },

  onGuestsChange(e) {
    this.setData({ guests: this.data.guestOptions[Number(e.detail.value)] }, this.refreshTotal);
  },

  refreshTotal() {
    const nights = this.getNights(this.data.checkIn, this.data.checkOut);
    this.setData({
      nights,
      total: nights * this.data.room.price,
    });
  },

  getNights(checkIn, checkOut) {
    const start = new Date(checkIn).getTime();
    const end = new Date(checkOut).getTime();
    return Math.max(0, Math.ceil((end - start) / 86400000));
  },

  previewImages(e) {
    wx.previewImage({
      current: e.currentTarget.dataset.src,
      urls: this.data.room.images,
    });
  },

  goCheckout() {
    if (this.data.nights < 1) {
      wx.showToast({ title: "离店日期需晚于入住日期", icon: "none" });
      return;
    }

    wx.navigateTo({
      url: `/pages/checkout/checkout?id=${this.data.room.id}&checkIn=${this.data.checkIn}&checkOut=${this.data.checkOut}&guests=${this.data.guests}`,
    });
  },
});
