let calendarWeekOffset = 0;

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

// Kalender aktualisieren
if (pageId === "calendar") {
    renderCalendarEvents();
    renderWeekCalendar();
}

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
renderHomeCalendar();

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

renderCalendarEvents();
renderWeekCalendar();
updateHome();

showPage("home");
setTimeout(renderWeekCalendar, 50);
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

// =================================
// EINSTELLUNGEN
// =================================

function clearHomeHubData() {
    const confirmDelete = confirm(
        "Möchtest du wirklich alle HomeHub-Daten löschen?"
    );

    if (!confirmDelete) {
        return;
    }

    localStorage.clear();

    alert("Alle HomeHub-Daten wurden gelöscht.");

    location.reload();
}

// =================================
// DATEN SICHERN
// =================================

function exportHomeHubData() {

    const data = {};

    for (let i = 0; i < localStorage.length; i++) {

        const key = localStorage.key(i);

        data[key] = localStorage.getItem(key);
    }

    const json = JSON.stringify(data, null, 2);

    const blob = new Blob(
        [json],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "HomeHub-Backup.json";

    link.click();

    URL.revokeObjectURL(url);
}


// =================================
// DATEN WIEDERHERSTELLEN
// =================================

function importHomeHubData(event) {

    const file = event.target.files[0];

    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {

        try {

            const data = JSON.parse(e.target.result);

            localStorage.clear();

            Object.keys(data).forEach(function(key) {

                localStorage.setItem(
                    key,
                    data[key]
                );

            });

            alert(
                "HomeHub wurde erfolgreich wiederhergestellt."
            );

            location.reload();

        } catch (error) {

            alert(
                "Die Datei konnte nicht gelesen werden."
            );

        }

    };

    reader.readAsText(file);
}

// =================================
// KALENDER
// =================================

function addCalendarEvent() {

    const title = document.getElementById("eventTitle").value.trim();
    const date = document.getElementById("eventDate").value;
    const time = document.getElementById("eventTime").value;
    const note = document.getElementById("eventNote").value.trim();

    if (!title || !date) {
        alert("Bitte gib mindestens einen Titel und ein Datum ein.");
        return;
    }

    let events = JSON.parse(
        localStorage.getItem("homeHubCalendar") || "[]"
    );

    const newEvent = {
        id: Date.now(),
        title: title,
        date: date,
        time: time,
        note: note
    };

    events.push(newEvent);

    events.sort(function(a, b) {
        const dateA = new Date(a.date + "T" + (a.time || "00:00"));
        const dateB = new Date(b.date + "T" + (b.time || "00:00"));

        return dateA - dateB;
    });

    localStorage.setItem(
        "homeHubCalendar",
        JSON.stringify(events)
    );

    document.getElementById("eventTitle").value = "";
    document.getElementById("eventDate").value = "";
    document.getElementById("eventTime").value = "";
    document.getElementById("eventNote").value = "";

    renderCalendarEvents();
    renderHomeCalendar();
}



// =================================
// WOCHENANSICHT
// =================================

function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatDateKey(date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
}

function changeCalendarWeek(direction) {
    calendarWeekOffset += Number(direction) || 0;
    renderWeekCalendar();
}

function goToCurrentCalendarWeek() {
    calendarWeekOffset = 0;
    renderWeekCalendar();
}

function renderWeekCalendar() {
    const grid = document.getElementById("calendarWeekGrid");
    const title = document.getElementById("weekTitle");

    if (!grid) return;

    // Stelle sicher, dass der Bereich sichtbar ist, auch wenn eine alte CSS-Regel greift.
    grid.style.display = "grid";
    grid.style.visibility = "visible";

    let events = [];
    try {
        events = JSON.parse(localStorage.getItem("homeHubCalendar") || "[]");
        if (!Array.isArray(events)) events = [];
    } catch (error) {
        events = [];
    }

    const today = new Date();
    let start = getStartOfWeek(today);
    start.setDate(start.getDate() + calendarWeekOffset * 7);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    if (title) {
        const from = start.toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit"
        });
        const to = end.toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
        title.textContent = `${from} – ${to}`;
    }

    grid.innerHTML = "";

    const weekdays = [
        "Montag", "Dienstag", "Mittwoch", "Donnerstag",
        "Freitag", "Samstag", "Sonntag"
    ];

    for (let i = 0; i < 7; i++) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);

        const key = formatDateKey(day);
        const isToday = key === formatDateKey(today);

        const dayEvents = events
            .filter(event => String(event.date || "") === key)
            .sort((a, b) => String(a.time || "23:59").localeCompare(String(b.time || "23:59")));

        const card = document.createElement("div");
        card.className = "calendar-day-card" + (isToday ? " today" : "");

        const header = document.createElement("div");
        header.className = "calendar-day-header";
        header.innerHTML = `
            <span>${weekdays[i]}</span>
            <strong>${String(day.getDate()).padStart(2, "0")}</strong>
        `;
        card.appendChild(header);

        const eventsBox = document.createElement("div");
        eventsBox.className = "calendar-day-events";

        if (dayEvents.length === 0) {
            const empty = document.createElement("div");
            empty.className = "calendar-no-event";
            empty.textContent = "Keine Termine";
            eventsBox.appendChild(empty);
        } else {
            dayEvents.forEach(event => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "calendar-week-event";
                button.title = "Termin löschen";

                const titleEl = document.createElement("strong");
                titleEl.textContent = event.title || "Termin";
                button.appendChild(titleEl);

                const timeEl = document.createElement("span");
                timeEl.textContent = event.time ? `🕐 ${event.time} Uhr` : "Ganztägig";
                button.appendChild(timeEl);

                if (event.note) {
                    const noteEl = document.createElement("small");
                    noteEl.textContent = `📝 ${event.note}`;
                    button.appendChild(noteEl);
                }

                button.addEventListener("click", function () {
                    deleteCalendarEvent(event.id);
                });

                eventsBox.appendChild(button);
            });
        }

        card.appendChild(eventsBox);
        grid.appendChild(card);
    }
}

// Falls die Startseite beim ersten Laden bereits sichtbar ist, die Woche nach dem DOM-Aufbau nochmals zeichnen.
window.addEventListener("DOMContentLoaded", function () {
    setTimeout(renderWeekCalendar, 0);
});

// =================================
// TERMINE ANZEIGEN
// =================================

function renderCalendarEvents() {

    const list = document.getElementById("calendarList");

    if (!list) {
        return;
    }

    const events = JSON.parse(
        localStorage.getItem("homeHubCalendar") || "[]"
    );

    list.innerHTML = "";

    if (events.length === 0) {

        list.innerHTML = `
            <li class="empty-state">
                📅 Noch keine Termine vorhanden.
            </li>
        `;

        return;
    }

    events.forEach(function(event) {

        const li = document.createElement("li");

        li.className = "calendar-event";

        const formattedDate = new Date(
            event.date + "T00:00:00"
        ).toLocaleDateString(
            "de-DE",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );

        li.innerHTML = `
            <div class="calendar-event-info">

                <strong>${event.title}</strong>

                <span>
                    📅 ${formattedDate}
                    ${event.time ? " · 🕐 " + event.time : ""}
                </span>

                ${
                    event.note
                    ? `<small>${event.note}</small>`
                    : ""
                }

            </div>

            <button
                class="settings-danger"
                onclick="deleteCalendarEvent(${event.id})"
            >
                🗑️ Löschen
            </button>
        `;

        list.appendChild(li);
    });
}


// =================================
// TERMIN LÖSCHEN
// =================================

function deleteCalendarEvent(id) {

    let events = JSON.parse(
        localStorage.getItem("homeHubCalendar") || "[]"
    );

    events = events.filter(function(event) {
        return event.id !== id;
    });

    localStorage.setItem(
        "homeHubCalendar",
        JSON.stringify(events)
    );

    renderCalendarEvents();
    renderHomeCalendar();
    renderWeekCalendar();
}

// =================================
// KALENDER AUF DER STARTSEITE
// =================================

function renderHomeCalendar() {
    const list = document.getElementById("homeCalendarList");

    if (!list) {
        return;
    }

    let events = [];

    try {
        events = JSON.parse(
            localStorage.getItem("homeHubCalendar") || "[]"
        );

        if (!Array.isArray(events)) {
            events = [];
        }
    } catch (error) {
        events = [];
    }

    list.innerHTML = "";

    const now = new Date();

    const endOfWeek = new Date(now);
    const day = now.getDay();
    const daysUntilSunday = day === 0 ? 0 : 7 - day;

    endOfWeek.setDate(
        now.getDate() + daysUntilSunday
    );

    endOfWeek.setHours(23, 59, 59, 999);

    const upcomingEvents = events
        .filter(function(event) {
            const eventDate = new Date(
                event.date + "T" + (event.time || "23:59")
            );

            return eventDate >= now &&
                   eventDate <= endOfWeek;
        })
        .sort(function(a, b) {
            const dateA = new Date(
                a.date + "T" + (a.time || "23:59")
            );

            const dateB = new Date(
                b.date + "T" + (b.time || "23:59")
            );

            return dateA - dateB;
        })
        .slice(0, 5);

    if (upcomingEvents.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                📅 Keine weiteren Termine diese Woche.
            </div>
        `;

        return;
    }

    upcomingEvents.forEach(function(event, index) {

        const date = new Date(
            event.date + "T00:00:00"
        );

        const todayKey = now.toISOString().slice(0, 10);
const eventKey = event.date;

const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowKey = tomorrow.toISOString().slice(0, 10);

let formattedDate;

if (eventKey === todayKey) {
    formattedDate = "HEUTE";
} else if (eventKey === tomorrowKey) {
    formattedDate = "MORGEN";
} else {
    formattedDate = date.toLocaleDateString(
        "de-DE",
        {
            weekday: "short",
            day: "2-digit",
            month: "2-digit"
        }
    );
}

        const item = document.createElement("div");

        if (index === 0) {
            item.className = "home-calendar-item next-event";
        } else {
            item.className = "home-calendar-item";
        }

        item.innerHTML = `
            
            <div class="home-calendar-date">
                <strong>${formattedDate}</strong>

                ${
                    event.time
                        ? `<span>🕐 ${event.time} Uhr</span>`
                        : `<span>Ganztägig</span>`
                }
            </div>

            <div class="home-calendar-info">
                <strong>${event.title || "Termin"}</strong>

                ${
                    event.note
                        ? `<span>📝 ${event.note}</span>`
                        : ""
                }
            </div>
        `;

        list.appendChild(item);
    });
}