const { hotel, rooms } = require("../../data/hotel");

Page({
  data: {
    hotel,
    hero: hotel.outdoorImages[0],
    recommended: rooms.slice(0, 3),
  },

  goRooms() {
    wx.switchTab({ url: "/pages/rooms/rooms" });
  },

  goRoom(e) {
    wx.navigateTo({
      url: `/pages/room-detail/room-detail?id=${e.currentTarget.dataset.id}`,
    });
  },

  goAbout() {
    wx.navigateTo({ url: "/pages/about/about" });
  },

  callHotel() {
    wx.makePhoneCall({ phoneNumber: hotel.phone });
  },

  openLocation() {
    wx.showToast({
      title: "待配置经纬度",
      icon: "none",
    });
  },
});
