// Будує список тем у бічній панелі, підсвічує відкриту тему,
// показує позначки за результатами вхідного тесту та шукає по темах.
(function () {
  const list = document.getElementById("topicList");
  if (!list || typeof TOPICS === "undefined") return;

  let status = {};
  try { status = JSON.parse(localStorage.getItem("nmt-topic-status-v2") || "{}"); } catch (e) { status = {}; }

  const currentPage = location.pathname.split("/").pop() || "index.html";
  const statusText = { gap: "прогалина", weak: "варто повторити", ok: "засвоєно" };

  TOPICS.forEach(([n, title]) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "tema" + n + ".html";
    a.innerHTML = '<span class="num">' + topicLabel(n) + '</span><span class="label"></span>';
    a.querySelector(".label").textContent = title;
    const s = status[n];
    if (s) {
      const mark = document.createElement("span");
      mark.className = "mark " + s;
      mark.title = statusText[s];
      mark.setAttribute("aria-label", "За вхідним тестом: " + statusText[s]);
      a.appendChild(mark);
    }
    if (a.getAttribute("href") === currentPage) {
      a.classList.add("active");
      a.setAttribute("aria-current", "page");
    }
    li.appendChild(a);
    list.appendChild(li);
  });

  const legend = document.getElementById("topicLegend");
  if (legend && Object.keys(status).length) legend.classList.remove("d-none");

  const active = list.querySelector("a.active");
  if (active) active.scrollIntoView({ block: "center" });

  const search = document.getElementById("topicSearch");
  const noResults = document.getElementById("noResults");
  search.addEventListener("input", () => {
    const query = search.value.trim().toLowerCase();
    let shown = 0;
    list.querySelectorAll("li").forEach(item => {
      const match = item.textContent.toLowerCase().includes(query);
      item.classList.toggle("d-none", !match);
      if (match) shown++;
    });
    noResults.classList.toggle("d-none", shown > 0);
  });
})();
