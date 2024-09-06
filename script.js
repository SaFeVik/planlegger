import { db } from './firebase.js';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

async function createPlannerHTML() {
    const container = document.querySelector('.planner-container');
    container.innerHTML = '';
    
    try {
        const data = await window.appFunctions.getTasks();
        data.weeks.forEach(weekData => {
            const weekDiv = document.createElement('div');
            weekDiv.classList.add('week');

            const weekTitle = document.createElement('h2');
            weekTitle.innerHTML = `Uke ${weekData.weekNr}`;
            weekDiv.appendChild(weekTitle);

            Object.entries(weekData.weekdays).forEach(([day, tasks]) => {
                const dayDiv = document.createElement('div');
                dayDiv.classList.add('day');

                const today = new Date().toLocaleDateString('no-NO', { weekday: 'long' }).toLowerCase();
                if (day === today) {
                    dayDiv.classList.add('today');
                }

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
                } else {
                    console.warn(`Uventet datatype for ${day}:`, tasks);
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

        data.longTerm.forEach(task => {
            const taskElement = createTaskElement(task, document.querySelector('.long-term-tasks'));
            document.querySelector('.long-term-tasks').appendChild(taskElement);
        });
        data.forgottenTasks.forEach(task => {
            const taskElement = createTaskElement(task, document.querySelector('.forgot-tasks'));
            document.querySelector('.forgot-tasks').appendChild(taskElement);
        });
        updateDayBackgrounds();
    } catch (error) {
        console.error("Feil ved henting av data:", error);
        container.innerHTML = `<p>En feil oppstod: ${error.message}</p>`;
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

// Kall funksjonen når siden lastes og når oppgaver endres
document.addEventListener('DOMContentLoaded', updateDayBackgrounds);
// Legg til dette kallet etter at du har lagt til eller slettet oppgaver

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
function createTaskElement(task, tasksDiv) {
    const taskElement = document.createElement('div');
    taskElement.classList.add('task');

    taskElement.innerHTML = `
        <div class="important-container"></div>
        <p class="task-text">
            ${task.task}
        </p>
        <div class="delete-task">Slett</div>
    `;

    
    const deleteButton = taskElement.querySelector('.delete-task');
    const taskTextEl = taskElement.querySelector('.task-text');
    const importantEl = taskElement.querySelector('.important-container');
    if (task.checked) {
        taskTextEl.classList.add('checked');
    }
    if (task.important) {
        importantEl.classList.add('important');
    }
    
    importantEl.addEventListener('click', () => changeTaskState(task, taskElement, false));
    taskTextEl.addEventListener('click', () => changeTaskState(task, taskElement, true));
    deleteButton.addEventListener('click', () => deleteTask(task, taskElement, tasksDiv));

    return taskElement;
}

async function addTask(weekNr, day, tasksDiv) {
    const newTask = prompt('Skriv inn ny oppgave:');
    if (newTask) {
        try {
            const taskId = await window.appFunctions.addTask(weekNr, day, newTask);
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
        await window.appFunctions.deleteTask(task.id);
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
        await window.appFunctions.changeTaskState(task.id, isChecked, isImportant);
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

