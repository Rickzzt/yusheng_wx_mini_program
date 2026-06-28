const api = require("../../services/api");
const { hotel: fallbackHotel, rooms: fallbackRooms } = require("../../data/hotel");

Page({
  data: {
    hotel: null,
    hero: "",
    recommended: [],
  },

  onLoad() {
    this.loadHome();
  },

  async loadHome() {
    try {
      const [hotel, rooms] = await Promise.all([api.getHotelProfile(), api.listRooms()]);
      this.setData({
        hotel,
        hero: hotel.outdoorImages[0],
        recommended: rooms.slice(0, 3),
      });
    } catch (error) {
      console.error("loadHome failed", error);
      this.setData({
        hotel: fallbackHotel,
        hero: fallbackHotel.outdoorImages[0],
        recommended: fallbackRooms.slice(0, 3),
      });
      wx.showToast({ title: error.message, icon: "none" });
    }
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
    wx.makePhoneCall({ phoneNumber: this.data.hotel.phone });
  },

  openLocation() {
    wx.showToast({
      title: "待配置经纬度",
      icon: "none",
    });
  },
});
