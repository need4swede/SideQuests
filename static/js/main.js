/**
 * main.js - JavaScript functions for SideQuests app
 * Includes drag-and-drop functionality using SortableJS
 */

// Initialize global variables for the edit modal
let currentEditType = null; // 'list' or 'task'
let currentEditId = null;
let currentListId = null; // Only needed for tasks

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
    modalTitle.textContent = type === 'list' ? 'Edit Quest Name' : 'Edit Objective Name';

    // Set current name in input
    const editInput = document.getElementById('edit-input');
    editInput.value = currentName;

    // Show the modal
    const editModal = document.getElementById('edit-modal');
    editModal.style.display = 'flex';

    // Focus on the input field
    editInput.focus();
}

/**
 * Function to close the edit modal
 */
function closeEditModal() {
    const editModal = document.getElementById('edit-modal');
    editModal.style.display = 'none';

    // Reset variables
    currentEditType = null;
    currentEditId = null;
    currentListId = null;
}

// Handle form submission for editing
document.getElementById('edit-form').addEventListener('submit', function (event) {
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

// Close the modal when clicking outside of it
window.addEventListener('click', function (event) {
    const editModal = document.getElementById('edit-modal');
    if (event.target === editModal) {
        closeEditModal();
    }
});

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
                    checkbox.innerHTML = data.completed ? '&#10003;' : '&#9675;';
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
                    listNameElement.textContent = newName;
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
                    taskTitleElement.textContent = newTitle;
                }
            } else {
                alert(data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

// Initialize after DOM content is loaded
document.addEventListener('DOMContentLoaded', function () {
    // Handle Add Objective Form Submission
    const addTaskForm = document.querySelector('.add-task-form');
    if (addTaskForm) {
        addTaskForm.addEventListener('submit', function (event) {
            event.preventDefault(); // Prevent the default form submission

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

    // Handle Add Quest Form Submission
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
});

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

        const taskContent = document.createElement('div');
        taskContent.classList.add('task-content');
        taskContent.style.flexGrow = '1';
        taskContent.setAttribute('onclick', `toggleComplete(${listId}, ${task.id})`);

        const checkbox = document.createElement('div');
        checkbox.classList.add('checkbox');
        checkbox.innerHTML = '&#9675;'; // Unchecked circle

        const taskTitle = document.createElement('div');
        taskTitle.classList.add('task-title');
        taskTitle.textContent = task.title;

        taskContent.appendChild(checkbox);
        taskContent.appendChild(taskTitle);

        const taskButtons = document.createElement('div');
        taskButtons.classList.add('task-buttons');

        const editButton = document.createElement('button');
        editButton.classList.add('edit-task-button');
        editButton.innerHTML = '&#9998;';
        editButton.addEventListener('click', function (event) {
            event.stopPropagation();
            showEditModal('task', task.id, task.title, listId);
        });

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-task-button');
        deleteButton.innerHTML = '&times;';
        deleteButton.addEventListener('click', function (event) {
            event.stopPropagation();
            deleteTask(listId, task.id);
        });

        taskButtons.appendChild(editButton);
        taskButtons.appendChild(deleteButton);

        taskCard.appendChild(taskContent);
        taskCard.appendChild(taskButtons);

        // Append the new task to the container
        tasksContainer.appendChild(taskCard);
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
        editButton.innerHTML = '&#9998;';
        editButton.addEventListener('click', function (event) {
            event.stopPropagation();
            showEditModal('list', list.id, list.name);
        });

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-list-button');
        deleteButton.innerHTML = '&times;';
        deleteButton.addEventListener('click', function (event) {
            event.stopPropagation();
            deleteList(list.id);
        });

        listCard.appendChild(listLink);
        listCard.appendChild(editButton);
        listCard.appendChild(deleteButton);

        // Append the new list to the container
        listsContainer.appendChild(listCard);
    }
}

/*===========================================
=            Drag-and-Drop Sorting          =
===========================================*/

// Initialize SortableJS for Quests (Lists)
const questsContainer = document.getElementById('quests-container');
if (questsContainer) {
    Sortable.create(questsContainer, {
        animation: 150,
        handle: '.list-card', // Allow dragging by clicking on the list card
        ghostClass: 'sortable-ghost', // Class name for the drop placeholder
        onEnd: function (evt) {
            // Update quest order when drag-and-drop action ends
            updateQuestOrder();
        }
    });
}

// Initialize SortableJS for Objectives (Tasks)
const objectivesContainer = document.getElementById('objectives-container');
if (objectivesContainer) {
    Sortable.create(objectivesContainer, {
        animation: 150,
        handle: '.task-card', // Allow dragging by clicking on the task card
        ghostClass: 'sortable-ghost',
        onEnd: function (evt) {
            // Update objective order when drag-and-drop action ends
            updateObjectiveOrder();
        }
    });
}

/**
 * Function to update the order of quests on the server
 */
function updateQuestOrder() {
    const questsContainer = document.getElementById('quests-container');
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
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

/*=====  End of Drag-and-Drop Sorting  =====*/
