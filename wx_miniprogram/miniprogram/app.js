// app.js
App({
  onLaunch: function () {
    this.globalData = {
      // 后端接入后填写云开发环境 ID；未配置时先跑本地展示和模拟支付流程。
      env: "cloud1-d0g2qu0y4d5f7abad",
    };
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else if (this.globalData.env) {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
    }
  },
});
