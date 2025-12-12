document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    const STATE_KEY_TODOS = 'glassytasks_todos';
    const STATE_KEY_NOTES = 'glassytasks_notes';

    let todos = JSON.parse(localStorage.getItem(STATE_KEY_TODOS)) || [];
    let notes = JSON.parse(localStorage.getItem(STATE_KEY_NOTES)) || [];
    let currentFilter = 'all';

    // --- DOM Elements ---
    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // To-Do Section
    const todoInput = document.getElementById('todo-input');
    const prioritySelect = document.getElementById('priority-select');
    const addTodoBtn = document.getElementById('add-todo-btn');
    const todoList = document.getElementById('todo-list');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const emptyStateTodo = document.getElementById('empty-state-todo');

    // Edit Task Modal
    const editTaskModal = document.getElementById('edit-task-modal');
    const closeEditTaskBtn = document.querySelector('.close-modal-task');
    const editTaskInput = document.getElementById('edit-task-input');
    const editPrioritySelect = document.getElementById('edit-priority-select');
    const saveEditTaskBtn = document.getElementById('save-edit-task-btn');
    const cancelEditTaskBtn = document.getElementById('cancel-edit-task-btn');
    let currentEditTaskId = null;

    // Notes Section
    const notesGrid = document.getElementById('notes-grid');
    const addNoteBtn = document.getElementById('add-note-btn');
    const emptyStateNotes = document.getElementById('empty-state-notes');

    // Note Modal
    const noteModal = document.getElementById('note-modal');
    const closeNoteBtn = document.querySelector('.close-modal');
    const noteTitleInput = document.getElementById('note-title-input');
    const noteBodyInput = document.getElementById('note-body-input');
    const saveNoteBtn = document.getElementById('save-note-btn');
    const cancelNoteBtn = document.getElementById('cancel-note-btn');
    const modalTitle = document.getElementById('modal-title');
    let currentEditingNoteId = null;

    // --- Initialization ---
    renderTodos();
    renderNotes();

    // --- Tab Logic ---
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(`${tabId}-section`).classList.add('active');
        });
    });

    // --- To-Do Logic ---

    function saveTodos() {
        localStorage.setItem(STATE_KEY_TODOS, JSON.stringify(todos));
        renderTodos();
    }

    function renderTodos() {
        todoList.innerHTML = '';

        const filteredTodos = todos.filter(todo => {
            if (currentFilter === 'active') return !todo.completed;
            if (currentFilter === 'completed') return todo.completed;
            return true;
        });

        if (filteredTodos.length === 0) {
            emptyStateTodo.classList.remove('hidden');
        } else {
            emptyStateTodo.classList.add('hidden');
        }

        // Sort: Non-completed first, then by priority (High > Med > Low) could be a nice enhancement,
        // but let's stick to user order for now, or just completed at bottom.
        // Let's sort completed to bottom
        filteredTodos.sort((a, b) => a.completed - b.completed);

        filteredTodos.forEach(todo => {
            const li = document.createElement('li');
            li.className = `task-item ${todo.completed ? 'completed' : ''}`;

            li.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${todo.completed ? 'checked' : ''}>
                <div class="task-content">
                    <span class="task-text">${escapeHtml(todo.text)}</span>
                    <div class="task-meta">
                        <span class="priority-dot priority-${todo.priority}"></span>
                        <span style="opacity:0.7; font-size: 0.7rem; text-transform: uppercase;">${todo.priority}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="icon-btn edit" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="icon-btn delete" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            `;

            // Event Listeners for Item
            const checkbox = li.querySelector('.task-checkbox');
            checkbox.addEventListener('change', () => toggleTodo(todo.id));

            const deleteBtn = li.querySelector('.delete');
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

            const editBtn = li.querySelector('.edit');
            editBtn.addEventListener('click', () => openEditTaskModal(todo));

            todoList.appendChild(li);
        });
    }

    function addTodo() {
        const text = todoInput.value.trim();
        const priority = prioritySelect.value;

        if (!text) return;

        const newTodo = {
            id: Date.now(),
            text: text,
            priority: priority,
            completed: false,
            createdAt: new Date().toISOString()
        };

        todos.unshift(newTodo); // Add to top
        saveTodos();

        todoInput.value = '';
        // Reset priority if desired, or keep last selected
        // prioritySelect.value = 'medium';
    }

    function deleteTodo(id) {
        if(confirm('Are you sure you want to delete this task?')) {
            todos = todos.filter(t => t.id !== id);
            saveTodos();
        }
    }

    function toggleTodo(id) {
        todos = todos.map(t => {
            if (t.id === id) {
                return { ...t, completed: !t.completed };
            }
            return t;
        });

        // Add a small delay for animation before re-rendering/sorting
        // But for simplicity in vanilla JS without complex framework reconciliation,
        // immediate render is safer to keep state in sync.
        // We handle the visual transition via CSS classes in render.
        saveTodos();

        // Confetti effect could go here
        if(todos.find(t => t.id === id).completed) {
            triggerConfetti();
        }
    }

    // Filter Logic
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            renderTodos();
        });
    });

    addTodoBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });

    // Edit Task Logic
    function openEditTaskModal(todo) {
        currentEditTaskId = todo.id;
        editTaskInput.value = todo.text;
        editPrioritySelect.value = todo.priority;
        editTaskModal.classList.remove('hidden');
    }

    function closeEditTaskModalFunc() {
        editTaskModal.classList.add('hidden');
        currentEditTaskId = null;
    }

    function saveEditedTask() {
        if (!currentEditTaskId) return;
        const newText = editTaskInput.value.trim();
        const newPriority = editPrioritySelect.value;

        if (!newText) {
            alert("Task cannot be empty");
            return;
        }

        todos = todos.map(t => {
            if (t.id === currentEditTaskId) {
                return { ...t, text: newText, priority: newPriority };
            }
            return t;
        });

        saveTodos();
        closeEditTaskModalFunc();
    }

    closeEditTaskBtn.addEventListener('click', closeEditTaskModalFunc);
    cancelEditTaskBtn.addEventListener('click', closeEditTaskModalFunc);
    saveEditTaskBtn.addEventListener('click', saveEditedTask);


    // --- Notes Logic ---

    function saveNotes() {
        localStorage.setItem(STATE_KEY_NOTES, JSON.stringify(notes));
        renderNotes();
    }

    function renderNotes() {
        notesGrid.innerHTML = '';

        if (notes.length === 0) {
            emptyStateNotes.classList.remove('hidden');
        } else {
            emptyStateNotes.classList.add('hidden');
        }

        notes.forEach(note => {
            const div = document.createElement('div');
            div.className = 'note-card';

            const date = new Date(note.updatedAt).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            div.innerHTML = `
                <button class="note-delete-btn" title="Delete Note"><i class="fas fa-times"></i></button>
                <div style="flex-grow:1; overflow:hidden;">
                    <h3 class="note-title">${escapeHtml(note.title)}</h3>
                    <p class="note-body">${escapeHtml(note.body)}</p>
                </div>
                <div class="note-date">Edited: ${date}</div>
            `;

            // Delete Note
            const deleteBtn = div.querySelector('.note-delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent opening modal
                deleteNote(note.id);
            });

            // Edit Note (Open Modal)
            div.addEventListener('click', () => {
                openNoteModal(note);
            });

            notesGrid.appendChild(div);
        });
    }

    function deleteNote(id) {
        if(confirm('Delete this note?')) {
            notes = notes.filter(n => n.id !== id);
            saveNotes();
        }
    }

    function openNoteModal(note = null) {
        if (note) {
            // Edit Mode
            currentEditingNoteId = note.id;
            modalTitle.textContent = 'Edit Note';
            noteTitleInput.value = note.title;
            noteBodyInput.value = note.body;
        } else {
            // Create Mode
            currentEditingNoteId = null;
            modalTitle.textContent = 'Create Note';
            noteTitleInput.value = '';
            noteBodyInput.value = '';
        }
        noteModal.classList.remove('hidden');
    }

    function closeNoteModalFunc() {
        noteModal.classList.add('hidden');
        currentEditingNoteId = null;
    }

    function saveNote() {
        const title = noteTitleInput.value.trim() || 'Untitled Note';
        const body = noteBodyInput.value.trim();

        if (!body) {
            alert('Please enter some content for the note.');
            return;
        }

        const now = new Date().toISOString();

        if (currentEditingNoteId) {
            // Update existing
            notes = notes.map(n => {
                if (n.id === currentEditingNoteId) {
                    return { ...n, title, body, updatedAt: now };
                }
                return n;
            });
        } else {
            // Create new
            const newNote = {
                id: Date.now(),
                title,
                body,
                createdAt: now,
                updatedAt: now
            };
            notes.unshift(newNote);
        }

        saveNotes();
        closeNoteModalFunc();
    }

    addNoteBtn.addEventListener('click', () => openNoteModal());
    closeNoteBtn.addEventListener('click', closeNoteModalFunc);
    cancelNoteBtn.addEventListener('click', closeNoteModalFunc);
    saveNoteBtn.addEventListener('click', saveNote);

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === noteModal) closeNoteModalFunc();
        if (e.target === editTaskModal) closeEditTaskModalFunc();
    });

    // --- Helpers ---
    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function triggerConfetti() {
        // Simple manual confetti visual using css/dom,
        // keeping it vanilla without external libs.
        // We can just create small elements and animate them.

        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];

        for(let i=0; i<30; i++) {
            const confetti = document.createElement('div');
            confetti.style.position = 'fixed';
            confetti.style.zIndex = '9999';
            confetti.style.left = '50%';
            confetti.style.top = '50%';
            confetti.style.width = '10px';
            confetti.style.height = '10px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.borderRadius = '50%';
            confetti.style.pointerEvents = 'none';

            document.body.appendChild(confetti);

            const angle = Math.random() * Math.PI * 2;
            const velocity = 5 + Math.random() * 5;
            const tx = Math.cos(angle) * 200;
            const ty = Math.sin(angle) * 200;

            const animation = confetti.animate([
                { transform: 'translate(0,0) scale(1)', opacity: 1 },
                { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
            ], {
                duration: 1000,
                easing: 'cubic-bezier(0, .9, .57, 1)'
            });

            animation.onfinish = () => confetti.remove();
        }
    }
});
