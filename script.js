// --- State Management ---
const state = {
    tasks: [],
    notes: [],
    filter: 'all' // all, active, completed
};

// --- DOM Elements ---
const dom = {
    // Tabs
    tabTasks: document.getElementById('tabTasks'),
    tabNotes: document.getElementById('tabNotes'),
    tasksSection: document.getElementById('tasksSection'),
    notesSection: document.getElementById('notesSection'),
    container: document.querySelector('.glass-container'),

    // Tasks
    taskInput: document.getElementById('taskInput'),
    priorityInput: document.getElementById('priorityInput'),
    addTaskBtn: document.getElementById('addTaskBtn'),
    taskList: document.getElementById('taskList'),
    filterBtns: document.querySelectorAll('.filter-btn'),

    // Notes
    notesGrid: document.getElementById('notesGrid'),
    addNoteBtn: document.getElementById('addNoteBtn'),

    // Modal
    modal: document.getElementById('noteModal'),
    closeModal: document.querySelector('.close-modal'),
    noteTitleInput: document.getElementById('noteTitle'),
    noteBodyInput: document.getElementById('noteBody'),
    saveNoteBtn: document.getElementById('saveNoteBtn')
};

// --- Initialization ---
function init() {
    loadData();
    renderTasks();
    renderNotes();
    setupEventListeners();

    // Default Tab
    switchTab('tasks');
}

// --- Event Listeners ---
function setupEventListeners() {
    // Tasks
    dom.addTaskBtn.addEventListener('click', addTask);
    dom.taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    dom.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            dom.filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.filter = btn.dataset.filter;
            renderTasks();
        });
    });

    // Notes
    dom.addNoteBtn.addEventListener('click', openModal);
    dom.closeModal.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target == dom.modal) closeModal();
    });
    dom.saveNoteBtn.addEventListener('click', saveNote);
}

// --- Logic: Switch Tabs ---
window.switchTab = function(tab) {
    if (tab === 'tasks') {
        dom.tabTasks.classList.add('active');
        dom.tabNotes.classList.remove('active');
        dom.tasksSection.classList.add('active-section');
        dom.notesSection.classList.remove('active-section');
        dom.container.classList.remove('wide-mode');

        dom.notesSection.style.display = 'none';
        dom.tasksSection.style.display = 'flex';
    } else {
        dom.tabTasks.classList.remove('active');
        dom.tabNotes.classList.add('active');
        dom.tasksSection.classList.remove('active-section');
        dom.notesSection.classList.add('active-section');
        dom.container.classList.add('wide-mode');

        dom.tasksSection.style.display = 'none';
        dom.notesSection.style.display = 'block';
    }
};

// --- Logic: Tasks ---

function addTask() {
    const text = dom.taskInput.value.trim();
    const priority = dom.priorityInput.value;

    if (!text) return;

    const newTask = {
        id: Date.now(),
        text: text,
        priority: priority,
        completed: false,
        createdAt: new Date().toISOString()
    };

    state.tasks.unshift(newTask);
    saveData();
    renderTasks();

    dom.taskInput.value = '';
    dom.taskInput.focus();
}

function toggleTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveData();
        renderTasks();
    }
}

function deleteTask(id) {
    state.tasks = state.tasks.filter(t => t.id !== id);
    saveData();
    renderTasks();
}

function editTask(id) {
    const taskItem = document.querySelector(`li[data-id="${id}"]`);
    if (!taskItem) return;

    const span = taskItem.querySelector('.task-text');

    // Enable editing
    span.contentEditable = true;
    span.focus();

    // Select all text
    const range = document.createRange();
    range.selectNodeContents(span);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const save = () => {
        span.contentEditable = false;
        const newText = span.textContent.trim();

        if (newText) {
            const task = state.tasks.find(t => t.id === id);
            if (task) {
                task.text = newText;
                saveData();
            }
        } else {
            // Revert if empty
            renderTasks();
        }
    };

    span.onblur = save;
    span.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            span.blur(); // Triggers save
        }
    };
}

function renderTasks() {
    dom.taskList.innerHTML = '';

    const filtered = state.tasks.filter(task => {
        if (state.filter === 'active') return !task.completed;
        if (state.filter === 'completed') return task.completed;
        return true;
    });

    // Sort: Non-completed first
    filtered.sort((a, b) => {
        if (a.completed === b.completed) return 0;
        return a.completed ? 1 : -1;
    });

    filtered.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.dataset.id = task.id; // Crucial for selection

        const pClass = `p-${task.priority}`;

        li.innerHTML = `
            <div class="task-content">
                <div class="priority-dot ${pClass}" title="${task.priority}"></div>
                <span class="task-text">${escapeHtml(task.text)}</span>
            </div>
            <div class="task-actions">
                <button class="icon-btn edit-btn" onclick="editTask(${task.id})" title="Edit Task">
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="icon-btn check-btn" onclick="toggleTask(${task.id})" title="${task.completed ? 'Undo' : 'Complete'}">
                    <i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i>
                </button>
                <button class="icon-btn delete-btn" onclick="deleteTask(${task.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        dom.taskList.appendChild(li);
    });
}

// --- Logic: Notes ---

function openModal() {
    dom.modal.style.display = 'flex';
    dom.noteTitleInput.value = '';
    dom.noteBodyInput.value = '';
    dom.noteTitleInput.focus();
}

function closeModal() {
    dom.modal.style.display = 'none';
}

function saveNote() {
    const title = dom.noteTitleInput.value.trim();
    const body = dom.noteBodyInput.value.trim();

    if (!title && !body) return;

    const newNote = {
        id: Date.now(),
        title: title || 'Untitled',
        body: body,
        updatedAt: new Date()
    };

    state.notes.unshift(newNote);
    saveData();
    renderNotes();
    closeModal();
}

function deleteNote(id) {
    state.notes = state.notes.filter(n => n.id !== id);
    saveData();
    renderNotes();
}

function renderNotes() {
    dom.notesGrid.innerHTML = '';

    state.notes.forEach(note => {
        const dateStr = new Date(note.updatedAt).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric'
        });

        const card = document.createElement('div');
        card.className = 'note-card';
        card.innerHTML = `
            <div>
                <div class="note-title">${escapeHtml(note.title)}</div>
                <div class="note-body">${escapeHtml(note.body).replace(/\n/g, '<br>')}</div>
            </div>
            <div class="note-footer">
                <span>${dateStr}</span>
                <button class="note-delete" onclick="deleteNote(${note.id})" title="Delete Note">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        dom.notesGrid.appendChild(card);
    });
}


// --- Utilities ---

function saveData() {
    localStorage.setItem('glassy_tasks', JSON.stringify(state.tasks));
    localStorage.setItem('glassy_notes', JSON.stringify(state.notes));
}

function loadData() {
    const savedTasks = localStorage.getItem('glassy_tasks');
    const savedNotes = localStorage.getItem('glassy_notes');

    if (savedTasks) state.tasks = JSON.parse(savedTasks);
    if (savedNotes) state.notes = JSON.parse(savedNotes);
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Expose to global scope for HTML attributes
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;
window.editTask = editTask;
window.deleteNote = deleteNote;
window.switchTab = switchTab;

init();
