/**
 * main.js - JavaScript functions for SideQuests app
 * Includes enhanced drag-and-drop functionality using SortableJS with dedicated drag handles.
 * Added sorting functionality for Quests and Objectives with toggling between ascending and descending orders.
 * Memorizes sorting preferences using localStorage.
 * Sets sorting state to 'manual' when items are reordered via drag-and-drop.
 */

// Initialize global variables for the edit modal
let currentEditType = null; // 'list' or 'task'
let currentEditId = null;
let currentListId = null; // Only needed for tasks

// Sorting state variables
let questsSortState = { type: null, order: 'asc' }; // type: 'name' or 'creation'
let tasksSortState = { type: null, order: 'asc' }; // type: 'title' or 'creation'

// Keys for localStorage
const LOCAL_STORAGE_KEYS = {
    quests: 'questsSortPreference',
    tasks: 'tasksSortPreference'
};

/**
 * Function to show the edit modal
 * @param {string} type - Type of item ('list' or 'task')
 * @param {number} id - ID of the item
 * @param {string} currentName - Current name/title of the item
 * @param {number} [listId=null] - ID of the list (for tasks)
 */
function showEditModal(type, id, currentName, listId = null) {
    currentEditType = type;
    currentEditId = id;
    currentListId = listId;

    // Set modal title
    const modalTitle = document.getElementById('modal-title');
    if (modalTitle) {
        modalTitle.textContent = type === 'list' ? 'Edit Quest Name' : 'Edit Objective Name';
    }

    // Set current name in input
    const editInput = document.getElementById('edit-input');
    if (editInput) {
        editInput.value = currentName;
    }

    // Show the modal
    const editModal = document.getElementById('edit-modal');
    if (editModal) {
        editModal.style.display = 'flex';
    }

    // Focus on the input field
    if (editInput) {
        editInput.focus();
    }
}

/**
 * Function to close the edit modal
 */
function closeEditModal() {
    const editModal = document.getElementById('edit-modal');
    if (editModal) {
        editModal.style.display = 'none';
    }

    // Reset variables
    currentEditType = null;
    currentEditId = null;
    currentListId = null;
}

/**
 * Function to toggle objective completion status
 * @param {number} listId - ID of the quest
 * @param {number} taskId - ID of the objective
 */
function toggleComplete(listId, taskId) {
    fetch(`/list/${listId}/complete/${taskId}`, {
        method: 'POST'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const taskCard = document.querySelector(`.task-card[data-task-id='${taskId}']`);
                if (taskCard) {
                    taskCard.classList.toggle('completed');
                    const checkbox = taskCard.querySelector('.checkbox');
                    if (checkbox) {
                        checkbox.innerHTML = data.completed ? '&#10003;' : '&#9675;';
                    }
                }
            } else {
                alert(data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

/**
 * Function to delete an objective
 * @param {number} listId - ID of the quest
 * @param {number} taskId - ID of the objective
 */
function deleteTask(listId, taskId) {
    if (confirm('Are you sure you want to delete this objective?')) {
        fetch(`/list/${listId}/delete/${taskId}`, {
            method: 'DELETE'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const taskCard = document.querySelector(`.task-card[data-task-id='${taskId}']`);
                    if (taskCard) {
                        taskCard.remove();
                    }
                } else {
                    alert(data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }
}

/**
 * Function to delete a quest
 * @param {number} listId - ID of the quest
 */
function deleteList(listId) {
    if (confirm('Are you sure you want to delete this quest and all its objectives?')) {
        fetch(`/delete_list/${listId}`, {
            method: 'DELETE'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const listCard = document.querySelector(`.list-card[data-list-id='${listId}']`);
                    if (listCard) {
                        listCard.remove();
                    }
                } else {
                    alert(data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }
}

/**
 * Function to update the quest name via AJAX
 * @param {number} listId - ID of the quest
 * @param {string} newName - New name of the quest
 */
function updateListName(listId, newName) {
    fetch(`/update_list/${listId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName }),
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const listCard = document.querySelector(`.list-card[data-list-id='${listId}']`);
                if (listCard) {
                    const listNameElement = listCard.querySelector('.list-name');
                    if (listNameElement) {
                        listNameElement.textContent = newName;
                    }
                }
            } else {
                alert(data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

/**
 * Function to update the objective title via AJAX
 * @param {number} listId - ID of the quest
 * @param {number} taskId - ID of the objective
 * @param {string} newTitle - New title of the objective
 */
function updateTaskTitle(listId, taskId, newTitle) {
    fetch(`/update_task/${listId}/${taskId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle }),
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const taskCard = document.querySelector(`.task-card[data-task-id='${taskId}']`);
                if (taskCard) {
                    const taskTitleElement = taskCard.querySelector('.task-title');
                    if (taskTitleElement) {
                        taskTitleElement.textContent = newTitle;
                    }
                }
            } else {
                alert(data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

/**
 * Function to add a new objective to the DOM
 * @param {Object} task - Task object containing id, title, and completed status
 */
function addTaskToDOM(task) {
    const tasksContainer = document.querySelector('.tasks-container');
    if (tasksContainer) {
        const listId = tasksContainer.getAttribute('data-list-id');

        const taskCard = document.createElement('div');
        taskCard.classList.add('task-card');
        taskCard.setAttribute('data-task-id', task.id);

        // Create Drag Handle
        const dragHandle = document.createElement('div');
        dragHandle.classList.add('drag-handle');
        dragHandle.setAttribute('aria-label', 'Drag Handle');
        dragHandle.setAttribute('title', 'Drag to reorder');
        dragHandle.innerHTML = '&#9776;'; // Unicode for the hamburger menu icon

        const taskContent = document.createElement('div');
        taskContent.classList.add('task-content');
        taskContent.style.flexGrow = '1';

        const checkbox = document.createElement('div');
        checkbox.classList.add('checkbox');
        checkbox.innerHTML = task.completed ? '&#10003;' : '&#9675;'; // Checked or unchecked

        const taskTitle = document.createElement('div');
        taskTitle.classList.add('task-title');
        taskTitle.textContent = task.title;

        taskContent.appendChild(checkbox);
        taskContent.appendChild(taskTitle);

        const taskButtons = document.createElement('div');
        taskButtons.classList.add('task-buttons');

        const editButton = document.createElement('button');
        editButton.classList.add('edit-task-button');
        editButton.innerHTML = '&#9998;'; // Pencil icon

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-task-button');
        deleteButton.innerHTML = '&times;'; // Times (X) icon

        taskButtons.appendChild(editButton);
        taskButtons.appendChild(deleteButton);

        taskCard.appendChild(dragHandle);
        taskCard.appendChild(taskContent);
        taskCard.appendChild(taskButtons);

        // Append the new task to the container
        tasksContainer.appendChild(taskCard);

        // Add event listeners
        if (taskContent) {
            taskContent.addEventListener('click', () => toggleComplete(listId, task.id));
        }
        if (editButton) {
            editButton.addEventListener('click', (event) => {
                event.stopPropagation();
                showEditModal('task', task.id, task.title, listId);
            });
        }
        if (deleteButton) {
            deleteButton.addEventListener('click', (event) => {
                event.stopPropagation();
                deleteTask(listId, task.id);
            });
        }
    }
}

/**
 * Function to add a new quest to the DOM
 * @param {Object} list - List object containing id and name
 */
function addListToDOM(list) {
    const listsContainer = document.querySelector('.lists-container');
    if (listsContainer) {
        const listCard = document.createElement('div');
        listCard.classList.add('list-card');
        listCard.setAttribute('data-list-id', list.id);

        // Create Drag Handle
        const dragHandle = document.createElement('div');
        dragHandle.classList.add('drag-handle');
        dragHandle.setAttribute('aria-label', 'Drag Handle');
        dragHandle.setAttribute('title', 'Drag to reorder');
        dragHandle.innerHTML = '&#9776;'; // Unicode for the hamburger menu icon

        const listLink = document.createElement('a');
        listLink.href = `/list/${list.id}`;
        listLink.style.flexGrow = '1';

        const listHeader = document.createElement('div');
        listHeader.classList.add('list-header');

        const listName = document.createElement('span');
        listName.classList.add('list-name');
        listName.textContent = list.name;

        listHeader.appendChild(listName);
        listLink.appendChild(listHeader);

        const editButton = document.createElement('button');
        editButton.classList.add('edit-list-button');
        editButton.innerHTML = '&#9998;'; // Pencil icon

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-list-button');
        deleteButton.innerHTML = '&times;'; // Times (X) icon

        listCard.appendChild(dragHandle);
        listCard.appendChild(listLink);
        listCard.appendChild(editButton);
        listCard.appendChild(deleteButton);

        // Append the new list to the container
        listsContainer.appendChild(listCard);

        // Add event listeners
        if (editButton) {
            editButton.addEventListener('click', (event) => {
                event.stopPropagation();
                showEditModal('list', list.id, list.name);
            });
        }
        if (deleteButton) {
            deleteButton.addEventListener('click', (event) => {
                event.stopPropagation();
                deleteList(list.id);
            });
        }
    }
}

/**
 * Function to update the order of quests on the server
 */
function updateQuestOrder() {
    const questsContainer = document.getElementById('quests-container');
    if (!questsContainer) return;

    const quests = questsContainer.querySelectorAll('.list-card');
    const orderedIds = Array.from(quests).map(quest => quest.getAttribute('data-list-id'));

    fetch('/update_quest_order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordered_ids: orderedIds })
    })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                alert('Failed to update quest order.');
            } else {
                // Set sort state to manual
                questsSortState.type = null;
                questsSortState.order = 'asc';
                resetSortButtons('quests');

                // Clear sorting preference from localStorage
                localStorage.removeItem(LOCAL_STORAGE_KEYS.quests);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

/**
 * Function to update the order of objectives within a quest on the server
 */
function updateObjectiveOrder() {
    const objectivesContainer = document.getElementById('objectives-container');
    if (!objectivesContainer) return;

    const listId = objectivesContainer.getAttribute('data-list-id');
    const objectives = objectivesContainer.querySelectorAll('.task-card');
    const orderedIds = Array.from(objectives).map(obj => obj.getAttribute('data-task-id'));

    fetch(`/update_objective_order/${listId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordered_ids: orderedIds })
    })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                alert('Failed to update objective order.');
            } else {
                // Set sort state to manual
                tasksSortState.type = null;
                tasksSortState.order = 'asc';
                resetSortButtons('tasks');

                // Clear sorting preference from localStorage
                localStorage.removeItem(LOCAL_STORAGE_KEYS.tasks);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

/**
 * Function to handle the back button click
 */
function handleBackButton() {
    window.location.href = '/'; // Assuming the root URL is the index page
}

/**
 * Function to initialize SortableJS with drag handles
 */
function initializeSortable() {
    // Initialize SortableJS for Quests (Lists)
    const questsContainer = document.getElementById('quests-container');
    if (questsContainer) {
        Sortable.create(questsContainer, {
            animation: 150,
            handle: '.drag-handle', // Restrict drag to the drag handle
            ghostClass: 'sortable-ghost', // Class name for the drop placeholder
            onEnd: function (evt) {
                // Update quest order when drag-and-drop action ends
                updateQuestOrder();
            },
            // Optional: Enhance mobile experience
            delay: 150, // Delay in ms before drag starts
            touchStartThreshold: 10, // Threshold for touch movements
        });
    }

    // Initialize SortableJS for Objectives (Tasks)
    const objectivesContainer = document.getElementById('objectives-container');
    if (objectivesContainer) {
        Sortable.create(objectivesContainer, {
            animation: 150,
            handle: '.drag-handle', // Restrict drag to the drag handle
            ghostClass: 'sortable-ghost',
            onEnd: function (evt) {
                // Update objective order when drag-and-drop action ends
                updateObjectiveOrder();
            },
            // Optional: Enhance mobile experience
            delay: 150,
            touchStartThreshold: 10,
        });
    }
}

/**
 * Function to sort Quests based on field and order
 * @param {string} field - 'name' or 'creation'
 * @param {string} order - 'asc' or 'desc'
 */
function sortQuests(field, order) {
    const questsContainer = document.getElementById('quests-container');
    if (!questsContainer) return;

    const quests = Array.from(questsContainer.querySelectorAll('.list-card'));

    let sortedQuests = quests.sort((a, b) => {
        let valueA, valueB;
        if (field === 'name') {
            valueA = a.querySelector('.list-name').textContent.toLowerCase();
            valueB = b.querySelector('.list-name').textContent.toLowerCase();
        } else if (field === 'creation') {
            valueA = parseInt(a.getAttribute('data-list-id'));
            valueB = parseInt(b.getAttribute('data-list-id'));
        }
        if (valueA < valueB) return order === 'asc' ? -1 : 1;
        if (valueA > valueB) return order === 'asc' ? 1 : -1;
        return 0;
    });

    // Append sorted quests to the container
    sortedQuests.forEach(quest => questsContainer.appendChild(quest));
}

/**
 * Function to sort Tasks based on field and order
 * @param {string} field - 'title' or 'creation'
 * @param {string} order - 'asc' or 'desc'
 */
function sortTasks(field, order) {
    const tasksContainer = document.getElementById('objectives-container');
    if (!tasksContainer) return;

    const tasks = Array.from(tasksContainer.querySelectorAll('.task-card'));

    let sortedTasks = [];

    if (field === 'title') {
        sortedTasks = tasks.sort((a, b) => {
            const titleA = a.querySelector('.task-title').textContent.toLowerCase();
            const titleB = b.querySelector('.task-title').textContent.toLowerCase();
            if (titleA < titleB) return order === 'asc' ? -1 : 1;
            if (titleA > titleB) return order === 'asc' ? 1 : -1;
            return 0;
        });
    } else if (field === 'creation') {
        sortedTasks = tasks.sort((a, b) => {
            const idA = parseInt(a.getAttribute('data-task-id'));
            const idB = parseInt(b.getAttribute('data-task-id'));
            if (idA < idB) return order === 'asc' ? -1 : 1;
            if (idA > idB) return order === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // Append sorted tasks to the container
    sortedTasks.forEach(task => tasksContainer.appendChild(task));
}

/**
 * Function to update the visual state of sort buttons
 * @param {string} category - 'quests' or 'tasks'
 * @param {string} activeButtonId - ID of the currently active sort button
 * @param {string} order - 'asc' or 'desc'
 */
function updateSortButtonsVisual(category, activeButtonId, order) {
    let sortButtonIds = [];
    if (category === 'quests') {
        sortButtonIds = ['sort-name-button', 'sort-creation-button'];
    } else if (category === 'tasks') {
        sortButtonIds = ['sort-title-button', 'sort-creation-task-button'];
    }

    sortButtonIds.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        const sortIcon = button ? button.querySelector('.sort-icon') : null;
        if (button) {
            if (buttonId === activeButtonId) {
                // Update the sort order arrow
                if (sortIcon) {
                    sortIcon.textContent = order === 'asc' ? ' ▲' : ' ▼';
                } else {
                    // If sort-icon doesn't exist, create it
                    const newSortIcon = document.createElement('span');
                    newSortIcon.classList.add('sort-icon');
                    newSortIcon.textContent = order === 'asc' ? ' ▲' : ' ▼';
                    button.appendChild(newSortIcon);
                }
                button.classList.add('active');
            } else {
                // Reset other buttons
                if (sortIcon) {
                    sortIcon.textContent = '';
                }
                button.classList.remove('active');
            }
        }
    });
}

/**
 * Function to reset sort buttons' visual state
 * @param {string} category - 'quests' or 'tasks'
 */
function resetSortButtons(category) {
    let sortButtonIds = [];
    if (category === 'quests') {
        sortButtonIds = ['sort-name-button', 'sort-creation-button'];
    } else if (category === 'tasks') {
        sortButtonIds = ['sort-title-button', 'sort-creation-task-button'];
    }

    sortButtonIds.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        const sortIcon = button ? button.querySelector('.sort-icon') : null;
        if (button) {
            if (sortIcon) {
                sortIcon.textContent = '';
            }
            button.classList.remove('active');
        }
    });
}

/**
 * Function to toggle sort order and update button state
 * @param {HTMLElement} button - The sort button element
 */
function toggleSortOrder(button) {
    const currentOrder = button.getAttribute('data-sort-order');
    const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
    button.setAttribute('data-sort-order', newOrder);

    const sortIcon = button.querySelector('.sort-icon');
    if (sortIcon) {
        sortIcon.textContent = newOrder === 'asc' ? '▲' : '▼';
    }

    // Reset other buttons in the same container
    const container = button.closest('.sort-and-group-controls');
    if (container) {
        container.querySelectorAll('button').forEach(btn => {
            if (btn !== button) {
                btn.setAttribute('data-sort-order', 'asc');
                const icon = btn.querySelector('.sort-icon');
                if (icon) icon.textContent = '';
            }
        });
    }
}

/**
 * Function to initialize sorting buttons event listeners
 */
function initializeSortingButtons() {
    // Quests Sorting Buttons
    const sortNameButton = document.getElementById('sort-name-button');
    const sortCreationButton = document.getElementById('sort-creation-button');

    if (sortNameButton) {
        sortNameButton.addEventListener('click', () => {
            toggleSortOrder(sortNameButton);
            sortQuests('name', sortNameButton.getAttribute('data-sort-order'));
        });
    }

    if (sortCreationButton) {
        sortCreationButton.addEventListener('click', () => {
            toggleSortOrder(sortCreationButton);
            sortQuests('creation', sortCreationButton.getAttribute('data-sort-order'));
        });
    }

    // Tasks Sorting Buttons
    const sortTitleButton = document.getElementById('sort-title-button');
    const sortCreationTaskButton = document.getElementById('sort-creation-task-button');

    if (sortTitleButton) {
        sortTitleButton.addEventListener('click', () => {
            toggleSortOrder(sortTitleButton);
            sortTasks('title', sortTitleButton.getAttribute('data-sort-order'));
        });
    }

    if (sortCreationTaskButton) {
        sortCreationTaskButton.addEventListener('click', () => {
            toggleSortOrder(sortCreationTaskButton);
            sortTasks('creation', sortCreationTaskButton.getAttribute('data-sort-order'));
        });
    }
}

/**
 * Function to save sort preferences to localStorage
 * @param {string} category - 'quests' or 'tasks'
 * @param {string} type - Sort type (e.g., 'name', 'creation', 'title')
 * @param {string} order - 'asc' or 'desc'
 */
function saveSortPreference(category, type, order) {
    if (!LOCAL_STORAGE_KEYS[category]) return;
    const preference = {
        type: type,
        order: order
    };
    localStorage.setItem(LOCAL_STORAGE_KEYS[category], JSON.stringify(preference));
}

/**
 * Function to load sort preferences from localStorage
 * @param {string} category - 'quests' or 'tasks'
 * @returns {Object|null} - Returns the preference object or null if not found
 */
function loadSortPreference(category) {
    if (!LOCAL_STORAGE_KEYS[category]) return null;
    const preference = localStorage.getItem(LOCAL_STORAGE_KEYS[category]);
    return preference ? JSON.parse(preference) : null;
}

/**
 * Function to initialize SortableJS with drag handles
 */
function initializeSortable() {
    // Initialize SortableJS for Quests (Lists)
    const questsContainer = document.getElementById('quests-container');
    if (questsContainer) {
        Sortable.create(questsContainer, {
            animation: 150,
            handle: '.drag-handle', // Restrict drag to the drag handle
            ghostClass: 'sortable-ghost', // Class name for the drop placeholder
            onEnd: function (evt) {
                // Update quest order when drag-and-drop action ends
                updateQuestOrder();
            },
            // Optional: Enhance mobile experience
            delay: 150, // Delay in ms before drag starts
            touchStartThreshold: 10, // Threshold for touch movements
        });
    }

    // Initialize SortableJS for Objectives (Tasks)
    const objectivesContainer = document.getElementById('objectives-container');
    if (objectivesContainer) {
        Sortable.create(objectivesContainer, {
            animation: 150,
            handle: '.drag-handle', // Restrict drag to the drag handle
            ghostClass: 'sortable-ghost',
            onEnd: function (evt) {
                // Update objective order when drag-and-drop action ends
                updateObjectiveOrder();
            },
            // Optional: Enhance mobile experience
            delay: 150,
            touchStartThreshold: 10,
        });
    }
}

/**
 * Function to apply saved sorting preferences
 */
function applySavedSortingPreferences() {
    // Apply Quests Sorting Preference
    const savedQuestsSort = loadSortPreference('quests');
    if (savedQuestsSort) {
        sortQuests(savedQuestsSort.type, savedQuestsSort.order);
        updateSortButtonsVisual('quests', getSortButtonId('quests', savedQuestsSort.type), savedQuestsSort.order);
    }

    // Apply Tasks Sorting Preference
    const savedTasksSort = loadSortPreference('tasks');
    if (savedTasksSort) {
        sortTasks(savedTasksSort.type, savedTasksSort.order);
        updateSortButtonsVisual('tasks', getSortButtonId('tasks', savedTasksSort.type), savedTasksSort.order);
    }
}

/**
 * Helper function to get the sort button ID based on category and type
 * @param {string} category - 'quests' or 'tasks'
 * @param {string} type - Sort type (e.g., 'name', 'creation', 'title')
 * @returns {string|null} - Returns the button ID or null if not found
 */
function getSortButtonId(category, type) {
    if (category === 'quests') {
        if (type === 'name') return 'sort-name-button';
        if (type === 'creation') return 'sort-creation-button';
    } else if (category === 'tasks') {
        if (type === 'title') return 'sort-title-button';
        if (type === 'creation') return 'sort-creation-task-button';
    }
    return null;
}

/**
 * Function to initialize all event listeners
 */
function initializeEventListeners() {
    // Back button
    const backButton = document.querySelector('.back-button');
    if (backButton) {
        backButton.addEventListener('click', handleBackButton);
    }

    // Edit form submission
    const editForm = document.getElementById('edit-form');
    if (editForm) {
        editForm.addEventListener('submit', function (event) {
            event.preventDefault();

            const newName = document.getElementById('edit-input').value.trim();

            if (newName === '') {
                alert('Name cannot be empty.');
                return;
            }

            if (currentEditType === 'list') {
                updateListName(currentEditId, newName);
            } else if (currentEditType === 'task') {
                updateTaskTitle(currentListId, currentEditId, newName);
            }

            // Close the modal after submission
            closeEditModal();
        });
    }

    // Close modal when clicking outside
    window.addEventListener('click', function (event) {
        const editModal = document.getElementById('edit-modal');
        if (editModal && event.target === editModal) {
            closeEditModal();
        }
    });

    // Add Task Form
    const addTaskForm = document.querySelector('.add-task-form');
    if (addTaskForm) {
        addTaskForm.addEventListener('submit', function (event) {
            event.preventDefault();

            const listId = addTaskForm.getAttribute('data-list-id');
            const formData = new FormData(addTaskForm);
            const title = formData.get('title');

            if (title.trim() === '') {
                alert('Please enter an objective title.');
                return;
            }

            fetch(`/list/${listId}/add_task`, {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        alert(data.error);
                    } else {
                        addTaskToDOM(data);
                        addTaskForm.reset();
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                });
        });
    }

    // Add Quest Form
    const addListForm = document.querySelector('.add-list-form');
    if (addListForm) {
        addListForm.addEventListener('submit', function (event) {
            event.preventDefault();

            const formData = new FormData(addListForm);
            let name = formData.get('name');

            // Trim whitespace
            name = name.trim();

            fetch('/add_list', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        alert(data.error);
                    } else {
                        addListToDOM(data);
                        addListForm.reset();
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                });
        });
    }

    // Initialize SortableJS with drag handles
    initializeSortable();

    // Initialize Sorting functionality
    initializeSortingButtons();

    // Apply saved sorting preferences
    applySavedSortingPreferences();

    // Add event listeners for existing elements
    document.querySelectorAll('.task-card').forEach(card => {
        const listId = card.closest('.tasks-container').dataset.listId;
        const taskId = card.dataset.taskId;

        const taskContent = card.querySelector('.task-content');
        const editButton = card.querySelector('.edit-task-button');
        const deleteButton = card.querySelector('.delete-task-button');

        if (taskContent) {
            taskContent.addEventListener('click', () => toggleComplete(listId, taskId));
        }

        if (editButton) {
            editButton.addEventListener('click', (event) => {
                event.stopPropagation();
                const taskTitle = card.querySelector('.task-title').textContent;
                showEditModal('task', taskId, taskTitle, listId);
            });
        }

        if (deleteButton) {
            deleteButton.addEventListener('click', (event) => {
                event.stopPropagation();
                deleteTask(listId, taskId);
            });
        }
    });

    document.querySelectorAll('.list-card').forEach(card => {
        const listId = card.dataset.listId;

        const editButton = card.querySelector('.edit-list-button');
        const deleteButton = card.querySelector('.delete-list-button');

        if (editButton) {
            editButton.addEventListener('click', (event) => {
                event.stopPropagation();
                const listName = card.querySelector('.list-name').textContent;
                showEditModal('list', listId, listName);
            });
        }

        if (deleteButton) {
            deleteButton.addEventListener('click', (event) => {
                event.stopPropagation();
                deleteList(listId);
            });
        }
    });
}

/**
 * Function to initialize all components when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function () {
    initializeEventListeners();
});
