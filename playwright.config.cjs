const { defineConfig } = require('@playwright/test');
const path = require('node:path');
const os = require('node:os');
module.exports=defineConfig({
 testDir:'./tests/ui',workers:1,use:{baseURL:'http://127.0.0.1:3199',headless:true,viewport:{width:1440,height:1000},
  launchOptions:process.env.SIZZLA_CHROMIUM?{executablePath:process.env.SIZZLA_CHROMIUM}:{}},
 webServer:{command:'node src/server.cjs',url:'http://127.0.0.1:3199',reuseExistingServer:false,env:{PORT:'3199',SIZZLA_DATA_DIR:process.env.SIZZLA_TEST_DATA||path.join(os.tmpdir(),'sizzla-ui-tests')}}
});
