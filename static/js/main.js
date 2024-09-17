// Remove the toggleDarkMode function and theme initialization code

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

            // Allow empty names; the server will handle it
            // Optionally, you can trim whitespace
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

// Function to add a new task to the DOM
function addTaskToDOM(task) {
    const tasksContainer = document.querySelector('.tasks-container');
    if (tasksContainer) {
        const listId = tasksContainer.getAttribute('data-list-id');

        const taskCard = document.createElement('div');
        taskCard.classList.add('task-card');
        taskCard.setAttribute('data-task-id', task.id);
        taskCard.setAttribute('onclick', `toggleComplete(${listId}, ${task.id})`);

        const taskContent = document.createElement('div');
        taskContent.classList.add('task-content');

        const checkbox = document.createElement('div');
        checkbox.classList.add('checkbox');
        checkbox.innerHTML = '&#9675;'; // Unchecked circle

        const taskTitle = document.createElement('div');
        taskTitle.classList.add('task-title');
        taskTitle.textContent = task.title;

        taskContent.appendChild(checkbox);
        taskContent.appendChild(taskTitle);

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-task-button');
        deleteButton.innerHTML = '&times;';
        deleteButton.addEventListener('click', function (event) {
            event.stopPropagation();
            deleteTask(listId, task.id);
        });

        taskCard.appendChild(taskContent);
        taskCard.appendChild(deleteButton);

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

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-list-button');
        deleteButton.innerHTML = '&times;';
        deleteButton.addEventListener('click', function (event) {
            event.stopPropagation();
            deleteList(list.id);
        });

        listCard.appendChild(listLink);
        listCard.appendChild(deleteButton);

        // Prepend the new list to the top of the container
        listsContainer.insertBefore(listCard, listsContainer.firstChild);
    }
}
