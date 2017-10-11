var userConfig = require('../user-config');

const remote = require('electron').remote;
const addProjectTextEL = document.getElementById('addProjectTextEL');
const addProjectButtonEl = document.getElementById('addProjectButtonEl');
const projectListEl = document.getElementById('projectListEl');

document.getElementById('userData').innerHTML = userConfig.userDataConfig;

const projects = userConfig.getConfig().projects;
function renderProjectList() {
    projectListEl.innerHTML = '';
    Object.keys(projects).forEach(function (proj) {
        const li = document.createElement('li');
        const href = document.createElement('a');
        href.innerText = proj;
        href.href = 'compare/index.html';
        href.addEventListener('click', function () {
            userConfig.config.projectName = proj;
            userConfig.saveConfig();
        })
        li.appendChild(href);
        projectListEl.appendChild(li)
    })

}

renderProjectList();
addProjectButtonEl.addEventListener('click', function () {
    const val = addProjectTextEL.value;
    if (val) {
        projects[val] = {
            urlList: []
        }

        userConfig.saveConfig();
        renderProjectList();
    }
});


console.log('userConfig', projects);

document.addEventListener("keydown", function (e) {
    if (e.keyCode === 123) { // F12
        var window = remote.getCurrentWindow();
        window.toggleDevTools();
    }
});