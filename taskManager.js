import { db } from './firebase.js';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, writeBatch } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { getCurrentUser } from './auth.js';

async function getTasks(username) {
    const tasksCol = collection(db, 'tasks');
    const q = query(tasksCol, where("user", "==", username));
    const taskSnapshot = await getDocs(q);
    const taskList = taskSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    return processTasksData(taskList);
}

async function addTask(weekNr, day, task, year) {
    const newTask = {
        weekNr: weekNr,
        year: year ?? moment().isoWeekYear(),
        day: day,
        task: task,
        checked: false,
        important: false,
        user: getCurrentUser()
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

async function updateTaskDay(taskId, newDay) {
    await updateDoc(doc(db, "tasks", taskId), {
        day: newDay
    });
}

// TEMP: Migration to set year=2024 for ALL tasks (regardless of existing year)
async function migrateAllTasksSetYear2024() {
    const tasksCol = collection(db, 'tasks');
    const taskSnapshot = await getDocs(tasksCol);
    let batch = writeBatch(db);
    let ops = 0;
    let updated = 0;
    for (const d of taskSnapshot.docs) {
        batch.update(doc(db, 'tasks', d.id), { year: 2024 });
        ops += 1;
        updated += 1;
        if (ops >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            ops = 0;
        }
    }
    if (ops > 0) {
        await batch.commit();
    }
    return { updated };
}


function processTasksData(allTasks) {
    const base = moment();
    // Build 4 consecutive weeks starting from current week, with correct iso week years
    let weeks = Array.from({ length: 4 }, (_, i) => {
        const m = base.clone().add(i, 'week');
        return {
            weekNr: m.isoWeek(),
            year: m.isoWeekYear(),
            weekdays: { mandag: [], tirsdag: [], onsdag: [], torsdag: [], fredag: [], lørdag: [], søndag: [] }
        };
    });
    const weekKeyToIndex = new Map(
        weeks.map((w, idx) => [`${w.year}-${w.weekNr}`, idx])
    );

    let forgottenTasks = [];
    let longTerm = [];

    for (let task of allTasks) {
        if (task.weekNr === 0) {
            longTerm.push(task);
            continue;
        }
        const year = task.year ?? base.isoWeekYear();
        const key = `${year}-${task.weekNr}`;
        if (weekKeyToIndex.has(key)) {
            const idx = weekKeyToIndex.get(key);
            weeks[idx].weekdays[task.day].push(task);
        } else if (!task.checked) {
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
        if ((a.year ?? 0) !== (b.year ?? 0)) {
            return (a.year ?? 0) - (b.year ?? 0);
        }
        return a.weekNr - b.weekNr;
    });
    longTerm.sort((a, b) => a.task.localeCompare(b.task));

    return { weeks, forgottenTasks, longTerm };
}

const app = {
    getTasks,
    addTask,
    deleteTask,
    changeTaskState,
    updateTaskDay,
    processTasksData,
    migrateAllTasksSetYear2024 // TEMP: expose for manual run
};

export default app;