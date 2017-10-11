var common = require('./common');
module.exports = function ({webDriverIo, defaultConfig, test}) {
    return common({webDriverIo, defaultConfig, test})
        .waitForExist(test.testConfigValue, defaultConfig.timeout)
};