var userConfig = require('../user-config');

const addProjectTextEL = document.getElementById('addProjectTextEL');
const addProjectButtonEl = document.getElementById('addProjectButtonEl');
const projectListEl = document.getElementById('projectListEl');

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