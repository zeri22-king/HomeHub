// ================================
// NAVIGATION
// ================================

function showPage(pageId) {

    // Alle Seiten ausblenden
    const pages = document.querySelectorAll(".page");

    pages.forEach(page => {
        page.classList.remove("active");
    });


    // Gewählte Seite anzeigen
    const selectedPage =
        document.getElementById(pageId);

    if (selectedPage) {
        selectedPage.classList.add("active");
    }


    // Alle Sidebar-Buttons deaktivieren
    const navButtons =
        document.querySelectorAll(".nav-button");

    navButtons.forEach(button => {
        button.classList.remove("active-nav");
    });


    // Passenden Sidebar-Button aktivieren
    navButtons.forEach(button => {

        const action =
            button.getAttribute("onclick");

        if (
            action &&
            action.includes(`showPage('${pageId}')`)
        ) {
            button.classList.add("active-nav");
        }

    });


    // Dashboard aktualisieren
    updateHome();
}



// ================================
// UHR
// ================================

function updateClock() {

    const now = new Date();


    const time =
        now.toLocaleTimeString("de-DE");


    const date =
        now.toLocaleDateString("de-DE", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });


    const clock =
        document.getElementById("clock");

    const dateElement =
        document.getElementById("date");


    if (clock) {
        clock.textContent = time;
    }

    if (dateElement) {
        dateElement.textContent = date;
    }

}


setInterval(updateClock, 1000);



// ================================
// EINKAUFSLISTE
// ================================

let shoppingItems =
    JSON.parse(
        localStorage.getItem("homehubShopping")
    ) || [];



function saveShopping() {

    localStorage.setItem(
        "homehubShopping",
        JSON.stringify(shoppingItems)
    );

}



// Artikel hinzufügen

function addShoppingItem() {

    const input =
        document.getElementById("shoppingInput");

    const quantityInput =
        document.getElementById("shoppingQuantity");

    const category =
        document.getElementById("shoppingCategory");


    const name =
        input.value.trim();


    const quantity =
        parseInt(quantityInput.value) || 1;


    // Leeren Artikel verhindern
    if (name === "") {
        return;
    }


    shoppingItems.push({

        name: name,

        quantity: quantity,

        category: category.value,

        completed: false

    });


    // Eingabefelder zurücksetzen

    input.value = "";

    quantityInput.value = 1;


    saveShopping();

    updateShoppingList();

}



// Einkaufsliste anzeigen

function updateShoppingList() {

    const list =
        document.getElementById("shoppingList");


    if (!list) {
        return;
    }


    list.innerHTML = "";


    shoppingItems.forEach(
        (item, index) => {

            const li =
                document.createElement("li");


            li.className =
                "shopping-item";


            if (item.completed) {
                li.classList.add("completed");
            }


            li.innerHTML = `

                <input
                    type="checkbox"
                    ${item.completed ? "checked" : ""}
                    onchange="toggleShoppingItem(${index})"
                >

                <div class="item-content">

                    <div class="item-name">
                        ${escapeHTML(item.name)}
                    </div>

                    <div class="item-details">
                        Menge: ${item.quantity}
                        · ${escapeHTML(item.category)}
                    </div>

                </div>

                <button
                    class="delete-button"
                    onclick="deleteShoppingItem(${index})"
                >
                    🗑️
                </button>

            `;


            list.appendChild(li);

        }
    );


    updateHome();

}



// Einkauf abhaken

function toggleShoppingItem(index) {

    if (!shoppingItems[index]) {
        return;
    }


    shoppingItems[index].completed =
        !shoppingItems[index].completed;


    saveShopping();

    updateShoppingList();

}



// Einkauf löschen

function deleteShoppingItem(index) {

    if (!shoppingItems[index]) {
        return;
    }


    shoppingItems.splice(index, 1);


    saveShopping();

    updateShoppingList();

}



// Erledigte Einkäufe löschen

function clearCompletedShopping() {

    shoppingItems =
        shoppingItems.filter(
            item => !item.completed
        );


    saveShopping();

    updateShoppingList();

}



// ================================
// HAUSHALT
// ================================

let tasks =
    JSON.parse(
        localStorage.getItem("homehubTasks")
    ) || [];



// Aufgaben speichern

function saveTasks() {

    localStorage.setItem(
        "homehubTasks",
        JSON.stringify(tasks)
    );

}



// Aufgabe hinzufügen

function addTask() {

    const input =
        document.getElementById("taskInput");

    const dateInput =
        document.getElementById("taskDate");

    const intervalInput =
        document.getElementById("taskInterval");


    const name =
        input.value.trim();


    if (name === "") {
        return;
    }


    let dueDate =
        dateInput.value;


    // Wenn kein Datum ausgewählt wurde:
    // heutiges Datum verwenden

    if (dueDate === "") {

        dueDate =
            formatDate(new Date());

    }


    tasks.push({

        name: name,

        dueDate: dueDate,

        interval:
            parseInt(intervalInput.value) || 0,

        completed: false

    });


    // Eingaben zurücksetzen

    input.value = "";

    dateInput.value = "";


    saveTasks();

    updateTasks();

}



// Haushaltsaufgaben anzeigen

function updateTasks() {

    const list =
        document.getElementById("taskList");


    if (!list) {
        return;
    }


    list.innerHTML = "";


    tasks.forEach(
        (task, index) => {

            const li =
                document.createElement("li");


            li.className =
                "task-item";


            if (task.completed) {
                li.classList.add("completed");
            }


            const due =
                parseLocalDate(task.dueDate);


            const today =
                new Date();


            today.setHours(
                0,
                0,
                0,
                0
            );


            const isOverdue =
                due < today &&
                !task.completed;


            let intervalText =
                "Einmalig";


            if (task.interval === 1) {
                intervalText =
                    "Jeden Tag";
            }

            else if (task.interval === 3) {
                intervalText =
                    "Alle 3 Tage";
            }

            else if (task.interval === 7) {
                intervalText =
                    "Jede Woche";
            }

            else if (task.interval === 14) {
                intervalText =
                    "Alle 2 Wochen";
            }

            else if (task.interval === 30) {
                intervalText =
                    "Jeden Monat";
            }


            li.innerHTML = `

                <input
                    type="checkbox"
                    ${task.completed ? "checked" : ""}
                    onchange="completeTask(${index})"
                >

                <div class="item-content">

                    <div class="item-name">
                        ${escapeHTML(task.name)}
                    </div>

                    <div
                        class="
                            task-date
                            ${isOverdue ? "task-overdue" : ""}
                        "
                    >
                        Fällig:
                        ${formatDateGerman(task.dueDate)}

                        · ${intervalText}
                    </div>

                </div>

                <button
                    class="delete-button"
                    onclick="deleteTask(${index})"
                >
                    🗑️
                </button>

            `;


            list.appendChild(li);

        }
    );


    updateHome();

}



// Haushaltsaufgabe erledigen

function completeTask(index) {

    const task =
        tasks[index];


    if (!task) {
        return;
    }


    // Wiederkehrende Aufgabe

    if (task.interval > 0) {

        const currentDate =
            parseLocalDate(task.dueDate);


        currentDate.setDate(
            currentDate.getDate() +
            task.interval
        );


        task.dueDate =
            formatDate(currentDate);


        // Wiederkehrende Aufgabe bleibt offen
        task.completed = false;

    }


    // Einmalige Aufgabe

    else {

        task.completed =
            !task.completed;

    }


    saveTasks();

    updateTasks();

}



// Aufgabe löschen

function deleteTask(index) {

    if (!tasks[index]) {
        return;
    }


    tasks.splice(index, 1);


    saveTasks();

    updateTasks();

}



// Erledigte Aufgaben löschen

function clearCompletedTasks() {

    tasks =
        tasks.filter(
            task => !task.completed
        );


    saveTasks();

    updateTasks();

}



// ================================
// HOME
// ================================

function updateHome() {

    // Offene Einkäufe

    const openShopping =
        shoppingItems.filter(
            item => !item.completed
        ).length;


    // Heutiges Datum

    const today =
        new Date();


    today.setHours(
        0,
        0,
        0,
        0
    );


    // Fällige Aufgaben

    const dueTasks =
        tasks.filter(
            task => {

                if (task.completed) {
                    return false;
                }


                const date =
                    parseLocalDate(task.dueDate);


                return date <= today;

            }
        ).length;


    // Einkauf-Zahl aktualisieren

    const shoppingCount =
        document.getElementById(
            "shoppingCount"
        );


    if (shoppingCount) {

        shoppingCount.textContent =
            openShopping +
            " offene Artikel";

    }


    // Haushalts-Zahl aktualisieren

    const taskCount =
        document.getElementById(
            "taskCount"
        );


    if (taskCount) {

        taskCount.textContent =
            dueTasks +
            " fällige Aufgaben";

    }


    // Heute aktualisieren

    updateTodayPanel();


    // Fortschritt aktualisieren

    updateProgress();

}



// ================================
// HEUTE-DASHBOARD
// ================================

function updateTodayPanel() {

    const panel =
        document.getElementById(
            "todayPanel"
        );


    if (!panel) {
        return;
    }


    panel.innerHTML = "";


    let somethingShown = false;


    const today =
        new Date();


    today.setHours(
        0,
        0,
        0,
        0
    );


    // =========================
    // HAUSHALT
    // =========================

    tasks.forEach(
        (task, index) => {

            if (task.completed) {
                return;
            }


            const dueDate =
                parseLocalDate(
                    task.dueDate
                );


            if (dueDate <= today) {

                somethingShown = true;


                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "today-item";


                const overdue =
                    dueDate < today;


                item.innerHTML = `

                    <div class="today-icon">
                        🧹
                    </div>

                    <div>

                        <strong>
                            ${escapeHTML(task.name)}
                        </strong>

                        <p>
                            ${
                                overdue
                                    ? "Überfällig"
                                    : "Fällig heute"
                            }
                        </p>

                    </div>

                    <button
                        class="small-action"
                        onclick="completeTask(${index})"
                    >
                        ✓ Erledigt
                    </button>

                `;


                panel.appendChild(item);

            }

        }
    );


    // =========================
    // EINKAUF
    // =========================

    const openShopping =
        shoppingItems.filter(
            item => !item.completed
        );


    if (openShopping.length > 0) {

        somethingShown = true;


        const item =
            document.createElement(
                "div"
            );


        item.className =
            "today-item";


        const preview =
            openShopping
                .slice(0, 3)
                .map(
                    shopping =>
                        `${shopping.quantity}× ${shopping.name}`
                )
                .join(" · ");


        let moreText = "";


        if (openShopping.length > 3) {

            moreText =
                ` + ${openShopping.length - 3} weitere`;

        }


        item.innerHTML = `

            <div class="today-icon">
                🛒
            </div>

            <div>

                <strong>
                    ${openShopping.length}
                    offene Artikel
                </strong>

                <p>
                    ${escapeHTML(preview)}
                    ${escapeHTML(moreText)}
                </p>

            </div>

            <button
                class="small-action"
                onclick="showPage('shopping')"
            >
                Öffnen
            </button>

        `;


        panel.appendChild(item);

    }


    // =========================
    // ALLES ERLEDIGT
    // =========================

    if (!somethingShown) {

        panel.innerHTML = `

            <div class="today-item">

                <div class="today-icon">
                    🎉
                </div>

                <div>

                    <strong>
                        Alles erledigt!
                    </strong>

                    <p>
                        Heute steht nichts mehr an.
                    </p>

                </div>

            </div>

        `;

    }

}



// ================================
// TAGESFORTSCHRITT
// ================================

function updateProgress() {

    const progressText =
        document.getElementById(
            "progressText"
        );


    const progressBar =
        document.getElementById(
            "progressBar"
        );


    if (!progressText || !progressBar) {
        return;
    }


    // Alle Einkäufe

    const totalShopping =
        shoppingItems.length;


    const completedShopping =
        shoppingItems.filter(
            item => item.completed
        ).length;


    // Alle Aufgaben

    const totalTasks =
        tasks.length;


    const completedTasks =
        tasks.filter(
            task => task.completed
        ).length;


    // Alles zusammen

    const total =
        totalShopping +
        totalTasks;


    const completed =
        completedShopping +
        completedTasks;


    // Noch nichts vorhanden

    if (total === 0) {

        progressText.textContent =
            "Noch nichts geplant";


        progressBar.style.width =
            "0%";


        return;
    }


    // Prozent berechnen

    const percentage =
        Math.round(
            (completed / total) * 100
        );


    progressText.textContent =
        percentage +
        "% erledigt";


    progressBar.style.width =
        percentage +
        "%";

}



// ================================
// DATUM
// ================================

// Datum als YYYY-MM-DD

function formatDate(date) {

    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            date.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;

}



// YYYY-MM-DD als lokales Datum lesen

function parseLocalDate(dateString) {

    const parts =
        dateString.split("-");


    return new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
    );

}



// Deutsches Datum

function formatDateGerman(dateString) {

    const parts =
        dateString.split("-");


    return `${parts[2]}.${parts[1]}.${parts[0]}`;

}



// ================================
// SICHERHEIT
// ================================

function escapeHTML(text) {

    const div =
        document.createElement("div");


    div.textContent =
        text;


    return div.innerHTML;

}



// ================================
// START
// ================================

updateClock();

updateShoppingList();

updateTasks();

updateHome();

showPage("home");
// ================================
// DARK MODE
// ================================

function toggleTheme() {

    document.body.classList.toggle(
        "dark-mode"
    );


    const darkMode =
        document.body.classList.contains(
            "dark-mode"
        );


    localStorage.setItem(
        "homehubDarkMode",
        darkMode
    );


    updateThemeButton();
}



// Button-Text aktualisieren

function updateThemeButton() {

    const button =
        document.getElementById(
            "themeButton"
        );


    if (!button) {
        return;
    }


    const darkMode =
        document.body.classList.contains(
            "dark-mode"
        );


    if (darkMode) {

        button.textContent =
            "☀️ Hell Mode";

    } else {

        button.textContent =
            "🌙 Dark Mode";

    }

}



// Gespeicherten Modus laden

function loadTheme() {

    const darkMode =
        localStorage.getItem(
            "homehubDarkMode"
        );


    if (darkMode === "true") {

        document.body.classList.add(
            "dark-mode"
        );

    }


    updateThemeButton();

}


loadTheme();