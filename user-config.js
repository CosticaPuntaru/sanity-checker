
const remote = require('electron').remote;
const app = remote.app;
var fs = require('fs');
var path = require('path');

class UserConfig {
    constructor() {
        this.userDataConfig = path.join(app.getPath('userData'), 'user-config.json');
        if (fs.existsSync(this.userDataConfig)) {
            try {
                this.config = JSON.parse(fs.readFileSync(this.userDataConfig, 'utf8'));
            } catch (err) {
                dialog.showErrorBox('failed to load config', err);
                this.config = {
                    projects: {}
                };
            }
        } else {
            this.config = {
                projects: {}
            };
        }
    }

    getConfig() {
        return this.config
    }

    saveConfig() {
        console.log('saving config');
        fs.writeFileSync(this.userDataConfig, JSON.stringify(this.config));
    }
}

var userConfig = new UserConfig();
module.exports  = userConfig;
