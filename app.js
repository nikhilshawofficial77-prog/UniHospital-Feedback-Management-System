(function () {
  const FEEDBACK_KEY = "Unihospital.feedback";

  function readFeedback() {
    const saved = localStorage.getItem(FEEDBACK_KEY);
    if (saved === null) return [];

    let feedback;
    try {
      feedback = JSON.parse(saved);
    } catch {
      throw new Error("The saved feedback could not be read.");
    }

    if (!Array.isArray(feedback)) {
      throw new Error("The saved feedback has an invalid format.");
    }
    return feedback;
  }

  function saveFeedback(feedback) {
    try {
      localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedback));
    } catch {
      throw new Error("Could not save feedback in this browser.");
    }
  }

  function today() {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + month + "-" + day;
  }

  // Feedback form on feedback.html
  const feedbackForm = document.getElementById("feedback-form");
  if (feedbackForm) {
    const emailInput = feedbackForm.elements.email;
    const message = document.getElementById("feedback-message");

    function updateEmailField() {
      const wantsEmail = feedbackForm.elements.identity.value === "email";
      emailInput.required = wantsEmail;
      if (!wantsEmail) emailInput.value = "";
    }

    document.querySelectorAll('input[name="identity"]').forEach(function (radio) {
      radio.addEventListener("change", updateEmailField);
    });

    feedbackForm.elements.visitDate.value = today();
    updateEmailField();

    feedbackForm.addEventListener("submit", function (event) {
      event.preventDefault();
      message.textContent = "";

      const wantsEmail = feedbackForm.elements.identity.value === "email";
      const email = wantsEmail ? emailInput.value.trim().toLowerCase() : "";
      const entry = {
        id: Date.now() + "-" + Math.random(),
        patientEmail: email,
        patientName: email || "Patient",
        visitDate: feedbackForm.elements.visitDate.value,
        category: feedbackForm.elements.category.value,
        rating: Number(feedbackForm.elements.rating.value),
        comments: feedbackForm.elements.comments.value.trim(),
        anonymous: !wantsEmail,
        status: "Pending",
        submittedAt: new Date().toISOString()
      };

      try {
        const feedback = readFeedback();
        feedback.push(entry);
        saveFeedback(feedback);
        feedbackForm.reset();
        feedbackForm.elements.visitDate.value = today();
        updateEmailField();
        message.textContent = "Thank you. Your feedback has been sent to the clinic.";
      } catch (error) {
        message.textContent = error.message;
      }
    });
  }

  function addCell(row, text, className) {
    const cell = document.createElement("td");
    cell.textContent = text;
    if (className) cell.className = className;
    row.appendChild(cell);
    return cell;
  }

  // Draw the dashboard table and summary values
  function showDashboard() {
    const rows = document.getElementById("feedback-rows");
    const message = document.getElementById("dashboard-message");
    const filter = document.getElementById("category-filter");
    rows.textContent = "";

    let feedback;
    try {
      feedback = readFeedback();
    } catch (error) {
      message.textContent = error.message;
      message.classList.remove("is-hidden");
      return;
    }

    let ratingTotal = 0;
    let resolvedTotal = 0;
    feedback.forEach(function (entry) {
      ratingTotal += Number(entry.rating);
      if (entry.status === "Resolved") resolvedTotal++;
    });

    document.getElementById("total-count").textContent = feedback.length;
    document.getElementById("pending-count").textContent = feedback.length - resolvedTotal;
    document.getElementById("resolved-count").textContent = resolvedTotal;
    const average = feedback.length ? ratingTotal / feedback.length : 0;
    document.getElementById("average-rating").innerHTML = average.toFixed(1) + " <small>/ 5</small>";

    feedback.slice().reverse().forEach(function (entry) {
      if (filter.value !== "all" && entry.category !== filter.value) return;

      const row = document.createElement("tr");
      const submitted = entry.submittedAt
        ? new Date(entry.submittedAt).toLocaleString()
        : "";
      const visit = submitted ? `${entry.visitDate}\n${submitted}` : entry.visitDate;
      const patient = entry.anonymous
        ? "Anonymous"
        : (entry.patientEmail || entry.patientName || "Patient");

      addCell(row, visit);
      addCell(row, patient);
      addCell(row, entry.category);
      addCell(row, entry.rating + " / 5");
      addCell(row, entry.comments || "—", "comment-cell");

      const statusCell = addCell(row, "");
      const status = document.createElement("span");
      status.className = entry.status === "Resolved" ? "status resolved" : "status";
      status.textContent = entry.status || "Pending";
      statusCell.appendChild(status);

      const actionCell = document.createElement("td");
      const button = document.createElement("button");
      button.className = "text-button row-action";
      button.textContent = entry.status === "Resolved" ? "Reopen" : "Mark resolved";
      button.addEventListener("click", function () {
        changeStatus(entry.id);
      });
      actionCell.appendChild(button);
      row.appendChild(actionCell);
      rows.appendChild(row);
    });

    if (rows.children.length === 0) {
      message.textContent = feedback.length === 0
        ? "No feedback has been submitted yet."
        : "No feedback matches this service.";
      message.classList.remove("is-hidden");
    } else {
      message.classList.add("is-hidden");
    }
  }

  // Switch one feedback item between Pending and Resolved
  function changeStatus(id) {
    try {
      const feedback = readFeedback();
      const entry = feedback.find(function (item) {
        return item.id === id;
      });

      if (!entry) {
        throw new Error("That feedback could not be found. Refresh the dashboard and try again.");
      }

      entry.status = entry.status === "Resolved" ? "Pending" : "Resolved";
      saveFeedback(feedback);
      showDashboard();
    } catch (error) {
      const message = document.getElementById("dashboard-message");
      message.textContent = error.message;
      message.classList.remove("is-hidden");
    }
  }

  // Dashboard page: load feedback and reload when the service filter changes
  const categoryFilter = document.getElementById("category-filter");
  if (categoryFilter) {
    showDashboard();
    categoryFilter.addEventListener("change", showDashboard);
  }
})();