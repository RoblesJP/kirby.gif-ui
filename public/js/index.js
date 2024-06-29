const form = document.getElementById("form");
const selectType = document.getElementById("select-type");
const urlInputTemplate = document.getElementById("url-input-template");
const audioInputTemplate = document.getElementById("audio-input-template");
const inputContainer = document.getElementById("input-container");
let action = "";

selectType.addEventListener("change", (event) => {
  inputContainer.innerHTML = "";
  let clone;

  if (event.target.value == 1) {
    action = "/gif";
    clone = urlInputTemplate.content.cloneNode(true);
  }

  if (event.target.value == 2) {
    action = "/audio";
    clone = audioInputTemplate.content.cloneNode(true);
  }

  inputContainer.appendChild(clone);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  let formData = new FormData(event.target);

  if (formData.get("type") == 2) {
    const fileInput = document.getElementById("file-input");
    const file = fileInput.files[0];

    if (file.size > 1000000) {
      createToast("The file size must be less than 1MB", NotifyLevel.Error);
      return;
    }
  }

  const options = {
    method: "POST",
    body: formData,
  };

  fetch(action, options)
    .then(async (res) => {
      if (res.ok) {
        return res.json();
      }
      let json = await res.json();
      throw new Error(json.message);
    })
    .then((json) => createToast(json.message, NotifyLevel.Success))
    .catch((error) => createToast(error.message, NotifyLevel.Error));
});

const NotifyLevel = {
  Success: "success",
  Warning: "warning",
  Error: "danger",
};

function createToast(text, level = NotifyLevel.Warning) {
  let toastContainer = document.querySelector(".toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.classList.add("toast-container", "p-3", "top-0", "end-0");
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.classList.add(
    "toast",
    "align-items-center",
    "border-0",
    `text-bg-${level}`
  );

  const toastBody = document.createElement("div");
  toastBody.classList.add("toast-body");
  toastBody.innerText = text;

  toast.appendChild(toastBody);
  toastContainer.appendChild(toast);

  toastInstance = new bootstrap.Toast(toast);

  toast.addEventListener("hidden.bs.toast", (event) => {
    toast.remove();
  });

  toastInstance.show();
}
