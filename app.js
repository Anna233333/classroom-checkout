(() => {
  "use strict";

  const students = [
    { id: 1, name: "Emma", avatar: "🦊" },
    { id: 2, name: "Liam", avatar: "🐻" },
    { id: 3, name: "Tom", avatar: "🐸" },
    { id: 4, name: "Jack", avatar: "🦁" },
    { id: 5, name: "Noah", avatar: "🐼" },
    { id: 6, name: "Sophia", avatar: "🐰" },
    { id: 7, name: "Maya", avatar: "🐯" },
    { id: 8, name: "Eli", avatar: "🐨" },
    { id: 9, name: "Ava", avatar: "🦄" },
    { id: 10, name: "Leo", avatar: "🐵" },
    { id: 11, name: "Mia", avatar: "🐧" },
    { id: 12, name: "Ben", avatar: "🐙" },
    { id: 13, name: "Zoe", avatar: "🦋" },
    { id: 14, name: "Kai", avatar: "🐺" },
    { id: 15, name: "Ruby", avatar: "🐞" },
    { id: 16, name: "Owen", avatar: "🦉" },
    { id: 17, name: "Ivy", avatar: "🐝" },
    { id: 18, name: "Sam", avatar: "🦖" },
    { id: 19, name: "Nora", avatar: "🐬" },
    { id: 20, name: "Max", avatar: "🐢" }
  ];

  const animalChoices = [...new Set(students.map((student) => student.avatar))];
  const accessoryChoices = [
    { value: "", label: "No accessory" },
    { value: "👓", label: "Glasses" },
    { value: "👑", label: "Crown" },
    { value: "🎀", label: "Bow" },
    { value: "🎩", label: "Hat" },
    { value: "🎧", label: "Headphones" },
    { value: "⭐", label: "Star" }
  ];
  const accessoryPositionClasses = {
    "👓": "accessory-face accessory-glasses",
    "🎧": "accessory-face accessory-headphones",
    "👑": "accessory-top accessory-crown",
    "🎩": "accessory-top accessory-hat",
    "🎀": "accessory-corner accessory-bow",
    "⭐": "accessory-corner accessory-star"
  };

  const bathroomInfo = {
    boys: { label: "Boys’ bathroom", shortLabel: "Boys", icon: "🚹" },
    girls: { label: "Girls’ bathroom", shortLabel: "Girls", icon: "🚺" },
    neutral: { label: "All-gender bathroom", shortLabel: "All-gender", icon: "🚻" }
  };

  const destinations = {
    ...bathroomInfo,
    nurse: { label: "Nurse", shortLabel: "Nurse", icon: "🩹" },
    office: { label: "Office", shortLabel: "Office", icon: "🏫" },
    other: { label: "Other classroom", shortLabel: "Other", icon: "🚪" }
  };

  const buddyModeCopy = {
    OPTIONAL: {
      label: "Optional buddy",
      description: "Students may go alone or choose one available buddy."
    },
    REQUIRED: {
      label: "Buddy required",
      description: "Every new request must include one available buddy."
    },
    SOLO: {
      label: "Solo only",
      description: "Buddy selection is hidden and new requests are individual."
    }
  };

  const FREQUENT_BATHROOM_TRIP_THRESHOLD = 3;
  const SCHEDULE_EARLY_WINDOW_MS = 10 * 60 * 1000;
  const SCHEDULE_LATE_WINDOW_MS = 30 * 60 * 1000;

  const state = {
    buddyMode: "OPTIONAL",
    requests: [],
    history: [],
    studentSupports: {},
    nextRequestId: 101,
    passes: {
      boys: { status: "AVAILABLE", currentRequestId: null },
      girls: { status: "AVAILABLE", currentRequestId: null },
      neutral: { status: "AVAILABLE", currentRequestId: null }
    },
    queues: { boys: [], girls: [], neutral: [] },
    selectedPrimaryId: null,
    selectedBuddyId: null,
    selectionReturnTarget: null,
    dialogStudentId: null,
    dialogBuddyId: null,
    dialogReturnTarget: null,
    dialogReturnStudentId: null
  };

  const els = {
    roster: document.querySelector("#student-roster"),
    rosterSummary: document.querySelector("#roster-summary"),
    selectionAnnouncement: document.querySelector("#selection-announcement"),
    selectionTray: document.querySelector("#selection-tray"),
    selectionTrayContent: document.querySelector("#selection-tray-content"),
    bathroomChips: document.querySelector("#bathroom-chips"),
    studentRuleLabel: document.querySelector("#student-rule-label"),
    teacherMetrics: document.querySelector("#teacher-metrics"),
    teacherAlerts: document.querySelector("#teacher-alerts"),
    teacherAlertCount: document.querySelector("#teacher-alert-count"),
    teacherAlertList: document.querySelector("#teacher-alert-list"),
    supportForm: document.querySelector("#support-form"),
    supportStudent: document.querySelector("#support-student"),
    supportBathroomMinutes: document.querySelector("#support-bathroom-minutes"),
    supportDestination: document.querySelector("#support-destination"),
    supportTime: document.querySelector("#support-time"),
    supportFormError: document.querySelector("#support-form-error"),
    supportList: document.querySelector("#support-list"),
    avatarEditorForm: document.querySelector("#avatar-editor-form"),
    avatarStudent: document.querySelector("#avatar-student"),
    avatarName: document.querySelector("#avatar-name"),
    avatarAnimal: document.querySelector("#avatar-animal"),
    avatarAccessory: document.querySelector("#avatar-accessory"),
    avatarPreview: document.querySelector("#avatar-preview"),
    avatarFormError: document.querySelector("#avatar-form-error"),
    activeTrips: document.querySelector("#active-trips"),
    activeCount: document.querySelector("#active-count"),
    teacherQueues: document.querySelector("#teacher-queues"),
    tripHistory: document.querySelector("#trip-history"),
    dialogShell: document.querySelector("#student-dialog"),
    dialogContent: document.querySelector("#dialog-content"),
    toast: document.querySelector("#toast")
  };

  let toastTimer;

  function studentById(id) {
    return students.find((student) => student.id === Number(id));
  }

  function requestById(id) {
    return state.requests.find((request) => request.id === Number(id));
  }

  function studentIdsForRequest(request) {
    return [request.studentId, request.buddyId].filter(Boolean);
  }

  function namesForRequest(request) {
    return studentIdsForRequest(request).map((id) => studentById(id).name).join(" & ");
  }

  function avatarsForRequest(request) {
    return studentIdsForRequest(request).map((id) => avatarMarkup(studentById(id), "mini-avatar")).join("");
  }

  function avatarMarkup(student, className = "") {
    if (!student) return "";
    const accessoryClass = accessoryPositionClasses[student.accessory] || "accessory-corner";
    return `<span class="avatar-figure ${className}" aria-hidden="true"><span class="avatar-creature">${student.avatar}</span>${student.accessory ? `<i class="avatar-accessory ${accessoryClass}">${student.accessory}</i>` : ""}</span>`;
  }

  function activeRequestForStudent(studentId) {
    return state.requests.find((request) =>
      ["WAITING", "NOT_READY", "OFFERED", "OUT"].includes(request.status) &&
      studentIdsForRequest(request).includes(Number(studentId))
    );
  }

  function studentState(studentId) {
    const request = activeRequestForStudent(studentId);
    if (!request) return { label: "", className: "", request: null };
    if (request.status === "OUT") return { label: "Out", className: "out", request };
    if (request.status === "OFFERED") return { label: "Offered", className: "offered", request };
    return { label: "Waiting", className: "waiting", request };
  }

  function isStudentAvailable(studentId) {
    return !activeRequestForStudent(studentId);
  }

  function isBathroom(destination) {
    return Object.hasOwn(bathroomInfo, destination);
  }

  function timeLabel(date = new Date()) {
    return new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" }).format(date);
  }

  function durationLabel(start, end = new Date()) {
    const minutes = Math.max(1, Math.round((end - start) / 60000));
    return `${minutes} min`;
  }

  function supportForStudent(studentId) {
    return state.studentSupports[Number(studentId)] || {
      bathroomMinutes: 10,
      scheduledDestination: "",
      scheduledTime: ""
    };
  }

  function scheduledDateForToday(time, referenceDate = new Date()) {
    if (!time) return null;
    const [hours, minutes] = time.split(":").map(Number);
    const scheduled = new Date(referenceDate);
    scheduled.setHours(hours, minutes, 0, 0);
    return scheduled;
  }

  function dueScheduleForStudent(studentId, now = new Date()) {
    const support = supportForStudent(studentId);
    if (!support.scheduledDestination || !support.scheduledTime) return null;
    const scheduledAt = scheduledDateForToday(support.scheduledTime, now);
    const difference = now.getTime() - scheduledAt.getTime();
    if (difference < -SCHEDULE_EARLY_WINDOW_MS || difference > SCHEDULE_LATE_WINDOW_MS) return null;

    const requestMatchesSchedule = (request) =>
      request.destination === support.scheduledDestination &&
      studentIdsForRequest(request).includes(Number(studentId)) &&
      request.departedAt &&
      Math.abs(request.departedAt.getTime() - scheduledAt.getTime()) <= 60 * 60 * 1000;
    const tripMatchesSchedule = (trip) =>
      trip.destination === support.scheduledDestination &&
      (trip.studentIds || []).includes(Number(studentId)) &&
      Math.abs(trip.departedAt.getTime() - scheduledAt.getTime()) <= 60 * 60 * 1000;

    if (state.requests.some((request) => ["OUT", "RETURNED"].includes(request.status) && requestMatchesSchedule(request))) return null;
    if (state.history.some(tripMatchesSchedule)) return null;
    return { ...support, scheduledAt };
  }

  function showToast(message, tone = "success") {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.className = `toast is-visible ${tone}`;
    toastTimer = window.setTimeout(() => {
      els.toast.className = "toast";
    }, 3600);
  }

  function renderAll() {
    renderStudentHeader();
    renderBathroomChips();
    renderRoster();
    renderSelectionTray();
    renderTeacherDashboard();
  }

  function renderStudentHeader() {
    els.studentRuleLabel.textContent = buddyModeCopy[state.buddyMode].label;
  }

  function renderBathroomChips() {
    els.bathroomChips.innerHTML = Object.entries(bathroomInfo).map(([key, info]) => {
      const pass = state.passes[key];
      const waitingCount = state.queues[key].filter((id) => {
        const request = requestById(id);
        return request && ["WAITING", "NOT_READY", "OFFERED"].includes(request.status);
      }).length;
      const stateText = pass.status === "IN_USE" ? "In use" : pass.status === "OFFERED" ? "Offered" : "Available";
      const stateClass = pass.status === "IN_USE" ? "in-use" : pass.status === "OFFERED" ? "offered" : "";
      return `
        <article class="bathroom-chip">
          <span class="bathroom-chip-icon" aria-hidden="true">${info.icon}</span>
          <span><strong>${info.shortLabel}</strong><small>${waitingCount} waiting</small></span>
          <span class="bathroom-chip-state ${stateClass}">${stateText}</span>
        </article>`;
    }).join("");
  }

  function renderRoster() {
    const availableCount = students.filter((student) => isStudentAvailable(student.id)).length;
    els.rosterSummary.textContent = `${availableCount} of ${students.length} students available`;
    els.roster.innerHTML = students.map((student) => {
      const status = studentState(student.id);
      const isSelected = state.selectedPrimaryId === student.id;
      const choosingBuddy = Boolean(state.selectedPrimaryId) && els.dialogShell.hidden;
      const unavailableChoice = choosingBuddy && !isSelected && !isStudentAvailable(student.id);
      let accessibleStatus = status.label ? `, ${status.label}` : ", available";
      if (isSelected) accessibleStatus = ", selected as primary student; tap again to cancel";
      else if (choosingBuddy && !unavailableChoice) accessibleStatus = ", available; tap to choose as buddy";
      else if (unavailableChoice) accessibleStatus += ", unavailable as a buddy";
      return `
        <button class="student-card${isSelected ? " is-selected" : ""}${unavailableChoice ? " is-unavailable-choice" : ""}" type="button" data-student-id="${student.id}" aria-label="${student.name}${accessibleStatus}" aria-pressed="${isSelected}"${unavailableChoice ? " aria-disabled=\"true\"" : ""}>
          <span class="state-badge ${status.className}">${status.label}</span>
          ${avatarMarkup(student, "avatar")}
          <span class="student-name">${student.name}</span>
        </button>`;
    }).join("");
  }

  function renderSelectionTray() {
    const primary = studentById(state.selectedPrimaryId);
    const shouldShow = Boolean(primary) && els.dialogShell.hidden && state.buddyMode !== "SOLO";
    els.selectionTray.hidden = !shouldShow;
    document.body.classList.toggle("selection-active", shouldShow);
    if (!shouldShow) {
      els.selectionTrayContent.innerHTML = "";
      return;
    }

    const prompt = state.buddyMode === "REQUIRED"
      ? "Now tap one available buddy"
      : "Tap a buddy, or continue alone";
    els.selectionTrayContent.innerHTML = `
      <div class="selection-tray-inner">
        <div class="selection-choice">
          ${avatarMarkup(primary, "avatar")}
          <span><strong id="selection-tray-title">${primary.name} selected</strong><small>${prompt}</small></span>
        </div>
        <div class="selection-actions">
          <button class="button secondary" type="button" data-cancel-selection>Cancel</button>
          ${state.buddyMode === "OPTIONAL" ? `<button class="button primary" type="button" data-continue-solo>Continue Solo</button>` : ""}
        </div>
      </div>`;
  }

  function initializeSupportForm() {
    els.supportStudent.innerHTML = studentOptionsMarkup();
    populateSupportForm();
  }

  function studentOptionsMarkup() {
    return students.map((student) =>
      `<option value="${student.id}">${student.avatar}${student.accessory || ""} ${student.name}</option>`
    ).join("");
  }

  function refreshStudentOptionLabels() {
    const supportStudentId = els.supportStudent.value;
    const avatarStudentId = els.avatarStudent.value;
    els.supportStudent.innerHTML = studentOptionsMarkup();
    els.avatarStudent.innerHTML = studentOptionsMarkup();
    els.supportStudent.value = supportStudentId;
    els.avatarStudent.value = avatarStudentId;
  }

  function populateSupportForm() {
    const support = supportForStudent(els.supportStudent.value || students[0].id);
    els.supportBathroomMinutes.value = support.bathroomMinutes;
    els.supportDestination.value = support.scheduledDestination;
    els.supportTime.value = support.scheduledTime;
    els.supportTime.disabled = !support.scheduledDestination;
    els.supportFormError.hidden = true;
  }

  function saveStudentSupport(form) {
    const data = new FormData(form);
    const studentId = Number(data.get("studentId"));
    const bathroomMinutes = Number(data.get("bathroomMinutes"));
    const scheduledDestination = data.get("scheduledDestination");
    const scheduledTime = data.get("scheduledTime");

    if (!Number.isFinite(bathroomMinutes) || bathroomMinutes < 5 || bathroomMinutes > 60) {
      els.supportFormError.textContent = "Bathroom check-in time must be between 5 and 60 minutes.";
      els.supportFormError.hidden = false;
      return;
    }
    if (scheduledDestination && !scheduledTime) {
      els.supportFormError.textContent = "Choose a time for the daily destination reminder.";
      els.supportFormError.hidden = false;
      return;
    }

    state.studentSupports[studentId] = {
      bathroomMinutes,
      scheduledDestination,
      scheduledTime: scheduledDestination ? scheduledTime : ""
    };
    els.supportFormError.hidden = true;
    renderTeacherDashboard();
    showToast(`Support settings saved for ${studentById(studentId).name}.`);
  }

  function renderSupportList() {
    const entries = Object.entries(state.studentSupports);
    els.supportList.innerHTML = entries.length ? entries.map(([studentId, support]) => {
      const student = studentById(studentId);
      const scheduleText = support.scheduledDestination
        ? `${destinations[support.scheduledDestination].shortLabel} daily at ${timeLabel(scheduledDateForToday(support.scheduledTime))}`
        : "No daily destination reminder";
      return `
        <article class="support-item">
          <div class="support-item-main">
            ${avatarMarkup(student, "support-item-avatar")}
            <span><strong>${student.name}</strong><small>Bathroom check-in: ${support.bathroomMinutes} min · ${scheduleText}</small></span>
          </div>
          <div class="support-item-actions">
            <button type="button" data-edit-support="${student.id}">Edit</button>
            <button type="button" data-remove-support="${student.id}">Remove</button>
          </div>
        </article>`;
    }).join("") : emptyState("No personalized supports have been added this session.");
  }

  function initializeAvatarEditor() {
    els.avatarStudent.innerHTML = studentOptionsMarkup();
    els.avatarAnimal.innerHTML = animalChoices.map((animal) =>
      `<option value="${animal}">${animal}</option>`
    ).join("");
    els.avatarAccessory.innerHTML = accessoryChoices.map((accessory) =>
      `<option value="${accessory.value}">${accessory.value ? `${accessory.value} ` : ""}${accessory.label}</option>`
    ).join("");
    populateAvatarEditor();
  }

  function populateAvatarEditor() {
    const student = studentById(els.avatarStudent.value || students[0].id);
    els.avatarName.value = student.name;
    els.avatarAnimal.value = student.avatar;
    els.avatarAccessory.value = student.accessory || "";
    els.avatarFormError.hidden = true;
    updateAvatarPreview();
  }

  function updateAvatarPreview() {
    const animal = animalChoices.includes(els.avatarAnimal.value) ? els.avatarAnimal.value : animalChoices[0];
    const accessory = accessoryChoices.some((choice) => choice.value === els.avatarAccessory.value) ? els.avatarAccessory.value : "";
    els.avatarPreview.innerHTML = `${avatarMarkup({ avatar: animal, accessory }, "avatar-preview-figure")}<strong></strong><small>Preview</small>`;
    els.avatarPreview.querySelector("strong").textContent = els.avatarName.value.trim() || "Student";
  }

  function saveAvatarProfile(form) {
    const data = new FormData(form);
    const student = studentById(data.get("studentId"));
    const studentName = data.get("studentName").trim();
    const animal = data.get("animal");
    const accessory = data.get("accessory");
    const validName = /^[\p{L}][\p{L} '\-]{0,13}$/u.test(studentName);
    const duplicateName = students.some((candidate) => candidate.id !== student.id && candidate.name.toLowerCase() === studentName.toLowerCase());

    if (!validName) {
      els.avatarFormError.textContent = "Use 1–14 letters, spaces, apostrophes, or hyphens for the display name.";
      els.avatarFormError.hidden = false;
      return;
    }
    if (duplicateName) {
      els.avatarFormError.textContent = "Each student needs a unique display name.";
      els.avatarFormError.hidden = false;
      return;
    }
    if (!animalChoices.includes(animal) || !accessoryChoices.some((choice) => choice.value === accessory)) return;

    student.name = studentName;
    student.avatar = animal;
    student.accessory = accessory;
    els.avatarFormError.hidden = true;
    refreshStudentOptionLabels();
    renderAll();
    populateAvatarEditor();
    showToast(`${student.name}’s avatar was updated.`);
  }

  function renderTeacherDashboard() {
    const activeRequests = state.requests.filter((request) => request.status === "OUT");
    const waitingRequests = state.requests.filter((request) => ["WAITING", "NOT_READY", "OFFERED"].includes(request.status));
    const studentCountOut = activeRequests.reduce((sum, request) => sum + studentIdsForRequest(request).length, 0);
    const offeredCount = waitingRequests.filter((request) => request.status === "OFFERED").length;

    els.teacherMetrics.innerHTML = [
      ["Students out", studentCountOut],
      ["Requests waiting", waitingRequests.length],
      ["Passes offered", offeredCount],
      ["Trips completed", state.history.length]
    ].map(([label, value]) => `<article class="metric"><span>${label}</span><strong>${value}</strong></article>`).join("");

    renderTeacherReminders(activeRequests);
    renderSupportList();

    els.activeCount.textContent = studentCountOut;
    els.activeTrips.innerHTML = activeRequests.length ? activeRequests.map((request) => `
      <article class="list-row">
        <div class="list-row-main">
          <span class="list-row-avatar" aria-hidden="true">${avatarsForRequest(request)}</span>
          <span><strong>${namesForRequest(request)}</strong><small>${destinations[request.destination].label} · Floor ${request.floor}</small></span>
        </div>
        <div class="active-trip-actions">
          <small>Left ${timeLabel(request.departedAt)}</small>
          <button class="button return-button" type="button" data-action="return" data-request-id="${request.id}" aria-label="Mark ${namesForRequest(request)} returned">Mark Returned</button>
        </div>
      </article>`).join("") : emptyState("Everyone is in the classroom.");

    const queueSections = Object.entries(bathroomInfo).map(([key, info]) => {
      const queueRequests = state.queues[key].map(requestById).filter((request) => request && request.status !== "OUT");
      if (!queueRequests.length) return "";
      return `
        <div class="queue-group">
          <p class="field-label">${info.icon} ${info.shortLabel}</p>
          ${queueRequests.map((request, index) => `
            <article class="list-row">
              <div class="list-row-main">
                <span><strong>${index + 1}. ${namesForRequest(request)}</strong><small>Floor ${request.floor}</small></span>
              </div>
              <span class="state-badge ${request.status === "OFFERED" ? "offered" : "waiting"}" style="position:static;width:auto;height:auto;padding:5px 8px;font-size:.62rem;color:inherit">${request.status.replace("_", " ")}</span>
            </article>`).join("")}
        </div>`;
    }).join("");
    els.teacherQueues.innerHTML = queueSections || emptyState("No one is waiting for a bathroom pass.");

    els.tripHistory.innerHTML = state.history.length ? [...state.history].reverse().map((trip) => `
      <article class="list-row">
        <div class="list-row-main">
          <span class="list-row-avatar" aria-hidden="true">${trip.avatars}</span>
          <span><strong>${trip.names}</strong><small>${destinations[trip.destination].shortLabel} · Floor ${trip.floor}</small></span>
        </div>
        <span class="history-timing">
          <small><b>Left</b> ${timeLabel(trip.departedAt)}</small>
          <small><b>Returned</b> ${timeLabel(trip.returnedAt)}</small>
          <strong>${trip.duration} total</strong>
        </span>
      </article>`).join("") : emptyState("Returned trips will appear here.");
  }

  function renderTeacherReminders(activeRequests) {
    const bathroomTripCounts = new Map(students.map((student) => [student.id, 0]));
    state.history.filter((trip) => isBathroom(trip.destination)).forEach((trip) => {
      (trip.studentIds || []).forEach((studentId) => {
        bathroomTripCounts.set(studentId, (bathroomTripCounts.get(studentId) || 0) + 1);
      });
    });
    activeRequests.filter((request) => isBathroom(request.destination)).forEach((request) => {
      studentIdsForRequest(request).forEach((studentId) => {
        bathroomTripCounts.set(studentId, (bathroomTripCounts.get(studentId) || 0) + 1);
      });
    });

    const longTripReminders = activeRequests
      .filter((request) => isBathroom(request.destination))
      .flatMap((request) => studentIdsForRequest(request).map((studentId) => ({ request, student: studentById(studentId) })))
      .filter(({ request, student }) => {
        const thresholdMs = supportForStudent(student.id).bathroomMinutes * 60 * 1000;
        return Date.now() - request.departedAt.getTime() > thresholdMs;
      })
      .map(({ request, student }) => ({
        icon: "⏱️",
        names: student.name,
        detail: `Bathroom trip passed their ${supportForStudent(student.id).bathroomMinutes}-minute check-in time · left ${timeLabel(request.departedAt)}`
      }));

    const frequentTripReminders = students
      .filter((student) => (bathroomTripCounts.get(student.id) || 0) >= FREQUENT_BATHROOM_TRIP_THRESHOLD)
      .map((student) => ({
        icon: "↻",
        names: student.name,
        detail: `${bathroomTripCounts.get(student.id)} bathroom trips during this session`
      }));

    const scheduledReminders = students.flatMap((student) => {
      const schedule = dueScheduleForStudent(student.id);
      if (!schedule) return [];
      return [{
        icon: destinations[schedule.scheduledDestination].icon,
        names: student.name,
        detail: `${destinations[schedule.scheduledDestination].label} scheduled for ${timeLabel(schedule.scheduledAt)} · awaiting sign-out`
      }];
    });

    const reminders = [...scheduledReminders, ...longTripReminders, ...frequentTripReminders];
    els.teacherAlerts.hidden = reminders.length === 0;
    els.teacherAlertCount.textContent = reminders.length;
    els.teacherAlertList.innerHTML = reminders.map((reminder) => `
      <article class="reminder-row">
        <span class="reminder-icon" aria-hidden="true">${reminder.icon}</span>
        <span><strong>${reminder.names}</strong><small>${reminder.detail}</small></span>
      </article>`).join("");
  }

  function emptyState(message) {
    return `<div class="empty-state">${message}</div>`;
  }

  function openStudentDialog(studentId, trigger, buddyId = null) {
    const student = studentById(studentId);
    if (!student) return;
    state.dialogStudentId = student.id;
    state.dialogBuddyId = buddyId ? Number(buddyId) : null;
    state.dialogReturnTarget = trigger || state.selectionReturnTarget || document.activeElement;
    state.dialogReturnStudentId = state.selectedPrimaryId || student.id;
    renderOpenDialog();
    els.dialogShell.hidden = false;
    document.body.classList.add("dialog-open");
    renderRoster();
    renderSelectionTray();
    requestAnimationFrame(() => {
      const focusTarget = els.dialogShell.querySelector("input:checked, button:not(.dialog-close)") || els.dialogShell.querySelector(".dialog-close");
      focusTarget?.focus();
    });
  }

  function renderOpenDialog() {
    if (!state.dialogStudentId) return;
    const student = studentById(state.dialogStudentId);
    const request = activeRequestForStudent(student.id);
    els.dialogContent.innerHTML = request ? statusDialog(student, request) : requestForm(student, state.dialogBuddyId);
  }

  function dialogPerson(student, subtitle, buddy = null) {
    const title = buddy ? `${student.name} & ${buddy.name}` : `Hi, ${student.name}!`;
    return `
      <div class="dialog-person">
        <span class="dialog-avatar-group" aria-hidden="true">${avatarMarkup(student, "dialog-avatar")}${buddy ? avatarMarkup(buddy, "dialog-avatar") : ""}</span>
        <div><p class="eyebrow">Student checkout</p><h2 id="dialog-title">${title}</h2><p id="dialog-description">${subtitle}</p></div>
      </div>`;
  }

  function requestForm(student, buddyId = null, errorMessage = "") {
    const buddy = studentById(buddyId);
    const dueSchedule = dueScheduleForStudent(student.id);
    const preferredDestination = dueSchedule?.scheduledDestination || Object.keys(destinations)[0];
    return `
      ${dialogPerson(student, buddy ? "You’re checking out together. Choose where you’re going." : "Choose where you’re going. We’ll check the pass for you.", buddy)}
      ${dueSchedule ? `<p class="scheduled-support">${destinations[dueSchedule.scheduledDestination].icon} Scheduled ${destinations[dueSchedule.scheduledDestination].label} visit at ${timeLabel(dueSchedule.scheduledAt)}. It’s selected below.</p>` : ""}
      <form id="trip-request-form" class="trip-form" novalidate>
        <fieldset class="field-group" style="border:0;padding:0;margin:0">
          <legend class="field-label">Destination</legend>
          <div class="option-grid">
            ${Object.entries(destinations).map(([key, info]) => `
              <label class="option-card">
                <input type="radio" name="destination" value="${key}" ${key === preferredDestination ? "checked" : ""}>
                <span><b aria-hidden="true">${info.icon}</b>${info.shortLabel}</span>
              </label>`).join("")}
          </div>
        </fieldset>
        <fieldset class="field-group" style="border:0;padding:0;margin:0">
          <legend class="field-label">Floor</legend>
          <div class="option-grid" style="grid-template-columns:1fr 1fr">
            <label class="option-card"><input type="radio" name="floor" value="1" checked><span><b>1</b>First floor</span></label>
            <label class="option-card"><input type="radio" name="floor" value="2"><span><b>2</b>Second floor</span></label>
          </div>
        </fieldset>
        ${errorMessage ? `<p class="form-error" role="alert">${errorMessage}</p>` : ""}
        <div class="dialog-actions">
          <button class="button secondary" type="button" data-change-students>${buddy ? "Change students" : "Change student"}</button>
          <button class="button primary" type="submit">I’m Going</button>
        </div>
      </form>`;
  }

  function statusDialog(student, request) {
    const destination = destinations[request.destination];
    const partner = request.buddyId ? studentById(request.buddyId === student.id ? request.studentId : request.buddyId) : null;
    const sharedDetails = `${destination.label} · Floor ${request.floor}${partner ? ` · With ${partner.name}` : ""}`;

    if (request.status === "OUT") {
      return `
        ${dialogPerson(student, "You’re checked out right now.")}
        <div class="status-panel">
          <div class="status-callout out"><strong>${destination.icon} You’re out</strong><p>${sharedDetails}<br>Left at ${timeLabel(request.departedAt)}</p></div>
          <div class="dialog-actions"><button class="button secondary" type="button" data-close-dialog>Cancel</button><button class="button danger" type="button" data-action="return" data-request-id="${request.id}">I’m Back</button></div>
        </div>`;
    }

    if (request.status === "OFFERED") {
      return `
        ${dialogPerson(student, "Good news—the pass is ready for you.")}
        <div class="status-panel">
          <div class="status-callout offered"><strong>${destination.icon} Your pass is ready!</strong><p>${sharedDetails}</p></div>
          <div class="dialog-actions"><button class="button warning" type="button" data-action="not-ready" data-request-id="${request.id}">Not Ready</button><button class="button primary" type="button" data-action="use-pass" data-request-id="${request.id}">Use Pass</button></div>
        </div>`;
    }

    const queue = state.queues[request.destination];
    const position = queue.indexOf(request.id) + 1;
    const isNotReady = request.status === "NOT_READY";
    return `
      ${dialogPerson(student, isNotReady ? "Your place is saved until you’re ready." : "You’re in line for a bathroom pass.")}
      <div class="status-panel">
        <div class="status-callout"><strong>${destination.icon} ${isNotReady ? "Place saved" : `You’re number ${position}`}</strong><p>${sharedDetails}${isNotReady ? `<br>Original queue position: ${position}` : ""}</p></div>
        <div class="dialog-actions"><button class="button secondary" type="button" data-close-dialog>Close</button>${isNotReady ? `<button class="button primary" type="button" data-action="ready-now" data-request-id="${request.id}">Ready Now</button>` : `<button class="button warning" type="button" data-action="not-ready" data-request-id="${request.id}">Not Ready</button>`}</div>
      </div>`;
  }

  function clearSelection({ render = true, restoreFocus = false } = {}) {
    const returnTarget = state.selectionReturnTarget;
    const returnStudentId = state.selectedPrimaryId;
    state.selectedPrimaryId = null;
    state.selectedBuddyId = null;
    state.selectionReturnTarget = null;
    if (render) {
      renderRoster();
      renderSelectionTray();
    }
    if (restoreFocus) {
      const currentCard = returnStudentId ? els.roster.querySelector(`[data-student-id="${returnStudentId}"]`) : null;
      if (currentCard) currentCard.focus();
      else if (returnTarget && document.contains(returnTarget)) returnTarget.focus();
    }
  }

  function closeDialog({ restoreFocus = true, keepSelection = false } = {}) {
    if (els.dialogShell.hidden) return;
    els.dialogShell.hidden = true;
    document.body.classList.remove("dialog-open");
    const returnTarget = state.dialogReturnTarget;
    const returnStudentId = state.dialogReturnStudentId;
    state.dialogStudentId = null;
    state.dialogBuddyId = null;
    state.dialogReturnTarget = null;
    state.dialogReturnStudentId = null;
    if (!keepSelection) clearSelection({ render: false });
    renderRoster();
    renderSelectionTray();
    if (restoreFocus) {
      const currentCard = returnStudentId ? els.roster.querySelector(`[data-student-id="${returnStudentId}"]`) : null;
      if (currentCard) currentCard.focus();
      else if (returnTarget && document.contains(returnTarget)) returnTarget.focus();
    }
  }

  function changeStudents() {
    const keepPrimary = state.buddyMode !== "SOLO" && Boolean(state.selectedPrimaryId);
    state.selectedBuddyId = null;
    closeDialog({ keepSelection: keepPrimary });
    if (keepPrimary) {
      els.selectionAnnouncement.textContent = `Choose a different buddy for ${studentById(state.selectedPrimaryId).name}.`;
    }
  }

  function handleStudentSelection(studentId, trigger) {
    const activeRequest = activeRequestForStudent(studentId);
    if (activeRequest) {
      if (state.selectedPrimaryId) {
        showToast(`${studentById(studentId).name} is not available as a buddy.`, "notice");
        return;
      }
      openStudentDialog(studentId, trigger);
      return;
    }

    if (state.buddyMode === "SOLO") {
      clearSelection({ render: false });
      openStudentDialog(studentId, trigger);
      return;
    }

    if (!state.selectedPrimaryId) {
      state.selectedPrimaryId = Number(studentId);
      state.selectionReturnTarget = trigger;
      renderRoster();
      renderSelectionTray();
      const prompt = state.buddyMode === "REQUIRED" ? "Now tap an available buddy." : "Now tap a buddy, or choose Continue Solo.";
      els.selectionAnnouncement.textContent = `${studentById(studentId).name} selected. ${prompt}`;
      return;
    }

    if (state.selectedPrimaryId === Number(studentId)) {
      const name = studentById(studentId).name;
      clearSelection({ restoreFocus: true });
      els.selectionAnnouncement.textContent = `${name} selection canceled.`;
      return;
    }

    if (!isStudentAvailable(studentId)) {
      showToast(`${studentById(studentId).name} is not available as a buddy.`, "notice");
      return;
    }

    state.selectedBuddyId = Number(studentId);
    openStudentDialog(state.selectedPrimaryId, state.selectionReturnTarget, state.selectedBuddyId);
  }

  function continueSolo() {
    if (!state.selectedPrimaryId || state.buddyMode !== "OPTIONAL") return;
    state.selectedBuddyId = null;
    openStudentDialog(state.selectedPrimaryId, state.selectionReturnTarget);
  }

  function createRequest(studentId, destination, floor, buddyId) {
    if (!isStudentAvailable(studentId)) return { error: "You already have an active request." };
    let normalizedBuddyId = buddyId ? Number(buddyId) : null;
    if (state.buddyMode === "SOLO") normalizedBuddyId = null;
    if (state.buddyMode === "REQUIRED" && !normalizedBuddyId) return { error: "Please choose an available buddy." };
    if (normalizedBuddyId && (!isStudentAvailable(normalizedBuddyId) || normalizedBuddyId === Number(studentId))) {
      return { error: "That buddy is no longer available. Please choose another." };
    }

    const request = {
      id: state.nextRequestId++,
      studentId: Number(studentId),
      buddyId: normalizedBuddyId,
      destination,
      floor: Number(floor),
      status: "WAITING",
      requestedAt: new Date(),
      departedAt: null,
      returnedAt: null
    };
    state.requests.push(request);
    return { request };
  }

  function submitRequest(form) {
    const data = new FormData(form);
    const destination = data.get("destination");
    const result = createRequest(state.dialogStudentId, destination, data.get("floor"), state.dialogBuddyId);
    if (result.error) {
      els.dialogContent.innerHTML = requestForm(studentById(state.dialogStudentId), state.dialogBuddyId, result.error);
      els.dialogContent.querySelector("input")?.focus();
      return;
    }

    const request = result.request;
    if (!isBathroom(destination)) {
      checkOut(request);
      closeDialog();
      renderAll();
      showToast(`${namesForRequest(request)} checked out to the ${destinations[destination].shortLabel}.`);
      return;
    }

    const pass = state.passes[destination];
    const queue = state.queues[destination];
    if (pass.status === "AVAILABLE" && queue.length === 0) {
      checkOut(request);
      closeDialog();
      renderAll();
      showToast(`${namesForRequest(request)} may go now. The ${bathroomInfo[destination].shortLabel.toLowerCase()} pass is in use.`);
    } else {
      request.status = "WAITING";
      queue.push(request.id);
      offerNextPass(destination);
      closeDialog();
      renderAll();
      const position = queue.indexOf(request.id) + 1;
      const message = request.status === "OFFERED" ? "The pass is ready—tap your animal to use it." : `You’re number ${position} in line. Please return to your seat.`;
      showToast(message, "notice");
    }
  }

  function checkOut(request) {
    request.status = "OUT";
    request.departedAt = new Date();
    if (isBathroom(request.destination)) {
      const queue = state.queues[request.destination];
      const index = queue.indexOf(request.id);
      if (index >= 0) queue.splice(index, 1);
      state.passes[request.destination] = { status: "IN_USE", currentRequestId: request.id };
    }
  }

  function offerNextPass(bathroomType) {
    const pass = state.passes[bathroomType];
    if (pass.status !== "AVAILABLE") return;
    const next = state.queues[bathroomType]
      .map(requestById)
      .find((request) => request && request.status === "WAITING");
    if (!next) return;
    next.status = "OFFERED";
    pass.status = "OFFERED";
    pass.currentRequestId = next.id;
  }

  function markNotReady(request) {
    if (!request || !isBathroom(request.destination)) return;
    const pass = state.passes[request.destination];
    if (request.status === "OFFERED" && pass.currentRequestId === request.id) {
      pass.status = "AVAILABLE";
      pass.currentRequestId = null;
    }
    request.status = "NOT_READY";
    offerNextPass(request.destination);
    renderAll();
    closeDialog();
    showToast("Your place is saved. Tap your animal when you’re ready.", "notice");
  }

  function markReady(request) {
    if (!request || request.status !== "NOT_READY") return;
    request.status = "WAITING";
    offerNextPass(request.destination);
    renderAll();
    closeDialog();
    showToast(request.status === "OFFERED" ? "The pass is ready for you now." : "You’re ready. Your original place is saved.");
  }

  function useOfferedPass(request) {
    if (!request || request.status !== "OFFERED") return;
    checkOut(request);
    renderAll();
    closeDialog();
    showToast(`${namesForRequest(request)} may go now.`);
  }

  function returnFromTrip(request) {
    if (!request || request.status !== "OUT") return;
    request.returnedAt = new Date();
    state.history.push({
      studentIds: studentIdsForRequest(request),
      names: namesForRequest(request),
      avatars: avatarsForRequest(request),
      destination: request.destination,
      floor: request.floor,
      departedAt: request.departedAt,
      returnedAt: request.returnedAt,
      duration: durationLabel(request.departedAt, request.returnedAt)
    });
    request.status = "RETURNED";
    if (isBathroom(request.destination)) {
      state.passes[request.destination] = { status: "AVAILABLE", currentRequestId: null };
      offerNextPass(request.destination);
    }
    renderAll();
    closeDialog();
    showToast(`Welcome back, ${namesForRequest(request)}!`);
  }

  function setBuddyMode(mode) {
    if (!buddyModeCopy[mode] || mode === state.buddyMode) return;
    const hadUnfinishedSelection = Boolean(state.selectedPrimaryId) || (!els.dialogShell.hidden && state.dialogStudentId && !activeRequestForStudent(state.dialogStudentId));
    if (!els.dialogShell.hidden && state.dialogStudentId && !activeRequestForStudent(state.dialogStudentId)) {
      closeDialog({ restoreFocus: false });
    } else {
      clearSelection();
    }
    state.buddyMode = mode;
    document.querySelectorAll("[data-mode]").forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.mode === mode);
    });
    document.querySelector("#buddy-mode-description").textContent = buddyModeCopy[mode].description;
    renderStudentHeader();
    showToast(`${buddyModeCopy[mode].label} is now active for new requests.${hadUnfinishedSelection ? " Unfinished selection cleared." : ""}`);
  }

  function switchView(viewName) {
    if (state.selectedPrimaryId) clearSelection();
    document.querySelector("#student-view").hidden = viewName !== "student";
    document.querySelector("#teacher-view").hidden = viewName !== "teacher";
    document.querySelectorAll(".view-tab").forEach((button) => {
      const isActive = button.dataset.view === viewName;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    if (viewName === "teacher") renderTeacherDashboard();
  }

  document.addEventListener("click", (event) => {
    const studentCard = event.target.closest("[data-student-id]");
    if (studentCard) handleStudentSelection(Number(studentCard.dataset.studentId), studentCard);

    const cancelSelectionButton = event.target.closest("[data-cancel-selection]");
    if (cancelSelectionButton) clearSelection({ restoreFocus: true });

    const continueSoloButton = event.target.closest("[data-continue-solo]");
    if (continueSoloButton) continueSolo();

    const changeStudentsButton = event.target.closest("[data-change-students]");
    if (changeStudentsButton) changeStudents();

    const editSupportButton = event.target.closest("[data-edit-support]");
    if (editSupportButton) {
      els.supportStudent.value = editSupportButton.dataset.editSupport;
      populateSupportForm();
      els.supportForm.scrollIntoView({ behavior: "smooth", block: "center" });
      els.supportBathroomMinutes.focus();
    }

    const removeSupportButton = event.target.closest("[data-remove-support]");
    if (removeSupportButton) {
      const studentId = Number(removeSupportButton.dataset.removeSupport);
      delete state.studentSupports[studentId];
      if (Number(els.supportStudent.value) === studentId) populateSupportForm();
      renderTeacherDashboard();
      showToast(`Personalized supports removed for ${studentById(studentId).name}.`, "notice");
    }

    const closeButton = event.target.closest("[data-close-dialog]");
    if (closeButton) closeDialog();

    const viewButton = event.target.closest("[data-view]");
    if (viewButton) switchView(viewButton.dataset.view);

    const modeButton = event.target.closest("[data-mode]");
    if (modeButton) setBuddyMode(modeButton.dataset.mode);

    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      const request = requestById(actionButton.dataset.requestId);
      if (actionButton.dataset.action === "not-ready") markNotReady(request);
      if (actionButton.dataset.action === "ready-now") markReady(request);
      if (actionButton.dataset.action === "use-pass") useOfferedPass(request);
      if (actionButton.dataset.action === "return") returnFromTrip(request);
    }
  });

  document.addEventListener("submit", (event) => {
    if (event.target.matches("#support-form")) {
      event.preventDefault();
      saveStudentSupport(event.target);
    } else if (event.target.matches("#avatar-editor-form")) {
      event.preventDefault();
      saveAvatarProfile(event.target);
    } else if (event.target.matches("#trip-request-form")) {
      event.preventDefault();
      submitRequest(event.target);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.dialogShell.hidden) closeDialog();
    if (event.key === "Tab" && !els.dialogShell.hidden) {
      const focusable = [...els.dialogShell.querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled])")].filter((item) => item.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  document.querySelector("#clear-history").addEventListener("click", () => {
    state.history.length = 0;
    renderTeacherDashboard();
    showToast("Return history cleared.", "notice");
  });

  els.supportStudent.addEventListener("change", populateSupportForm);
  els.supportDestination.addEventListener("change", () => {
    els.supportTime.disabled = !els.supportDestination.value;
    if (!els.supportDestination.value) els.supportTime.value = "";
  });
  els.avatarStudent.addEventListener("change", populateAvatarEditor);
  els.avatarName.addEventListener("input", updateAvatarPreview);
  els.avatarAnimal.addEventListener("change", updateAvatarPreview);
  els.avatarAccessory.addEventListener("change", updateAvatarPreview);

  window.setInterval(() => {
    if (!document.querySelector("#teacher-view").hidden) renderTeacherDashboard();
  }, 30000);

  initializeSupportForm();
  initializeAvatarEditor();
  renderAll();
})();
