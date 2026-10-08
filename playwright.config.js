const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30000,
  retries: 1,
  reporter: [["list"],["html",{outputFolder:"playwright-report",open:"never"}]],
  use: { baseURL:"http://127.0.0.1:3000", trace:"on-first-retry", screenshot:"only-on-failure" },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  },
  projects: [
    { name:"desktop-chromium", use:{...devices["Desktop Chrome"]} },
    { name:"mobile-chromium", use:{...devices["Pixel 7"]} }
  ]
});
