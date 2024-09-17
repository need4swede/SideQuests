// Variables to hold the current edit context
let currentEditType = null; // 'list' or 'task'
let currentEditId = null;
let currentListId = null; // Only needed for tasks

// Function to show the edit modal
function showEditModal(type, id, currentName, listId = null) {
    currentEditType = type;
    currentEditId = id;
    currentListId = listId;

    // Set modal title
    const modalTitle = document.getElementById('modal-title');
    modalTitle.textContent = type === 'list' ? 'Edit List Name' : 'Edit Task Name';

    // Set current name in input
    const editInput = document.getElementById('edit-input');
    editInput.value = currentName;

    // Show the modal
    const editModal = document.getElementById('edit-modal');
    editModal.style.display = 'flex';

    // Focus on the input field
    editInput.focus();
}

// Function to close the edit modal
function closeEditModal() {
    const editModal = document.getElementById('edit-modal');
    editModal.style.display = 'none';

    // Reset variables
    currentEditType = null;
    currentEditId = null;
    currentListId = null;
}

// Handle form submission
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

// Function to toggle task completion status
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

// Function to delete a task
function deleteTask(listId, taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
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

// Function to delete a list
function deleteList(listId) {
    if (confirm('Are you sure you want to delete this list and all its tasks?')) {
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

// Function to update the list name via AJAX
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

// Function to update the task title via AJAX
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

// Handle Add Task Form Submission
document.addEventListener('DOMContentLoaded', function () {
    const addTaskForm = document.querySelector('.add-task-form');
    if (addTaskForm) {
        addTaskForm.addEventListener('submit', function (event) {
            event.preventDefault(); // Prevent the default form submission

            const listId = addTaskForm.getAttribute('data-list-id');
            const formData = new FormData(addTaskForm);
            const title = formData.get('title');

            if (title.trim() === '') {
                alert('Please enter a task title.');
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

    // Handle Add List Form Submission
    const addListForm = document.querySelector('.add-list-form');
    if (addListForm) {
        addListForm.addEventListener('submit', function (event) {
            event.preventDefault();

            const formData = new FormData(addListForm);
            let name = formData.get('name');

            // Trim whitespace (optional)
            name = name.trim();

            // We allow empty names; the server will handle defaulting to today's date

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

// Function to add a new task to the DOM
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

        // Prepend the new task to the top of the list
        tasksContainer.insertBefore(taskCard, tasksContainer.firstChild);
    }
}

// Function to add a new list to the DOM
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

        // Prepend the new list to the top of the container
        listsContainer.insertBefore(listCard, listsContainer.firstChild);
    }
}
