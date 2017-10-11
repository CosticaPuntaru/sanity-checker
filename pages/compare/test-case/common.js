module.exports = function ({ webDriverIo, defaultConfig, test }) {
    var remote = webDriverIo.remote(defaultConfig.webDriverIo)
        .init()

    if (defaultConfig.setViewportSize) {
        remote = remote.setViewportSize(defaultConfig.setViewportSize)
    } else {
        remote = remote.setViewportSize({
            width: 1024,
            height: 764
        })
    }
    return remote
        .url(test.url)
};