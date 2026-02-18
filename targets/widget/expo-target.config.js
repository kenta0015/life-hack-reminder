/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
  type: "widget",
  name: "LifeHackWidget",
  displayName: "今日の1枚",
  icon: "../../assets/images/icon.png",
  entitlements: {
    "com.apple.security.application-groups": config.ios?.entitlements?.["com.apple.security.application-groups"] ?? ["group.com.kenta0015.life-hack-reminder"],
  },
});