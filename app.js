import { db } from './firebase.js';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

async function getTasks() {
    const tasksCol = collection(db, 'tasks');
    const taskSnapshot = await getDocs(tasksCol);
    const taskList = taskSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    return processTasksData(taskList);
}

async function addTask(weekNr, day, task) {
    const newTask = {
        weekNr: weekNr,
        day: day,
        task: task,
        checked: false,
        important: false,
        user: "maritaeline@outlook.com"
    };
    const docRef = await addDoc(collection(db, "tasks"), newTask);
    return docRef.id;
}

async function deleteTask(taskId) {
    await deleteDoc(doc(db, "tasks", taskId));
}

async function changeTaskState(taskId, checked, important) {
    await updateDoc(doc(db, "tasks", taskId), {
        checked: checked,
        important: important
    });
}

function processTasksData(allTasks) {
    const currentWeek = moment().isoWeek();
    const nextWeek = currentWeek + 1;

    let weeks = [
        {
            weekNr: currentWeek,
            weekdays: {
                mandag: [], tirsdag: [], onsdag: [], torsdag: [], fredag: [], lørdag: [], søndag: []
            }
        },
        {
            weekNr: nextWeek,
            weekdays: {
                mandag: [], tirsdag: [], onsdag: [], torsdag: [], fredag: [], lørdag: [], søndag: []
            }
        }
    ];

    let forgottenTasks = [];
    let longTerm = [];

    for (let task of allTasks) {
        if (task.weekNr === 0) {
            longTerm.push(task);
        } else if (task.weekNr === currentWeek || task.weekNr === nextWeek) {
            let weekIndex = task.weekNr === currentWeek ? 0 : 1;
            weeks[weekIndex].weekdays[task.day].push(task);
        } else {
            forgottenTasks.push(task);
        }
    }

    // Sort tasks within each day
    for (let week of weeks) {
        for (let day in week.weekdays) {
            week.weekdays[day].sort((a, b) => a.task.localeCompare(b.task));
        }
    }

    // Sort forgottenTasks and longTerm
    forgottenTasks.sort((a, b) => {
        if (a.task !== b.task) {
            return a.task.localeCompare(b.task);
        }
        return a.weekNr - b.weekNr;
    });
    longTerm.sort((a, b) => a.task.localeCompare(b.task));

    return { weeks, forgottenTasks, longTerm };
}

// Eksporter funksjonene
window.appFunctions = {
    getTasks,
    addTask,
    deleteTask,
    changeTaskState
};

// Test funksjon
async function testConnection() {
    try {
        const tasks = await getTasks();
        console.log('Tilkobling vellykket. Hentet oppgaver:', tasks);
    } catch (error) {
        console.error('Feil ved testing av tilkobling:', error);
    }
}

// Kjør testen når siden lastes
window.onload = function() {
    testConnection();
};
