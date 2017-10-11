var urlToImage = require('../../url-to-image');
const remote = require('electron').remote;
const shell = remote.shell;
var fs = require('fs');
var path = require('path');
const dialog = remote.dialog;
var looksSame = require('looks-same');
var userConfig = require('../../user-config');
var Queue = require('promise-queue')
var webdriverio = require('webdriverio');
const window = remote.getCurrentWindow();

class Project {
    constructor(projectName = userConfig.getConfig().projectName) {
        const config = userConfig.getConfig();
        while (!projectName) {
            projectName = 'dummy'
        }

        this.userConfig = config.projects[projectName];
        while (!this.userConfig.directory) {
            this.userConfig.directory = dialog.showOpenDialog({ properties: ['openDirectory'] })[0];
            if (!this.userConfig.directory) {
                alert('requires a project directory ');
            } else {
                userConfig.saveConfig();
            }
        }

        this.configPath = path.join(this.userConfig.directory, 'config.json');
        if (fs.existsSync(this.configPath)) {
            try {
                this.config = JSON.parse(fs.readFileSync(this.configPath));
            } catch (err) {
                this.config = { executions: [] };
                dialog.showErrorBox(err.name, err);
            }
        } else {
            this.config = { executions: [] }
        }
    }

    get(prop) {
        if (prop === 'directory') {
            return this.userConfig.directory;
        }
        return this.config[prop];
    }

    set(prop, value) {
        this.config[prop] = value;
        fs.writeFileSync(this.configPath, JSON.stringify(this.config));
    }
}

const project = new Project();

const defaultConfigOptionsDefault = {
    maxClientCount: 5,
    timeout: 3000,
    setViewportSize: {
        width: 1024,
        height: 764
    },
    webDriverIo: {
        desiredCapabilities: {
            browserName: 'chrome'
        }
    }
};
let defaultConfigOptions = project.get('defaultConfigOptions') || defaultConfigOptionsDefault;

const defaultTestCase = require('./test-case/default-test-case');
const waitForTimeTestCase = require('./test-case/wait-for-time-test-case');
const waitForTextTestCase = require('./test-case/wait-for-text-test-case');
const waitForElementTestCase = require('./test-case/wait-for-element-test-case');

document.addEventListener("keydown", function (e) {
    if (e.keyCode === 123) { // F12
        window.toggleDevTools();
    }
});
document.querySelectorAll('.tabsHeader').forEach(function (tabHeader) {
    tabHeader.addEventListener('click', function () {
        document.querySelectorAll('.tabsHeader.active, .tabs.active').forEach((t) => t.classList.remove('active'));
        tabHeader.classList.add('active')
        console.log('tabHeader.for', tabHeader.getAttribute('for'));
        document.getElementById(tabHeader.getAttribute('for')).classList.add('active')
    })
})


const projectConfigUrlList = project.get('urlList') || [];
const urlListEL = document.getElementById('urlList');
const defaultConfigurationEl = document.getElementById('defaultConfiguration');
const defaultConfigurationButtonEl = document.getElementById('defaultConfigurationButton');
defaultConfigurationEl.value = JSON.stringify(defaultConfigOptions, false, 4);
defaultConfigurationButton.addEventListener('click', function () {
    try {
        defaultConfigOptions = JSON.parse(defaultConfigurationEl.value)
        project.set('defaultConfigOptions', defaultConfigOptions)
    } catch (err) {
        alert(err)
    }
})
renderUrlList();
const urlButtonEL = document.getElementById('urlButton');
const urlTextEL = document.getElementById('urlText');
const testTypeEL = document.getElementById('testType');
const testCaseValueEL = document.getElementById('testCaseValue');

testTypeEL.addEventListener('change', function () {
    const testType = testTypeEL.options[testTypeEL.selectedIndex].value;

    switch (testType) {
        case 'waitForTime':
            testCaseValueEL.type = 'number';
            testCaseValueEL.value = 3000;
            testCaseValueEL.placeholder = 'Insert time in ms';
            testCaseValueEL.classList.remove('hidden');
            break;

        case 'waitForText':
            testCaseValueEL.type = 'text';
            testCaseValueEL.value = '';
            testCaseValueEL.placeholder = 'Insert a text to wait for';
            testCaseValueEL.classList.remove('hidden');
            break;

        case 'waitForElement':
            testCaseValueEL.type = 'text';
            testCaseValueEL.value = '';
            testCaseValueEL.placeholder = 'Insert a css selector to wait for';
            testCaseValueEL.classList.remove('hidden');
            break;
        case 'customTest':
            testCaseValueEL.type = 'file';
            testCaseValueEL.classList.remove('hidden');
            break;

        default:
            testCaseValueEL.classList.add('hidden');
            break;

    }
});

testCaseValueEL.addEventListener('change', function () {
    const testType = testTypeEL.options[testTypeEL.selectedIndex].value;
    if (testType !== 'customTest') {
        return
    }

    const scriptFile = testCaseValueEL.files[0];
    if (scriptFile) {
        let scriptFilePath = path.relative(project.get('directory'), scriptFile.path);
        if (scriptFilePath.indexOf('./') !== 0) {
            alert('The script chosen as a test case is not under the project directory')
        }
    }
});

urlButtonEL.addEventListener('click', function () {
    const url = urlTextEL.value.trim();
    const testType = testTypeEL.options[testTypeEL.selectedIndex].value;
    let testConfigValue;
    if (testType === 'customTest') {
        const scriptFile = testCaseValueEL.files[0];
        if (!scriptFile) {
            return alert('please select a test case file script');
        }
        testConfigValue = path.relative(project.get('directory'), scriptFile.path);
    } else {
        testConfigValue = testCaseValueEL.value;
    }
    if (url) {
        if (projectConfigUrlList.find((u) => u.url === url && u.testConfigValue === testConfigValue && u.testType === testType)) {
            alert('this test already exists');
            return;
        }
        addUrl({ url: url, testConfigValue, testType });
    } else {
        alert('please insert an url')
    }
});

function addUrl(item) {
    projectConfigUrlList.push(item);
    project.set('urlList', projectConfigUrlList);
    renderUrlList();
}

function removeUrl(index) {
    projectConfigUrlList.splice(index, 1);
    project.set('urlList', projectConfigUrlList);
    renderUrlList();
}

function renderUrlList() {
    urlListEL.innerHTML = '';
    projectConfigUrlList.forEach(function (item, index) {
        const li = document.createElement('tr');
        const countEl = document.createElement('td');
        const textEl = document.createElement('td');
        const butEltd = document.createElement('td');
        const testTypeEltd = document.createElement('td');
        const testValueEltd = document.createElement('td');
        const butEl = document.createElement('button');
        butEl.innerHTML = 'x';

        butEl.addEventListener('click', function () {
            removeUrl(index);
        });
        testTypeEltd.innerHTML = item.testType || 'default';
        testValueEltd.innerHTML = item.testConfigValue || 'N/A';

        countEl.innerHTML = index + 1;
        li.appendChild(countEl);
        li.appendChild(textEl);
        li.appendChild(testTypeEltd);
        li.appendChild(testValueEltd);
        butEltd.appendChild(butEl);
        li.appendChild(butEltd);

        textEl.innerHTML = item.url;
        textEl.setAttribute('title', textEl.innerHTML);
        urlListEL.appendChild(li);
    });
}


const response = document.getElementById('response');
const execute = document.getElementById('execute');
const executionText = document.getElementById('executionText');


execute.addEventListener('click', function execute() {
    const execName = executionText.value.trim();
    if (!execName) {
        alert('insert execution name');
        return;
    }
    if (project.get('executions').find((e) => e.name === execName)) {
        alert('Execution name already used');
        return;
    }
    response.innerHTML = 'executing';
    let success = 0;
    let errors = 0;
    let total = projectConfigUrlList.length;
    let errorsMessage = "";

    function display() {
        response.innerHTML = `success: ${success}, errors: ${errors}, left: ${total - success - errors} <br/> ${errorsMessage}`
    }

    display();

    var queue = new Queue(defaultConfigOptions.maxClientCount || 5, Infinity);
    fs.mkdirSync(path.join(project.get('directory'), execName));
    Promise.all(projectConfigUrlList.map(function (item) {
        queue.add(() => {
            return new Promise((resolve, reject) => {
                let testCase;
                switch (item.testType || 'default') {
                    case 'waitForTime':
                        testCase = waitForTimeTestCase;
                        break;
                    case 'waitForText':
                        testCase = waitForTextTestCase;
                        break;
                    case 'waitForElement':
                        testCase = waitForElementTestCase;
                        break;
                    case 'customTest':
                        if (!fs.existsSync(item.testConfigValue)) {
                            if (!fs.existsSync(path.join(project.get('directory'), item.testConfigValue))) {
                                return reject('test case file not found! ' + item.testConfigValue)
                            }

                            item.testConfigValue = path.join(project.get('directory'), item.testConfigValue);
                        }
                        testCase = require(item.testConfigValue);
                        break;
                    default:
                        testCase = defaultTestCase;
                        break;
                }
                const browser = testCase({
                    webDriverIo: webdriverio,
                    defaultConfig: defaultConfigOptions,
                    test: item
                });
                return browser.saveScreenshot()
                    .then((buffer) => {
                        return browser.end().then(() => {
                            fs.writeFileSync(path.join(project.get('directory'), execName, ( new Buffer(item.url) ).toString("base64")) + '.png', buffer);
                            resolve()
                        })
                    }).catch((err) => {
                        console.log('errrrr', err);
                        reject(err)
                        browser.end()
                    })

            }).then(function () {
                success++;
                display()
                // now google.png exists and contains screenshot of google.com
            }).catch(function (err) {
                errors++;
                errorsMessage += "<br>" + JSON.stringify(item) + err;
                display();
                console.error(err);
            })
        })

    })).then((function (theList) {
        const exec = project.get('executions');
        exec.push({ name: execName, time: new Date() });
        project.set('executions', exec);
        renderExecutions()
    }));

});


const compare1EL = document.getElementById('compare1');
const compare2EL = document.getElementById('compare2');
const compareButtonEL = document.getElementById('compareButton');
const compareEl = document.getElementById('compareEl');
renderExecutions();
function renderExecutions() {
    compare1EL.innerHTML = '<option value="">Select a version</option>';
    compare2EL.innerHTML = '<option value="">Select another version</option>';
    project.get('executions').forEach(({ name, time }) => {
        const option1 = document.createElement('option');
        option1.value = name;
        option1.innerHTML = `${name} - ${(new Date(time)).toUTCString()} `;
        const option2 = option1.cloneNode(true);
        compare1EL.appendChild(option1);
        compare2EL.appendChild(option2);
    });
}

function renderComparison(results) {
    compareEl.innerHTML = '';
    results.forEach((c) => {
        const ctr = document.createElement('tr');
        const tdurl = document.createElement('td');
        const tdstatus = document.createElement('td');
        const tddiff = document.createElement('td');

        if (c.diff) {
            const img = document.createElement('img');
            img.height = 100;
            img.width = 100;
            img.src = `data:image/png;base64,${c.diff}`;
            img.addEventListener('click', function (e) {
                e.target.classList.toggle('fullScreenImage')
            });
            tddiff.appendChild(img);
        } else {

            tddiff.innerHTML = 'none';
        }
        tdstatus.innerHTML = c.status;
        tdurl.innerHTML = Buffer.from(c.name, 'base64').toString();
        ctr.appendChild(tdurl);
        ctr.appendChild(tdstatus);
        ctr.appendChild(tddiff);
        compareEl.appendChild(ctr);
    })

}

compareButtonEL.addEventListener('click', function () {
    const compare1 = compare1EL.options[compare1EL.selectedIndex].value;
    const compare2 = compare2EL.options[compare2EL.selectedIndex].value;
    if (!compare1 || !compare2 || compare1 === compare2) {
        return alert('please select both compare versions and different');
    }
    const compare1Dir = path.join(project.get('directory'), compare1);
    const compare2Dir = path.join(project.get('directory'), compare2);
    const compare1List = fs.readdirSync(compare1Dir);
    const compare2List = fs.readdirSync(compare2Dir);
    const results = [];

    compare1List.forEach(function (c1) {
        const c2Index = compare2List.indexOf(c1);
        console.log('c1', c1, c2Index);
        const c = {
            name: c1,
            compareable: c2Index > -1,
            status: 'Missing target'
        };
        results.push(c)
        if (c.compareable) {
            compare2List.splice(c2Index, 1);
            c.status = 'loading';
            const c1Path = path.join(compare1Dir, c1);
            const c2Path = path.join(compare2Dir, c1);
            looksSame(c1Path, c2Path, function (error, equal) {
                console.log('error', error, equal);
                if (error) {
                    c.status = error
                    renderComparison(results);
                } else if (equal) {
                    c.status = 'same';
                    renderComparison(results);
                } else {
                    c.status = 'differs';
                    renderComparison(results);
                    looksSame.createDiff({
                        reference: c1Path,
                        current: c2Path,
                        highlightColor: '#ff0000', //color to highlight the differences
                        strict: false,//strict comparsion
                        tolerance: 2.5
                    }, function (error, buffer, x) {
                        if (error) {
                            c.status = error
                        } else {
                            c.diff = buffer.toString('base64');
                        }

                        renderComparison(results);
                    });
                }

            });


        }
    });
    compare2List.forEach((c2) => {
        results.push({
            name: c2,
            compareable: false,
            status: 'Missing base'
        });
    });

    renderComparison(results);
});