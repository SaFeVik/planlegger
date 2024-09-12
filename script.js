import taskManager from './taskManager.js';
import { login, logout, getCurrentUser, isLoggedIn } from './auth.js';
moment.locale('nb');

function showLoginOverlay() {
    document.querySelector('.login-overlay').classList.remove('hide');
}

function hideLoginOverlay() {
    document.querySelector('.login-overlay').classList.add('hide');
}

function showUsername(username) {
    const usernameElement = document.createElement('div');
    usernameElement.classList.add('username-display');
    usernameElement.textContent = username;
    document.body.insertBefore(usernameElement, document.body.firstChild);
}

function showLogoutButton() {
    const logoutButton = document.createElement('button');
    logoutButton.textContent = 'Logg ut';
    logoutButton.classList.add('logout-button');
    logoutButton.addEventListener('click', logout);
    document.body.insertBefore(logoutButton, document.body.firstChild);
}

// Add this function near the top of your script.js file
function setupLoginInputs() {
    const loginInputs = document.querySelectorAll('.form-element input');
    const deleteButtons = document.querySelectorAll('.login-delete-input');

    loginInputs.forEach((input, index) => {
        const deleteButton = deleteButtons[index];
        deleteButton.addEventListener('click', () => {
            input.value = '';
        });
    });
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const user = await login(username, password);
        hideLoginOverlay();
        showUsername(user);
        showLogoutButton();
        createPlannerHTML();
    } catch (error) {
        alert(error.message);
    }
});

// Modify the createPlannerHTML function
async function createPlannerHTML() {
    const container = document.querySelector('.planner-container');
    container.innerHTML = '';
    
    if (!isLoggedIn()) {
        showLoginOverlay();
        return;
    }

    showUsername(getCurrentUser());
    showLogoutButton();

    try {
        const data = await taskManager.getTasks(getCurrentUser());
        data.weeks.forEach(weekData => {
            const weekDiv = document.createElement('div');
            weekDiv.classList.add('week');

            const weekTitle = document.createElement('h2');
            weekTitle.innerHTML = `Uke ${weekData.weekNr}`;
            weekDiv.appendChild(weekTitle);

            Object.entries(weekData.weekdays).forEach(([day, tasks]) => {
                const dayDiv = document.createElement('div');
                dayDiv.classList.add('day');
                dayDiv.setAttribute('data-day', day);

                const dayTitle = document.createElement('h3');
                const today = moment().format('dddd').toLowerCase();
                const isFirstWeek = weekData.weekNr === moment().isoWeek();
                console.log(isFirstWeek, day, today);
                if (isFirstWeek && day === today) {
                    dayTitle.style.color = 'rgb(255, 59, 48';
                }
                dayTitle.innerHTML = day.charAt(0).toUpperCase() + day.slice(1);
                dayDiv.appendChild(dayTitle);

                const tasksDiv = document.createElement('div');
                tasksDiv.classList.add('tasks');

                if (Array.isArray(tasks)) {
                    tasks.forEach(task => {
                        const taskElement = createTaskElement(task, tasksDiv);
                        tasksDiv.appendChild(taskElement);
                    });
                }

                dayDiv.appendChild(tasksDiv);

                const addTaskButton = document.createElement('button');
                addTaskButton.classList.add('add-task');
                addTaskButton.innerHTML = 'Legg til';
                addTaskButton.addEventListener('click', () => addTask(weekData.weekNr, day, tasksDiv));
                dayDiv.appendChild(addTaskButton);

                weekDiv.appendChild(dayDiv);
            });
            container.appendChild(weekDiv);
        });
        data.forgottenTasks.forEach(task => {
            const taskElement = createTaskElement(task, document.querySelector('.forgotten-tasks'));
            document.querySelector('.forgot-tasks').appendChild(taskElement);
        });
        data.longTerm.forEach(task => {
            const taskElement = createTaskElement(task, document.querySelector('.long-term-tasks'));
            document.querySelector('.long-term-tasks').appendChild(taskElement);
        });

        implementDragAndDrop();
        updateDayBackgrounds();
    } catch (error) {
        console.error("Feil ved henting av data:", error);
        container.innerHTML = `<p>En feil oppstod: ${error.message}</p>`;
    }
}

// Add this function to initialize the app
function initApp() {
    setupLoginInputs();
    if (isLoggedIn()) {
        hideLoginOverlay();
        createPlannerHTML();
    } else {
        showLoginOverlay();
    }
}

// Modify the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    updateDayBackgrounds();
});

// Function for making a task element
function createTaskElement(task, tasksDiv) {
    const taskElement = document.createElement('div');
    taskElement.classList.add('task');
    taskElement.setAttribute('draggable', 'true');
    taskElement.setAttribute('data-task-id', task.id);

    taskElement.innerHTML = `
        <div class="important-container"></div>
        <p class="task-text ${task.checked ? 'checked' : ''}">
            ${task.task}
        </p>
        <div class="delete-task">Slett</div>
    `;

    const deleteButton = taskElement.querySelector('.delete-task');
    const taskTextEl = taskElement.querySelector('.task-text');
    const importantEl = taskElement.querySelector('.important-container');
    
    if (task.important) {
        importantEl.classList.add('important');
    }
    
    importantEl.addEventListener('click', () => changeTaskState(task, taskElement, false));
    taskTextEl.addEventListener('click', () => changeTaskState(task, taskElement, true));
    deleteButton.addEventListener('click', () => deleteTask(task, taskElement, tasksDiv));

    return taskElement;
}

// Drag and drop
function implementDragAndDrop() {
    const tasks = document.querySelectorAll('.task');
    const days = document.querySelectorAll('.day');

    tasks.forEach(task => {
        task.addEventListener('dragstart', dragStart);
        task.addEventListener('dragend', dragEnd);
    });

    days.forEach(day => {
        day.addEventListener('dragover', dragOver);
        day.addEventListener('dragenter', dragEnter);
        day.addEventListener('dragleave', dragLeave);
        day.addEventListener('drop', drop);
    });
}

function dragStart() {
    this.classList.add('dragging');
}

function dragEnd() {
    this.classList.remove('dragging');
}

function dragOver(e) {
    e.preventDefault();
}

function dragEnter(e) {
    e.preventDefault();
    this.classList.add('drag-over');
}

function dragLeave() {
    this.classList.remove('drag-over');
}

async function drop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    const task = document.querySelector('.dragging');
    const tasksContainer = this.querySelector('.tasks');
    tasksContainer.appendChild(task);
    
    const taskId = task.getAttribute('data-task-id');
    const newDay = this.getAttribute('data-day');
    
    try {
        await taskManager.updateTaskDay(taskId, newDay);
        updateDayBackgrounds();
    } catch (error) {
        console.error("Feil ved oppdatering av oppgavedag:", error);
    }
}

// Function for updating the day backgrounds
function updateDayBackgrounds() {
    const days = document.querySelectorAll('.day');

    days.forEach(day => {
        const tasks = day.querySelectorAll('.task');
        const count = Math.min(tasks.length, 7)
        
        const colors = [
            {r: 255, g: 255, b: 255},
            {r: 246, g: 250, b: 254},
            {r: 237, g: 245, b: 253},
            {r: 228, g: 240, b: 252},
            {r: 219, g: 235, b: 252},
            {r: 210, g: 230, b: 251},
            {r: 201, g: 225, b: 251},
            {r: 192, g: 220, b: 250}
        ]
        day.style.backgroundColor = `rgb(${colors[count]["r"]}, ${colors[count]["g"]}, ${colors[count]["b"]})`;

    });
}

// Long term and forgotten
document.querySelector('.add-long-term-task').addEventListener('click', () => {
    addTask(0, 'glemt', document.querySelector('.long-term-tasks'));
});

document.querySelector('.forgot-container .arrow-left').addEventListener('click', (event) => {
    event.target.classList.toggle('rotate');
    document.querySelector('.forgot-tasks').classList.toggle('hide');
});
document.querySelector('.long-term-container .arrow-left').addEventListener('click', (event) => {
    event.target.classList.toggle('rotate');
    document.querySelector('.long-term-tasks').classList.toggle('hide');
    document.querySelector('.add-long-term-task').classList.toggle('hide');
});

// Make and add task
async function addTask(weekNr, day, tasksDiv) {
    const newTask = prompt('Skriv inn ny oppgave:');
    if (newTask) {
        try {
            const taskId = await taskManager.addTask(weekNr, day, newTask);
            const taskElement = createTaskElement({id: taskId, task: newTask, checked: false, important: false}, tasksDiv);
            tasksDiv.appendChild(taskElement);
            updateDayBackgrounds();
        } catch (error) {
            console.error("Feil ved legging til av oppgave:", error);
            alert('Kunne ikke legge til oppgaven. Prøv igjen senere.');
        }
    }
}

// Delete a task
async function deleteTask(task, taskElement, tasksDiv) {
    const taskElementCopy = taskElement.cloneNode(true);
    taskElement.remove();

    try {
        await taskManager.deleteTask(task.id);
        updateDayBackgrounds();
    } catch (error) {
        console.error("Feil ved sletting av oppgave:", error);
        tasksDiv.appendChild(taskElementCopy);
        alert('Kunne ikke slette oppgaven. Prøv igjen senere.');
    }
}

// Change important or checked
async function changeTaskState(task, taskElement, isCheckingTask) {
    const taskTextEl = taskElement.querySelector('.task-text');
    const importantEl = taskElement.querySelector('.important-container');
    
    if (isCheckingTask) {
        taskTextEl.classList.toggle('checked');
    } else {
        importantEl.classList.toggle('important');
    }
    
    const isChecked = taskTextEl.classList.contains('checked');
    const isImportant = importantEl.classList.contains('important');

    try {
        await taskManager.changeTaskState(task.id, isChecked, isImportant);
    } catch (error) {
        console.error("Feil ved endring av oppgavestatus:", error);
        if (isCheckingTask) {
            taskTextEl.classList.toggle('checked');
        } else {
            importantEl.classList.toggle('important');
        }
        alert('Kunne ikke endre oppgavestatus. Prøv igjen senere.');
    }
}