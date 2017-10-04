var urlToImage = require('../../url-to-image');
const remote = require('electron').remote;
const shell = remote.shell;
var fs = require('fs');
var path = require('path');
const dialog = remote.dialog;
var looksSame = require('looks-same');
var userConfig = require('../../user-config');
document.addEventListener("keydown", function (e) {
    if (e.keyCode === 123) { // F12
        var window = remote.getCurrentWindow();
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
const list = project.get('urlList') || [];
const urlListElement = document.getElementById('urlList');
renderUrlList();
const urlButton = document.getElementById('urlButton');
const urlDelay = document.getElementById('urlDelay');
const urlText = document.getElementById('urlText');


urlButton.addEventListener('click', function () {
    var value = urlText.value.trim();
    var delay = urlDelay.value.trim();

    if (value) {
        if (list.find((u) => u.url === value)) {
            alert('url exists');
            return;
        }
        addUrl({ url: value, delay });
    }
});

function addUrl(item) {
    list.push(item);
    project.set('urlList', list);
    renderUrlList();
}

function removeUrl(index) {
    list.splice(index, 1);
    project.set('urlList', list);
    renderUrlList();
}

function renderUrlList() {
    urlListElement.innerHTML = '';
    list.map(function (item, index) {
        const li = document.createElement('tr');
        const textEl = document.createElement('td');
        const butEltd = document.createElement('td');
        const butEl = document.createElement('button');
        butEl.innerHTML = 'x';

        butEl.addEventListener('click', function () {
            removeUrl(index);
        });

        li.appendChild(textEl);
        butEltd.appendChild(butEl);
        li.appendChild(butEltd);

        textEl.innerHTML = `${item.url} - ${item.delay || 300}ms`;
        textEl.setAttribute('title', textEl.innerHTML);
        urlListElement.appendChild(li);
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
    let total = list.length;
    let errorsMessage = "";

    function display() {
        response.innerHTML = `success: ${success}, errors: ${errors}, left: ${total - success - errors} <br/> ${errorsMessage}`
    }

    Promise.all(list.map(function (item) {
        urlToImage(
            item.url,
            path.join(project.get('directory'), execName, ( new Buffer(item.url) ).toString("base64")) + '.png',
            {
                requestTimeout: item.delay
            }
        ).then(function () {
            success++;
            display()
            // now google.png exists and contains screenshot of google.com
        }).catch(function (err) {
            errors++;
            display();
            errorsMessage += "<br>" + err.message;
            console.error(err);
        });
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