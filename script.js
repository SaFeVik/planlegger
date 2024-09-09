import app from './app.js';

// Resten av koden i script.js
async function createPlannerHTML() {
    const container = document.querySelector('.planner-container');
    container.innerHTML = '';
    
    try {
        const data = await app.getTasks();
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
        await app.updateTaskDay(taskId, newDay);
        updateDayBackgrounds();
    } catch (error) {
        console.error("Feil ved oppdatering av oppgavedag:", error);
    }
}

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

document.addEventListener('DOMContentLoaded', updateDayBackgrounds);

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

async function addTask(weekNr, day, tasksDiv) {
    const newTask = prompt('Skriv inn ny oppgave:');
    if (newTask) {
        try {
            const taskId = await app.addTask(weekNr, day, newTask);
            const taskElement = createTaskElement({id: taskId, task: newTask, checked: false, important: false}, tasksDiv);
            tasksDiv.appendChild(taskElement);
            updateDayBackgrounds();
        } catch (error) {
            console.error("Feil ved legging til av oppgave:", error);
            alert('Kunne ikke legge til oppgaven. Prøv igjen senere.');
        }
    }
}

async function deleteTask(task, taskElement, tasksDiv) {
    const taskElementCopy = taskElement.cloneNode(true);
    taskElement.remove();

    try {
        await app.deleteTask(task.id);
        updateDayBackgrounds();
    } catch (error) {
        console.error("Feil ved sletting av oppgave:", error);
        tasksDiv.appendChild(taskElementCopy);
        alert('Kunne ikke slette oppgaven. Prøv igjen senere.');
    }
}

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
        await app.changeTaskState(task.id, isChecked, isImportant);
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

// Initialiser planleggeren når siden lastes
window.onload = async function() {
    await createPlannerHTML();
};

