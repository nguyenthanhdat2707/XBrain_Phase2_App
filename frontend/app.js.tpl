const API_BASE_URL = "{{ api_base_url }}";

const buttons = document.querySelectorAll("[data-path]");
const statusEl = document.querySelector("#status");
const endpointEl = document.querySelector("#endpoint");
const resultEl = document.querySelector("#result");

function setBusy(isBusy) {
  buttons.forEach((button) => {
    button.disabled = isBusy;
  });
}

async function loadPath(path) {
  const url = `${API_BASE_URL}${path}`;
  statusEl.textContent = "Loading";
  endpointEl.textContent = url;
  resultEl.textContent = "";
  setBusy(true);

  try {
    const response = await fetch(url);
    const body = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(body, null, 2));
    }

    statusEl.textContent = "Loaded";
    resultEl.textContent = JSON.stringify(body, null, 2);
  } catch (error) {
    statusEl.textContent = "Error";
    resultEl.textContent = error.message || String(error);
  } finally {
    setBusy(false);
  }
}

buttons.forEach((button) => {
  button.addEventListener("click", () => loadPath(button.dataset.path));
});
