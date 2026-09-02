
// =================================
// DEVELOPER MODE
// =================================
const DEVELOPER_EMAIL = "n.zerlauth@gmx.at";
let developerAccess = false;

function updateDeveloperAccessUI(allowed, user) {
    developerAccess = !!allowed;
    const nav = document.getElementById("developer-nav-button");
    const more = document.getElementById("developer-more-menu-item");
    const page = document.getElementById("developer");
    const emailEl = document.getElementById("developer-account-email");

    if (nav) nav.classList.toggle("developer-visible", developerAccess);
    if (more) more.classList.toggle("developer-visible", developerAccess);
    if (emailEl) emailEl.textContent = user?.email || "—";
    window.__homeHubDeveloperEmail = user?.email || "";
    if (!developerAccess && page) page.classList.remove("active");
    if (developerAccess) setTimeout(function(){ developerUpdateOverview(); developerLoadManagement(); }, 0);
    return developerAccess;
}

async function updateDeveloperAccess(user) {
    if (!user) return updateDeveloperAccessUI(false, null);
    let allowed = false;
    try {
        const { data, error } = await supabaseClient.rpc("is_homehub_developer");
        if (!error) allowed = data === true;
        if (error) console.warn("Developer-RPC:", error.message);
    } catch (error) { console.warn("Developer-RPC fehlgeschlagen:", error); }

    // Zweite sichere Prüfung direkt auf der Entwickler-Tabelle (RLS erlaubt nur die eigene Zeile).
    if (!allowed) {
        try {
            const { data, error } = await supabaseClient
                .from("homehub_developers")
                .select("user_id")
                .eq("user_id", user.id)
                .maybeSingle();
            if (!error && data) allowed = true;
        } catch (error) { console.warn("Developer-Tabelle konnte nicht geprüft werden:", error); }
    }

    // Nur als Übergangshilfe für den festgelegten Entwickler-Account.
    const allowedByEmail = String(user.email || "").trim().toLowerCase() === DEVELOPER_EMAIL;
    return updateDeveloperAccessUI(allowed || allowedByEmail, user);
}

function developerUpdateOverview() {
    if (!developerAccess) return;
    const size = typeof getHomeHubCloudData === "function" ? JSON.stringify(getHomeHubCloudData()).length : 0;
    const set = (id, value) => { const e=document.getElementById(id); if(e) e.textContent=value; };
    set("developer-account-email", "" + (supabaseClient.auth.getUser ? (window.__homeHubDeveloperEmail || "n.zerlauth@gmx.at") : "—"));
    set("developer-household-name", currentHousehold?.name || "—");
    set("developer-household-id", currentHousehold?.id ? String(currentHousehold.id).slice(0,8)+"…" : "Kein Haushalt");
    set("developer-data-size", size ? Math.round(size/1024*10)/10 + " KB" : "0 KB");
    set("developer-auth-status", currentHousehold ? "Angemeldet" : "Session aktiv");
    set("developer-household-status", currentHousehold ? "Synchronisiert" : "Wird geladen…");
    set("developer-browser", navigator.userAgent.includes("Edg/") ? "Microsoft Edge" : navigator.userAgent.includes("Chrome") ? "Google Chrome" : navigator.userAgent.includes("Safari") ? "Safari" : "Browser");
}

async function developerRefreshDiagnostics() {
    if (!developerAccess) return;
    const ok = await developerRunFullDiagnostics();
    const now = new Date().toLocaleString("de-AT");
    const e=document.getElementById("developer-last-sync"); if(e) e.textContent = ok ? now : "Cloud-Fehler";
    const c=document.getElementById("developer-cloud-status"); if(c) c.textContent = ok ? "Online" : "Fehler";
    developerUpdateOverview();
    await showHomeHubAlert(ok ? "Diagnose abgeschlossen. Die Cloud ist erreichbar." : "Diagnose abgeschlossen. Es gibt ein Cloud-Problem.", "Entwicklerdiagnose");
}

async function developerCopyDiagnostics() {
    if (!developerAccess) return;
    developerUpdateOverview();
    const text = [
      "HomeHub Developer Diagnostics",
      "App: v17",
      "Account: " + (window.__homeHubDeveloperEmail || "n.zerlauth@gmx.at"),
      "Haushalt: " + (currentHousehold?.name || "—"),
      "Haushalt-ID: " + (currentHousehold?.id || "—"),
      "Cloud: " + (document.getElementById("developer-cloud-status")?.textContent || "—"),
      "Zeit: " + new Date().toLocaleString("de-AT")
    ].join("\n");
    try { await navigator.clipboard.writeText(text); await showHomeHubAlert("Diagnose wurde kopiert.", "Entwickler"); }
    catch (_) { await showHomeHubAlert(text, "Entwicklerdiagnose"); }
}

function developerReloadHomeHub() {
    if (!developerAccess) return;
    cloudLoaded = false;
    loadCloudData(true);
}

async function developerCheckCloud() {
    if (!developerAccess) return;
    const ok = await loadCloudData(true);
    await showHomeHubAlert(
        ok ? "Die HomeHub-Cloud-Verbindung funktioniert." : "Die HomeHub-Cloud-Verbindung konnte nicht geprüft werden.",
        "Cloud-Status"
    );
}


// =================================
// DEVELOPER MANAGEMENT & DIAGNOSTICS
// =================================
async function developerLoadManagement() {
    if (!developerAccess) return;
    const membersEl = document.getElementById("developer-members-list");
    const householdsEl = document.getElementById("developer-households-list");
    if (membersEl) membersEl.innerHTML = '<div class="developer-loading">Lade Benutzer…</div>';
    if (householdsEl) householdsEl.innerHTML = '<div class="developer-loading">Lade Haushalte…</div>';

    const [membersResult, householdsResult] = await Promise.all([
        supabaseClient.rpc("developer_list_members", { p_household_id: currentHousehold?.id || null }),
        supabaseClient.rpc("developer_list_households")
    ]);

    if (membersResult.error) {
        console.error("Developer members:", membersResult.error);
        if (membersEl) membersEl.innerHTML = '<div class="developer-error">Benutzer konnten nicht geladen werden.<br><small>' + escapeHtml(membersResult.error.message) + '</small></div>';
    } else {
        renderDeveloperMembers(Array.isArray(membersResult.data) ? membersResult.data : []);
    }

    if (householdsResult.error) {
        console.error("Developer households:", householdsResult.error);
        if (householdsEl) householdsEl.innerHTML = '<div class="developer-error">Haushalte konnten nicht geladen werden.<br><small>' + escapeHtml(householdsResult.error.message) + '</small></div>';
    } else {
        renderDeveloperHouseholds(Array.isArray(householdsResult.data) ? householdsResult.data : []);
    }
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, function(ch) {
        return ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[ch];
    });
}

function renderDeveloperMembers(items) {
    const el = document.getElementById("developer-members-list");
    const count = document.getElementById("developer-member-count");
    if (count) count.textContent = String(items.length);
    if (!el) return;
    if (!items.length) { el.innerHTML = '<div class="developer-empty">Keine Mitglieder gefunden.</div>'; return; }
    el.innerHTML = items.map(function(item) {
        const initial = escapeHtml((item.email || "?").charAt(0).toUpperCase());
        const role = item.role === "owner" ? "Besitzer" : "Mitglied";
        const joined = item.joined_at ? new Date(item.joined_at).toLocaleDateString("de-AT") : "—";
        return '<div class="developer-data-row"><div class="developer-avatar">'+initial+'</div><div class="developer-data-main"><strong>'+escapeHtml(item.email || "Unbekannter Account")+'</strong><small>'+role+' · beigetreten '+joined+'</small></div><code>'+escapeHtml(String(item.user_id || "").slice(0,8))+'…</code></div>';
    }).join("");
}

function renderDeveloperHouseholds(items) {
    const el = document.getElementById("developer-households-list");
    const count = document.getElementById("developer-household-count");
    if (count) count.textContent = String(items.length);
    if (!el) return;
    if (!items.length) { el.innerHTML = '<div class="developer-empty">Keine Haushalte gefunden.</div>'; return; }
    el.innerHTML = items.map(function(item) {
        const mine = currentHousehold && item.id === currentHousehold.id;
        const created = item.created_at ? new Date(item.created_at).toLocaleDateString("de-AT") : "—";
        return '<div class="developer-data-row household-row"><div class="developer-avatar">🏠</div><div class="developer-data-main"><strong>'+escapeHtml(item.name || "Ohne Namen")+(mine ? ' <span class="developer-mini-badge">AKTUELL</span>' : '')+'</strong><small>'+Number(item.member_count || 0)+' Mitglied(er) · erstellt '+created+'</small></div><code>'+escapeHtml(String(item.id || "").slice(0,8))+'…</code></div>';
    }).join("");
}

async function developerRunFullDiagnostics() {
    if (!developerAccess) return;
    const summary = document.getElementById("developer-diagnostics-summary");
    if (summary) summary.innerHTML = '<div class="developer-diagnostic-state neutral"><span>●</span><div><strong>Diagnose läuft…</strong><small>Supabase, Session, Haushalt und Daten werden geprüft.</small></div></div>';
    const result = await supabaseClient.rpc("developer_diagnostics", { p_household_id: currentHousehold?.id || null });
    if (result.error) {
        console.error("Developer diagnostics:", result.error);
        if (summary) summary.innerHTML = '<div class="developer-diagnostic-state error"><span>!</span><div><strong>Diagnose fehlgeschlagen</strong><small>'+escapeHtml(result.error.message)+'</small></div></div>';
        return false;
    }
    const d = result.data || {};
    const set = (id, value) => { const e=document.getElementById(id); if(e) e.textContent=value; };
    set("diag-session", d.session_ok ? "OK" : "Fehler");
    set("diag-cloud", d.cloud_data_exists ? "Vorhanden" : "Leer");
    set("diag-household", d.household_found ? "OK" : "Fehlt");
    set("diag-members", String(d.member_count ?? 0));
    set("diag-updated", d.data_updated_at ? new Date(d.data_updated_at).toLocaleString("de-AT") : "Noch keine Daten");
    set("diag-realtime", "Aktiv");
    const ok = !!d.session_ok && !!d.household_found && d.cloud_read_ok !== false;
    if (summary) summary.innerHTML = '<div class="developer-diagnostic-state '+(ok ? 'success' : 'error')+'"><span>'+(ok ? '✓' : '!')+'</span><div><strong>'+(ok ? 'Systemprüfung erfolgreich' : 'Probleme gefunden')+'</strong><small>'+escapeHtml(d.message || (ok ? 'Die wichtigsten HomeHub-Dienste sind erreichbar.' : 'Bitte die einzelnen Diagnosewerte prüfen.'))+'</small></div></div>';
    const last = document.getElementById("developer-last-sync"); if(last) last.textContent = new Date().toLocaleString("de-AT");
    const cloud = document.getElementById("developer-cloud-status"); if(cloud) cloud.textContent = ok ? "Online" : "Prüfen";
    return ok;
}

// =================================
// HOMeHUB DIALOGE
// Ersetzt Browser-alert/confirm/prompt durch eigene HomeHub-Popups.
// =================================
let homeHubDialogResolver = null;
let homeHubDialogMode = null;

function closeHomeHubDialog(result) {
    const modal = document.getElementById("homehub-modal");
    const input = document.getElementById("homehub-modal-input");
    if (modal) {
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
    }
    if (homeHubDialogResolver) {
        const resolve = homeHubDialogResolver;
        homeHubDialogResolver = null;
        homeHubDialogMode = null;
        resolve(result);
    }
    if (input) input.value = "";
}

function openHomeHubDialog({ title = "HomeHub", message = "", type = "alert", defaultValue = "", placeholder = "" }) {
    return new Promise((resolve) => {
        const modal = document.getElementById("homehub-modal");
        const titleEl = document.getElementById("homehub-modal-title");
        const messageEl = document.getElementById("homehub-modal-message");
        const input = document.getElementById("homehub-modal-input");
        const ok = document.getElementById("homehub-modal-ok");
        const cancel = document.getElementById("homehub-modal-cancel");
        const icon = document.getElementById("homehub-modal-icon");
        if (!modal || !titleEl || !messageEl || !input || !ok || !cancel || !icon) {
            resolve(type === "confirm" ? false : type === "prompt" ? null : undefined);
            return;
        }

        homeHubDialogResolver = resolve;
        homeHubDialogMode = type;
        titleEl.textContent = title;
        messageEl.textContent = message;
        input.style.display = type === "prompt" ? "block" : "none";
        input.value = type === "prompt" ? defaultValue : "";
        input.placeholder = placeholder;
        cancel.style.display = type === "alert" ? "none" : "inline-block";
        ok.textContent = type === "confirm" ? "Bestätigen" : type === "prompt" ? "Weiter" : "OK";
        icon.textContent = type === "confirm" ? "❓" : type === "prompt" ? "✏️" : "🏠";

        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
        setTimeout(() => type === "prompt" ? input.focus() : ok.focus(), 20);
    });
}

function showHomeHubAlert(message, title = "HomeHub") {
    return openHomeHubDialog({ title, message, type: "alert" });
}

function showHomeHubConfirm(message, title = "HomeHub") {
    return openHomeHubDialog({ title, message, type: "confirm" });
}

function showHomeHubPrompt(message, defaultValue = "", title = "HomeHub", placeholder = "") {
    return openHomeHubDialog({ title, message, type: "prompt", defaultValue, placeholder });
}

document.addEventListener("DOMContentLoaded", () => {
    const ok = document.getElementById("homehub-modal-ok");
    const cancel = document.getElementById("homehub-modal-cancel");
    const input = document.getElementById("homehub-modal-input");
    const backdrop = document.querySelector("[data-modal-close]");

    if (ok) ok.addEventListener("click", () => {
        const result = homeHubDialogMode === "prompt" ? input.value : true;
        closeHomeHubDialog(result);
    });
    if (cancel) cancel.addEventListener("click", () => closeHomeHubDialog(homeHubDialogMode === "prompt" ? null : false));
    if (backdrop) backdrop.addEventListener("click", () => closeHomeHubDialog(homeHubDialogMode === "prompt" ? null : false));
    if (input) input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") { event.preventDefault(); ok.click(); }
        if (event.key === "Escape") { event.preventDefault(); cancel.click(); }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && document.getElementById("homehub-modal")?.classList.contains("open")) {
            closeHomeHubDialog(homeHubDialogMode === "prompt" ? null : false);
        }
    });
});

// ===============================
// SUPABASE
// ===============================

const SUPABASE_URL = "https://tuqgjozhmqikyfvkbawn.supabase.co";

// sb_publishable_luc_sCawzTFhpqo93BxKLg_z-ZTf-pm
const SUPABASE_KEY = "sb_publishable_luc_sCawzTFhpqo93BxKLg_z-ZTf-pm";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// =================================
// CLOUD-SPEICHERUNG (SUPABASE)
// =================================
// Supabase ist die dauerhafte Datenquelle.
// localStorage wird nur als lokaler Cache verwendet.

let cloudLoaded = false;
let cloudLoadPromise = null;
let cloudSaveQueue = Promise.resolve();
let cloudChannel = null;
let currentHousehold = null;
let currentMembership = null;

const HOMEHUB_DATA_KEYS = [
    "homehubShopping",
    "homehubTasks",
    "homehubNotes",
    "homeHubCalendar",
    "homehubDarkMode"
];

function getHomeHubCloudData() {
    const result = {};
    HOMEHUB_DATA_KEYS.forEach(function(key) {
        const value = localStorage.getItem(key);
        if (value !== null) result[key] = value;
    });
    return result;
}

function applyHomeHubCloudData(data) {
    if (!data || typeof data !== "object") return;
    HOMEHUB_DATA_KEYS.forEach(function(key) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            localStorage.setItem(key, data[key]);
        }
    });
}

function clearHomeHubCache() {
    HOMEHUB_DATA_KEYS.forEach(function(key) {
        localStorage.removeItem(key);
    });
}

function setCloudStatus(textValue, online) {
    const el = document.getElementById("cloud-status-text");
    if (el) el.textContent = textValue;
    const dot = document.querySelector(".offline-status .status-dot");
    if (dot) dot.style.background = online ? "#22c55e" : "#f59e0b";
}

function refreshHomeHubUI() {
    try {
        shoppingItems = JSON.parse(localStorage.getItem("homehubShopping") || "[]") || [];
        tasks = JSON.parse(localStorage.getItem("homehubTasks") || "[]") || [];
        notes = JSON.parse(localStorage.getItem("homehubNotes") || "[]") || [];
        updateShoppingList();
        updateTasks();
        renderNotes();
        renderCalendarEvents();
        renderHomeCalendar();
        renderWeekCalendar();
        updateHome();
        loadTheme();
        checkCalendarReminders();
    } catch (error) {
        console.error("HomeHub Oberfläche konnte nicht aktualisiert werden:", error);
    }
}

async function getCurrentHousehold() {
    const { data, error } = await supabaseClient
        .rpc("get_my_household");

    if (error) {
        console.error("Haushalt konnte nicht geladen werden:", error);
        return null;
    }

    if (!data) return null;
    currentHousehold = data.household || null;
    currentMembership = data.membership || null;
    updateHouseholdUI();
    return currentHousehold;
}

function updateHouseholdUI() {
    const nameEl = document.getElementById("household-name");
    const codeEl = document.getElementById("household-code");
    const roleEl = document.getElementById("household-role");
    const statusEl = document.getElementById("household-status");

    if (nameEl) nameEl.textContent = currentHousehold ? currentHousehold.name : "Noch kein Haushalt";
    if (codeEl) codeEl.textContent = currentHousehold ? currentHousehold.join_code : "—";
    if (roleEl) roleEl.textContent = currentMembership ? (currentMembership.role === "owner" ? "Besitzer" : "Mitglied") : "—";
    if (statusEl) statusEl.textContent = currentHousehold ? "Aktiv" : "Kein Haushalt";
}

async function createHousehold() {
    const name = await showHomeHubPrompt("Wie soll dein Haushalt heißen?", "Mein Haushalt");
    if (!name || !name.trim()) return;

    const { data, error } = await supabaseClient.rpc("create_household", {
        p_name: name.trim()
    });
    if (error) {
        console.error(error);
        await showHomeHubAlert("Der Haushalt konnte nicht erstellt werden: " + error.message);
        return;
    }

    currentHousehold = data.household;
    currentMembership = data.membership;
    updateHouseholdUI();
    await loadCloudData(true);
    await showHomeHubAlert("Haushalt erstellt! Dein Beitrittscode ist: " + currentHousehold.join_code);
}

async function joinHousehold() {
    const code = await showHomeHubPrompt("Gib den 8-stelligen Beitrittscode des Haushalts ein:", "", "Haushalt beitreten", "8-stelliger Code");
    if (!code || !code.trim()) return;

    const { data, error } = await supabaseClient.rpc("join_household", {
        p_join_code: code.trim().toUpperCase()
    });
    if (error) {
        console.error(error);
        await showHomeHubAlert("Beitritt fehlgeschlagen: " + error.message);
        return;
    }

    currentHousehold = data.household;
    currentMembership = data.membership;
    updateHouseholdUI();
    clearHomeHubCache();
    cloudLoaded = false;
    await loadCloudData(true);
    await showHomeHubAlert("Du bist jetzt Mitglied von „" + currentHousehold.name + "“. ");
}

async function leaveHousehold() {
    if (!currentHousehold) return;
    if (currentMembership && currentMembership.role === "owner") {
        await showHomeHubAlert("Als Besitzer kannst du den Haushalt nicht verlassen. Übertrage zuerst den Besitz oder lösche den Haushalt.");
        return;
    }
    if (!(await showHomeHubConfirm("Möchtest du diesen Haushalt wirklich verlassen?", "Haushalt verlassen"))) return;

    const { error } = await supabaseClient.rpc("leave_household");
    if (error) {
        await showHomeHubAlert("Der Haushalt konnte nicht verlassen werden: " + error.message);
        return;
    }
    currentHousehold = null;
    currentMembership = null;
    cloudLoaded = false;
    clearHomeHubCache();
    updateHouseholdUI();
    refreshHomeHubUI();
    await showHomeHubAlert("Du hast den Haushalt verlassen.");
}

async function deleteHousehold() {
    if (!currentHousehold || !currentMembership || currentMembership.role !== "owner") {
        await showHomeHubAlert("Nur der Besitzer kann den Haushalt löschen.");
        return;
    }
    if (!(await showHomeHubConfirm("Möchtest du den gesamten Haushalt wirklich löschen? Dabei werden auch die gemeinsamen HomeHub-Daten gelöscht.", "Haushalt löschen"))) return;

    const { error } = await supabaseClient.rpc("delete_my_household");
    if (error) {
        await showHomeHubAlert("Der Haushalt konnte nicht gelöscht werden: " + error.message);
        return;
    }
    currentHousehold = null;
    currentMembership = null;
    cloudLoaded = false;
    clearHomeHubCache();
    updateHouseholdUI();
    refreshHomeHubUI();
    await showHomeHubAlert("Der Haushalt wurde gelöscht.");
}

async function copyHouseholdCode() {
    if (!currentHousehold) return;
    try {
        await navigator.clipboard.writeText(currentHousehold.join_code);
        await showHomeHubAlert("Beitrittscode kopiert: " + currentHousehold.join_code);
    } catch (_) {
        await showHomeHubPrompt("Beitrittscode:", currentHousehold.join_code, "Beitrittscode");
    }
}

function subscribeToCloud(householdId) {
    if (!householdId) return;
    if (cloudChannel) {
        supabaseClient.removeChannel(cloudChannel);
        cloudChannel = null;
    }

    cloudChannel = supabaseClient
        .channel("homehub-household-" + householdId)
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "homehub_data",
                filter: "household_id=eq." + householdId
            },
            function(payload) {
                if (payload.eventType === "DELETE") {
                    clearHomeHubCache();
                    refreshHomeHubUI();
                    setCloudStatus("Cloud-Daten gelöscht", true);
                    return;
                }
                if (payload.new && payload.new.data) {
                    applyHomeHubCloudData(payload.new.data);
                    refreshHomeHubUI();
                    setCloudStatus("Mit Haushalt synchronisiert", true);
                }
            }
        )
        .subscribe();
}

async function ensureHomeHubHousehold() {
    const { data, error } = await supabaseClient.rpc("ensure_my_household");
    if (error) {
        console.error("HomeHub-Haushalt konnte nicht sichergestellt werden:", error);
        return null;
    }
    if (data) {
        currentHousehold = data.household || null;
        currentMembership = data.membership || null;
        updateHouseholdUI();
    }
    return currentHousehold;
}

async function loadCloudData(forceReload) {
    if (!forceReload && cloudLoaded) return true;
    if (cloudLoadPromise) return cloudLoadPromise;

    cloudLoadPromise = (async function() {
        const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
        const session = sessionData && sessionData.session;
        if (sessionError || !session) {
            setCloudStatus("Nicht angemeldet", false);
            return false;
        }

        const household = await ensureHomeHubHousehold();
        if (!household) {
            setCloudStatus("Haushalt konnte nicht geladen werden", false);
            return false;
        }

        const { data, error } = await supabaseClient.rpc("get_homehub_data", {
            p_household_id: household.id
        });

        if (error) {
            console.error("HomeHub Cloud laden fehlgeschlagen:", error);
            setCloudStatus("Cloud-Fehler", false);
            return false;
        }

        if (data && typeof data === "object") {
            applyHomeHubCloudData(data);
        } else {
            // Noch kein Datensatz: vorhandene lokale Daten einmalig sicher über die RPC speichern.
            const localData = getHomeHubCloudData();
            if (Object.keys(localData).length) {
                const { error: saveError } = await supabaseClient.rpc("save_homehub_data", {
                    p_household_id: household.id,
                    p_data: localData
                });
                if (saveError) {
                    console.error("Lokale HomeHub-Daten konnten nicht übernommen werden:", saveError);
                    setCloudStatus("Cloud-Fehler", false);
                    return false;
                }
            }
        }

        cloudLoaded = true;
        subscribeToCloud(household.id);
        refreshHomeHubUI();
        setCloudStatus("Mit Haushalt synchronisiert", true);
        return true;
    })();

    try { return await cloudLoadPromise; }
    finally { cloudLoadPromise = null; }
}

function queueCloudSave() {
    cloudSaveQueue = cloudSaveQueue
        .catch(function() {})
        .then(async function() {
            if (!cloudLoaded || !currentHousehold) return;
            const { data: sessionData } = await supabaseClient.auth.getSession();
            const session = sessionData && sessionData.session;
            if (!session) return;

            const payload = getHomeHubCloudData();
            const { error } = await supabaseClient.rpc("save_homehub_data", {
                p_household_id: currentHousehold.id,
                p_data: payload
            });

            if (error) throw error;
            setCloudStatus("Mit Haushalt synchronisiert", true);
        })
        .catch(function(error) {
            console.error("HomeHub Cloud-Speicherung fehlgeschlagen:", error);
            setCloudStatus("Cloud-Speicherung fehlgeschlagen", false);
        });
    return cloudSaveQueue;
}

// =================================
// AUTHENTICATION
// =================================

function getAuthElements() {
    return {
        email: document.getElementById("login-email"),
        password: document.getElementById("login-password"),
        error: document.getElementById("login-error"),
        message: document.getElementById("login-message"),
        loginButton: document.getElementById("login-button"),
        signupButton: document.getElementById("signup-button")
    };
}

function showAuthMessage(errorText, successText) {
    const el = getAuthElements();
    if (el.error) el.error.textContent = errorText || "";
    if (el.message) el.message.textContent = successText || "";
}

function updateAccountUI(session) {
    const emailEl = document.getElementById("account-email");
    if (emailEl) {
        emailEl.textContent = session && session.user && session.user.email
            ? session.user.email
            : "Nicht angemeldet";
    }
}

async function login() {
    const el = getAuthElements();
    const email = el.email.value.trim();
    const password = el.password.value;
    showAuthMessage("", "");

    if (!email || !password) {
        showAuthMessage("Bitte E-Mail und Passwort eingeben.", "");
        return;
    }

    el.loginButton.disabled = true;
    if (el.signupButton) el.signupButton.disabled = true;
    el.loginButton.textContent = "Anmelden...";

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    el.loginButton.disabled = false;
    if (el.signupButton) el.signupButton.disabled = false;
    el.loginButton.textContent = "Anmelden";

    if (error) {
        console.error("Supabase Login Fehler:", error);
        showAuthMessage(error.message, "");
        return;
    }

    document.getElementById("login-screen").style.display = "none";
    updateAccountUI(data.session);
    await updateDeveloperAccess(data.user);
    console.log("Erfolgreich angemeldet:", data.user.email);
    await loadCloudData();
}

async function signup() {
    const el = getAuthElements();
    const email = el.email.value.trim();
    const password = el.password.value;
    showAuthMessage("", "");

    if (!email || !password) {
        showAuthMessage("Bitte E-Mail und Passwort eingeben.", "");
        return;
    }
    if (password.length < 6) {
        showAuthMessage("Das Passwort muss mindestens 6 Zeichen haben.", "");
        return;
    }

    el.loginButton.disabled = true;
    if (el.signupButton) el.signupButton.disabled = true;
    if (el.signupButton) el.signupButton.textContent = "Konto wird erstellt...";

    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + window.location.pathname }
    });

    el.loginButton.disabled = false;
    if (el.signupButton) el.signupButton.disabled = false;
    if (el.signupButton) el.signupButton.textContent = "Konto erstellen";

    if (error) {
        console.error("Supabase Registrierung Fehler:", error);
        showAuthMessage(error.message, "");
        return;
    }

    if (data.session) {
        document.getElementById("login-screen").style.display = "none";
        updateAccountUI(data.session);
        await updateDeveloperAccess(data.user);
        await loadCloudData();
    } else {
        showAuthMessage("", "Konto erstellt. Bitte bestätige deine E-Mail-Adresse und melde dich danach an.");
    }
}

async function resetPassword() {
    const el = getAuthElements();
    const email = el.email.value.trim();
    showAuthMessage("", "");
    if (!email) {
        showAuthMessage("Bitte zuerst deine E-Mail-Adresse eingeben.", "");
        return;
    }

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname
    });
    if (error) {
        showAuthMessage(error.message, "");
    } else {
        showAuthMessage("", "Eine E-Mail zum Zurücksetzen des Passworts wurde gesendet.");
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
}

async function deleteAccount() {
    const confirmed = await showHomeHubConfirm(
        "Möchtest du dein HomeHub-Konto wirklich endgültig löschen? Deine Cloud-Daten und dein Benutzerkonto werden dabei gelöscht.",
        "Konto endgültig löschen"
    );
    if (!confirmed) return;

    const { error } = await supabaseClient.rpc("delete_my_account");
    if (error) {
        console.error("Konto konnte nicht gelöscht werden:", error);
        await showHomeHubAlert("Das Konto konnte nicht gelöscht werden. Bitte führe zuerst die SQL-Datei aus, die im ZIP enthalten ist.");
        return;
    }

    await supabaseClient.auth.signOut();
    clearHomeHubCache();
    await showHomeHubAlert("Dein HomeHub-Konto wurde gelöscht.");
    location.reload();
}

async function checkLogin() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const loginScreen = document.getElementById("login-screen");

    if (session) {
        loginScreen.style.display = "none";
        updateAccountUI(session);
        await updateDeveloperAccess(session.user);
        await loadCloudData();
    } else {
        loginScreen.style.display = "flex";
        cloudLoaded = false;
        setCloudStatus("Nicht angemeldet", false);
    }
}

supabaseClient.auth.onAuthStateChange(function(event, session) {
    const loginScreen = document.getElementById("login-screen");
    if (session) {
        loginScreen.style.display = "none";
        updateAccountUI(session);
        // Wichtig: Auch bei einer bereits bestehenden Session den Entwicklerzugriff setzen.
        setTimeout(function() { updateDeveloperAccess(session.user); loadCloudData(); }, 0);
    } else {
        updateDeveloperAccess(null);
        loginScreen.style.display = "flex";
        cloudLoaded = false;
        if (cloudChannel) {
            supabaseClient.removeChannel(cloudChannel);
            cloudChannel = null;
        }
        clearHomeHubCache();
        refreshHomeHubUI();
        setCloudStatus("Nicht angemeldet", false);
    }
});

let calendarWeekOffset = 0;

// ================================
// NAVIGATION
// ================================

function showPage(pageId) {

    if (pageId === "developer" && !developerAccess) {
        return;
    }

    // Scrollposition sofort zurücksetzen
    window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant"
    });

    // Mehr-Menü schließen, sobald eine Seite geöffnet wird
    closeMoreMenu();

    // Alle Seiten ausblenden
    const pages = document.querySelectorAll(".page");

    pages.forEach(page => {
        page.classList.remove("active");
    });

    // Gewählte Seite anzeigen
    const selectedPage = document.getElementById(pageId);

    if (selectedPage) {
        selectedPage.classList.add("active");
    }

    // Alle Navigations-Buttons deaktivieren
    const navButtons = document.querySelectorAll(".nav-button");

    navButtons.forEach(button => {
        button.classList.remove("active-nav");
    });

    // Passenden Haupt-Navigationsbutton aktivieren
    navButtons.forEach(button => {

        const action = button.getAttribute("onclick");

        if (
            action &&
            action.includes(`showPage('${pageId}')`)
        ) {
            button.classList.add("active-nav");
        }
    });

    // Kalender und Einstellungen gehören auf dem Handy zu „Mehr“
    if (pageId === "calendar" || pageId === "settings" || pageId === "notes") {
        const moreButton = document.getElementById("moreNavButton");

        if (moreButton) {
            moreButton.classList.add("active-nav");
        }
    }

    // Dashboard aktualisieren
    updateHome();
}


function toggleMoreMenu() {

    const menu = document.getElementById("moreMenu");
    const button = document.getElementById("moreNavButton");

    if (!menu || !button) {
        return;
    }

    const isOpen = menu.classList.toggle("open");

    button.classList.toggle("menu-open", isOpen);
}


function closeMoreMenu() {

    const menu = document.getElementById("moreMenu");
    const button = document.getElementById("moreNavButton");

    if (menu) {
        menu.classList.remove("open");
    }

    if (button) {
        button.classList.remove("menu-open");
    }
}


document.addEventListener("click", function(event) {

    const menu = document.getElementById("moreMenu");
    const button = document.getElementById("moreNavButton");

    if (!menu || !button) {
        return;
    }

    if (
        menu.classList.contains("open") &&
        !menu.contains(event.target) &&
        !button.contains(event.target)
    ) {
        closeMoreMenu();
    }
});


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

    queueCloudSave();
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

    queueCloudSave();
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


    // Aufgaben, die heute fällig oder bereits überfällig sind
    // Zukünftige Aufgaben (z. B. Samstag) werden auf Home nicht mitgezählt.
    const openTasks =
        tasks.filter(task => {
            if (task.completed) return false;

            const dueDate = parseLocalDate(task.dueDate);
            return dueDate <= today;
        }).length;


    // Einkauf-Zahl aktualisieren

    const shoppingCount =
        document.getElementById(
            "shoppingCount"
        );


    if (shoppingCount) {

        shoppingCount.textContent =
            openShopping;

    }


    // Haushalts-Zahl aktualisieren

    const taskCount =
        document.getElementById(
            "taskCount"
        );


    if (taskCount) {

        taskCount.textContent =
            openTasks;

    }


    // Heute aktualisieren

    updateTodayPanel();
    renderHomeCalendar();
    updateTodayPage();

    // Fortschritt aktualisieren

    updateProgress();

}




// ================================
// NOTIZEN
// ================================

let notes = JSON.parse(
    localStorage.getItem("homehubNotes") || "[]"
) || [];

let editingNoteId = null;

function saveNotes() {
    localStorage.setItem(
        "homehubNotes",
        JSON.stringify(notes)
    );

    queueCloudSave();
}

function renderNotes() {
    const list = document.getElementById("notesList");
    const count = document.getElementById("notesCount");

    if (!list) {
        return;
    }

    list.innerHTML = "";

    if (count) {
        count.textContent = notes.length;
    }

    if (notes.length === 0) {
        list.innerHTML = `
            <div class="notes-empty">
                <div class="notes-empty-icon">📝</div>
                <strong>Noch keine Notizen</strong>
                <p>Erstelle deine erste Notiz oben.</p>
            </div>
        `;
        return;
    }

    notes.forEach(function(note) {
        const card = document.createElement("article");
        card.className = "note-card";

        const title = note.title || "Ohne Titel";
        const content = note.content || "";

        card.innerHTML = `
            <div class="note-card-main">
                <div class="note-card-icon">📝</div>
                <div class="note-card-content">
                    <strong>${escapeHTML(title)}</strong>
                    <p>${escapeHTML(content).replace(/\n/g, "<br>")}</p>
                </div>
            </div>

            <div class="note-card-actions">
                <button class="note-action" onclick="editNote(${note.id})" title="Bearbeiten">✏️</button>
                <button class="note-action note-delete" onclick="deleteNote(${note.id})" title="Löschen">🗑️</button>
            </div>
        `;

        list.appendChild(card);
    });
}

function saveNote() {
    const titleInput = document.getElementById("noteTitle");
    const contentInput = document.getElementById("noteContent");

    if (!titleInput || !contentInput) {
        return;
    }

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (title === "" && content === "") {
        return;
    }

    if (editingNoteId !== null) {
        const note = notes.find(function(item) {
            return item.id === editingNoteId;
        });

        if (note) {
            note.title = title || "Ohne Titel";
            note.content = content;
        }

        editingNoteId = null;
    } else {
        notes.unshift({
            id: Date.now(),
            title: title || "Ohne Titel",
            content: content
        });
    }

    saveNotes();
    clearNoteForm();
    renderNotes();
}

function editNote(id) {
    const note = notes.find(function(item) {
        return item.id === id;
    });

    if (!note) {
        return;
    }

    const titleInput = document.getElementById("noteTitle");
    const contentInput = document.getElementById("noteContent");
    const cancelButton = document.getElementById("cancelNoteEdit");
    const saveLabel = document.getElementById("noteSaveLabel");

    if (!titleInput || !contentInput) {
        return;
    }

    editingNoteId = id;
    titleInput.value = note.title || "";
    contentInput.value = note.content || "";

    if (cancelButton) {
        cancelButton.style.display = "inline-flex";
    }

    if (saveLabel) {
        saveLabel.textContent = "Notiz speichern";
    }

    titleInput.focus();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}

function cancelNoteEdit() {
    editingNoteId = null;
    clearNoteForm();
}

function clearNoteForm() {
    const titleInput = document.getElementById("noteTitle");
    const contentInput = document.getElementById("noteContent");
    const cancelButton = document.getElementById("cancelNoteEdit");
    const saveLabel = document.getElementById("noteSaveLabel");

    if (titleInput) titleInput.value = "";
    if (contentInput) contentInput.value = "";

    if (cancelButton) {
        cancelButton.style.display = "none";
    }

    if (saveLabel) {
        saveLabel.textContent = "+ Notiz hinzufügen";
    }
}

function deleteNote(id) {
    const note = notes.find(function(item) {
        return item.id === id;
    });

    if (!note) {
        return;
    }

    const oldMenu = document.querySelector(".note-delete-menu");
    if (oldMenu) {
        oldMenu.remove();
    }

    const menu = document.createElement("div");
    menu.className = "note-delete-menu";

    const title = note.title || "Ohne Titel";

    menu.innerHTML = `
        <div class="note-delete-menu-box" role="dialog" aria-modal="true" aria-label="Notiz löschen">
            <strong>Notiz löschen?</strong>
            <p>Möchtest du „${escapeHTML(title)}“ wirklich löschen?</p>
            <button class="note-delete-confirm">🗑️ Löschen</button>
            <button class="note-delete-cancel">Abbrechen</button>
        </div>
    `;

    document.body.appendChild(menu);

    const closeMenu = function() {
        menu.remove();
    };

    menu.querySelector(".note-delete-confirm").addEventListener("click", function() {
        notes = notes.filter(function(item) {
            return item.id !== id;
        });

        if (editingNoteId === id) {
            editingNoteId = null;
            clearNoteForm();
        }

        saveNotes();
        renderNotes();
        closeMenu();
    });

    menu.querySelector(".note-delete-cancel").addEventListener("click", closeMenu);

    menu.addEventListener("click", function(event) {
        if (event.target === menu) {
            closeMenu();
        }
    });
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
// HEUTE-SEITE
// ================================

function updateTodayPage() {

    const eventsList = document.getElementById("todayEventsList");
    const tasksList = document.getElementById("todayTasksList");
    const shoppingList = document.getElementById("todayShoppingList");
    const allDone = document.getElementById("todayAllDone");
    const progressText = document.getElementById("todayProgressText");
    const progressPercent = document.getElementById("todayProgressPercent");
    const progressBar = document.getElementById("todayProgressBar");

    if (!eventsList || !tasksList || !shoppingList) return;

    const todayString = formatDate(new Date());
    const events = JSON.parse(localStorage.getItem("homeHubCalendar") || "[]");

    const todayEvents = events
        .filter(event => event.date === todayString)
        .sort((a, b) => {
            if (!a.time && !b.time) return 0;
            if (!a.time) return 1;
            if (!b.time) return -1;
            return a.time.localeCompare(b.time);
        });

    eventsList.innerHTML = "";

    if (todayEvents.length === 0) {
        eventsList.innerHTML = `
            <div class="today-empty-item">
                <span>📅</span>
                <div>
                    <strong>Keine Termine heute</strong>
                    <p>Dein Kalender ist heute frei.</p>
                </div>
            </div>
        `;
    } else {
        todayEvents.forEach(event => {
            const item = document.createElement("div");
            item.className = "today-page-item";

            const categoryText =
                event.category && event.category !== "none"
                    ? (
                        event.category === "work" ? "💼 Arbeit" :
                        event.category === "sport" ? "🏋️ Sport" :
                        event.category === "free" ? "🎮 Freizeit" :
                        event.category === "important" ? "⭐ Wichtig" :
                        event.category === "other" ? "📌 Sonstiges" : ""
                    )
                    : "";

            const meta = [
                event.time ? `🕘 ${event.time}` : "Keine Uhrzeit",
                categoryText,
                event.repeat && event.repeat !== "none" ? "🔁" : "",
                event.reminder && event.reminder !== "none" ? "🔔" : ""
            ].filter(Boolean).join(" · ");

            item.innerHTML = `
                <div class="today-page-icon">📅</div>
                <div class="today-page-content">
                    <strong>${escapeHTML(event.title)}</strong>
                    <p>${escapeHTML(meta)}</p>
                </div>
                <button class="small-action" onclick="showCalendarEventMenu(${event.id})">Öffnen</button>
            `;

            eventsList.appendChild(item);
        });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueTasks = tasks
        .map((task, index) => ({ task, index }))
        .filter(({ task }) => !task.completed && parseLocalDate(task.dueDate) <= today)
        .sort((a, b) => parseLocalDate(a.task.dueDate) - parseLocalDate(b.task.dueDate));

    tasksList.innerHTML = "";

    if (dueTasks.length === 0) {
        tasksList.innerHTML = `
            <div class="today-empty-item">
                <span>🧹</span>
                <div>
                    <strong>Keine offenen Aufgaben</strong>
                    <p>Für heute ist nichts mehr fällig.</p>
                </div>
            </div>
        `;
    } else {
        dueTasks.forEach(({ task, index }) => {
            const overdue = parseLocalDate(task.dueDate) < today;
            const item = document.createElement("div");
            item.className = `today-page-item ${overdue ? "today-page-overdue" : ""}`;

            item.innerHTML = `
                <input class="today-checkbox" type="checkbox" onchange="completeTask(${index})">
                <div class="today-page-icon">🧹</div>
                <div class="today-page-content">
                    <strong>${escapeHTML(task.name)}</strong>
                    <p class="${overdue ? "today-overdue-text" : ""}">
                        ${overdue ? "🔴 Überfällig" : "Fällig heute"} · ${formatDateGerman(task.dueDate)}
                    </p>
                </div>
                <button class="small-action" onclick="completeTask(${index})">✓ Erledigt</button>
            `;

            tasksList.appendChild(item);
        });
    }

    const openShopping = shoppingItems
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !item.completed);

    shoppingList.innerHTML = "";

    if (openShopping.length === 0) {
        shoppingList.innerHTML = `
            <div class="today-empty-item">
                <span>🛒</span>
                <div>
                    <strong>Keine offenen Einkäufe</strong>
                    <p>Deine Einkaufsliste ist leer.</p>
                </div>
            </div>
        `;
    } else {
        openShopping.forEach(({ item, index }) => {
            const row = document.createElement("div");
            row.className = "today-page-item";
            row.innerHTML = `
                <input class="today-checkbox" type="checkbox" onchange="toggleShoppingItem(${index})">
                <div class="today-page-icon">🛒</div>
                <div class="today-page-content">
                    <strong>${escapeHTML(item.name)}</strong>
                    <p>${item.quantity}× · ${escapeHTML(item.category)}</p>
                </div>
            `;
            shoppingList.appendChild(row);
        });
    }

    const todayTaskTotal = tasks.filter(task => parseLocalDate(task.dueDate) <= today).length;
    const todayTaskCompleted = tasks.filter(task => parseLocalDate(task.dueDate) <= today && task.completed).length;
    const shoppingTotal = shoppingItems.length;
    const shoppingCompleted = shoppingItems.filter(item => item.completed).length;

    const progressTotal = todayTaskTotal + shoppingTotal;
    const progressDone = todayTaskCompleted + shoppingCompleted;
    const percentage = progressTotal === 0 ? 0 : Math.round((progressDone / progressTotal) * 100);

    if (progressText) progressText.textContent = `${progressDone} von ${progressTotal} erledigt`;
    if (progressPercent) progressPercent.textContent = `${percentage}%`;
    if (progressBar) progressBar.style.width = `${percentage}%`;

    if (allDone) {
        allDone.style.display =
            todayEvents.length === 0 && dueTasks.length === 0 && openShopping.length === 0
                ? "flex"
                : "none";
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
renderNotes();
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

    queueCloudSave();

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

// Jetzt, nachdem alle HomeHub-Datenstrukturen definiert sind, Cloud-Login prüfen.
checkLogin();

// =================================
// EINSTELLUNGEN
// =================================

async function clearHomeHubData() {
    const confirmDelete = await showHomeHubConfirm(
        "Möchtest du wirklich alle HomeHub-Daten löschen? Diese Daten werden auch aus Supabase entfernt.",
        "HomeHub-Daten löschen"
    );

    if (!confirmDelete) return;

    const { data: sessionData } = await supabaseClient.auth.getSession();
    const session = sessionData && sessionData.session;

    if (session) {
        if (!currentHousehold) {
            clearHomeHubCache();
            refreshHomeHubUI();
            await showHomeHubAlert("Du bist keinem Haushalt zugeordnet.");
            return;
        }

        const { error } = await supabaseClient
            .from("homehub_data")
            .delete()
            .eq("household_id", currentHousehold.id);

        if (error) {
            console.error("Cloud-Daten konnten nicht gelöscht werden:", error);
            await showHomeHubAlert("Die Cloud-Daten konnten nicht gelöscht werden.");
            return;
        }
    }

    clearHomeHubCache();
    refreshHomeHubUI();
    await showHomeHubAlert("Alle HomeHub-Daten wurden gelöscht.");
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

    reader.onload = async function(e) {

        try {

            const data = JSON.parse(e.target.result);

            localStorage.clear();

            clearHomeHubCache();

            Object.keys(data).forEach(function(key) {
                localStorage.setItem(key, data[key]);
            });

            await queueCloudSave();
            refreshHomeHubUI();

            await showHomeHubAlert(
                "HomeHub wurde erfolgreich wiederhergestellt und in Supabase gespeichert."
            );

        } catch (error) {

            await showHomeHubAlert(
                "Die Datei konnte nicht gelesen werden."
            );

        }

    };

    reader.readAsText(file);
}

// =================================
// KALENDER
// =================================

async function addCalendarEvent() {

    const title = document.getElementById("eventTitle").value.trim();
    const date = document.getElementById("eventDate").value;
    const time = document.getElementById("eventTime").value;
    const note = document.getElementById("eventNote").value.trim();

    const repeat = document.getElementById("eventRepeat").value;
    const category = document.getElementById("eventCategory").value;
    const reminder = document.getElementById("eventReminder").value;

    if (!title || !date) {
        await showHomeHubAlert("Bitte gib mindestens einen Titel und ein Datum ein.");
        return;
    }

    let events = JSON.parse(
        localStorage.getItem("homeHubCalendar") || "[]"
    );

// ========================================
// BESTEHENDEN TERMIN BEARBEITEN
// ========================================

if (window.editingCalendarEventId) {

    const oldEvent = events.find(function(event) {
        return event.id === window.editingCalendarEventId;
    });

    if (!oldEvent) {
        return;
    }

    // ========================================
    // WIEDERHOLUNG ODER NEUER EINZELTERMIN
    // ========================================

    // Alten Termin bzw. alte Serie entfernen
    if (oldEvent.repeatGroupId) {

        events = events.filter(function(event) {
            return event.repeatGroupId !== oldEvent.repeatGroupId;
        });

    } else {

        events = events.filter(function(event) {
            return event.id !== oldEvent.id;
        });

    }

    // ========================================
    // ANZAHL DER NEUEN TERMINE
    // ========================================

    let count = 1;

    if (repeat === "daily") {
        count = 30;
    }

    if (repeat === "weekly") {
        count = 52;
    }

    if (repeat === "monthly") {
        count = 12;
    }

    // Gemeinsame ID für eine neue Wiederholung
    const newGroupId =
        repeat !== "none" ? Date.now() : null;

    const startDate = new Date(
        date + "T" + (time || "00:00")
    );

    // ========================================
    // NEUE TERMINE ERSTELLEN
    // ========================================

    for (let i = 0; i < count; i++) {

        const eventDate = new Date(startDate);

        if (repeat === "daily") {
            eventDate.setDate(
                eventDate.getDate() + i
            );
        }

        if (repeat === "weekly") {
            eventDate.setDate(
                eventDate.getDate() + (i * 7)
            );
        }

        if (repeat === "monthly") {
            eventDate.setMonth(
                eventDate.getMonth() + i
            );
        }

        const year = eventDate.getFullYear();

        const month = String(
            eventDate.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            eventDate.getDate()
        ).padStart(2, "0");

        events.push({
            id: Date.now() + i,
            repeatGroupId: newGroupId,
            title: title,
            date: `${year}-${month}-${day}`,
            time: time,
            note: note,
            repeat: repeat,
            category: category,
            reminder: reminder
        });
    }

    // Bearbeitungsmodus beenden
    window.editingCalendarEventId = null;

}
    // ========================================
    // NEUEN TERMIN ERSTELLEN
    // ========================================

    else {

    const startDate = new Date(
        date + "T" + (time || "00:00")
    );

    let count = 1;

    if (repeat === "daily") {
        count = 30;
    }

    if (repeat === "weekly") {
        count = 52;
    }

    if (repeat === "monthly") {
        count = 12;
    }

    const repeatGroupId = repeat !== "none" ? Date.now() : null;

    for (let i = 0; i < count; i++) {

        const eventDate = new Date(startDate);

        if (repeat === "daily") {
            eventDate.setDate(
                eventDate.getDate() + i
            );
        }

        if (repeat === "weekly") {
            eventDate.setDate(
                eventDate.getDate() + (i * 7)
            );
        }

        if (repeat === "monthly") {
            eventDate.setMonth(
                eventDate.getMonth() + i
            );
        }

        const formattedDate =
            eventDate.toISOString().slice(0, 10);

        const newEvent = {
            id: Date.now() + i,
            repeatGroupId: repeatGroupId,
            title: title,
            date: formattedDate,
            time: time,
            note: note,
            repeat: repeat,
            category: category,
            reminder: reminder
        };

        events.push(newEvent);
    }

}

    // ========================================
    // TERMINE SORTIEREN
    // ========================================

    events.sort(function(a, b) {

        const dateA = new Date(
            a.date + "T" + (a.time || "00:00")
        );

        const dateB = new Date(
            b.date + "T" + (b.time || "00:00")
        );

        return dateA - dateB;

    });

    // ========================================
    // SPEICHERN
    // ========================================

    localStorage.setItem(
        "homeHubCalendar",
        JSON.stringify(events)
    );

    queueCloudSave();

    // ========================================
    // EINGABEFELDER LEEREN
    // ========================================

    document.getElementById("eventTitle").value = "";
    document.getElementById("eventDate").value = "";
    document.getElementById("eventTime").value = "";
    document.getElementById("eventNote").value = "";
    document.getElementById("eventRepeat").value = "none";

    // ========================================
    // BUTTON ZURÜCKSETZEN
    // ========================================

    const button = document.querySelector(
        ".form-card .primary-button"
    );

    if (button) {
        button.textContent = "+ Termin hinzufügen";
    }

    // ========================================
    // ANZEIGEN AKTUALISIEREN
    // ========================================

    renderCalendarEvents();
    renderHomeCalendar();
    renderWeekCalendar();
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

if (event.category && event.category !== "none") {
    button.classList.add("category-" + event.category);
}

                button.title = "Termin löschen";

const metaEl = document.createElement("div");
metaEl.className = "calendar-week-meta";

if (event.repeat && event.repeat !== "none") {
    metaEl.innerHTML += `<span>🔁</span>`;
}

if (event.reminder && event.reminder !== "none") {
    metaEl.innerHTML += `<span>🔔</span>`;
} else {
    metaEl.innerHTML += `<span>🔕</span>`;
}

    button.appendChild(metaEl);


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
    		showCalendarEventMenu(event.id);
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

        ${
            event.category && event.category !== "none"
                ? `<span class="event-category category-${event.category}">
                    ${
                        event.category === "work" ? "💼 Arbeit" :
                        event.category === "sport" ? "🏋️ Sport" :
                        event.category === "free" ? "🎮 Freizeit" :
                        event.category === "important" ? "⭐ Wichtig" :
                        event.category === "other" ? "📌 Sonstiges" :
                        ""
                    }
                </span>`
                : ""
        }

${
    event.repeat && event.repeat !== "none"
        ? `<span class="event-meta">🔁 Wiederholung</span>`
        : ""
}

${
    event.reminder && event.reminder !== "none"
        ? `<span class="event-meta">🔔 Erinnerung</span>`
        : ""
}

        <span>
            📅 ${formattedDate}
            ${event.time ? " · 🕘 " + event.time : ""}
        </span>

                ${
                    event.note
                    ? `<small>${event.note}</small>`
                    : ""
                }

            </div>

<button
    class="secondary-button"
    onclick="editCalendarEvent(${event.id})"
>
    ✏️ Bearbeiten
</button>

            <button
                class="settings-danger"
                onclick="showDeleteCalendarMenu(${event.id})"
            >
                🗑️ Löschen
            </button>
        `;

        list.appendChild(li);
    });
}

// ========================================
// TERMIN-MENÜ IN DER WOCHENANSICHT
// ========================================

function showCalendarEventMenu(id) {

    const oldMenu = document.querySelector(".calendar-event-menu");

    if (oldMenu) {
        oldMenu.remove();
    }

    const menu = document.createElement("div");

    menu.className = "calendar-event-menu";

    menu.innerHTML = `
        <div class="calendar-event-menu-box">

            <strong>Was möchtest du tun?</strong>

            <button class="event-menu-edit">
                ✏️ Bearbeiten
            </button>

            <button class="event-menu-delete">
                🗑️ Löschen
            </button>

            <button class="event-menu-cancel">
                ✖️ Abbrechen
            </button>

        </div>
    `;

    document.body.appendChild(menu);

    menu.querySelector(".event-menu-edit").addEventListener(
        "click",
        function () {
            menu.remove();
            editCalendarEvent(id);
        }
    );

    menu.querySelector(".event-menu-delete").addEventListener(
        "click",
        function () {
            menu.remove();
            showDeleteCalendarMenu(id);
        }
    );

    menu.querySelector(".event-menu-cancel").addEventListener(
        "click",
        function () {
            menu.remove();
        }
    );

    menu.addEventListener("click", function (e) {
        if (e.target === menu) {
            menu.remove();
        }
    });
}

// ================================
// TERMIN BEARBEITEN
// ================================

function editCalendarEvent(id) {

    const events = JSON.parse(
        localStorage.getItem("homeHubCalendar") || "[]"
    );

    const event = events.find(function(event) {
        return event.id === id;
    });

    if (!event) {
        return;
    }

    document.getElementById("eventTitle").value =
        event.title || "";

    document.getElementById("eventDate").value =
        event.date || "";

    document.getElementById("eventTime").value =
        event.time || "";

    document.getElementById("eventNote").value =
        event.note || "";

    document.getElementById("eventCategory").value =
        event.category || "none";

    document.getElementById("eventRepeat").value =
        event.repeat || "none";

    document.getElementById("eventReminder").value =
        event.reminder || "none";

    // Termin-ID merken
    window.editingCalendarEventId = id;

    // Zum Eingabebereich scrollen
    document.getElementById("eventTitle").scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

    // Button ändern
    const button = document.querySelector(
        '.form-card .primary-button'
    );

    if (button) {
        button.textContent = "💾 Änderungen speichern";
    }
}

function showDeleteCalendarMenu(id) {

    const oldMenu = document.querySelector(".calendar-delete-menu");

    if (oldMenu) {
        oldMenu.remove();
    }

    const events = JSON.parse(
        localStorage.getItem("homeHubCalendar") || "[]"
    );

    const event = events.find(function(event) {
        return event.id === id;
    });

    if (!event) {
        return;
    }

    const menu = document.createElement("div");

    menu.className = "calendar-delete-menu";

    // ========================================
    // WIEDERHOLUNG
    // ========================================

    if (event.repeatGroupId) {

        menu.innerHTML = `
            <div class="calendar-delete-menu-box">

                <strong>🗑️ Wiederholung löschen?</strong>

                <button class="delete-menu-one">
                    🗑️ Nur diesen Termin
                </button>

                <button class="delete-menu-all">
                    🗑️ Alle Wiederholungen
                </button>

                <button class="delete-menu-cancel">
                    ✖️ Abbrechen
                </button>

            </div>
        `;

        document.body.appendChild(menu);

        menu.querySelector(".delete-menu-one").addEventListener(
            "click",
            function () {
                menu.remove();
                deleteCalendarEvent(id, "one");
            }
        );

        menu.querySelector(".delete-menu-all").addEventListener(
            "click",
            function () {
                menu.remove();
                deleteCalendarEvent(id, "all");
            }
        );

    }

    // ========================================
    // NORMALER TERMIN
    // ========================================

    else {

        menu.innerHTML = `
            <div class="calendar-delete-menu-box">

                <strong>🗑️ Termin löschen?</strong>

                <button class="delete-menu-one">
                    🗑️ Löschen
                </button>

                <button class="delete-menu-cancel">
                    ✖️ Abbrechen
                </button>

            </div>
        `;

        document.body.appendChild(menu);

        menu.querySelector(".delete-menu-one").addEventListener(
            "click",
            function () {
                menu.remove();
                deleteCalendarEvent(id, "one");
            }
        );
    }

    // ========================================
    // ABBRECHEN
    // ========================================

    menu.querySelector(".delete-menu-cancel").addEventListener(
        "click",
        function () {
            menu.remove();
        }
    );

    // Klick neben das Fenster = schließen
    menu.addEventListener("click", function (e) {
        if (e.target === menu) {
            menu.remove();
        }
    });
}

// =================================
// TERMIN LÖSCHEN
// =================================
function deleteCalendarEvent(id, mode) {

    let events = JSON.parse(
        localStorage.getItem("homeHubCalendar") || "[]"
    );

    const event = events.find(function(event) {
        return event.id === id;
    });

    if (!event) {
        return;
    }

// ========================================
// LÖSCHEN
// ========================================

if (event.repeatGroupId && mode === "all") {

    // Alle Wiederholungen löschen
    events = events.filter(function(item) {
        return item.repeatGroupId !== event.repeatGroupId;
    });

} else {

    // Nur diesen Termin löschen
    events = events.filter(function(item) {
        return item.id !== id;
    });

}

    // ========================================
    // SPEICHERN
    // ========================================

    localStorage.setItem(
        "homeHubCalendar",
        JSON.stringify(events)
    );

    queueCloudSave();

    // ========================================
    // ALLES AKTUALISIEREN
    // ========================================

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

// ========================================
// TERMINDERINNERUNGEN
// ========================================

function checkCalendarReminders() {
    const events = JSON.parse(
        localStorage.getItem("homeHubCalendar") || "[]"
    );

    const now = new Date();

    events.forEach(function(event) {

        if (!event.reminder || event.reminder === "none") {
            return;
        }

        if (!event.time) {
            return;
        }

        const eventDateTime = new Date(
            event.date + "T" + event.time
        );

        const reminderTime = new Date(eventDateTime);

        reminderTime.setMinutes(
            reminderTime.getMinutes() - Number(event.reminder)
        );

        const difference = now - reminderTime;

        // Erinnerung nur innerhalb eines kurzen Zeitfensters auslösen
        if (difference >= 0 && difference < 60000) {

            const reminderKey =
                "homeHubReminder_" + event.id;

            // Nicht mehrfach für denselben Termin anzeigen
            if (localStorage.getItem(reminderKey)) {
                return;
            }

            localStorage.setItem(reminderKey, "shown");

         const reminderBox = document.createElement("div");

reminderBox.className = "homehub-reminder";

reminderBox.innerHTML = `
    <div class="homehub-reminder-icon">🔔</div>
    <div class="homehub-reminder-content">
        <strong>Erinnerung</strong>
        <span>${event.title}</span>
        ${
            event.time
                ? `<small>🕐 ${event.time} Uhr</small>`
                : ""
        }
    </div>
    <button class="homehub-reminder-close">×</button>
`;

document.body.appendChild(reminderBox);

reminderBox
    .querySelector(".homehub-reminder-close")
    .addEventListener("click", function () {
        reminderBox.remove();
    });

setTimeout(function () {
    if (reminderBox.parentElement) {
        reminderBox.remove();
    }
}, 15000);   

        }
    });
}

// Alle 30 Sekunden prüfen
setInterval(checkCalendarReminders, 30000);

// Direkt beim Laden prüfen
checkCalendarReminders();


// Developer-/Cloud-Status bei jeder Auth-Änderung aktualisieren.
if (typeof supabaseClient !== "undefined" && supabaseClient?.auth) {
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        if (!session) {
            developerAccess = false;
            updateDeveloperAccessUI(false, null);
            if (cloudChannel) { supabaseClient.removeChannel(cloudChannel); cloudChannel = null; }
            cloudLoaded = false;
            currentHousehold = null;
            currentMembership = null;
            clearHomeHubCache();
            return;
        }
        updateDeveloperAccess(session.user);
    });
}
